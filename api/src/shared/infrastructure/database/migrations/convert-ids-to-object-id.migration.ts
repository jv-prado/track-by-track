import type { Connection } from 'mongoose';
import { Types } from 'mongoose';

/** `Connection.db` do Mongoose — evita depender do pacote `mongodb` direto (não é dependência declarada do projeto). */
type MongoDb = NonNullable<Connection['db']>;
type RawDoc = Record<string, unknown>;

/**
 * Bump o sufixo se a lógica de conversão mudar de forma incompatível com o
 * marcador já gravado — força uma nova rodada mesmo em banco já migrado.
 *
 * v1 tinha um bug: gravava `_id`/FKs como `Types.ObjectId` nativo, mas todo
 * schema da aplicação declarava esses campos como `String` — Mongo compara
 * tipo BSON na igualdade, então uma query com string nunca batia com o valor
 * `ObjectId` gravado (ex.: `RANKING_NOT_FOUND` em toda busca por
 * `userId`+`albumId`). v2 normalizou tudo pra string hex de 24 chars.
 *
 * v3 muda de novo: os schemas agora declaram `_id` e toda FK que referencia
 * o `_id` de outra coleção (userId, authorId, rankingId, followerId,
 * followeeId, actorId) como `Types.ObjectId` nativo — decisão consciente
 * (ver seção 4.6 do CLAUDE.md): storage no formato idiomático do Mongo, com o
 * cast pra string acontecendo só na borda persistência↔domínio (mappers) ou
 * persistência↔HTTP (services simples), nunca vazando ObjectId pro domínio
 * ou pra resposta. v3 converte a string hex gravada pela v2 pro `ObjectId`
 * nativo equivalente (mesmo valor, só troca o tipo BSON).
 */
const MIGRATION_ID = 'convert-ids-to-object-id-v3';

interface ForeignKey {
  field: string;
  map: Map<string, Types.ObjectId>;
}

interface MinimalLogger {
  log(message: string): void;
  warn(message: string): void;
}

const HEX24 = /^[0-9a-f]{24}$/i;

/** Já está no formato que os schemas esperam: `ObjectId` nativo. */
function isCorrectFormat(id: unknown): boolean {
  return id instanceof Types.ObjectId;
}

/**
 * Novo valor pra um id que precisa de conversão. String hex de 24 chars vira
 * o `ObjectId` equivalente (mesmo valor, só troca o tipo BSON) — preserva as
 * referências entre coleções sem precisar remapear nada. Qualquer outro
 * formato (não deveria mais existir depois de v1/v2, mas por segurança) gera
 * um id novo.
 */
function nextIdFor(id: unknown): Types.ObjectId {
  return typeof id === 'string' && HEX24.test(id)
    ? new Types.ObjectId(id)
    : new Types.ObjectId();
}

/**
 * Constrói, por coleção, o mapa `id-antigo (string hex) -> id-novo (ObjectId
 * nativo)`. Documento cujo `_id` já está correto não entra no mapa — é assim
 * que `migrateCollection` sabe que não há nada a fazer ali.
 */
async function buildIdMap(
  db: MongoDb,
  collection: string,
): Promise<Map<string, Types.ObjectId>> {
  const docs = await db
    .collection(collection)
    .find({}, { projection: { _id: 1 } })
    .toArray();

  const map = new Map<string, Types.ObjectId>();
  for (const doc of docs) {
    if (isCorrectFormat(doc._id)) continue;
    map.set(String(doc._id), nextIdFor(doc._id));
  }
  return map;
}

/**
 * Reescreve uma coleção inteira com `_id` novo e FKs remapeadas, via
 * coleção temporária + `rename(..., dropTarget: true)`: a coleção original
 * só é substituída na última operação (rename é troca de metadado, quase
 * instantânea), então um crash a qualquer momento antes disso deixa os dados
 * originais intactos — nunca um `deleteMany` seguido de `insertMany` que
 * pudesse deixar a coleção vazia se o processo caísse no meio.
 */
async function migrateCollection(
  db: MongoDb,
  name: string,
  idMap: Map<string, Types.ObjectId>,
  foreignKeys: ForeignKey[],
  logger: MinimalLogger,
): Promise<void> {
  if (idMap.size === 0) return;

  const docs = await db.collection(name).find({}).toArray();
  const newDocs = docs.map((doc) => {
    const rewritten: RawDoc = { ...doc };
    const newId = idMap.get(String(doc._id));
    rewritten._id = newId ?? doc._id;

    for (const { field, map } of foreignKeys) {
      const value = rewritten[field];
      if (value === undefined || value === null) continue; // ausente/opcional.
      if (isCorrectFormat(value)) continue; // já migrado.
      if (typeof value !== 'string') continue; // formato inesperado, não deveria acontecer.

      const key = value;
      const mapped = map.get(key);
      if (mapped) {
        rewritten[field] = mapped;
        continue;
      }
      // Referência órfã (documento apontado não existe mais, ou já estava
      // correto e por isso nunca entrou no idMap) — gera um id novo só pra
      // manter o tipo do campo válido; não inventa uma relação que não existia.
      const orphanId = nextIdFor(value);
      logger.warn(
        `Migração de ids: ${name}.${field} referenciava "${key}", que não existe mais — substituído por ${orphanId.toString()} (órfão).`,
      );
      rewritten[field] = orphanId;
    }
    return rewritten;
  });

  const tempName = `${name}__migrating_ids`;
  await db
    .collection(tempName)
    .drop()
    .catch(() => {});
  if (newDocs.length > 0) {
    await db.collection(tempName).insertMany(newDocs);
  } else {
    await db.createCollection(tempName);
  }
  await db.collection(tempName).rename(name, { dropTarget: true });

  logger.log(`Migração de ids: ${name} (${newDocs.length} documentos).`);
}

