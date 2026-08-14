import { mapToCuratedGenres } from './curated-genre-mapper';

describe('mapToCuratedGenres', () => {
  it('casa tags compostas do Spotify com a categoria curada por substring', () => {
    expect(mapToCuratedGenres(['classic rock', 'hard rock'])).toEqual(['rock']);
    expect(mapToCuratedGenres(['j-rock'])).toEqual(['rock']);
    expect(mapToCuratedGenres(['glam metal'])).toEqual(['metal']);
    expect(mapToCuratedGenres(['brazilian hip hop'])).toEqual(['hip-hop']);
    expect(mapToCuratedGenres(['contemporary r&b'])).toEqual(['r-b']);
  });

  it('casa tags exatas iguais à categoria curada', () => {
    expect(mapToCuratedGenres(['rock'])).toEqual(['rock']);
    expect(mapToCuratedGenres(['sertanejo'])).toEqual(['sertanejo']);
  });

  it('tags brasileiras reais (observadas no Mongo) caem na categoria certa', () => {
    expect(
      mapToCuratedGenres(['sertanejo universitário', 'piseiro', 'agronejo']),
    ).toEqual(['sertanejo']);
    expect(mapToCuratedGenres(['brazilian pop'])).toEqual(['pop']);
    expect(mapToCuratedGenres(['new mpb'])).toEqual(['mpb']);
    expect(mapToCuratedGenres(['brazilian trap'])).toEqual(['hip-hop']);
    expect(mapToCuratedGenres(['trap funk'])).toEqual(
      expect.arrayContaining(['hip-hop', 'funk']),
    );
    expect(mapToCuratedGenres(['forró tradicional', 'arrocha'])).toEqual([
      'sertanejo',
    ]);
  });

  // O Spotify raramente devolve o nome largo sozinho: quem lança rock hoje vem
  // marcado como "alternative rock", "grunge", "emo". Sem estes sinônimos o
  // filtro de rock ficava com uma dúzia de álbuns e a rolagem morria na
  // primeira tela.
  it('subgêneros que não contêm o nome da categoria também casam', () => {
    expect(mapToCuratedGenres(['grunge'])).toEqual(['rock']);
    expect(mapToCuratedGenres(['metalcore'])).toEqual(['metal']);
    expect(mapToCuratedGenres(['dancehall'])).toEqual(['reggae']);
    expect(mapToCuratedGenres(['bossa nova'])).toEqual(['jazz']);
    expect(mapToCuratedGenres(['uk drill'])).toEqual(['hip-hop']);
  });

  it('uma tag pode cair em mais de uma categoria — não são buckets exclusivos', () => {
    const genres = mapToCuratedGenres(['k-pop']);
    expect(genres).toEqual(expect.arrayContaining(['k-pop', 'pop']));
  });

  it('tag sem relação com nenhuma categoria curada não gera match', () => {
    expect(mapToCuratedGenres(['ballroom vogue', 'raï', 'gqom'])).toEqual([]);
  });

  it('sem gêneros de entrada, devolve lista vazia', () => {
    expect(mapToCuratedGenres([])).toEqual([]);
  });

  it('não duplica categoria quando mais de uma tag cai na mesma', () => {
    expect(mapToCuratedGenres(['rock', 'classic rock', 'hard rock'])).toEqual([
      'rock',
    ]);
  });
});
