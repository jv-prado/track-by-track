import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumSchema, AlbumSchemaClass } from './album.schema';
import { AlbumCatalogController } from './album-catalog.controller';
import { AlbumCatalogService } from './album-catalog.service';
import { AlbumCoverService } from './album-cover.service';
import { SpotifyClientService } from './spotify-client.service';
import { ItunesPreviewService } from './itunes-preview.service';
import { AppleTopAlbumsService } from './apple-top-albums.service';
import {
  AxiosSpotifyHttpClient,
  SPOTIFY_HTTP_CLIENT,
} from './spotify-http-client';
import {
  AxiosItunesHttpClient,
  ITUNES_HTTP_CLIENT,
} from './itunes-http-client';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlbumSchemaClass.name, schema: AlbumSchema },
    ]),
  ],
  controllers: [AlbumCatalogController],
  providers: [
    AlbumCoverService,
    AlbumCatalogService,
    SpotifyClientService,
    ItunesPreviewService,
    AppleTopAlbumsService,
    { provide: SPOTIFY_HTTP_CLIENT, useClass: AxiosSpotifyHttpClient },
    { provide: ITUNES_HTTP_CLIENT, useClass: AxiosItunesHttpClient },
  ],
  exports: [AlbumCatalogService],
})
export class AlbumCatalogModule {}
