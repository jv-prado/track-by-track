/**
 * Migração one-off Firestore -> MongoDB (Fase 7, CLAUDE.md).
 *
 * Lê as coleções do Firestore do projeto legado (trackbytrack-57ae6) e grava
 * o equivalente nas coleções `users`, `rankings`, `comments` e `albums` do
 * Mongo usado pela API nova. Idempotente: pode rodar várias vezes sem duplicar
 * nada (upsert por legacyFirebaseUid/legacySpotifyId nos usuários, por
 * (userId, albumId) nos rankings, e pelo próprio id do documento do Firestore
 * nos comentários).
 *
 * Uso:
 *   npm run migrate:dry-run   # só relata contagens/amostras, não escreve nada
 *   npm run migrate           # roda de verdade
 *
 * Contra MONGODB_URI de produção (mongodb+srv://...), a execução real exige
 * a env CONFIRM_PRODUCTION_MIGRATION setada — ver scripts/.env.example.
 *
 * Shape do Firestore legado (extraído de src/services/firebase/index.js e
 * src/services/spotify.js do histórico do git, commit anterior à reescrita):
 *
 *   usuarios/{uid}: { nome, email, foto_perfil?, data_cadastro,
 *     albuns_avaliados: [{ id, nome, artista, imagem,
 *       avaliacoes: { [trackId]: number 0-5 }, review?, data_avaliacao,
 *       data_review?, mediaAvaliacao, progresso, preferencias?: {
 *         faixaFavorita?, piorFaixa?, review?, data_review? },
 *       faixas?: [{ id, nome }], data_primeira_avaliacao,
 *       isPrimeiraAvaliacao?, data_completou_100?, data_atualizacao? }] }
 *
 *   usuariosSpotify/{spotifyId}: { nome, email?, foto_perfil?,
 *     ultima_atualizacao } — perfil de login demo via Spotify OAuth, nunca
 *     teve conta Firebase Auth nem avaliações próprias.
 *
 *   comentarios_resenha/{id}: { albumId, usuarioId (dono da review), autor,
 *     texto, autorId, autorFoto, data, editado?, dataEdicao? }
 *
 *   `avaliacoes` (coleção top-level) é morta — só usada em cascade-delete,
 *   nunca escrita. Ignorada de propósito.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import mongoose, { Schema } from 'mongoose';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// api/.env primeiro (reaproveita MONGODB_URI/SPOTIFY_* de lá), depois
// scripts/.env por cima só se algo específico da migração precisar sobrescrever.
dotenv.config({ path: path.resolve(__dirname, '../api/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const DRY_RUN = process.argv.includes('--dry-run');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Faltando variável de ambiente: ${name}`);
    process.exit(1);
  }
  return value;
}

const FIREBASE_SERVICE_ACCOUNT_PATH = requireEnv(
  'FIREBASE_SERVICE_ACCOUNT_PATH',
);
const MONGODB_URI = requireEnv('MONGODB_URI');
const SPOTIFY_CLIENT_ID = requireEnv('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = requireEnv('SPOTIFY_CLIENT_SECRET');

if (!existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
  console.error(
    `Service account não encontrada em: ${FIREBASE_SERVICE_ACCOUNT_PATH}`,
  );
  process.exit(1);
}

const looksLikeProduction = MONGODB_URI.startsWith('mongodb+srv://');
if (looksLikeProduction && !DRY_RUN) {
  if (!process.env.CONFIRM_PRODUCTION_MIGRATION) {
    console.error(
      [
        'MONGODB_URI aponta pra um cluster Atlas (produção).',
        'Faça um export/backup do Firestore ANTES de continuar:',
        '  firebase firestore:export gs://<bucket>/backups/$(date +%Y%m%d) --project trackbytrack-57ae6',
        'Depois, setar CONFIRM_PRODUCTION_MIGRATION=eu-fiz-backup-do-firestore em scripts/.env e rodar de novo.',
      ].join('\n'),
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Mongo — schemas espelham 1:1 api/src/modules/**/*.schema.ts.
// Duplicado de propósito (script roda fora do contexto Nest); se os schemas
// da API mudarem, atualizar aqui também.
// ---------------------------------------------------------------------------

