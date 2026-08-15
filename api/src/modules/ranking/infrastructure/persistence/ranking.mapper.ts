import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';
import {
  AlbumRanking,
  AlbumRankingProps,
} from '../../domain/entities/album-ranking.aggregate';
import { RankingEntry } from '../../domain/entities/ranking-entry.entity';
import { Score } from '../../domain/value-objects/score.vo';
import { RankingPosition } from '../../domain/value-objects/ranking-position.vo';
import { RankingLean } from './ranking.schema';

export class RankingMapper {
  static toDomain(doc: RankingLean): AlbumRanking {
    const entries = doc.entries.map((entry) =>
      RankingEntry.create({
        trackId: entry.trackId,
        trackNumber: entry.trackNumber,
        score: Score.create(entry.score),
        position: RankingPosition.create(entry.position),
        ignored: entry.ignored ?? false,
      }),
    );

    const props: AlbumRankingProps = {
      userId: doc.userId.toString(),
      albumId: doc.albumId,
      entries,
      review: {
        text: doc.review?.text ?? undefined,
        favoriteTrackId: doc.review?.favoriteTrackId ?? undefined,
        worstTrackId: doc.review?.worstTrackId ?? undefined,
      },
      firstCompletedAt: doc.firstCompletedAt,
      completedAt: doc.completedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return AlbumRanking.reconstitute(
      props,
      new UniqueEntityId(doc._id.toString()),
    );
  }

  static toPersistence(ranking: AlbumRanking) {
    return {
      _id: ranking.id.toString(),
      userId: ranking.userId,
      albumId: ranking.albumId,
      entries: ranking.entries.map((entry) => ({
        trackId: entry.trackId,
        trackNumber: entry.trackNumber,
        score: entry.score.value,
        position: entry.position.value,
        ignored: entry.ignored,
      })),
      averageScore: ranking.averageScore,
      review: ranking.review,
      firstCompletedAt: ranking.firstCompletedAt,
      completedAt: ranking.completedAt,
      createdAt: ranking.createdAt,
      updatedAt: ranking.updatedAt,
    };
  }
}
