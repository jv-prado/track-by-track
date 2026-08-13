import { Score } from './score.vo';
import { InvalidScoreError } from '../errors/invalid-score.error';

describe('Score', () => {
  it.each([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])(
    'aceita valores em passos de 0.5 entre 0 e 5 (%s)',
    (value) => {
      expect(Score.create(value).value).toBe(value);
    },
  );

  it.each([-1, 6, 2.3, NaN])('rejeita valor inválido: %s', (value) => {
    expect(() => Score.create(value)).toThrow(InvalidScoreError);
  });

  it('zero() cria um score não avaliado', () => {
    expect(Score.zero().isRated()).toBe(false);
  });

  it('isRated() é true para qualquer valor acima de zero', () => {
    expect(Score.create(1).isRated()).toBe(true);
    expect(Score.create(5).isRated()).toBe(true);
  });
});
