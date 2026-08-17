import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartEntrySchema, ChartEntrySchemaClass } from './chart-entry.schema';
import { AlbumCatalogModule } from '../album-catalog/album-catalog.module';
import { ChartsController } from './charts.controller';
import { ChartsService } from './charts.service';
import { BillboardSourceService } from './billboard-source.service';
import { ChartResolverService } from './chart-resolver.service';
import { BillboardSyncService } from './billboard-sync.service';
import {
  AxiosBillboardHttpClient,
  BILLBOARD_HTTP_CLIENT,
} from './billboard-http-client';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartEntrySchemaClass.name, schema: ChartEntrySchema },
    ]),
    // exporta AlbumCatalogService — é o que ChartResolverService reaproveita
    // pra resolução local+Spotify (spec §6), sem duplicar cliente nenhum.
    AlbumCatalogModule,
  ],
  controllers: [ChartsController],
  providers: [
    ChartsService,
    BillboardSourceService,
    ChartResolverService,
    BillboardSyncService,
    { provide: BILLBOARD_HTTP_CLIENT, useClass: AxiosBillboardHttpClient },
  ],
  // BillboardSyncService exportado pro script standalone de backfill/rerun manual.
  exports: [BillboardSyncService],
})
export class ChartsModule {}
