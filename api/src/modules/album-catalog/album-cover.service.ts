import { Inject, Injectable, Logger } from '@nestjs/common';
import { AlbumCatalogService } from './album-catalog.service';

export interface AlbumCover {
  body: Buffer;
  contentType: string;
}

/** Hosts de capa do Spotify. Ver `isAllowedCoverUrl`. */
const ALLOWED_HOSTS = ['i.scdn.co', 'image-cdn-ak.spotifycdn.com'];

/**
 * A URL vem do nosso próprio catálogo, mas a checagem de host fica assim mesmo:
 * é a diferença entre "proxy de capa" e "proxy aberto pra qualquer endereço que
 * um dia entre na coleção" (SSRF).
 */
function isAllowedCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.includes(parsed.host);
  } catch {
    return false;
  }
}

/**
 * Serve a capa pelo nosso domínio para o `<canvas>` do card compartilhável
 * poder desenhá-la: imagem de outra origem sem CORS contamina o canvas e
 * `toBlob` passa a estourar `SecurityError` — justamente no celular, que é
 * onde compartilhar importa.
 */
@Injectable()
export class AlbumCoverService {
  private readonly logger = new Logger(AlbumCoverService.name);

  constructor(
    @Inject(AlbumCatalogService)
    private readonly albumCatalog: AlbumCatalogService,
  ) {}

  async getCover(spotifyId: string): Promise<AlbumCover | null> {
    const album = await this.albumCatalog.getAlbum(spotifyId);
    const url = album?.imageUrl ?? album?.imageUrlSmall;
    if (!url || !isAllowedCoverUrl(url)) return null;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return {
        body: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') ?? 'image/jpeg',
      };
    } catch (error) {
      this.logger.warn(
        `Falha ao buscar capa de ${spotifyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