const userSchema = new Schema(
  {
    _id: String,
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, default: null },
    displayName: { type: String, required: true },
    avatarUrl: String,
    mustResetPassword: { type: Boolean, required: true, default: false },
    legacyFirebaseUid: { type: String, index: true },
    legacySpotifyId: { type: String, index: true },
    createdAt: Date,
  },
  { collection: 'users', versionKey: false },
);

const rankingEntrySchema = new Schema(
  {
    trackId: { type: String, required: true },
    trackNumber: { type: Number, required: true },
    score: { type: Number, required: true },
    position: { type: Number, required: true },
  },
  { _id: false },
);

const rankingSchema = new Schema(
  {
    _id: String,
    userId: { type: String, required: true },
    albumId: { type: String, required: true },
    entries: { type: [rankingEntrySchema], default: [] },
    averageScore: { type: Number, required: true },
    review: {
      type: new Schema(
        {
          text: String,
          favoriteTrackId: String,
          worstTrackId: String,
        },
        { _id: false },
      ),
      default: {},
    },
    firstCompletedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { collection: 'rankings', versionKey: false },
);
rankingSchema.index({ userId: 1, albumId: 1 }, { unique: true });

const commentSchema = new Schema(
  {
    _id: String,
    rankingId: { type: String, required: true },
    authorId: { type: String, required: true },
    authorDisplayName: { type: String, required: true },
    authorAvatarUrl: String,
    text: { type: String, required: true },
    createdAt: { type: Date, required: true },
    editedAt: { type: Date, default: null },
  },
  { collection: 'comments', versionKey: false },
);

const albumTrackSchema = new Schema(
  {
    spotifyId: { type: String, required: true },
    name: { type: String, required: true },
    durationMs: { type: Number, required: true },
    trackNumber: { type: Number, required: true },
  },
  { _id: false },
);

const albumSchema = new Schema(
  {
    _id: String,
    spotifyId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    artist: { type: String, required: true },
    imageUrl: String,
    releaseDate: String,
    tracks: { type: [albumTrackSchema], default: [] },
    cachedAt: { type: Date, required: true },
  },
  { collection: 'albums', versionKey: false },
);

const UserModel = mongoose.model('User', userSchema);
const RankingModel = mongoose.model('Ranking', rankingSchema);
const CommentModel = mongoose.model('Comment', commentSchema);
const AlbumModel = mongoose.model('Album', albumSchema);

// ---------------------------------------------------------------------------
// Spotify — Client Credentials, só pra resolver trackNumber de cada faixa.
// Mesmo fluxo de api/src/modules/album-catalog/spotify-client.service.ts.
// ---------------------------------------------------------------------------

interface SpotifyTrack {
  spotifyId: string;
  name: string;
  durationMs: number;
  trackNumber: number;
}
interface SpotifyAlbum {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl?: string;
  releaseDate?: string;
  tracks: SpotifyTrack[];
}

let cachedSpotifyToken: { accessToken: string; expiresAt: number } | null =
  null;
const spotifyHttp: AxiosInstance = axios.create();

async function getSpotifyAppToken(): Promise<string> {
  if (cachedSpotifyToken && cachedSpotifyToken.expiresAt > Date.now()) {
    return cachedSpotifyToken.accessToken;
  }
  const basicAuth = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
  ).toString('base64');
  const response = await spotifyHttp.post<{
    access_token: string;
    expires_in: number;
  }>('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  cachedSpotifyToken = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000 - 60_000,
  };
  return cachedSpotifyToken.accessToken;
}

