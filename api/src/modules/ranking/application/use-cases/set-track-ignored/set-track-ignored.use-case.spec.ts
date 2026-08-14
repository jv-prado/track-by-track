import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { SetTrackIgnoredUseCase } from './set-track-ignored.use-case';
import { CreateOrGetRankingUseCase } from '../create-or-get-ranking/create-or-get-ranking.use-case';
import { InMemoryRankingRepository } from '../test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from '../test-support/fake-album-catalog';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';
import { TrackNotInAlbumError } from '../../../domain/errors/track-not-in-album.error';

describe('SetTrackIgnoredUseCase', () => {
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

    const useCase = new SetTrackIgnoredUseCase(
      rankings,
      new FakeCacheInvalidator(),
    );
    return { useCase, rankings, rankingId: created.ranking.id };
  }

  it('marca uma faixa como ignorada, excluindo-a da média', async () => {
    const { useCase, rankingId } = await setup();

    const output = await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      trackId: 't1',
      ignored: true,
    });

    expect(output.entries.find((e) => e.trackId === 't1')?.ignored).toBe(true);
    expect(output.progress).toEqual({
      rated: 0,
      total: 1,
      ignored: 1,
      percentage: 0,
    });
  });

  it('desfaz o ignore de uma faixa', async () => {
    const { useCase, rankingId } = await setup();
    await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      trackId: 't1',
      ignored: true,
    });

    const output = await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      trackId: 't1',
      ignored: false,
    });

    expect(output.entries.find((e) => e.trackId === 't1')?.ignored).toBe(false);
  });

  it('lança RankingNotFoundError para ranking inexistente', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({
        rankingId: 'id-que-nao-existe',
        requestingUserId: 'user-1',
        trackId: 't1',
        ignored: true,
      }),
    ).rejects.toThrow(RankingNotFoundError);
  });

  it('lança RankingForbiddenError se outro usuário tentar ignorar', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({
        rankingId,
        requestingUserId: 'outro-usuario',
        trackId: 't1',
        ignored: true,
      }),
    ).rejects.toThrow(RankingForbiddenError);
  });

  it('mantém o ranking no banco quando a única marcação é um ignore', async () => {
    const { useCase, rankings, rankingId } = await setup();

    await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      trackId: 't1',
      ignored: true,
    });

    // Ignorar é conteúdo do usuário: sem isto o ranking sumia e o próximo
    // request sobre o mesmo rankingId virava 404.
    await expect(rankings.findById(rankingId)).resolves.not.toBeNull();
  });

  it('apaga o ranking quando o último ignore é desfeito e não há nota nem review', async () => {
    const { useCase, rankings, rankingId } = await setup();
    await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      trackId: 't1',
      ignored: true,
    });

    await useCase.execute({
      rankingId,
      requestingUserId: 'user-1',
      trackId: 't1',
      ignored: false,
    });

    await expect(rankings.findById(rankingId)).resolves.toBeNull();
  });

  it('lança TrackNotInAlbumError para faixa que não pertence ao álbum', async () => {
    const { useCase, rankingId } = await setup();

    await expect(
      useCase.execute({
        rankingId,
        requestingUserId: 'user-1',
        trackId: 'faixa-de-outro-album',
        ignored: true,
      }),
    ).rejects.toThrow(TrackNotInAlbumError);
  });
});
