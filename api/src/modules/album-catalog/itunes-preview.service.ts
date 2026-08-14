import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ITUNES_HTTP_CLIENT,
  type ItunesHttpClient,
} from './itunes-http-client';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
/** iTunes tem limite informal (~20 req/20s por IP) — 1 retry cobre um 403 pontual. */
const RETRY_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ItunesSongResult {
  wrapperType: string;
  kind?: string;
  artistName: string;
  trackName: string;
  previewUrl?: string;
}

interface ItunesSearchResponse {
  results: ItunesSongResult[];
}

@Injectable()
export class ItunesPreviewService {
  private readonly logger = new Logger(ItunesPreviewService.name);

  constructor(
    @Inject(ITUNES_HTTP_CLIENT) private readonly http: ItunesHttpClient,
  ) {}

  /**
   * Spotify parou de mandar `preview_url` pra apps novos (descontinuado nov/2024).
   * Busca de ÁLBUM no iTunes falha pra catálogo de selo grande (ex: "Appetite for
   * Destruction" não aparece na busca por `entity=album`, mesmo existindo no
   * catálogo) — busca por FAIXA (`entity=song`) acha certo e com preview.
   *
   * Buscada sob demanda (um clique = uma faixa), não em lote no carregamento do
   * álbum: evita o rate limit do iTunes de vez em vez de só conter o estouro, e o
   * álbum carrega sem esperar N chamadas externas que a maioria das faixas nunca
   * vai precisar (usuário raramente ouve prévia de todas).
   */
  async fetchPreview(
    artist: string,
    trackName: string,
    isRetry = false,
  ): Promise<string | undefined> {
    try {
      const response = await this.http.get<ItunesSearchResponse>(
        ITUNES_SEARCH_URL,
        {
          params: { term: `${artist} ${trackName}`, entity: 'song', limit: 5 },
        },
      );

      const normalizedArtist = artist.trim().toLowerCase();
      const normalizedTrackName = trackName.trim().toLowerCase();
      const candidates = response.data.results.filter(
        (result) =>
          result.wrapperType === 'track' &&
          result.kind === 'song' &&
          Boolean(result.previewUrl) &&
          result.artistName.toLowerCase().includes(normalizedArtist),
      );

      const exactMatch = candidates.find(
        (result) =>
          result.trackName.trim().toLowerCase() === normalizedTrackName,
      );
      return (exactMatch ?? candidates[0])?.previewUrl;
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status === 403 && !isRetry) {
        await delay(RETRY_DELAY_MS);
        return this.fetchPreview(artist, trackName, true);
      }

      // iTunes fora do ar não pode derrubar o pedido — prévia é bônus.
      this.logger.warn(
        `Falha ao buscar prévia no iTunes para "${artist} - ${trackName}": ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }
}
