import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import {
  transformUser,
  transformRanking,
  transformComment,
  FirestoreAlbumEntry,
  FirestoreCommentDoc,
  FirestoreUserDoc,
  MigratedUser,
  MigratedRanking,
  MigratedComment,
} from './transform';

const isDryRun = process.argv.includes('--dry-run');

interface Summary {
  usersMigrated: number;
  usersSkipped: string[];
  rankingsMigrated: number;
  commentsMigrated: number;
  commentsSkipped: string[];
}

interface UserPersistedDoc extends Omit<MigratedUser, 'id'> {
  _id: string;
}

interface RankingPersistedDoc extends Omit<MigratedRanking, 'id'> {
  _id: string;
}

interface CommentPersistedDoc extends Omit<MigratedComment, 'id'> {
  _id: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variável de ambiente obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

async function connectFirestore() {
  const serviceAccountPath = requireEnv('GOOGLE_APPLICATION_CREDENTIALS');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

async function connectMongo(): Promise<void> {
  const uri = requireEnv('MONGODB_URI');
  await mongoose.connect(uri);
}

function usersCollection() {
  return mongoose.connection.collection<UserPersistedDoc>('users');
}
function rankingsCollection() {
  return mongoose.connection.collection<RankingPersistedDoc>('rankings');
}
function commentsCollection() {
  return mongoose.connection.collection<CommentPersistedDoc>('comments');
}

function toUserDoc(user: MigratedUser): UserPersistedDoc {
  const { id, ...rest } = user;
  return { _id: id, ...rest };
}

function toRankingDoc(ranking: MigratedRanking): RankingPersistedDoc {
  const { id, ...rest } = ranking;
  return { _id: id, ...rest };
}

function toCommentDoc(comment: MigratedComment): CommentPersistedDoc {
  const { id, ...rest } = comment;
  return { _id: id, ...rest };
}

async function upsertUser(user: MigratedUser): Promise<string> {
  const filter = user.legacyFirebaseUid
    ? { legacyFirebaseUid: user.legacyFirebaseUid }
    : { legacySpotifyId: user.legacySpotifyId };
  await usersCollection().updateOne(filter, { $setOnInsert: toUserDoc(user) }, { upsert: true });
  const persisted = await usersCollection().findOne(filter);
  return persisted?._id ?? user.id;
}

async function main() {
  console.log(
    `Migração Firestore → Mongo — modo: ${isDryRun ? 'DRY RUN (nada será escrito)' : 'EXECUÇÃO REAL'}`,
  );

  const firestore = await connectFirestore();
  if (!isDryRun) {
    await connectMongo();
  }

  const summary: Summary = {
    usersMigrated: 0,
    usersSkipped: [],
    rankingsMigrated: 0,
    commentsMigrated: 0,
    commentsSkipped: [],
  };

  // legacyUid (uid do doc `usuarios`) -> id do novo usuário no Mongo
  const userIdMap = new Map<string, string>();
  // `${legacyUid}::${albumId}` -> id do novo ranking no Mongo
  const rankingIdMap = new Map<string, string>();

  const usersSnapshot = await firestore.collection('usuarios').get();

  for (const userDoc of usersSnapshot.docs) {
    const legacyUid = userDoc.id;
    const data = userDoc.data() as FirestoreUserDoc & { albuns_avaliados?: FirestoreAlbumEntry[] };

    const transformed = transformUser(legacyUid, data);
    if ('skipped' in transformed) {
      summary.usersSkipped.push(transformed.reason);
      continue;
    }

    const newUserId = isDryRun ? transformed.id : await upsertUser(transformed);
    userIdMap.set(legacyUid, newUserId);
    summary.usersMigrated += 1;

    const albunsAvaliados = data.albuns_avaliados ?? [];

    for (const albumEntry of albunsAvaliados) {
      const ranking = transformRanking(newUserId, albumEntry);
      rankingIdMap.set(`${legacyUid}::${albumEntry.id}`, ranking.id);

      if (!isDryRun) {
        await rankingsCollection().updateOne(
          { userId: ranking.userId, albumId: ranking.albumId },
          { $set: toRankingDoc(ranking) },
          { upsert: true },
        );
      }
      summary.rankingsMigrated += 1;
    }
  }

  const commentsSnapshot = await firestore.collection('comentarios_resenha').get();

  for (const commentDoc of commentsSnapshot.docs) {
    const data = commentDoc.data() as FirestoreCommentDoc;

    const newAuthorId = userIdMap.get(data.autorId);
    const rankingId = rankingIdMap.get(`${data.usuarioId}::${data.albumId}`);

    if (!newAuthorId || !rankingId) {
      summary.commentsSkipped.push(
        `comentário ${commentDoc.id}: ranking ou autor não encontrado (albumId=${data.albumId}, usuarioId=${data.usuarioId}, autorId=${data.autorId})`,
      );
      continue;
    }

    const comment = transformComment(data, rankingId, newAuthorId);

    if (!isDryRun) {
      const alreadyMigrated = await commentsCollection().findOne({
        rankingId: comment.rankingId,
        authorId: comment.authorId,
        createdAt: comment.createdAt,
      });
      if (!alreadyMigrated) {
        await commentsCollection().insertOne(toCommentDoc(comment));
      }
    }
    summary.commentsMigrated += 1;
  }

  console.log('\n=== Resumo da migração ===');
  console.log(`Usuários migrados: ${summary.usersMigrated}`);
  console.log(`Usuários pulados: ${summary.usersSkipped.length}`);
  summary.usersSkipped.slice(0, 20).forEach((reason) => console.log(`  - ${reason}`));
  console.log(`Rankings migrados: ${summary.rankingsMigrated}`);
  console.log(`Comentários migrados: ${summary.commentsMigrated}`);
  console.log(`Comentários pulados: ${summary.commentsSkipped.length}`);
  summary.commentsSkipped.slice(0, 20).forEach((reason) => console.log(`  - ${reason}`));

  if (isDryRun) {
    console.log(
      '\nDRY RUN — nada foi escrito no Mongo. Rode sem --dry-run para migrar de verdade.',
    );
  }

  if (!isDryRun) {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
