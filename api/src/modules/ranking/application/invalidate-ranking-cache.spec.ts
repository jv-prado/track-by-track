import { RateTrackUseCase } from './use-cases/rate-track/rate-track.use-case';
import { SaveReviewUseCase } from './use-cases/save-review/save-review.use-case';
import { ResetRankingUseCase } from './use-cases/reset-ranking/reset-ranking.use-case';
import { DeleteRankingUseCase } from './use-cases/delete-ranking/delete-ranking.use-case';
import { CreateOrGetRankingUseCase } from './use-cases/create-or-get-ranking/create-or-get-ranking.use-case';
import { InMemoryRankingRepository } from './use-cases/test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from './use-cases/test-support/fake-album-catalog';
import { FakeCacheInvalidator } from '../../../shared/application/ports/fake-cache-invalidator';

const USER = 'user-1';
const ALBUM = 'album-1';

async function setup() {
  const rankings = new InMemoryRankingRepository();
  const albumCatalog = new FakeAlbumCatalog();
  albumCatalog.seed({
    spotifyId: ALBUM,
    tracks: [
      { spotifyId: 't1', trackNumber: 1 },
      { spotifyId: 't2', trackNumber: 2 },
    ],
  });
  const cache = new FakeCacheInvalidator();

  const created = await new CreateOrGetRankingUseCase(
    rankings,
    albumCatalog,
    cache,
  ).execute({ userId: USER, albumId: ALBUM });

  return { rankings, cache, rankingId: created.ranking.id };
}

/** Duas faixas: avaliar as duas fecha o ranking (entra no feed). */
async function rateAll(
  useCase: RateTrackUseCase,
  rankingId: string,
): Promise<void> {
  for (const trackId of ['t1', 't2']) {
    await useCase.execute({
      rankingId,
      requestingUserId: USER,
      trackId,
      score: 4,
    });
  }
}

describe('invalidação de cache do ranking', () => {
  it('criar ranking não mexe em listagem pública', async () => {
    const { cache } = await setup();

    expect(cache.publicRankings).toHaveLength(0);
    expect(cache.rankings).toEqual([{ albumId: ALBUM, userId: USER }]);
  });

  it('avaliar faixa de ranking incompleto NÃO invalida o feed', async () => {
    const { rankings, cache, rankingId } = await setup();
    const rateTrack = new RateTrackUseCase(rankings, cache);

    await rateTrack.execute({
      rankingId,
      requestingUserId: USER,
      trackId: 't1',
      score: 5,
    });

    expect(cache.publicRankings).toHaveLength(0);
    expect(cache.rankings).toHaveLength(2); // criação + esta nota
  });

  it('completar o ranking invalida o feed', async () => {
    const { rankings, cache, rankingId } = await setup();
    const rateTrack = new RateTrackUseCase(rankings, cache);

    await rateAll(rateTrack, rankingId);

    expect(cache.publicRankings).toEqual([{ albumId: ALBUM, userId: USER }]);
  });

  it('trocar nota de ranking já completo invalida o feed (média exibida muda)', async () => {
    const { rankings, cache, rankingId } = await setup();
    const rateTrack = new RateTrackUseCase(rankings, cache);
    await rateAll(rateTrack, rankingId);
    const publicBumps = cache.publicRankings.length;

    await rateTrack.execute({
      rankingId,
      requestingUserId: USER,
      trackId: 't1',
      score: 1,
    });

    expect(cache.publicRankings.length).toBe(publicBumps + 1);
  });

  it('salvar review de ranking completo invalida as reviews do álbum', async () => {
    const { rankings, cache, rankingId } = await setup();
    await rateAll(new RateTrackUseCase(rankings, cache), rankingId);
    const publicBumps = cache.publicRankings.length;

    await new SaveReviewUseCase(rankings, cache).execute({
      rankingId,
      requestingUserId: USER,
      text: 'disco do ano',
    });

    expect(cache.publicRankings.length).toBe(publicBumps + 1);
  });

  it('resetar ranking completo invalida o feed (sai da listagem)', async () => {
    const { rankings, cache, rankingId } = await setup();
    await rateAll(new RateTrackUseCase(rankings, cache), rankingId);
    const publicBumps = cache.publicRankings.length;

    await new ResetRankingUseCase(rankings, cache).execute({
      rankingId,
      requestingUserId: USER,
    });

    expect(cache.publicRankings.length).toBe(publicBumps + 1);
  });

  it('apagar ranking invalida o feed', async () => {
    const { rankings, cache, rankingId } = await setup();

    await new DeleteRankingUseCase(rankings, cache).execute({
      rankingId,
      requestingUserId: USER,
    });

    expect(cache.publicRankings).toEqual([{ albumId: ALBUM, userId: USER }]);
  });
});
