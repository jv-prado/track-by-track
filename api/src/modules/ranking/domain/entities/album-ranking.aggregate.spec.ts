import { AlbumRanking } from './album-ranking.aggregate';
import { Score } from '../value-objects/score.vo';
import { TrackNotInAlbumError } from '../errors/track-not-in-album.error';
import { TrackIgnoredError } from '../errors/track-ignored.error';

function createRanking() {
  return AlbumRanking.create({
    userId: 'user-1',
    albumId: 'album-1',
    tracks: [
      { trackId: 't1', trackNumber: 1 },
      { trackId: 't2', trackNumber: 2 },
      { trackId: 't3', trackNumber: 3 },
    ],
  });
}

describe('AlbumRanking', () => {
  it('cria com todas as faixas zeradas e posições ordenadas pelo número da faixa', () => {
    const ranking = createRanking();

    expect(ranking.entries.map((e) => e.score.value)).toEqual([0, 0, 0]);
    expect(ranking.entries.map((e) => e.position.value)).toEqual([1, 2, 3]);
    expect(ranking.progress).toEqual({
      rated: 0,
      total: 3,
      ignored: 0,
      percentage: 0,
    });
    expect(ranking.averageScore).toBe(0);
  });

  it('rejeita avaliar faixa que não pertence ao álbum', () => {
    const ranking = createRanking();

    expect(() =>
      ranking.rateTrack('faixa-inexistente', Score.create(5)),
    ).toThrow(TrackNotInAlbumError);
  });

  it('recalcula posições após avaliar — maior nota fica em 1º', () => {
    const ranking = createRanking();

    ranking.rateTrack('t3', Score.create(5));
    ranking.rateTrack('t1', Score.create(2));

    const byTrack = Object.fromEntries(
      ranking.entries.map((e) => [e.trackId, e.position.value]),
    );
    expect(byTrack.t3).toBe(1);
    expect(byTrack.t1).toBe(2);
    expect(byTrack.t2).toBe(3); // ainda zero, empata em último
  });

  it('reaplicar a mesma nota limpa a avaliação (toggle)', () => {
    const ranking = createRanking();

    ranking.rateTrack('t1', Score.create(4));
    expect(ranking.entries.find((e) => e.trackId === 't1')?.score.value).toBe(
      4,
    );

    ranking.rateTrack('t1', Score.create(4));
    expect(ranking.entries.find((e) => e.trackId === 't1')?.score.value).toBe(
      0,
    );
  });

  it('calcula a média em escala 0-10 a partir dos scores 0-5', () => {
    const ranking = createRanking();

    ranking.rateTrack('t1', Score.create(5));
    ranking.rateTrack('t2', Score.create(5));
    ranking.rateTrack('t3', Score.create(5));

    expect(ranking.averageScore).toBe(10);
  });

  it('marca firstCompletedAt na primeira vez que todas as faixas são avaliadas', () => {
    const ranking = createRanking();
    expect(ranking.firstCompletedAt).toBeNull();

    ranking.rateTrack('t1', Score.create(3));
    ranking.rateTrack('t2', Score.create(3));
    expect(ranking.firstCompletedAt).toBeNull(); // ainda falta t3

    ranking.rateTrack('t3', Score.create(3));
    expect(ranking.firstCompletedAt).not.toBeNull();
    expect(ranking.completedAt).not.toBeNull();
    expect(ranking.isFirstCompletionBadgeActive).toBe(true);
  });

  it('mantém firstCompletedAt mesmo se o ranking deixar de estar 100% depois', () => {
    const ranking = createRanking();
    ranking.rateTrack('t1', Score.create(3));
    ranking.rateTrack('t2', Score.create(3));
    ranking.rateTrack('t3', Score.create(3));
    const firstCompletedAt = ranking.firstCompletedAt;

    ranking.rateTrack('t3', Score.create(3)); // toggle limpa a nota, sai dos 100%

    expect(ranking.firstCompletedAt).toBe(firstCompletedAt);
    expect(ranking.completedAt).toBeNull();
  });

  it('saveReview aceita faixa favorita/pior faixa válidas e rejeita inválidas', () => {
    const ranking = createRanking();

    ranking.saveReview({
      text: 'Ótimo álbum',
      favoriteTrackId: 't1',
      worstTrackId: 't2',
    });
    expect(ranking.review).toEqual({
      text: 'Ótimo álbum',
      favoriteTrackId: 't1',
      worstTrackId: 't2',
    });

    expect(() =>
      ranking.saveReview({ favoriteTrackId: 'faixa-inexistente' }),
    ).toThrow(TrackNotInAlbumError);
  });

  it('saveReview mescla com a review existente — trocar a favorita não apaga a pior faixa', () => {
    const ranking = createRanking();

    ranking.saveReview({ favoriteTrackId: 't1', worstTrackId: 't2' });
    ranking.saveReview({ favoriteTrackId: 't3' });

    expect(ranking.review).toEqual({
      favoriteTrackId: 't3',
      worstTrackId: 't2',
    });
  });

  it('resetAllScores zera notas, desfaz ignores, recalcula posições e mantém a review', () => {
    const ranking = createRanking();
    ranking.rateTrack('t1', Score.create(5));
    ranking.rateTrack('t2', Score.create(3));
    ranking.rateTrack('t3', Score.create(4));
    ranking.setTrackIgnored('t2', true);
    ranking.saveReview({ text: 'Ótimo', favoriteTrackId: 't1' });
    const firstCompletedAt = ranking.firstCompletedAt;

    ranking.resetAllScores();

    expect(ranking.entries.every((e) => e.score.value === 0)).toBe(true);
    expect(ranking.entries.every((e) => e.ignored === false)).toBe(true);
    expect(ranking.entries.map((e) => e.position.value)).toEqual([1, 2, 3]);
    expect(ranking.averageScore).toBe(0);
    expect(ranking.completedAt).toBeNull();
    expect(ranking.firstCompletedAt).toBe(firstCompletedAt); // permanece — badge é permanente
    expect(ranking.review).toEqual({ text: 'Ótimo', favoriteTrackId: 't1' }); // review não é afetada
  });

  describe('setTrackIgnored', () => {
    it('exclui a faixa ignorada da média e do progresso, sem afetar as demais', () => {
      const ranking = createRanking();
      ranking.rateTrack('t1', Score.create(4));
      ranking.rateTrack('t2', Score.create(2));

      ranking.setTrackIgnored('t3', true);

      expect(ranking.progress).toEqual({
        rated: 2,
        total: 2,
        ignored: 1,
        percentage: 100,
      });
      expect(ranking.averageScore).toBe(6); // (4+2)/2 * 2, t3 fora da conta
    });

    it('zera a nota da faixa ao ignorá-la, pra não reaparecer se for reincluída', () => {
      const ranking = createRanking();
      ranking.rateTrack('t1', Score.create(5));

      ranking.setTrackIgnored('t1', true);
      expect(ranking.entries.find((e) => e.trackId === 't1')?.score.value).toBe(
        0,
      );

      ranking.setTrackIgnored('t1', false);
      expect(ranking.entries.find((e) => e.trackId === 't1')?.score.value).toBe(
        0,
      );
    });

    it('rejeita avaliar ou reavaliar faixa ignorada', () => {
      const ranking = createRanking();
      ranking.setTrackIgnored('t1', true);

      expect(() => ranking.rateTrack('t1', Score.create(3))).toThrow(
        TrackIgnoredError,
      );
    });

    it('remove a faixa ignorada da review se ela era a favorita ou a pior', () => {
      const ranking = createRanking();
      ranking.rateTrack('t1', Score.create(5));
      ranking.rateTrack('t2', Score.create(1));
      ranking.saveReview({ favoriteTrackId: 't1', worstTrackId: 't2' });

      ranking.setTrackIgnored('t1', true);

      expect(ranking.review).toEqual({
        favoriteTrackId: undefined,
        worstTrackId: 't2',
      });
    });

    it('rejeita indicar faixa ignorada como favorita ou pior', () => {
      const ranking = createRanking();
      ranking.setTrackIgnored('t1', true);

      expect(() => ranking.saveReview({ favoriteTrackId: 't1' })).toThrow(
        TrackIgnoredError,
      );
    });

    it('considera completo quando todas as faixas não-ignoradas estão avaliadas', () => {
      const ranking = createRanking();
      ranking.setTrackIgnored('t3', true);
      ranking.rateTrack('t1', Score.create(4));
      ranking.rateTrack('t2', Score.create(4));

      expect(ranking.completedAt).not.toBeNull();
      expect(ranking.firstCompletedAt).not.toBeNull();
    });

    it('empurra faixas ignoradas para o final das posições', () => {
      const ranking = createRanking();
      ranking.rateTrack('t1', Score.create(1));
      ranking.setTrackIgnored('t2', true);
      ranking.rateTrack('t3', Score.create(5));

      const byTrack = Object.fromEntries(
        ranking.entries.map((e) => [e.trackId, e.position.value]),
      );
      expect(byTrack.t3).toBe(1);
      expect(byTrack.t1).toBe(2);
      expect(byTrack.t2).toBe(3);
    });
  });
});