/**
 * Converte `_id` e toda referência entre coleções (userId, authorId,
 * rankingId, followerId, followeeId, actorId) de string hex pra `ObjectId`
 * nativo do Mongo — formato que os schemas da aplicação declaram (ver seção
 * 4.6 do CLAUDE.md). **Não** toca em `ranking.albumId`/`notification.albumId`:
 * esses referenciam `albums.spotifyId` (catálogo do Spotify), não
 * `albums._id` — ver nota em ranking.schema.ts.
 *
 * Roda inteiramente via driver cru (bypassa o cast do Mongoose de propósito)
 * e precisa terminar antes de qualquer model Mongoose tocar as coleções —
 * por isso é chamada em main.ts logo após o app ser criado, antes do
 * `app.listen()`. Idempotente: marca conclusão em `migrations` e, mesmo sem
 * o marcador, cada coleção só é reescrita se ainda tiver algum `_id` fora do
 * formato esperado (seguro pra rodar de novo após uma queda no meio do
 * caminho).
 *
 * Devolve `true` só quando alguma coleção foi de fato reescrita nesta
 * chamada — é o sinal que main.ts usa pra decidir se vale rodar
 * `syncIndexes` (o `rename` usado aqui derruba os índices da coleção
 * substituída).
 */
export async function convertIdsToObjectId(
  connection: Connection,
  logger: MinimalLogger,
): Promise<boolean> {
  const db = connection.db;
  if (!db) {
    throw new Error('Conexão Mongo sem `db` — migração de ids não pode rodar.');
  }

  const migrations = db.collection<{ _id: string; completedAt: Date }>(
    'migrations',
  );
  const already = await migrations.findOne({ _id: MIGRATION_ID });
  if (already) return false;

  const [
    users,
    rankings,
    comments,
    follows,
    notifications,
    refreshtokens,
    passwordresettokens,
    albums,
  ] = await Promise.all([
    buildIdMap(db, 'users'),
    buildIdMap(db, 'rankings'),
    buildIdMap(db, 'comments'),
    buildIdMap(db, 'follows'),
    buildIdMap(db, 'notifications'),
    buildIdMap(db, 'refreshtokens'),
    buildIdMap(db, 'passwordresettokens'),
    buildIdMap(db, 'albums'),
  ]);

  const totalPending =
    users.size +
    rankings.size +
    comments.size +
    follows.size +
    notifications.size +
    refreshtokens.size +
    passwordresettokens.size +
    albums.size;

  if (totalPending > 0) {
    logger.log(
      `Migração de ids: iniciando conversão pra ObjectId nativo (${totalPending} documentos pendentes).`,
    );

    await migrateCollection(db, 'users', users, [], logger);
    await migrateCollection(
      db,
      'rankings',
      rankings,
      [{ field: 'userId', map: users }],
      logger,
    );
    await migrateCollection(
      db,
      'comments',
      comments,
      [
        { field: 'rankingId', map: rankings },
        { field: 'authorId', map: users },
      ],
      logger,
    );
    await migrateCollection(
      db,
      'follows',
      follows,
      [
        { field: 'followerId', map: users },
        { field: 'followeeId', map: users },
      ],
      logger,
    );
    await migrateCollection(
      db,
      'notifications',
      notifications,
      [
        { field: 'userId', map: users },
        { field: 'actorId', map: users },
        { field: 'rankingId', map: rankings },
      ],
      logger,
    );
    await migrateCollection(
      db,
      'refreshtokens',
      refreshtokens,
      [{ field: 'userId', map: users }],
      logger,
    );
    await migrateCollection(
      db,
      'passwordresettokens',
      passwordresettokens,
      [{ field: 'userId', map: users }],
      logger,
    );
    await migrateCollection(db, 'albums', albums, [], logger);

    logger.log('Migração de ids: concluída.');
  }

  await migrations.updateOne(
    { _id: MIGRATION_ID },
    { $setOnInsert: { completedAt: new Date() } },
    { upsert: true },
  );

  return totalPending > 0;
}
