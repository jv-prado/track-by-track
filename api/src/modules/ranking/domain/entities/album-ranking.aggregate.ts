import { AggregateRoot } from '../../../../shared/kernel/aggregate-root';
import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';
import { RankingEntry } from './ranking-entry.entity';
import { Score } from '../value-objects/score.vo';
import { RankingPosition } from '../value-objects/ranking-position.vo';
import { TrackNotInAlbumError } from '../errors/track-not-in-album.error';
import { TrackIgnoredError } from '../errors/track-ignored.error';

const FIRST_COMPLETION_BADGE_WINDOW_MS = 60 * 60 * 1000;

export interface ReviewProps {
  text?: string;
  favoriteTrackId?: string;
  worstTrackId?: string;
}

export interface AlbumRankingProps {
  userId: string;
  albumId: string;
  entries: RankingEntry[];
  review: ReviewProps;
  firstCompletedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlbumTrackRef {
  trackId: string;
  trackNumber: number;
}

export class AlbumRanking extends AggregateRoot<AlbumRankingProps> {
  private constructor(props: AlbumRankingProps, id?: UniqueEntityId) {
    super(props, id);
  }

  static create(params: {
    userId: string;
    albumId: string;
    tracks: AlbumTrackRef[];
  }): AlbumRanking {
    const now = new Date();
    const entries = params.tracks.map((track) =>
      RankingEntry.create({
        trackId: track.trackId,
        trackNumber: track.trackNumber,
        score: Score.zero(),
        position: RankingPosition.create(1),
        ignored: false,
      }),
    );

    const ranking = new AlbumRanking({
      userId: params.userId,
      albumId: params.albumId,
      entries,
      review: {},
      firstCompletedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    ranking.recomputePositions();
    return ranking;
  }

  static reconstitute(
    props: AlbumRankingProps,
    id: UniqueEntityId,
  ): AlbumRanking {
    return new AlbumRanking(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }

  get albumId(): string {
    return this.props.albumId;
  }

  get entries(): readonly RankingEntry[] {
    return this.props.entries;
  }

  get review(): Readonly<ReviewProps> {
    return this.props.review;
  }

  get firstCompletedAt(): Date | null {
    return this.props.firstCompletedAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * `total`/`rated` contam só faixas não-ignoradas — uma faixa ignorada (ex:
   * instrumental) não deve ser exigida do usuário nem aparecer como pendente.
   */
  get progress(): {
    rated: number;
    total: number;
    ignored: number;
    percentage: number;
  } {
    const ratable = this.props.entries.filter((entry) => !entry.ignored);
    const total = ratable.length;
    const rated = ratable.filter((entry) => entry.score.isRated()).length;
    return {
      rated,
      total,
      ignored: this.props.entries.length - total,
      percentage: total === 0 ? 0 : Math.round((rated / total) * 100),
    };
  }

  /**
   * 0-10, sempre derivado dos scores atuais — nunca aceito do cliente. Faixas
   * ignoradas saem do numerador e do denominador: não podem influenciar a média.
   */
  get averageScore(): number {
    const ratable = this.props.entries.filter((entry) => !entry.ignored);
    const total = ratable.length;
    if (total === 0) return 0;
    const sum = ratable.reduce((acc, entry) => acc + entry.score.value, 0);
    return (sum / total) * 2;
  }

  /**
   * Nenhuma faixa avaliada, nenhuma faixa ignorada e nenhuma review escrita —
   * ranking sem qualquer sinal de conteúdo do usuário. Nasce assim (visita à
   * página do álbum cria o registro antes da 1ª nota) ou volta a ficar assim
   * (usuário desfaz a última nota, ou reseta tudo sem ter escrito review).
   * Não deve contar em estatística nem sobreviver no banco — ver
   * `persistRanking` em application/.
   *
   * Ignorar faixa conta como conteúdo: sem isso, marcar um interlúdio como
   * ignorado antes da 1ª nota apagava o ranking recém-criado e o `rankingId`
   * que o cliente já tinha em mãos passava a devolver 404.
   */
  get isEmpty(): boolean {
    const hasReview = Boolean(
      this.props.review.text ||
      this.props.review.favoriteTrackId ||
      this.props.review.worstTrackId,
    );
    const { rated, ignored } = this.progress;
    return rated === 0 && ignored === 0 && !hasReview;
  }

  get isFirstCompletionBadgeActive(): boolean {
    if (!this.props.firstCompletedAt) return false;
    return (
      Date.now() - this.props.firstCompletedAt.getTime() <=
      FIRST_COMPLETION_BADGE_WINDOW_MS
    );
  }

  rateTrack(trackId: string, score: Score): void {
    const entry = this.assertTrackRateable(trackId);
    entry.applyScore(score);
    this.recomputePositions();
    this.updateCompletionState();
    this.props.updatedAt = new Date();
  }

  /**
   * Marca/desmarca uma faixa como ignorada (ex: instrumental que o usuário não
   * quer avaliar). Zera a nota — não é um toggle de valor, é reset dessa faixa —
   * pra uma nota antiga não reaparecer influenciando a média se ela for
   * reincluída depois. Se a faixa era a favorita/pior, essa escolha também sai
   * da review: não faz sentido destacar uma faixa que o usuário optou por não
   * avaliar.
   */
  setTrackIgnored(trackId: string, ignored: boolean): void {
    const entry = this.findEntry(trackId);
    entry.setIgnored(ignored);
    entry.applyScore(Score.zero());

    if (ignored) {
      if (this.props.review.favoriteTrackId === trackId) {
        this.props.review = {
          ...this.props.review,
          favoriteTrackId: undefined,
        };
      }
      if (this.props.review.worstTrackId === trackId) {
        this.props.review = { ...this.props.review, worstTrackId: undefined };
      }
    }

    this.recomputePositions();
    this.updateCompletionState();
    this.props.updatedAt = new Date();
  }

  /**
   * Zera todas as notas e desfaz ignores (mantém a review). `applyScore(Score.zero())`
   * sempre resulta em 0 independente do valor atual — não é um toggle aqui, é reset.
   * Mantém firstCompletedAt (badge é sobre a 1ª vez que completou, é permanente).
   */
  resetAllScores(): void {
    this.props.entries.forEach((entry) => {
      entry.applyScore(Score.zero());
      entry.setIgnored(false);
    });
    this.recomputePositions();
    this.props.completedAt = null;
    this.props.updatedAt = new Date();
  }

  /** Recebe só os campos que o cliente enviou (ver SaveReviewInput) — faz merge, nunca substitui a review inteira. */
  saveReview(review: Partial<ReviewProps>): void {
    if (review.favoriteTrackId)
      this.assertTrackRateable(review.favoriteTrackId);
    if (review.worstTrackId) this.assertTrackRateable(review.worstTrackId);

    this.props.review = { ...this.props.review, ...review };
    this.props.updatedAt = new Date();
  }

  /** Existe no álbum e não está ignorada — faixa ignorada não pode ser avaliada nem indicada como favorita/pior. */
  private assertTrackRateable(trackId: string): RankingEntry {
    const entry = this.findEntry(trackId);
    if (entry.ignored) {
      throw new TrackIgnoredError(trackId);
    }
    return entry;
  }

  private findEntry(trackId: string): RankingEntry {
    const entry = this.props.entries.find(
      (candidate) => candidate.trackId === trackId,
    );
    if (!entry) {
      throw new TrackNotInAlbumError(trackId);
    }
    return entry;
  }

  private recomputePositions(): void {
    const ordered = [...this.props.entries].sort((a, b) => {
      if (a.ignored !== b.ignored) return a.ignored ? 1 : -1;
      if (b.score.value !== a.score.value) return b.score.value - a.score.value;
      return a.trackNumber - b.trackNumber;
    });
    ordered.forEach((entry, index) => {
      entry.setPosition(RankingPosition.create(index + 1));
    });
  }

  private updateCompletionState(): void {
    const ratable = this.props.entries.filter((entry) => !entry.ignored);
    const allRated =
      ratable.length > 0 && ratable.every((entry) => entry.score.isRated());
    if (allRated) {
      if (!this.props.firstCompletedAt) {
        this.props.firstCompletedAt = new Date();
      }
      this.props.completedAt = new Date();
    } else {
      this.props.completedAt = null;
    }
  }
}
