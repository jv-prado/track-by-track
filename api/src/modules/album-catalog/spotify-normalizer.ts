export interface SpotifyImage {
  url: string;
}

export interface SpotifyArtist {
  /** Ausente em fixtures antigas de teste — gênero só é buscado quando presente. */
  id?: string;
  name: string;
}

export interface SpotifyArtistGenresRaw {
  id: string;
  genres: string[];
}

export interface SpotifySeveralArtistsResponseRaw {
  artists: SpotifyArtistGenresRaw[];
}

export interface SpotifyAlbumSummaryRaw {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date?: string;
  /** 'album' | 'single' | 'compilation' — usado só pra filtrar singles da busca. */
  album_type?: string;
}

export interface SpotifySearchResponseRaw {
  albums: { items: SpotifyAlbumSummaryRaw[]; total: number };
}

export interface SpotifyTrackRaw {
  id: string;
  name: string;
  duration_ms: number;
  track_number: number;
  preview_url?: string | null;
}

export interface SpotifyAlbumDetailRaw extends SpotifyAlbumSummaryRaw {
  tracks: { items: SpotifyTrackRaw[] };
}

export interface AlbumSummary {
  spotifyId: string;
  name: string;
  artist: string;
  /** 640px — usado só onde a capa aparece grande (detalhe do álbum). */
  imageUrl?: string;
  /** 300px — o que os grids consomem: mesma capa por ~1/4 dos bytes. */
  imageUrlSmall?: string;
  releaseDate?: string;
}

export interface RecentRelease extends AlbumSummary {
  /**
   * Tags cruas de artista do Spotify ("brazilian hip hop", "sertanejo
   * universitário"...). Quem consome mapeia pras categorias curadas — ver
   * `mapToCuratedGenres`.
   */
  genres: string[];
}

export interface AlbumTrackSummary {
  spotifyId: string;
  name: string;
  durationMs: number;
  trackNumber: number;
  /** 30s de prévia da Spotify — nem toda faixa tem. */
  previewUrl?: string;
}

export interface AlbumDetail extends AlbumSummary {
  tracks: AlbumTrackSummary[];
  /**
   * Gêneros dos artistas do álbum — Spotify não expõe gênero no próprio álbum,
   * só no artista. Opcional: só existe quando quem chamou `normalizeAlbumDetail`
   * já resolveu os artistas (ver `SpotifyClientService.getAlbumWithTracks`).
   */
  genres?: string[];
}

export function normalizeAlbumSummary(
  raw: SpotifyAlbumSummaryRaw,
): AlbumSummary {
  return {
    spotifyId: raw.id,
    name: raw.name,
    artist: raw.artists.map((artist) => artist.name).join(', '),
    imageUrl: raw.images[0]?.url,
    // Spotify devolve [640, 300, 64]; o do meio é o que o card precisa
    imageUrlSmall: raw.images[1]?.url ?? raw.images[0]?.url,
    releaseDate: raw.release_date,
  };
}

export function normalizeAlbumDetail(
  raw: SpotifyAlbumDetailRaw,
  genres?: string[],
): AlbumDetail {
  return {
    ...normalizeAlbumSummary(raw),
    ...(genres ? { genres } : {}),
    tracks: raw.tracks.items.map((track) => ({
      spotifyId: track.id,
      name: track.name,
      durationMs: track.duration_ms,
      trackNumber: track.track_number,
      previewUrl: track.preview_url ?? undefined,
    })),
  };
}
