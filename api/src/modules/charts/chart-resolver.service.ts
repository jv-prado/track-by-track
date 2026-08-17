import { Inject, Injectable } from '@nestjs/common';
import { AlbumCatalogService } from '../album-catalog/album-catalog.service';
import type { AlbumSummary } from '../album-catalog/spotify-normalizer';
import { matchScore, MATCH_THRESHOLD } from './chart-album-matcher';

export interface ChartResolveInput {
  name: string;
  artist: string;
}

/** Fatia mínima de `AlbumCatalogService` que o resolver precisa — fake simples nos testes. */
export interface ChartResolver {
  resolve(item: ChartResolveInput): Promise<string | null>;
}

/**
 * Resolve item de chart externo (sem spotifyId) pro catálogo (spec §6).
 * Usa `AlbumCatalogService.searchSpotifyOnly` — não o `search()` de UI —
 * porque o atalho de índice local do `search()` casa qualquer termo em comum
 * ("Drake Take Care" batia em "Boy Harsher · Careful" só por "care") e nunca
 * chegava a consultar o Spotify de verdade (confirmado na prática: 1ª leva
 * do sync do Billboard). Entre os candidatos devolvidos, pega o de maior
 * score (nunca o primeiro cego, spec §6 passo 3); abaixo do threshold,
 * `null` — quem chama marca como `unresolved`, nunca fabrica álbum a partir
 * de um chart.
 */
@Injectable()
export class ChartResolverService implements ChartResolver {
  constructor(
    @Inject(AlbumCatalogService)
    private readonly albumCatalog: AlbumCatalogService,
  ) {}

  async resolve(item: ChartResolveInput): Promise<string | null> {
    const { items } = await this.albumCatalog
      .searchSpotifyOnly(`${item.artist} ${item.name}`, 5)
      .catch(() => ({ items: [] as AlbumSummary[] }));

    let best: { spotifyId: string; score: number } | null = null;
    for (const candidate of items) {
      const score = matchScore(item, candidate);
      if (!best || score > best.score) {
        best = { spotifyId: candidate.spotifyId, score };
      }
    }

    if (!best || best.score < MATCH_THRESHOLD) return null;
    return best.spotifyId;
  }
}
