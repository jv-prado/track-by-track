import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfigService } from '../../../config/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
  ],
})
export class AppMongooseModule {}
