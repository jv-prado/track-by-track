import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RankingSchema,
  RankingSchemaClass,
} from '../ranking/infrastructure/persistence/ranking.schema';
import { AlbumSchema, AlbumSchemaClass } from '../album-catalog/album.schema';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RankingSchemaClass.name, schema: RankingSchema },
      { name: AlbumSchemaClass.name, schema: AlbumSchema },
    ]),
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
