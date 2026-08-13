import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumSchema, AlbumSchemaClass } from './album.schema';
import { AlbumCatalogController } from './album-catalog.controller';
import { AlbumCatalogService } from './album-catalog.service';
import { SpotifyClientService } from './spotify-client.service';
import {
  AxiosSpotifyHttpClient,
  SPOTIFY_HTTP_CLIENT,
} from './spotify-http-client';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlbumSchemaClass.name, schema: AlbumSchema },
    ]),
  ],
  controllers: [AlbumCatalogController],
  providers: [
    AlbumCatalogService,
    SpotifyClientService,
    { provide: SPOTIFY_HTTP_CLIENT, useClass: AxiosSpotifyHttpClient },
  ],
  exports: [AlbumCatalogService],
})
export class AlbumCatalogModule {}
