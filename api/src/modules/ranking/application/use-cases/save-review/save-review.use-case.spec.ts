import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { SaveReviewUseCase } from './save-review.use-case';
import { CreateOrGetRankingUseCase } from '../create-or-get-ranking/create-or-get-ranking.use-case';
import { InMemoryRankingRepository } from '../test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from '../test-support/fake-album-catalog';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';
import { TrackNotInAlbumError } from '../../../domain/errors/track-not-in-album.error';

describe('SaveReviewUseCase', () => {
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

    const useCase = new SaveReviewUseCase(rankings, new FakeCacheInvalidator());
    return { useCase, rankingId: created.ranking.id };
  }

  it('salva review com faixa favorita válida', async () => {
    const { useCase, rankingId } = await setup();

    const output = await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      text: 'Muito bom',
      favoriteTrackId: 't1',
    });

    expect(output.review).toEqual({ text: 'Muito bom', favoriteTrackId: 't1' });
  });

  it('salva favorita e pior faixa em chamadas separadas sem uma apagar a outra', async () => {
    const { useCase, rankingId } = await setup();

    await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      favoriteTrackId: 't1',
    });
    const output = await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      text: 'ainda bom',
    });

    expect(output.review).toEqual({ text: 'ainda bom', favoriteTrackId: 't1' });
  });

  it('null limpa o campo explicitamente; undefined (ausente) não mexe', async () => {
    const { useCase, rankingId } = await setup();

    await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      text: 'Muito bom',
      favoriteTrackId: 't1',
    });
    const output = await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      favoriteTrackId: null,
    });

    expect(output.review).toEqual({ text: 'Muito bom' });
  });

  it('rejeita faixa favorita que não pertence ao álbum', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({
        rankingId,
        requestingUserId: 'user-1',
        favoriteTrackId: 'faixa-inexistente',
      }),
    ).rejects.toThrow(TrackNotInAlbumError);
  });

  it('rejeita edição de review de outro usuário', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({
        rankingId,
        requestingUserId: 'outro-usuario',
        text: 'hack',
      }),
    ).rejects.toThrow(RankingForbiddenError);
  });
});
