import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { CreateOrGetRankingUseCase } from './create-or-get-ranking.use-case';
import { InMemoryRankingRepository } from '../test-support/in-memory-ranking.repository';
import { FakeAlbumCatalog } from '../test-support/fake-album-catalog';
import { AlbumNotFoundError } from '../../../../album-catalog/errors/album-not-found.error';

describe('CreateOrGetRankingUseCase', () => {
  function setup() {
    const rankings = new InMemoryRankingRepository();
    const albumCatalog = new FakeAlbumCatalog();
    albumCatalog.seed({
      spotifyId: 'album-1',
      tracks: [
        { spotifyId: 't1', trackNumber: 1 },
        { spotifyId: 't2', trackNumber: 2 },
      ],
    });
    const useCase = new CreateOrGetRankingUseCase(
      rankings,
      albumCatalog,
      new FakeCacheInvalidator(),
    );
    return { useCase, rankings };
  }

  it('cria um ranking novo com todas as faixas do álbum zeradas', async () => {
    const { useCase } = setup();

    const output = await useCase.execute({
      userId: 'user-1',
      albumId: 'album-1',
    });

    expect(output.created).toBe(true);
    expect(output.ranking.entries).toHaveLength(2);
    expect(output.ranking.entries.every((e) => e.score === 0)).toBe(true);
  });

  it('retorna o ranking existente sem criar outro na segunda chamada', async () => {
    const { useCase } = setup();

    const first = await useCase.execute({
      userId: 'user-1',
      albumId: 'album-1',
    });
    const second = await useCase.execute({
      userId: 'user-1',
      albumId: 'album-1',
    });

    expect(second.created).toBe(false);
    expect(second.ranking.id).toBe(first.ranking.id);
  });

  it('sob criação concorrente, devolve o mesmo ranking em vez de estourar conflito', async () => {
    const { useCase, rankings } = setup();

    // Duplo clique em "avaliar álbum" ou duas abas abertas: as duas passam pelo
    // findByUserAndAlbum antes de qualquer save. Antes do fix, a segunda batia
    // no índice único e virava 500 INTERNAL_ERROR.
    const [first, second] = await Promise.all([
      useCase.execute({ userId: 'user-1', albumId: 'album-1' }),
      useCase.execute({ userId: 'user-1', albumId: 'album-1' }),
    ]);

    expect(first.ranking.id).toBe(second.ranking.id);
    expect([first.created, second.created].filter(Boolean)).toHaveLength(1);
    await expect(
      rankings.findByUserAndAlbum('user-1', 'album-1'),
    ).resolves.not.toBeNull();
  });

  it('lança AlbumNotFoundError quando o álbum não existe no catálogo', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: 'user-1', albumId: 'album-que-nao-existe' }),
    ).rejects.toThrow(AlbumNotFoundError);
  });
});
