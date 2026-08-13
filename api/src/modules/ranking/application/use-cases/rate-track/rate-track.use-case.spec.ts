import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { RateTrackUseCase } from './rate-track.use-case';
import { CreateOrGetRankingUseCase } from '../create-or-get-ranking/create-or-get-ranking.use-case';
import { InMemoryRankingRepository } from '../test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from '../test-support/fake-album-catalog';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';
import { TrackNotInAlbumError } from '../../../domain/errors/track-not-in-album.error';

describe('RateTrackUseCase', () => {
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

    const useCase = new RateTrackUseCase(rankings, new FakeCacheInvalidator());
    return { useCase, rankingId: created.ranking.id };
  }

  it('avalia uma faixa com sucesso', async () => {
    const { useCase, rankingId } = await setup();

    const output = await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      trackId: 't1',
      score: 4,
    });

    expect(output.entries.find((e) => e.trackId === 't1')?.score).toBe(4);
  });

  it('lança RankingNotFoundError para ranking inexistente', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({
        rankingId: 'id-que-nao-existe',
        requestingUserId: 'user-1',
        trackId: 't1',
        score: 4,
      }),
    ).rejects.toThrow(RankingNotFoundError);
  });

  it('lança RankingForbiddenError se outro usuário tentar avaliar', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({
        rankingId,
        requestingUserId: 'outro-usuario',
        trackId: 't1',
        score: 4,
      }),
    ).rejects.toThrow(RankingForbiddenError);
  });

  it('lança TrackNotInAlbumError para faixa que não pertence ao álbum', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({
        rankingId,
        requestingUserId: 'user-1',
        trackId: 'faixa-de-outro-album',
        score: 4,
      }),
    ).rejects.toThrow(TrackNotInAlbumError);
  });
});
