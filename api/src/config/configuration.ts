import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema';

/** Alias tipado — nunca injete `ConfigService` cru, sempre `AppConfigService`. */
export type AppConfigService = ConfigService<Env, true>;
