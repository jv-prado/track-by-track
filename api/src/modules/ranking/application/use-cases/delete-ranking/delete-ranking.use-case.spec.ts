import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { DeleteRankingUseCase } from './delete-ranking.use-case';
import { CreateOrGetRankingUseCase } from '../create-or-get-ranking/create-or-get-ranking.use-case';
import { InMemoryRankingRepository } from '../test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from '../test-support/fake-album-catalog';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';

describe('DeleteRankingUseCase', () => {
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
      useCase: new DeleteRankingUseCase(rankings, new FakeCacheInvalidator()),
      rankings,
      rankingId: created.ranking.id,
    };
  }

  it('apaga o ranking do dono', async () => {
    const { useCase, rankings, rankingId } = await setup();

    await useCase.execute({ rankingId, requestingUserId: 'user-1' });

    expect(await rankings.findById(rankingId)).toBeNull();
  });

  it('rejeita apagar ranking de outro usuário', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({ rankingId, requestingUserId: 'outro-usuario' }),
    ).rejects.toThrow(RankingForbiddenError);
  });

  it('lança RankingNotFoundError para ranking inexistente', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({
        rankingId: 'id-que-nao-existe',
        requestingUserId: 'user-1',
      }),
    ).rejects.toThrow(RankingNotFoundError);
  });
});
