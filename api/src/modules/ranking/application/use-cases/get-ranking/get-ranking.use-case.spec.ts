import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { GetRankingUseCase } from './get-ranking.use-case';
import { CreateOrGetRankingUseCase } from '../create-or-get-ranking/create-or-get-ranking.use-case';
import { InMemoryRankingRepository } from '../test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from '../test-support/fake-album-catalog';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';

describe('GetRankingUseCase', () => {
  async function setup() {
    const rankings = new InMemoryRankingRepository();
    const albumCatalog = new FakeAlbumCatalog();
    albumCatalog.seed({
      spotifyId: 'album-1',
      tracks: [{ spotifyId: 't1', trackNumber: 1 }],
    });
    const created = await new CreateOrGetRankingUseCase(
      rankings,
      albumCatalog,
      new FakeCacheInvalidator(),
    ).execute({
      userId: 'user-1',
      albumId: 'album-1',
    });
    return {
      useCase: new GetRankingUseCase(rankings),
      rankingId: created.ranking.id,
    };
  }

  it('busca por id', async () => {
    const { useCase, rankingId } = await setup();
    const view = await useCase.byId(rankingId);
    expect(view.id).toBe(rankingId);
  });

  it('busca por usuário + álbum', async () => {
    const { useCase } = await setup();
    const view = await useCase.byUserAndAlbum('user-1', 'album-1');
    expect(view.albumId).toBe('album-1');
  });

  it('lança RankingNotFoundError quando não existe', async () => {
    const { useCase } = await setup();
    await expect(useCase.byId('id-que-nao-existe')).rejects.toThrow(
      RankingNotFoundError,
    );
    await expect(
      useCase.byUserAndAlbum('user-1', 'outro-album'),
    ).rejects.toThrow(RankingNotFoundError);
  });
});
