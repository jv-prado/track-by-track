import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumCatalogModule } from '../album-catalog/album-catalog.module';
import { RANKING_REPOSITORY } from './domain/repositories/ranking.repository';
import { MongoRankingRepository } from './infrastructure/persistence/mongo-ranking.repository';
import {
  RankingSchema,
  RankingSchemaClass,
} from './infrastructure/persistence/ranking.schema';
import { CreateOrGetRankingUseCase } from './application/use-cases/create-or-get-ranking/create-or-get-ranking.use-case';
import { RateTrackUseCase } from './application/use-cases/rate-track/rate-track.use-case';
import { SetTrackIgnoredUseCase } from './application/use-cases/set-track-ignored/set-track-ignored.use-case';
import { SaveReviewUseCase } from './application/use-cases/save-review/save-review.use-case';
import { GetRankingUseCase } from './application/use-cases/get-ranking/get-ranking.use-case';
import { ResetRankingUseCase } from './application/use-cases/reset-ranking/reset-ranking.use-case';
import { DeleteRankingUseCase } from './application/use-cases/delete-ranking/delete-ranking.use-case';
import { RankingsController } from './presentation/rankings.controller';
import { RankingDirectoryService } from './application/services/ranking-directory.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RankingSchemaClass.name, schema: RankingSchema },
    ]),
    AlbumCatalogModule,
  ],
  controllers: [RankingsController],
  providers: [
    { provide: RANKING_REPOSITORY, useClass: MongoRankingRepository },
    CreateOrGetRankingUseCase,
    RateTrackUseCase,
    SetTrackIgnoredUseCase,
    SaveReviewUseCase,
    GetRankingUseCase,
    ResetRankingUseCase,
    DeleteRankingUseCase,
    RankingDirectoryService,
  ],
  // Comments consulta o dono do ranking pra saber a quem notificar.
  exports: [RankingDirectoryService],
})
export class RankingModule {}
