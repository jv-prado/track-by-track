import {
  AlbumCatalogPort,
  RankingAlbumInfo,
} from '../../ports/album-catalog.port';

export class FakeAlbumCatalog implements AlbumCatalogPort {
  private readonly albums = new Map<string, RankingAlbumInfo>();

  seed(album: RankingAlbumInfo): void {
    this.albums.set(album.spotifyId, album);
  }

  getAlbum(spotifyId: string): Promise<RankingAlbumInfo | null> {
    return Promise.resolve(this.albums.get(spotifyId) ?? null);
  }
}