const albumFetchCache = new Map<string, SpotifyAlbum | null>();

/** Cache em Mongo primeiro (7 dias, mesma regra da API); senão busca no Spotify. */
async function getAlbumWithTracks(
  spotifyId: string,
): Promise<SpotifyAlbum | null> {
  if (albumFetchCache.has(spotifyId)) return albumFetchCache.get(spotifyId)!;

  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const cached = await AlbumModel.findOne({ spotifyId }).lean().exec();
  if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL_MS) {
    const album: SpotifyAlbum = {
      spotifyId: cached.spotifyId,
      name: cached.name,
      artist: cached.artist,
      imageUrl: cached.imageUrl ?? undefined,
      releaseDate: cached.releaseDate ?? undefined,
      tracks: cached.tracks,
    };
    albumFetchCache.set(spotifyId, album);
    return album;
  }

  try {
    const token = await getSpotifyAppToken();
    const response = await spotifyHttp.get(
      `https://api.spotify.com/v1/albums/${spotifyId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const raw = response.data;
    const album: SpotifyAlbum = {
      spotifyId: raw.id,
      name: raw.name,
      artist: (raw.artists ?? []).map((a: { name: string }) => a.name).join(', '),
      imageUrl: raw.images?.[0]?.url,
      releaseDate: raw.release_date,
      tracks: (raw.tracks?.items ?? []).map((t: any) => ({
        spotifyId: t.id,
        name: t.name,
        durationMs: t.duration_ms,
        trackNumber: t.track_number,
      })),
    };

    if (!DRY_RUN) {
      await AlbumModel.updateOne(
        { spotifyId },
        {
          $set: { ...album, cachedAt: new Date() },
          $setOnInsert: { _id: randomUUID() },
        },
        { upsert: true },
      );
    }

    albumFetchCache.set(spotifyId, album);
    return album;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : null;
    if (status === 404) {
      albumFetchCache.set(spotifyId, null);
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Score domínio é 0-5 em passos de 0.5 (ver Score VO). Legado já usava essa escala. */
function normalizeScore(raw: unknown, warnings: string[], context: string): number {
  const n = typeof raw === 'number' ? raw : 0;
  if (!Number.isFinite(n) || n < 0 || n > 5) {
    warnings.push(`${context}: score inválido (${String(raw)}), usando 0`);
    return 0;
  }
  const rounded = Math.round(n * 2) / 2;
  if (rounded !== n) {
    warnings.push(`${context}: score ${n} arredondado pra ${rounded}`);
  }
  return rounded;
}

interface BuiltEntry {
  trackId: string;
  trackNumber: number;
  score: number;
  position: number;
}

/**
 * Spotify reatribui o id de uma faixa entre chamadas (relinking — mesmo áudio,
 * id diferente por endpoint/tempo). Confirmado no dado real: uma faixa salva
 * como favorita não batia por id contra o álbum atual, mas era a mesma faixa
 * (`GET /tracks/{id}` apontava pro mesmo albumId). Como o legado também
 * guardava o nome da faixa (`faixaFavoritaNome`/`piorFaixaNome`), usamos o
 * nome como fallback antes de descartar a preferência.
 */
function resolveTrackRef(
  rawId: unknown,
  rawName: unknown,
  tracks: SpotifyTrack[],
  warnings: string[],
  context: string,
  label: string,
): string | undefined {
  if (!rawId) return undefined;
  if (tracks.some((t) => t.spotifyId === rawId)) return rawId as string;

  if (typeof rawName === 'string' && rawName.trim()) {
    const needle = rawName.trim().toLowerCase();
    const byName = tracks.find((t) => t.name.trim().toLowerCase() === needle);
    if (byName) {
      warnings.push(
        `${context}: ${label} ${rawId} não bate por id (Spotify relinking) — recuperada por nome ("${rawName}")`,
      );
      return byName.spotifyId;
    }
  }

  warnings.push(`${context}: ${label} ${rawId} não pertence ao álbum, ignorada`);
  return undefined;
}

/** Espelha AlbumRanking.recomputePositions() do domínio: maior nota primeiro, empate por trackNumber. */
function buildEntriesWithPositions(
  tracks: SpotifyTrack[],
  scoresMap: Record<string, unknown>,
  warnings: string[],
  context: string,
): BuiltEntry[] {
  const entries = tracks.map((track) => ({
    trackId: track.spotifyId,
    trackNumber: track.trackNumber,
    score: normalizeScore(
      scoresMap[track.spotifyId],
      warnings,
      `${context} faixa ${track.spotifyId}`,
    ),
    position: 1,
  }));

  const ordered = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.trackNumber - b.trackNumber;
  });
  ordered.forEach((entry, index) => {
    entry.position = index + 1;
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Migração
// ---------------------------------------------------------------------------

const stats = {
  usersUpserted: 0,
  usersSkipped: 0,
  usersMerged: 0,
  spotifyUsersCreated: 0,
  spotifyUsersMerged: 0,
  spotifyUsersSkipped: 0,
  rankingsUpserted: 0,
  rankingsSkipped: 0,
  commentsUpserted: 0,
  commentsSkipped: 0,
};
const warnings: string[] = [];

async function migrate() {
  const app = initializeApp({
    credential: cert(
      JSON.parse(readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8')),
    ),
  });
  const firestore = getFirestore(app);

  await mongoose.connect(MONGODB_URI);

  // rankingKey(uid legado, albumId spotify) -> novo rankingId, pra ligar comentários.
  const rankingIdByLegacyKey = new Map<string, string>();
  // uid legado -> novo userId, pra ligar autor de comentário.
  const userIdByLegacyUid = new Map<string, string>();

  // --- usuarios ---------------------------------------------------------
  const usuariosSnap = await firestore.collection('usuarios').get();
  console.log(`usuarios: ${usuariosSnap.size} documentos`);

  for (const doc of usuariosSnap.docs) {
    const uid = doc.id;
    const data = doc.data();

    if (!data.email) {
      stats.usersSkipped++;
      warnings.push(`usuarios/${uid}: sem email, pulado`);
      continue;
    }

    const email = String(data.email).toLowerCase();
    const existingByUid = await UserModel.findOne({ legacyFirebaseUid: uid })
      .lean()
      .exec();

    let userId: string;
    if (existingByUid?._id) {
      userId = existingByUid._id;
      // já migrado numa run anterior — reprocessa os rankings, não mexe no user.
    } else {
      // Email é unique no schema. Pode já existir uma conta criada direto na
      // API nova (ex: teste manual durante a Fase 3) com o MESMO email de um
      // usuário do Firestore — visto na prática (jv_prado@outlook.com: conta
      // real com senha já cadastrada colidiu com o registro legado). Nesse
      // caso, linka o uid legado na conta existente em vez de tentar criar
      // uma segunda — e principalmente NUNCA sobrescreve passwordHash/
      // mustResetPassword de uma conta que já tem senha de verdade.
      const existingByEmail = await UserModel.findOne({ email }).lean().exec();
      if (existingByEmail?._id) {
        userId = existingByEmail._id;
        if (!DRY_RUN && !existingByEmail.legacyFirebaseUid) {
          await UserModel.updateOne(
            { _id: userId },
            { $set: { legacyFirebaseUid: uid } },
          );
        }
        stats.usersMerged++;
        warnings.push(
          `usuarios/${uid}: email ${email} já existe numa conta Mongo (${userId}) — linkado, senha/estado preservados`,
        );
      } else {
        userId = randomUUID();
        if (!DRY_RUN) {
          await UserModel.create({
            _id: userId,
            email,
            passwordHash: null,
            displayName: data.nome || 'Usuário',
            avatarUrl: data.foto_perfil || undefined,
            mustResetPassword: true,
            legacyFirebaseUid: uid,
            createdAt: toDate(data.data_cadastro) ?? new Date(),
          });
        }
      }
    }
    userIdByLegacyUid.set(uid, userId);
    stats.usersUpserted++;

    // --- albuns_avaliados -> rankings ---
    const albuns = Array.isArray(data.albuns_avaliados)
      ? data.albuns_avaliados
      : [];

    for (const album of albuns) {
      const spotifyAlbumId = album?.id;
      const context = `usuarios/${uid} álbum ${spotifyAlbumId ?? '(sem id)'}`;
      if (!spotifyAlbumId) {
        stats.rankingsSkipped++;
        warnings.push(`${context}: sem id de álbum, pulado`);
        continue;
      }

      const catalogAlbum = await getAlbumWithTracks(spotifyAlbumId);
      if (!catalogAlbum || catalogAlbum.tracks.length === 0) {
        stats.rankingsSkipped++;
        warnings.push(
          `${context}: álbum não encontrado no Spotify (removido/indisponível), pulado`,
        );
        continue;
      }

      const scoresMap = album.avaliacoes ?? {};
      const entries = buildEntriesWithPositions(
        catalogAlbum.tracks,
        scoresMap,
        warnings,
        context,
      );
      const allRated = entries.every((e) => e.score > 0);
      const averageScore =
        entries.length > 0
          ? (entries.reduce((sum, e) => sum + e.score, 0) / entries.length) * 2
          : 0;

      const preferencias = album.preferencias ?? {};
      const review: { text?: string; favoriteTrackId?: string; worstTrackId?: string } =
        {};
      const reviewText = preferencias.review ?? album.review;
      if (typeof reviewText === 'string' && reviewText.trim()) {
        review.text = reviewText;
      }
      review.favoriteTrackId = resolveTrackRef(
        preferencias.faixaFavorita,
        preferencias.faixaFavoritaNome,
        catalogAlbum.tracks,
        warnings,
        context,
        'faixaFavorita',
      );
      review.worstTrackId = resolveTrackRef(
        preferencias.piorFaixa,
        preferencias.piorFaixaNome,
        catalogAlbum.tracks,
        warnings,
        context,
        'piorFaixa',
      );
      if (review.favoriteTrackId === undefined) delete review.favoriteTrackId;
      if (review.worstTrackId === undefined) delete review.worstTrackId;

      const createdAt =
        toDate(album.data_primeira_avaliacao) ??
        toDate(album.data_avaliacao) ??
        new Date();
      const updatedAt =
        toDate(album.data_atualizacao) ?? toDate(album.data_avaliacao) ?? createdAt;
      const firstCompletedAt =
        toDate(album.data_completou_100) ?? (allRated ? updatedAt : null);
      const completedAt = allRated ? (firstCompletedAt ?? updatedAt) : null;

      const existingRanking = await RankingModel.findOne({
        userId,
        albumId: spotifyAlbumId,
      })
        .lean()
        .exec();
      const rankingId = existingRanking?._id ?? randomUUID();
      rankingIdByLegacyKey.set(`${uid}::${spotifyAlbumId}`, rankingId);

      if (!DRY_RUN) {
        await RankingModel.updateOne(
          { userId, albumId: spotifyAlbumId },
          {
            $set: {
              entries,
              averageScore,
              review,
              firstCompletedAt,
              completedAt,
              createdAt,
              updatedAt,
            },
            $setOnInsert: { _id: rankingId },
          },
          { upsert: true },
        );
      }
      stats.rankingsUpserted++;
    }
  }

  // --- usuariosSpotify ----------------------------------------------------
  const spotifyUsersSnap = await firestore.collection('usuariosSpotify').get();
  console.log(`usuariosSpotify: ${spotifyUsersSnap.size} documentos`);

  for (const doc of spotifyUsersSnap.docs) {
    const spotifyId = doc.id;
    const data = doc.data();

    if (!data.email) {
      stats.spotifyUsersSkipped++;
      warnings.push(
        `usuariosSpotify/${spotifyId}: sem email, não dá pra criar conta email/senha — pulado`,
      );
      continue;
    }

    const email = String(data.email).toLowerCase();
    const byLegacyId = await UserModel.findOne({ legacySpotifyId: spotifyId })
      .lean()
      .exec();
    const byEmail = byLegacyId
      ? null
      : await UserModel.findOne({ email }).lean().exec();

    if (byLegacyId) {
      // já migrado numa run anterior, nada a fazer.
      continue;
    }

    if (byEmail) {
      // mesma pessoa já existe via conta email/senha real — só linka o id legado.
      if (!DRY_RUN) {
        await UserModel.updateOne(
          { _id: byEmail._id },
          { $set: { legacySpotifyId: spotifyId } },
        );
      }
      stats.spotifyUsersMerged++;
      continue;
    }

    if (!DRY_RUN) {
      await UserModel.create({
        _id: randomUUID(),
        email,
        passwordHash: null,
        displayName: data.nome || 'Usuário Spotify',
        avatarUrl: data.foto_perfil || undefined,
        mustResetPassword: true,
        legacySpotifyId: spotifyId,
        createdAt: toDate(data.ultima_atualizacao) ?? new Date(),
      });
    }
    stats.spotifyUsersCreated++;
  }

  // --- comentarios_resenha -> comments -------------------------------------
  const commentsSnap = await firestore.collection('comentarios_resenha').get();
  console.log(`comentarios_resenha: ${commentsSnap.size} documentos`);

  for (const doc of commentsSnap.docs) {
    const data = doc.data();
    const context = `comentarios_resenha/${doc.id}`;

    let rankingId = rankingIdByLegacyKey.get(`${data.usuarioId}::${data.albumId}`);
    if (!rankingId) {
      // Ranking já existia de uma run anterior (não passou pelo Map desta execução).
      const ownerUserId =
        userIdByLegacyUid.get(data.usuarioId) ??
        (await UserModel.findOne({ legacyFirebaseUid: data.usuarioId })
          .lean()
          .exec())?._id;
      const ranking = ownerUserId
        ? await RankingModel.findOne({
            userId: ownerUserId,
            albumId: data.albumId,
          })
            .lean()
            .exec()
        : null;
      rankingId = ranking?._id ?? undefined;
    }

    if (!rankingId) {
      stats.commentsSkipped++;
      warnings.push(`${context}: ranking de destino não encontrado, pulado (órfão)`);
      continue;
    }

    const authorId =
      userIdByLegacyUid.get(data.autorId) ??
      (await UserModel.findOne({ legacyFirebaseUid: data.autorId }).lean().exec())
        ?._id ??
      data.autorId; // fallback: uid legado cru, melhor que perder o comentário

    if (!DRY_RUN) {
      await CommentModel.updateOne(
        { _id: doc.id }, // id do Firestore reaproveitado como _id — upsert idempotente natural
        {
          $set: {
            rankingId,
            authorId,
            authorDisplayName: data.autor || 'Usuário',
            authorAvatarUrl: data.autorFoto || undefined,
            text: data.texto || '',
            createdAt: toDate(data.data) ?? new Date(),
            editedAt: data.editado ? toDate(data.dataEdicao) ?? new Date() : null,
          },
        },
        { upsert: true },
      );
    }
    stats.commentsUpserted++;
  }

  await mongoose.disconnect();

  // --- relatório ------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log(DRY_RUN ? 'DRY RUN — nenhuma escrita foi realizada' : 'Migração concluída');
  console.log('='.repeat(60));
  console.table(stats);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} avisos:`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

migrate().catch((error) => {
  console.error('Migração falhou:', error);
  process.exit(1);
});
