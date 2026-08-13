import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * Backfill de `imageUrlSmall` nos álbuns que já estavam em cache antes do campo
 * existir. O CDN do Spotify usa o mesmo id de imagem com um prefixo por tamanho,
 * então dá para derivar a de 300px da de 640px sem chamar a API.
 *
 * Idempotente: só toca documento sem `imageUrlSmall`. Quem não casar com o
 * prefixo de 640 fica como está — a projeção do Discovery já cai no `$ifNull`.
 *
 * Uso:  npx tsx scripts/backfill-album-image-small.ts [--dry-run]
 */
const SPOTIFY_640_PREFIX = 'ab67616d0000b273';
const SPOTIFY_300_PREFIX = 'ab67616d00001e02';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI não definido');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const albums = mongoose.connection.collection('albums');

  const filter = {
    imageUrlSmall: { $exists: false },
    imageUrl: { $regex: SPOTIFY_640_PREFIX },
  };
  const [total, pending, sample] = await Promise.all([
    albums.countDocuments({}),
    albums.countDocuments(filter),
    albums.find(filter).limit(3).toArray(),
  ]);

  console.log(
    `álbuns: ${total} · sem imageUrlSmall com capa 640px: ${pending}`,
  );
  sample.forEach((doc) => {
    const from = String(doc.imageUrl);
    console.log(
      `  ${String(doc.name)}\n    ${from}\n    -> ${from.replace(SPOTIFY_640_PREFIX, SPOTIFY_300_PREFIX)}`,
    );
  });

  if (dryRun) {
    console.log('--dry-run: nada foi escrito');
  } else {
    const result = await albums.updateMany(filter, [
      {
        $set: {
          imageUrlSmall: {
            $replaceOne: {
              input: '$imageUrl',
              find: SPOTIFY_640_PREFIX,
              replacement: SPOTIFY_300_PREFIX,
            },
          },
        },
      },
    ]);
    console.log(`atualizados: ${result.modifiedCount}`);
  }

  await mongoose.disconnect();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
