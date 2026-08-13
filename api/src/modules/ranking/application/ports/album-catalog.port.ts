export interface RankingAlbumTrack {
  spotifyId: string;
  trackNumber: number;
}

export interface RankingAlbumInfo {
  spotifyId: string;
  tracks: RankingAlbumTrack[];
}

/** Único ponto do Album Catalog que o contexto Ranking precisa — permite fake simples nos testes. */
export interface AlbumCatalogPort {
  getAlbum(spotifyId: string): Promise<RankingAlbumInfo | null>;
}
