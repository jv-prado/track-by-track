import { Entity } from '../../../../shared/kernel/entity';
import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';
import { Score } from '../value-objects/score.vo';
import { RankingPosition } from '../value-objects/ranking-position.vo';

export interface RankingEntryProps {
  trackId: string;
  trackNumber: number;
  score: Score;
  position: RankingPosition;
  ignored: boolean;
}

export class RankingEntry extends Entity<RankingEntryProps> {
  private constructor(props: RankingEntryProps, id: UniqueEntityId) {
    super(props, id);
  }

  static create(props: RankingEntryProps): RankingEntry {
    return new RankingEntry(props, new UniqueEntityId(props.trackId));
  }

  get trackId(): string {
    return this.props.trackId;
  }

  get trackNumber(): number {
    return this.props.trackNumber;
  }

  get score(): Score {
    return this.props.score;
  }

  get position(): RankingPosition {
    return this.props.position;
  }

  get ignored(): boolean {
    return this.props.ignored;
  }

  /** Reaplicar o mesmo score limpa a avaliação (toggle) — regra já existente no produto. */
  applyScore(newScore: Score): void {
    this.props.score =
      this.props.score.value === newScore.value ? Score.zero() : newScore;
  }

  setPosition(position: RankingPosition): void {
    this.props.position = position;
  }

  setIgnored(ignored: boolean): void {
    this.props.ignored = ignored;
  }
}
