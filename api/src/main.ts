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
  app.useLogger(app.get(Logger));
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

  console.log(`Track by Track API rodando em http://localhost:${env.PORT}/v1`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
