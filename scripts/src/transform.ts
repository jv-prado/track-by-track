import { randomUUID } from 'crypto';

/** Formatos legados do Firestore — nomes de campo inconsistentes entre gravadores (ver investigação). */
export interface FirestoreUserDoc {
  nome?: string;
  displayName?: string;
  email?: string;
  foto_perfil?: string;
  photoURL?: string;
  data_cadastro?: Date;
}

export interface FirestoreTrackRef {
  id: string;
  nome?: string;
}

export interface FirestoreAlbumEntry {
  id: string;
  avaliacoes?: Record<string, number>;
  faixas?: FirestoreTrackRef[];
  preferencias?: {
    faixaFavorita?: string;
    piorFaixa?: string;
    review?: string;
  };
  progresso?: { percentual?: number };
  data_primeira_avaliacao?: Date;
  data_avaliacao?: Date;
  data_completou_100?: Date;
  data_atualizacao?: Date;
}

export interface FirestoreCommentDoc {
  albumId: string;
  usuarioId: string;
  autor?: string;
  autorId: string;
  autorFoto?: string;
  texto: string;
  data?: Date;
  editado?: boolean;
  dataEdicao?: Date;
}

export interface MigratedUser {
  id: string;
  legacyFirebaseUid?: string;
  legacySpotifyId?: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  mustResetPassword: true;
  passwordHash: null;
  createdAt: Date;
}

export interface RankingEntryData {
  trackId: string;
  trackNumber: number;
  score: number;
  position: number;
}

export interface MigratedRanking {
  id: string;
  userId: string;
  albumId: string;
  entries: RankingEntryData[];
  averageScore: number;
  review: { text?: string; favoriteTrackId?: string; worstTrackId?: string };
  firstCompletedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MigratedComment {
  id: string;
  rankingId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: Date;
  editedAt: Date | null;
}

export type Skipped = { skipped: true; reason: string };

function isSpotifyUid(uid: string): boolean {
  return uid.startsWith('spotify_');
}

/**
 * Usuários migrados nunca têm senha real (a "senha" antiga era uma gambiarra
 * sintética client-side — ver CLAUDE.md seção 0/4.4). Precisam do fluxo de
 * "definir senha" (reset) no primeiro acesso.
 */
export function transformUser(uid: string, doc: FirestoreUserDoc): MigratedUser | Skipped {
  const email = doc.email?.trim().toLowerCase();
  if (!email) {
    return { skipped: true, reason: `usuário ${uid} sem e-mail — não é possível criar conta` };
  }

  return {
    id: randomUUID(),
    legacyFirebaseUid: isSpotifyUid(uid) ? undefined : uid,
    legacySpotifyId: isSpotifyUid(uid) ? uid.replace('spotify_', '') : undefined,
    email,
    displayName: doc.nome ?? doc.displayName ?? 'Usuário',
    avatarUrl: doc.foto_perfil ?? doc.photoURL,
    mustResetPassword: true,
    passwordHash: null,
    createdAt: doc.data_cadastro ?? new Date(),
  };
}

/** Espelha AlbumRanking#recomputePositions — o script roda fora do domínio Nest. */
function computePositions(
  entries: { trackId: string; trackNumber: number; score: number }[],
): Map<string, number> {
  const ordered = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.trackNumber - b.trackNumber;
  });
  const positions = new Map<string, number>();
  ordered.forEach((entry, index) => positions.set(entry.trackId, index + 1));
  return positions;
}

export function transformRanking(
  newUserId: string,
  albumEntry: FirestoreAlbumEntry,
): MigratedRanking {
  const faixas = albumEntry.faixas ?? [];
  const avaliacoes = albumEntry.avaliacoes ?? {};

  const rawEntries = faixas.map((track, index) => ({
    trackId: track.id,
    trackNumber: index + 1,
    score: avaliacoes[track.id] ?? 0,
  }));
  const positions = computePositions(rawEntries);
  const entries: RankingEntryData[] = rawEntries.map((entry) => ({
    ...entry,
    position: positions.get(entry.trackId) ?? rawEntries.length,
  }));

  const total = entries.length;
  const averageScore =
    total === 0 ? 0 : (entries.reduce((acc, e) => acc + e.score, 0) / total) * 2;

  const isComplete = total > 0 && entries.every((e) => e.score > 0);
  const firstCompletedAt = albumEntry.data_completou_100 ?? (isComplete ? new Date() : null);
  const completedAt = isComplete ? (albumEntry.data_atualizacao ?? new Date()) : null;
  const createdAt = albumEntry.data_primeira_avaliacao ?? albumEntry.data_avaliacao ?? new Date();

  return {
    id: randomUUID(),
    userId: newUserId,
    albumId: albumEntry.id,
    entries,
    averageScore,
    review: {
      text: albumEntry.preferencias?.review,
      favoriteTrackId: albumEntry.preferencias?.faixaFavorita,
      worstTrackId: albumEntry.preferencias?.piorFaixa,
    },
    firstCompletedAt,
    completedAt,
    createdAt,
    updatedAt: albumEntry.data_atualizacao ?? createdAt,
  };
}

export function transformComment(
  doc: FirestoreCommentDoc,
  rankingId: string,
  newAuthorId: string,
): MigratedComment {
  return {
    id: randomUUID(),
    rankingId,
    authorId: newAuthorId,
    authorDisplayName: doc.autor ?? 'Usuário',
    authorAvatarUrl: doc.autorFoto,
    text: doc.texto,
    createdAt: doc.data ?? new Date(),
    editedAt: doc.editado ? (doc.dataEdicao ?? null) : null,
  };
}
