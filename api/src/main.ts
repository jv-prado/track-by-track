import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.schema';

async function bootstrap() {
  const env = validateEnv(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.setGlobalPrefix('v1');
  // CORP padrão do helmet é `same-origin`, o que faz o browser BLOQUEAR a capa
  // servida por /albums/:id/cover quando a web está em outra origem (dev:
  // 5173 → 3333; prod: domínio da web → host da API). Sem isso o proxy de capa
  // — que existe justamente pra desenhar no canvas sem contaminá-lo — nunca
  // carrega. CORS continua restrito a WEB_ORIGIN logo abaixo.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Track by Track API')
    .setDescription(
      'Contrato da API — fonte de tipos para o frontend (ver seção 2.2 do CLAUDE.md)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });

  await app.listen(env.PORT);

  logger.log(`Track by Track API rodando em http://localhost:${env.PORT}/v1`);
}

bootstrap().catch((error: unknown) => {
  // Falha de boot acontece antes do logger existir — stderr é o único canal.
  process.stderr.write(
    `${String(error instanceof Error ? error.stack : error)}\n`,
  );
  process.exit(1);
});
