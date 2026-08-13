import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('Track by Track API')
    .setDescription(
      'Contrato da API — fonte de tipos para o frontend (ver seção 2.2 do CLAUDE.md)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

  // Resolve pelo cwd, não por __dirname: o script roda compilado (dist/src/) para
  // que o TypeScript emita `design:paramtypes` — esbuild/tsx não emite, e sem esse
  // metadata o Swagger não enxerga os DTOs de @Query() e o contrato sai sem
  // nenhum query param (era o caso até aqui).
  writeFileSync(
    join(process.cwd(), 'openapi.json'),
    JSON.stringify(document, null, 2),
  );
  await app.close();

  console.log('openapi.json gerado.');
}

generate().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
