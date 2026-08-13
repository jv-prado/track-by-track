import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { ResetRankingUseCase } from './reset-ranking.use-case';
import { CreateOrGetRankingUseCase } from '../create-or-get-ranking/create-or-get-ranking.use-case';
import { RateTrackUseCase } from '../rate-track/rate-track.use-case';
import { InMemoryRankingRepository } from '../test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from '../test-support/fake-album-catalog';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';

describe('ResetRankingUseCase', () => {
  async function setup() {
    const rankings = new InMemoryRankingRepository();
    const albumCatalog = new FakeAlbumCatalog();
    albumCatalog.seed({
      spotifyId: 'album-1',
      tracks: [
        { spotifyId: 't1', trackNumber: 1 },
        { spotifyId: 't2', trackNumber: 2 },
      ],
    });

    const created = await new CreateOrGetRankingUseCase(
      rankings,
      albumCatalog,
      new FakeCacheInvalidator(),
    ).execute({
      userId: 'user-1',
      albumId: 'album-1',
    });
    await new RateTrackUseCase(rankings, new FakeCacheInvalidator()).execute({
      rankingId: created.ranking.id,
      requestingUserId: 'user-1',
      trackId: 't1',
      score: 5,
    });

    return {
      useCase: new ResetRankingUseCase(rankings, new FakeCacheInvalidator()),
      rankingId: created.ranking.id,
    };
  }

  it('zera todas as notas mantendo o ranking', async () => {
    const { useCase, rankingId } = await setup();

    const output = await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
    });

    expect(output.entries.every((e) => e.score === 0)).toBe(true);
    expect(output.averageScore).toBe(0);
    expect(output.progress.percentage).toBe(0);
  });

  it('rejeita reset por outro usuário', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({ rankingId, requestingUserId: 'outro-usuario' }),
    ).rejects.toThrow(RankingForbiddenError);
  });
});
