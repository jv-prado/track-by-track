# Track by Track

Plataforma para criação de rankings de álbuns: usuários avaliam faixas individualmente e o
sistema calcula a ordenação/nota final do álbum. Domínio completo e decisões de arquitetura
estão documentados em [`CLAUDE.md`](./CLAUDE.md) — este README é só o "como rodar".

## Stack

- **Frontend** (`/`, raiz): Vite + React + TypeScript, TanStack Router + TanStack Query,
  Zustand, Axios, Tailwind v4.
- **API** (`api/`): NestJS + DDD, MongoDB (Mongoose), JWT + refresh rotativo, `nestjs-pino`
  (logs estruturados), `@nestjs/throttler` (rate limit).
- **Scripts** (`scripts/`): migração one-off de um Firestore legado pro Mongo atual —
  só relevante se você está migrando dados antigos, não é necessário pro dia a dia.

Repositório único, três `package.json` independentes (`/`, `api/`, `scripts/`) — sem
workspaces, `npm install` roda separado em cada um.

## Setup rápido

Pré-requisitos: Node 22+, Docker (pro Mongo local), `npm`.

```bash
# 1. Variáveis de ambiente — cada pasta tem seu próprio .env.example
cd api && cp .env.example .env  # api/.env — preencher SPOTIFY_CLIENT_ID/SECRET e JWT_ACCESS_SECRET
cd .. && cp .env.example .env   # .env da raiz — já aponta pro backend local

# 2. Instalar dependências (cada pasta é independente)
npm install                     # raiz (web)
cd api && npm install && cd ..  # api

# 3. Subir tudo: infra em docker + API + web
npm run dev:full
```

`npm run dev:full` levanta, em ordem: **Mongo 7** (`:27018`), **mongo-express** (`:8081`) e
**Redis 7** (`:6380`) via `docker compose`, e depois a **API** (`:3333/v1`, Swagger em `/docs`)
e a **web** (`:5173`) em paralelo.

Só a infra: `npm run dev:infra` · derrubar: `npm run dev:infra:down`.

O Redis é **opcional**: `CACHE_DRIVER` vem como `memory` por padrão, então a API funciona
mesmo com o container parado. `redis` só passa a valer quando você roda mais de uma instância
(ver [`docs/CACHE-REDIS.md`](./docs/CACHE-REDIS.md)) — e, mesmo configurada com `redis`, a API
degrada para o Mongo se o Redis cair, nunca responde erro por causa disso.

`api/.env` exige `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` (Client Credentials — usado só
pra buscar catálogo de álbuns, nunca envolve login/conta de usuário) e um
`JWT_ACCESS_SECRET` com 32+ caracteres — a API valida essas variáveis com Zod no boot e
crasha com mensagem clara se algo estiver faltando ou fora do formato esperado.

## Comandos úteis

Rodar dentro de cada pasta (`api/` ou raiz):

```bash
npm run typecheck   # tsc, sem emitir
npm run lint        # eslint
npm test            # unitários (api/) — jest + repositórios in-memory
npm run test:e2e    # e2e (api/) — supertest + mongodb-memory-server, banco isolado
npm run build        # build de produção
```

Comando extra da API: `npm run openapi:gen` regenera `api/openapi.json` (contrato — a web
consome isso pra gerar tipos, ver seção 2.2 do `CLAUDE.md`). Ele **compila antes de gerar**
(`nest build && node dist/src/openapi.js`) porque só o `tsc` emite `design:paramtypes`; rodando
por `tsx`/esbuild o Swagger não enxerga os DTOs de `@Query()` e o contrato sai sem nenhum query
param.

Cache: `docs/CACHE-REDIS.md` tem o plano, as chaves, os TTLs e a tabela de invalidação.
`GET /v1/health` reporta driver, status e contadores de hit/miss/erro do cache.

## Deploy

- **API**: `api/Dockerfile` (multi-stage, `node:22-slim`, usuário não-root) já pronto e
  testado (`docker build` + `docker run` contra Mongo real). Onde hospedar fica em aberto —
  Railway, Render, Fly.io ou um VPS qualquer servem, desde que rodem um container Node
  normal com acesso à `MONGODB_URI` (Atlas em produção, ver `api/.env.production.example`)
  e às demais variáveis do `.env`.
- **Web**: `npm run build` gera `dist/` estático — qualquer hosting estático serve
  (Vercel, Firebase Hosting, Netlify). `firebase.json` na raiz já está configurado só pra
  isso (seção `hosting`; Firestore/Auth/Functions do Firebase foram removidos por completo
  do produto, ver `CLAUDE.md` seção 0).

## Migração de dados legados (Firestore → Mongo)

Só necessário se você está migrando uma instalação antiga que ainda usava Firestore:

```bash
cd scripts
npm install
cp .env.example .env   # GOOGLE_APPLICATION_CREDENTIALS + MONGODB_URI de destino
npm run migrate:dry-run   # só relata contagens, não escreve nada — rodar sempre primeiro
npm run migrate            # escreve de verdade — idempotente, seguro rodar mais de uma vez
```

**Nunca** rode `migrate` (sem `--dry-run`) contra um Firestore de produção sem um
backup/export feito antes e sem confirmação explícita de quem pediu a migração.

## Licença

MIT.
