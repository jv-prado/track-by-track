import { Controller, Get, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import {
  CACHE,
  type Cache,
} from '../../shared/infrastructure/cache/cache.port';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(CACHE) private readonly cache: Cache,
  ) {}

  @Public()
  @Get()
  async check() {
    return {
      status: 'ok',
      mongo:
        this.connection.readyState === ConnectionStates.connected
          ? 'connected'
          : 'disconnected',
      // cache fora do ar não reprova o health: a API responde sem ele, só mais devagar
      cache: {
        driver: this.cache.driver(),
        status: (await this.cache.healthy()) ? 'up' : 'down',
        ...this.cache.stats(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
