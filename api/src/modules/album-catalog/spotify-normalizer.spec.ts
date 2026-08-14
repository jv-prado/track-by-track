import {
  normalizeAlbumDetail,
  normalizeAlbumSummary,
} from './spotify-normalizer';

describe('spotify-normalizer', () => {
  it('normaliza um resumo de álbum, juntando artistas e separando os dois tamanhos de capa', () => {
    const summary = normalizeAlbumSummary({
      id: 'abc123',
      name: 'The Suffering',
      artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
      images: [
        { url: 'https://img/large.jpg' },
        { url: 'https://img/small.jpg' },
      ],
      release_date: '2024-01-01',
    });

    expect(summary).toEqual({
      spotifyId: 'abc123',
      name: 'The Suffering',
      artist: 'Artist A, Artist B',
      imageUrl: 'https://img/large.jpg',
      imageUrlSmall: 'https://img/small.jpg',
      releaseDate: '2024-01-01',
    });
  });

  it('usa a capa grande como small quando o Spotify manda um tamanho só', () => {
    const summary = normalizeAlbumSummary({
      id: 'abc123',
      name: 'The Suffering',
      artists: [{ name: 'Artist A' }],
      images: [{ url: 'https://img/large.jpg' }],
    });

    expect(summary.imageUrlSmall).toBe('https://img/large.jpg');
  });

  it('lida com álbum sem imagem', () => {
    const summary = normalizeAlbumSummary({
      id: 'abc123',
      name: 'The Suffering',
      artists: [{ name: 'Artist A' }],
      images: [],
    });

    expect(summary.imageUrl).toBeUndefined();
    expect(summary.imageUrlSmall).toBeUndefined();
  });

  it('normaliza detalhes do álbum incluindo faixas', () => {
    const detail = normalizeAlbumDetail({
      id: 'abc123',
      name: 'The Suffering',
      artists: [{ name: 'Artist A' }],
      images: [{ url: 'https://img/large.jpg' }],
      release_date: '2024-01-01',
      tracks: {
        items: [
          { id: 't1', name: 'Track One', duration_ms: 180000, track_number: 1 },
          { id: 't2', name: 'Track Two', duration_ms: 200000, track_number: 2 },
        ],
      },
    });

    expect(detail.tracks).toEqual([
      {
        spotifyId: 't1',
        name: 'Track One',
        durationMs: 180000,
        trackNumber: 1,
      },
      {
        spotifyId: 't2',
        name: 'Track Two',
        durationMs: 200000,
        trackNumber: 2,
      },
    ]);
  });

  it('sem gêneros informados, não inclui o campo (compatível com cache antigo)', () => {
    const detail = normalizeAlbumDetail({
      id: 'abc123',
      name: 'The Suffering',
      artists: [{ name: 'Artist A' }],
      images: [],
      tracks: { items: [] },
    });

    expect(detail.genres).toBeUndefined();
  });

  it('inclui gêneros quando informados — vêm do artista, não do álbum', () => {
    const detail = normalizeAlbumDetail(
      {
        id: 'abc123',
        name: 'The Suffering',
        artists: [{ name: 'Artist A' }],
        images: [],
        tracks: { items: [] },
      },
      ['rock', 'metal'],
    );

    expect(detail.genres).toEqual(['rock', 'metal']);
  });
});
