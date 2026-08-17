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
 * entre elas. `br` cobre o público do produto; o resto cobre mercados que
 * puxam gêneros diferentes (k-pop/j-pop, latino, europeu). A ordem aqui não
 * decide rank nenhum — `mergeByRank` usa a posição real em cada loja, não a
 * ordem deste array (ver comentário lá).
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
 * Pior posição possível numa loja de 100 — usada como penalidade pra loja
 * onde o álbum nem aparece. Sem isso, um álbum #1 numa loja só (ausente nas
 * outras 7) empataria ou ganharia de um álbum #2 em todas as 8 — a penalidade
 * é o que faz presença ampla pesar mais que um pico isolado.
 */
const ABSENT_PENALTY_RANK = 101;

interface MergeEntry {
  item: ChartAlbumRaw;
  rankSum: number;
  appearances: number;
}

/**
 * Rank médio do álbum através das 8 lojas (Borda count), não "quem entra
 * primeiro no array de lojas vence": a implementação antiga intercalava
 * posição por posição e o primeiro item inserido no Map ficava com o #1
 * global pra sempre — na prática, o #1 da primeira loja do array (`br`)
 * sempre vencia o #1 de qualquer outra loja, mesmo que a outra fosse mais
 * disputada. Aqui cada loja em que o álbum NÃO aparece conta como
 * `ABSENT_PENALTY_RANK` (pior que qualquer posição real) — a média final
 * reflete desempenho pelas 8 lojas, não a ordem em que foram lidas. Gêneros
 * de todas as lojas em que aparece são somados — a mesma obra vem marcada
 * como "Latin" numa loja e "Pop" noutra.
 */
export function mergeByRank(charts: ChartAlbumRaw[][]): ChartAlbumRaw[] {
  const merged = new Map<string, MergeEntry>();

  for (const chart of charts) {
    chart.forEach((item, index) => {
      const key = `${item.artistName}|${item.name}`.toLowerCase();
      const rank = index + 1;
      const existing = merged.get(key);
      if (existing) {
        existing.rankSum += rank;
        existing.appearances += 1;
        existing.item.genres = [
          ...new Set([...existing.item.genres, ...item.genres]),
        ];
        return;
      }
      merged.set(key, { item: { ...item }, rankSum: rank, appearances: 1 });
    });
  }

  const storeCount = charts.length;
  return [...merged.values()]
    .map((entry) => {
      const missingStores = storeCount - entry.appearances;
      const averageRank =
        (entry.rankSum + missingStores * ABSENT_PENALTY_RANK) / storeCount;
      return { item: entry.item, averageRank };
    })
    .sort((a, b) => a.averageRank - b.averageRank)
    .map(({ item }) => item);
}
