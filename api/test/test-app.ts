import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { App } from 'supertest/types';
// AppModule é importado DINAMICAMENTE (abaixo), depois de setar as env vars.
// @nestjs/config lê/valida process.env assim que `ConfigModule.forRoot()` roda —
// e isso acontece na hora em que o decorator @Module de AppModule é avaliado, ou
// seja, no import do módulo, não na hora de compilar/instanciar. Um `import`
// estático no topo do arquivo seria hoisted (roda antes de qualquer env var ser
// setada aqui embaixo) e a app subiria com o MONGODB_URI real do `.env`, não com
// o do MongoMemoryServer — foi exatamente isso que aconteceu e escreveu dados de
// teste no Mongo real de dev antes dessa correção.
type AppModuleType = typeof import('../src/app.module').AppModule;

export interface TestApp {
  app: INestApplication;
  mongod: MongoMemoryServer;
  close: () => Promise<void>;
}

/**
 * `INestApplication.getHttpServer()` é tipado como `any`, então cada
 * `request(server())` do supertest virava um `no-unsafe-argument`. A asserção
 * fica num lugar só, tipada, em vez de espalhada por dezenas de chamadas.
 */
export function httpServer(testApp: TestApp): App {
  return testApp.app.getHttpServer() as App;
}

export async function createTestApp(
  configureModule?: (
    builder: ReturnType<typeof Test.createTestingModule>,
  ) => void,
): Promise<TestApp> {
  const mongod = await MongoMemoryServer.create();

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET = 'e2e-test-secret-with-32-characters-minimum';
  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_REFRESH_TTL = '7d';
  process.env.WEB_ORIGIN = 'http://localhost:5173';
  process.env.SPOTIFY_CLIENT_ID = 'e2e-test-client-id';
  process.env.SPOTIFY_CLIENT_SECRET = 'e2e-test-client-secret';
  process.env.EMAIL_SENDER_ADAPTER = 'console';
  // Cache desligado no e2e de propósito: suíte que passa por causa de resposta
  // cacheada esconde bug de invalidação. O cache tem teste próprio
  // (in-memory-cache.adapter.spec, redis-cache.adapter.spec, invalidate-ranking-cache.spec).
  process.env.CACHE_DRIVER = 'off';

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário no topo do arquivo
  const { AppModule } = require('../src/app.module') as {
    AppModule: AppModuleType;
  };

  const builder = Test.createTestingModule({
    imports: [AppModule],
  });
  configureModule?.(builder);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();

  return {
    app,
    mongod,
    close: async () => {
      await app.close();
      await mongod.stop();
    },
  };
}
