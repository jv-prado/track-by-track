export interface SpotifyImage {
  url: string;
}

export interface SpotifyArtist {
  name: string;
}

export interface SpotifyAlbumSummaryRaw {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date?: string;
}

export interface SpotifySearchResponseRaw {
  albums: { items: SpotifyAlbumSummaryRaw[]; total: number };
}

export interface SpotifyTrackRaw {
  id: string;
  name: string;
  duration_ms: number;
  track_number: number;
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

export interface AlbumTrackSummary {
  spotifyId: string;
  name: string;
  durationMs: number;
  trackNumber: number;
}

export interface AlbumDetail extends AlbumSummary {
  tracks: AlbumTrackSummary[];
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

export function normalizeAlbumDetail(raw: SpotifyAlbumDetailRaw): AlbumDetail {
  return {
    ...normalizeAlbumSummary(raw),
    tracks: raw.tracks.items.map((track) => ({
      spotifyId: track.id,
      name: track.name,
      durationMs: track.duration_ms,
      trackNumber: track.track_number,
    })),
  };
}
