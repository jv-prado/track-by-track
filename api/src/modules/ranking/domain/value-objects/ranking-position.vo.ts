import { ValueObject } from '../../../../shared/kernel/value-object';

interface RankingPositionProps {
  value: number;
}

/**
 * Nunca aceita do cliente — sempre recalculada pelo agregado a partir dos
 * scores (ver AlbumRanking#recomputePositions). Fecha o gap de confiança do
 * `mediaInformada`/posição que o app antigo aceitava do frontend.
 */
export class RankingPosition extends ValueObject<RankingPositionProps> {
  private constructor(props: RankingPositionProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  static create(value: number): RankingPosition {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`Posição inválida: ${value}. Deve ser um inteiro >= 1.`);
    }
    return new RankingPosition({ value });
  }
}
