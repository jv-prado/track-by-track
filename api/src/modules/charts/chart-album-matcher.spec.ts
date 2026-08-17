import {
  MATCH_THRESHOLD,
  isConfidentMatch,
  matchScore,
} from './chart-album-matcher';

describe('chart-album-matcher', () => {
  it('mesmo nome e mesmo artista pontua próximo do máximo', () => {
    const score = matchScore(
      { name: 'Renaissance', artist: 'Beyoncé' },
      { name: 'Renaissance', artist: 'Beyoncé' },
    );

    expect(score).toBeGreaterThanOrEqual(0.99);
  });

  it('pequena variação de grafia (edição extra, acento) ainda confia', () => {
    expect(
      isConfidentMatch(
        { name: 'Renaissance (Deluxe)', artist: 'Beyonce' },
        { name: 'Renaissance', artist: 'Beyoncé' },
      ),
    ).toBe(true);
  });

  it('artista claramente diferente rejeita mesmo com nome idêntico', () => {
    expect(
      isConfidentMatch(
        { name: 'Greatest Hits', artist: 'Journey' },
        { name: 'Greatest Hits', artist: 'Toto' },
      ),
    ).toBe(false);
  });

  it('nome e artista sem nenhuma relação pontua abaixo do threshold', () => {
    const score = matchScore(
      { name: 'Ghost Album Nine', artist: 'Nobody Real' },
      { name: 'Renaissance', artist: 'Beyoncé' },
    );

    expect(score).toBeLessThan(MATCH_THRESHOLD);
  });
});
