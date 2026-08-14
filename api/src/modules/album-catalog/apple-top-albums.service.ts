import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ITUNES_HTTP_CLIENT,
  type ItunesHttpClient,
} from './itunes-http-client';
import {
  APPLE_GENERIC_GENRE_ID,
  APPLE_GENRE_NAMES,
} from './apple-genres.constant';

/**
 * RSS Generator v2 da Apple — público, sem auth, mantido pela própria Apple pra
 * embutir charts em sites de terceiros. Confirmado contra a API real: só
 * `most-played` existe pra `albums` (testados também `new-releases`,
 * `new-music`, `top-albums`, `coming-soon` etc — todos 404) e não há parâmetro
 * de gênero (`?genre=21` é ignorado, devolve o chart inteiro). `limit` máximo
 * aceito é 100 (200 devolve 500).
 */
const chartUrl = (storefront: string) =>
  `https://rss.applemarketingtools.com/api/v2/${storefront}/music/most-played/100/albums.json`;

/**
 * O gênero por item é o único filtro possível (ver acima), então profundidade
 * por gênero só vem de unir lojas: 100 itens por loja e pouca sobreposição
 * entre elas. `br` primeiro porque é o público do produto; o resto cobre os
 * mercados que puxam gêneros diferentes (k-pop/j-pop, latino, europeu).
 */
const STOREFRONTS = ['br', 'us', 'gb', 'mx', 'de', 'jp', 'fr', 'es'];

interface AppleGenreRaw {
  genreId: string;
  name: string;
}

interface AppleAlbumRaw {
  artistName: string;
  name: string;
  releaseDate?: string;
  artworkUrl100: string;
  genres: AppleGenreRaw[];
}

interface AppleChartResponseRaw {
  feed: { results: AppleAlbumRaw[] };
}

export interface ChartAlbumRaw {
  artistName: string;
  name: string;
  releaseDate?: string;
  imageUrl?: string;
  genres: string[];
}

@Injectable()
export class AppleTopAlbumsService {
  private readonly logger = new Logger(AppleTopAlbumsService.name);

  constructor(
    @Inject(ITUNES_HTTP_CLIENT) private readonly http: ItunesHttpClient,
  ) {}

  async fetchChart(): Promise<ChartAlbumRaw[]> {
    const charts = await Promise.all(
      STOREFRONTS.map((storefront) => this.fetchStorefront(storefront)),
    );
    return mergeByRank(charts);
  }

  private async fetchStorefront(storefront: string): Promise<ChartAlbumRaw[]> {
    try {
      const response = await this.http.get<AppleChartResponseRaw>(
        chartUrl(storefront),
      );
      return response.data.feed.results.map((raw) => ({
        artistName: raw.artistName,
        name: raw.name,
        releaseDate: raw.releaseDate,
        // Apple entrega template de 100x100 — trocar o segmento dá a mesma
        // arte em resolução alta, sem chamada extra.
        imageUrl: raw.artworkUrl100?.replace('100x100bb', '600x600bb'),
        genres: primaryGenre(raw.genres),
      }));
    } catch (error) {
      this.logger.warn(
        `Falha ao buscar chart da Apple (${storefront}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}

/**
 * A Apple manda os gêneros do mais específico pro mais largo, e o resto da
 * lista é solto demais pra filtrar: "Teenage Dream" da Katy Perry vem
 * `[Musik, Pop, Rock]` e a Marília Mendonça vem `[Sertanejo, Música, Rock]` —
 * pegar todos punha as duas no filtro de Rock. Só o primeiro (fora a categoria
 * guarda-chuva) é o gênero de verdade do álbum.
 */
function primaryGenre(genres: AppleGenreRaw[]): string[] {
  const main = genres.find((genre) => genre.genreId !== APPLE_GENERIC_GENRE_ID);
  if (!main) return [];
  // fallback pro nome local: id novo no catálogo da Apple ainda filtra, só
  // aparece na língua da loja que o trouxe.
  return [APPLE_GENRE_NAMES[main.genreId] ?? main.name];
}

/**
 * Intercala as lojas por posição (1º de cada loja, depois 2º de cada...) em vez
 * de concatenar: concatenar jogaria o chart inteiro de `br` na frente e o topo
 * global só apareceria depois de 100 itens. Duplicata fica na melhor posição
 * que alcançou, com os gêneros de todas as lojas somados — a mesma obra vem
 * marcada como "Latin" numa loja e "Pop" noutra.
 */
function mergeByRank(charts: ChartAlbumRaw[][]): ChartAlbumRaw[] {
  const merged = new Map<string, ChartAlbumRaw>();
  const deepest = Math.max(0, ...charts.map((chart) => chart.length));

  for (let rank = 0; rank < deepest; rank += 1) {
    for (const chart of charts) {
      const item = chart[rank];
      if (!item) continue;
      const key = `${item.artistName}|${item.name}`.toLowerCase();
      const seen = merged.get(key);
      if (seen) {
        seen.genres = [...new Set([...seen.genres, ...item.genres])];
        continue;
      }
      merged.set(key, { ...item });
    }
  }

  return [...merged.values()];
}
