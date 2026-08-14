import 'dotenv/config';
import axios from 'axios';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { AlbumCatalogService } from '../src/modules/album-catalog/album-catalog.service';
import type { AlbumDetail } from '../src/modules/album-catalog/spotify-normalizer';
import { AlbumSchemaClass } from '../src/modules/album-catalog/album.schema';
import { RankingSchemaClass } from '../src/modules/ranking/infrastructure/persistence/ranking.schema';

/**
 * Backfill de `albums` pra rankings que referenciam um `albumId` nunca resolvido
 * pelo Album Catalog (típico de rankings migrados na fase 7, importados direto
 * do Firestore em dry-run). Sem isso a capa só aparece na primeira vez que o
 * álbum passa pelo fallback lazy do Discovery (`resolveMissingAlbums` em
 * discovery.service.ts) — este script só adianta esse preenchimento em vez de
 * esperar tráfego real bater em cada álbum.
 *
 * Usa `AlbumCatalogService.getAlbum()` (mesmo caminho da rota HTTP) em vez de
 * bater no Spotify direto, então o registro gravado sai completo — faixas,
 * prévias do iTunes, `imageUrlSmall` — e não fica um cache incompleto por 7
 * dias (TTL do Album Catalog) até alguém abrir a tela de álbum.
 *
 * Idempotente: só busca `albumId` que ainda não está em `albums`, então rodar
 * de novo depois de um 429 retoma exatamente de onde parou.
 *
 * Uso: npx tsx scripts/backfill-missing-albums.ts [--dry-run] [--concurrency=2]
 */
const DRY_RUN = process.argv.includes('--dry-run');
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='));
// Client Credentials do Spotify tem rate limit agressivo pra rajada — 5
// workers em paralelo bateu 429 em ~1000 chamadas na primeira tentativa.
const CONCURRENCY = concurrencyArg ? Number(concurrencyArg.split('=')[1]) : 2;
const MAX_RETRIES_PER_ALBUM = 6;
// Espaçamento mínimo entre chamadas de um mesmo worker, além do retry — reduz
// a chance de reencostar no limite mesmo depois de um backoff bem-sucedido.
const REQUEST_SPACING_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  const header = error.response?.headers?.['retry-after'];
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

function isRateLimited(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 429;
}

async function getAlbumWithRetry(
  albumCatalog: AlbumCatalogService,
  id: string,
): Promise<AlbumDetail | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await albumCatalog.getAlbum(id);
    } catch (error) {
      if (!isRateLimited(error) || attempt >= MAX_RETRIES_PER_ALBUM) throw error;
      // Backoff exponencial (1s, 2s, 4s, ...) como piso; usa o `Retry-After`
      // do Spotify quando ele manda, que costuma ser mais preciso.
      const waitMs = Math.max(retryAfterMs(error) ?? 0, 1000 * 2 ** attempt);
      console.log(
        `  429 em ${id} — aguardando ${Math.round(waitMs / 1000)}s (tentativa ${attempt + 1}/${MAX_RETRIES_PER_ALBUM})`,
      );
      await sleep(waitMs);
    }
  }
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const albumCatalog = app.get(AlbumCatalogService);
    const albumModel = app.get<Model<AlbumSchemaClass>>(
      getModelToken(AlbumSchemaClass.name),
    );
    const rankingModel = app.get<Model<RankingSchemaClass>>(
      getModelToken(RankingSchemaClass.name),
    );

    const [distinctIds, cachedIds] = await Promise.all([
      rankingModel.distinct('albumId').exec() as Promise<string[]>,
      albumModel.distinct('spotifyId').exec() as Promise<string[]>,
    ]);
    const cached = new Set(cachedIds);
    const missing = distinctIds.filter((id) => !cached.has(id));

    console.log(
      `rankings referenciam ${distinctIds.length} álbuns distintos · ${missing.length} sem cache`,
    );

    if (DRY_RUN) {
      console.log('--dry-run: nada será buscado no Spotify');
      console.log('amostra:', missing.slice(0, 5));
      return;
    }
    if (missing.length === 0) {
      console.log('nada a fazer.');
      return;
    }

    let done = 0;
    let ok = 0;
    let notFound = 0;
    let failed = 0;

    async function worker(queue: string[]): Promise<void> {
      for (const id of queue) {
        try {
          const album = await getAlbumWithRetry(albumCatalog, id);
          if (album) ok++;
          else notFound++;
        } catch (error) {
          failed++;
          console.error(`falhou ${id}:`, error instanceof Error ? error.message : error);
        }
        done++;
        if (done % 50 === 0 || done === missing.length) {
          console.log(`${done}/${missing.length}`);
        }
        await sleep(REQUEST_SPACING_MS);
      }
    }

    // Fila dividida em N workers concorrentes — respeita rate limit do Spotify
    // sem serializar tudo numa chamada de cada vez.
    const queues: string[][] = Array.from({ length: CONCURRENCY }, () => []);
    missing.forEach((id, i) => queues[i % CONCURRENCY]!.push(id));
    await Promise.all(queues.map(worker));

    console.log(
      `concluído: ${ok} resolvidos · ${notFound} não encontrados no Spotify · ${failed} falharam`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
