import { ValueObject } from '../../../../shared/kernel/value-object';
import { InvalidScoreError } from '../errors/invalid-score.error';

interface ScoreProps {
  value: number;
}

export class Score extends ValueObject<ScoreProps> {
  static readonly MIN = 0;
  static readonly MAX = 5;

  private constructor(props: ScoreProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  /** Passos de meia estrela: 0, 0.5, 1, ..., 5. `*2` inteiro evita erro de ponto flutuante. */
  static create(value: number): Score {
    if (
      !Number.isFinite(value) ||
      !Number.isInteger(value * 2) ||
      value < Score.MIN ||
      value > Score.MAX
    ) {
      throw new InvalidScoreError(value);
    }
    return new Score({ value });
  }

  static zero(): Score {
    return new Score({ value: 0 });
  }

  isRated(): boolean {
    return this.props.value > 0;
  }
}
