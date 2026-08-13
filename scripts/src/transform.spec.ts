import { transformUser, transformRanking, transformComment, Skipped } from './transform';

describe('transformUser', () => {
  it('migra usuário do Firebase Auth normal (uid comum)', () => {
    const result = transformUser('firebase-uid-123', {
      nome: 'Ana',
      email: 'ana@example.com',
      foto_perfil: 'https://img/ana.jpg',
      data_cadastro: new Date('2024-01-01'),
    });

    expect(result).toMatchObject({
      legacyFirebaseUid: 'firebase-uid-123',
      legacySpotifyId: undefined,
      email: 'ana@example.com',
      displayName: 'Ana',
      avatarUrl: 'https://img/ana.jpg',
      mustResetPassword: true,
      passwordHash: null,
    });
  });

  it('migra usuário vindo do bridge Spotify (uid spotify_*), guardando o spotifyId', () => {
    const result = transformUser('spotify_abc123', {
      displayName: 'Bruno',
      email: 'bruno@example.com',
    });

    expect(result).toMatchObject({
      legacyFirebaseUid: undefined,
      legacySpotifyId: 'abc123',
      email: 'bruno@example.com',
    });
  });

  it('normaliza e-mail para minúsculas', () => {
    const result = transformUser('uid-1', { email: 'ANA@EXAMPLE.COM', nome: 'Ana' });
    expect((result as { email: string }).email).toBe('ana@example.com');
  });

  it('pula usuário sem e-mail', () => {
    const result = transformUser('uid-sem-email', { nome: 'Sem Email' });
    expect((result as Skipped).skipped).toBe(true);
  });

  it('usa displayName como fallback de nome, e "Usuário" se nenhum existir', () => {
    const withDisplayName = transformUser('uid-1', {
      displayName: 'Carla',
      email: 'carla@example.com',
    });
    expect((withDisplayName as { displayName: string }).displayName).toBe('Carla');

    const withNoName = transformUser('uid-2', { email: 'semnome@example.com' });
    expect((withNoName as { displayName: string }).displayName).toBe('Usuário');
  });
});

describe('transformRanking', () => {
  const faixas = [
    { id: 't1', nome: 'Faixa 1' },
    { id: 't2', nome: 'Faixa 2' },
    { id: 't3', nome: 'Faixa 3' },
  ];

  it('migra avaliações para entries com posição recalculada', () => {
    const ranking = transformRanking('novo-user-id', {
      id: 'album-1',
      faixas,
      avaliacoes: { t1: 3, t2: 5, t3: 0 },
    });

    expect(ranking.userId).toBe('novo-user-id');
    expect(ranking.albumId).toBe('album-1');
    expect(ranking.entries).toHaveLength(3);

    const byTrack = Object.fromEntries(ranking.entries.map((e) => [e.trackId, e]));
    expect(byTrack.t2?.position).toBe(1); // maior nota
    expect(byTrack.t1?.position).toBe(2);
    expect(byTrack.t3?.position).toBe(3);
  });

  it('calcula averageScore em escala 0-10 a partir das notas 0-5 (não confia em mediaAvaliacao antigo)', () => {
    const ranking = transformRanking('user-1', {
      id: 'album-1',
      faixas,
      avaliacoes: { t1: 5, t2: 5, t3: 5 },
    });

    expect(ranking.averageScore).toBe(10);
  });

  it('faixa sem avaliação vira score 0', () => {
    const ranking = transformRanking('user-1', {
      id: 'album-1',
      faixas,
      avaliacoes: { t1: 4 },
    });

    const byTrack = Object.fromEntries(ranking.entries.map((e) => [e.trackId, e.score]));
    expect(byTrack.t2).toBe(0);
    expect(byTrack.t3).toBe(0);
  });

  it('migra review (favoriteTrackId/worstTrackId/text)', () => {
    const ranking = transformRanking('user-1', {
      id: 'album-1',
      faixas,
      avaliacoes: {},
      preferencias: { faixaFavorita: 't1', piorFaixa: 't3', review: 'Muito bom' },
    });

    expect(ranking.review).toEqual({
      text: 'Muito bom',
      favoriteTrackId: 't1',
      worstTrackId: 't3',
    });
  });

  it('marca completedAt/firstCompletedAt só quando 100% avaliado', () => {
    const incomplete = transformRanking('user-1', {
      id: 'album-1',
      faixas,
      avaliacoes: { t1: 3 },
    });
    expect(incomplete.completedAt).toBeNull();

    const complete = transformRanking('user-1', {
      id: 'album-1',
      faixas,
      avaliacoes: { t1: 3, t2: 3, t3: 3 },
    });
    expect(complete.completedAt).not.toBeNull();
    expect(complete.firstCompletedAt).not.toBeNull();
  });
});

describe('transformComment', () => {
  it('migra comentário associando ao novo rankingId e authorId', () => {
    const comment = transformComment(
      {
        albumId: 'album-1',
        usuarioId: 'legacy-owner-uid',
        autor: 'Bruno',
        autorId: 'legacy-author-uid',
        autorFoto: 'https://img/bruno.jpg',
        texto: 'Ótima resenha!',
        data: new Date('2024-05-01'),
      },
      'novo-ranking-id',
      'novo-author-id',
    );

    expect(comment.rankingId).toBe('novo-ranking-id');
    expect(comment.authorId).toBe('novo-author-id');
    expect(comment.authorDisplayName).toBe('Bruno');
    expect(comment.text).toBe('Ótima resenha!');
    expect(comment.editedAt).toBeNull();
  });

  it('preserva editedAt quando o comentário foi editado', () => {
    const comment = transformComment(
      {
        albumId: 'album-1',
        usuarioId: 'owner',
        autorId: 'author',
        texto: 'Editado',
        editado: true,
        dataEdicao: new Date('2024-06-01'),
      },
      'ranking-1',
      'author-novo',
    );

    expect(comment.editedAt).toEqual(new Date('2024-06-01'));
  });
});
