import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.schema';
import { convertIdsToObjectId } from './shared/infrastructure/database/migrations/convert-ids-to-object-id.migration';

async function bootstrap() {
  const env = validateEnv(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Roda antes de qualquer model Mongoose tocar as coleções: normaliza todo
  // `_id`/FK pra `ObjectId` nativo, formato que os schemas da aplicação
  // declaram (`type: Types.ObjectId`) — via driver cru, sem passar pelo cast
  // do Mongoose.
  const connection = app.get<Connection>(getConnectionToken());
  const migrated = await convertIdsToObjectId(connection, logger);

  // `syncIndexes` reconstrói os índices que o `rename` da migração derruba
  // (ver convert-ids-to-object-id.migration.ts) — só precisa rodar na rodada
  // que efetivamente migrou algo. Por model, com catch próprio: um índice que
  // falhe por dado pré-existente inconsistente (ex.: campo único com valor
  // duplicado numa coleção não relacionada a esta migração) não pode derrubar
  // o boot da API inteira — fica um alerta no log em vez de crash.
  if (migrated) {
    await Promise.all(
      Object.entries(connection.models).map(async ([name, model]) => {
        try {
          await model.syncIndexes();
        } catch (error) {
          logger.warn(
            `Falha ao sincronizar índices de ${name} após migração de ids: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }),
    );
  }

  app.setGlobalPrefix('v1');
  app.use(helmet());
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
