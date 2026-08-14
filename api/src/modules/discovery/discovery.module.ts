import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RankingSchema,
  RankingSchemaClass,
} from '../ranking/infrastructure/persistence/ranking.schema';
import { AlbumSchema, AlbumSchemaClass } from '../album-catalog/album.schema';
import { AlbumCatalogModule } from '../album-catalog/album-catalog.module';
import { FollowsModule } from '../follows/follows.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RankingSchemaClass.name, schema: RankingSchema },
      { name: AlbumSchemaClass.name, schema: AlbumSchema },
    ]),
    AlbumCatalogModule,
    FollowsModule,
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
