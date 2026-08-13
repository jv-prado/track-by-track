# Plano de cache (Redis) — Track by Track

> Documento de execução. Uma fase por vez, com aceite medido antes de seguir.
> Escrito a partir de medição real da API local (5.408 rankings, 4.430 completos), não de suposição.

---

## 0. Veredito, antes de qualquer código

Medi todos os endpoints candidatos, duas chamadas seguidas cada, contra o Mongo local:

| Endpoint | 1ª | 2ª | Payload | Onde o tempo vai |
| --- | --- | --- | --- | --- |
| `GET /v1/albums/search?q=lorde` | **599ms** | **617ms** | 3.8kb | Spotify, toda vez |
| `GET /v1/albums/:id` (não existe → 404) | **384ms** | **152ms** | 0.2kb | Spotify, toda vez |
| `GET /v1/albums/:id` (em cache Mongo) | 2ms | 2ms | 2.5kb | Mongo, índice `spotifyId` |
| `GET /v1/discovery/feed?page=1&perPage=30` | 19ms | 5ms | 12kb | Mongo agg + 2 `$lookup` |
| `GET /v1/discovery/feed?page=50` | 12ms | 7ms | 11.8kb | idem (`$skip` fundo) |
| `GET /v1/discovery/top-albums?page=1` | 15ms | 12ms | 4.5kb | `$group` global + `distinct` |
| `GET /v1/discovery/albums/:id/stats` | 4ms | 3ms | 0.1kb | 3 agg + `findOne` |
| `GET /v1/discovery/albums/:id/reviews` | 2ms | 2ms | 0.1kb | Mongo, índice `(albumId, updatedAt)` |
| `GET /v1/discovery/users/:id` + `/stats` | 4ms / 3ms | — | 7kb | Mongo, índice `(userId, createdAt)` |

Conclusão desconfortável mas honesta: **o gargalho não é o Mongo, é o Spotify.** Feed e top-albums
estão em 5–19ms; cachear isso hoje economiza milissegundos. Já `search` custa **600ms em toda
chamada** — é 30x o endpoint mais lento do sistema e o único que o usuário sente enquanto digita.

Ordem de retorno sobre investimento:

1. **Spotify search + negative cache de álbum inexistente** — 600ms → ~2ms. Ganho imediato, visível.
2. **Token de app do Spotify compartilhado** — hoje é `private cachedToken` em memória
   ([spotify-client.service.ts:38](../api/src/modules/album-catalog/spotify-client.service.ts#L38)):
   com 2 instâncias, 2 tokens e o dobro de chamadas a `/api/token`.
3. **`top-albums`** — 15ms hoje, mas é `$group` sobre **toda** a coleção de completos + `distinct`.
   Cresce linear com o volume; é a próxima a doer, não a que dói agora.
4. **`feed` / `album stats` / `user stats`** — cachear por higiene e para aguentar pico, não por
   latência atual.

E o corolário: **se o deploy é uma instância só, Redis não é obrigatório para itens 1 e 3** — um
LRU em processo entrega o mesmo número. Por isso a fase 1 introduz uma **porta de cache** com dois
adapters (memória e Redis) e a decisão de infra fica adiável sem reescrever nada.

**Fora do escopo do Redis, mas dentro deste plano** (seções 11 e 12): a capa que só aparece ao
rolar é peso de imagem, não latência de API — 2.7MB por tela de feed, medido; e o `$skip` profundo
do feed é dívida estrutural que cache esconde em vez de resolver. Nenhum dos dois melhora com
Redis, os dois entram como fases 6 e 7.

---

## 1. Onde cabe e onde não cabe

| Dado | Cachear? | Por quê |
| --- | --- | --- |
| Spotify `search` | **Sim**, TTL 24h | 600ms, resultado praticamente imóvel, chave = query normalizada |
| Spotify álbum 404 | **Sim**, TTL 1h (negative cache) | 384ms para responder "não existe"; ID inválido é repetido por bot/typo |
| Spotify app token | **Sim**, TTL = `expires_in − 60s` | compartilhar entre instâncias, evitar rate limit em `/api/token` |
| `top-albums` | **Sim**, TTL 5min | `$group` global, custo cresce com a base |
| `feed` (página pública) | **Sim**, TTL 60s | alto tráfego, tolera 60s de defasagem |
| `album stats` / `album reviews` | **Sim**, TTL 10min / 5min | leitura por álbum, muda só quando alguém publica ranking |
| `user stats` / rankings do usuário | **Sim**, TTL 5min / 60s | perfil é read-heavy |
| busca dentro de "minhas avaliações" (`search=`) | **Não** | texto livre = cardinalidade infinita de chave; 4ms já resolve |
| Álbum detalhado (`/v1/albums/:id`) | **Não** | já cacheado no Mongo com TTL 7 dias, 2ms. Redis daria 0.5ms |
| Ranking em edição (`GET /rankings/me/:albumId`) | **Não** | caminho de escrita, precisa ser fresco; 2ms |
| Comentários | **Não** | volume baixo, índice `(rankingId, createdAt)` já resolve |
| Refresh token / password reset | **Não** | precisa durabilidade e auditoria — fica no Mongo |
| Sessão / access token | **Não** | JWT é stateless por design (seção 4.4 do CLAUDE.md) |
| Contador de rate limit (`@nestjs/throttler`) | **Sim**, quando >1 instância | hoje o limite é por processo, então N instâncias = N×60 req/min |

---

## 2. Ganhos mais baratos que Redis (fazer junto, não depois)

1. **`Cache-Control` + `ETag` nas leituras públicas.** `feed`, `top-albums`, `album stats` podem
   responder `Cache-Control: public, max-age=30, stale-while-revalidate=60`. Isso corta a request
   inteira, não só o Mongo. Complementa Redis, não compete.
2. **`perPage` do feed já está em 30** — 1 request por tela em vez de 3 (feito).
3. **Índices** — conferidos, estão de pé: `rankings (userId,albumId) unique`, `(userId,createdAt)`,
   `(albumId,updatedAt)`, `(completedAt,createdAt)`; `albums.spotifyId unique`;
   `comments (rankingId,createdAt)`. Nada a fazer aqui.
4. **`$skip` profundo no feed** é a única dívida estrutural de leitura: `page=50` já paga
   1.470 documentos descartados. Cursor por `(createdAt,_id)` resolve de verdade; cache só esconde.

---

## 3. Arquitetura

### 3.1 Porta e adapters

`api/src/shared/infrastructure/cache/`

```
cache.port.ts             # CACHE = Symbol('Cache') + interface Cache
in-memory-cache.adapter.ts # LRU + TTL, default em dev/test e fallback
redis-cache.adapter.ts     # ioredis
null-cache.adapter.ts      # CACHE_ENABLED=false → todo get é miss
cache.module.ts            # escolhe o adapter por env, global
cache-keys.ts              # ÚNICO lugar que monta string de chave
```

```ts
export const CACHE = Symbol('Cache');

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** contador monotônico usado como versão de invalidação (seção 5) */
  bump(key: string): Promise<number>;
  version(key: string): Promise<number>;
  /** read-through com proteção de stampede */
  getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T>;
}
```

Regras:

- Nenhum service importa `ioredis`. Só o adapter. Injeção por `Symbol`, como manda a seção 4.3.
- `domain/**` não conhece cache. Cache é infraestrutura; quem orquestra é application/service.
- Serialização: `JSON.stringify`. `Date` volta como string — os endpoints já entregam ISO 8601 na
  fronteira HTTP (seção 3 do CLAUDE.md), então o tipo cacheado é o **DTO de resposta**, nunca o
  documento Mongo hidratado nem entidade de domínio.

### 3.2 Redis nunca derruba a request

`redis-cache.adapter.ts` com `ioredis`:

```ts
new Redis(url, {
  commandTimeout: 150,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true,
});
```

Todo comando dentro de `try/catch`: erro → `logger.warn` (com throttle de 1 log/30s para não
inundar) → `get` devolve `null` (miss), `set`/`bump` viram no-op. **Cache indisponível degrada para
Mongo, nunca para 500.** `GET /v1/health` reporta `redis: "up" | "down"`, mas `down` não reprova
readiness — a API funciona sem cache.

### 3.3 Stampede

`getOrSet` em duas camadas:

1. **Mapa de promessas em processo** — N requests concorrentes na mesma chave viram 1 execução.
   Resolve 95% dos casos e é grátis.
2. **Lock `SET <key>:lock <id> NX EX 10`** — só para as agregações caras (`top-albums`,
   `album stats`, Spotify token). Quem não pega o lock espera 50ms, tenta o `get` uma vez e, se
   ainda for miss, calcula (correção > espera).

### 3.4 docker-compose (dev)

```yaml
redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6380:6379" # 6380 no host, mesmo motivo do mongo em 27018
    command: redis-server --save "" --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru
```

Sem volume, de propósito: cache é descartável. `allkeys-lru` porque toda chave aqui tem TTL e
nenhuma é fonte da verdade.

### 3.5 Env (`config/env.schema.ts`)

```ts
CACHE_DRIVER: z.enum(['memory', 'redis', 'off']).default('memory'),
REDIS_URL: z.string().url().optional(),
CACHE_PREFIX: z.string().default('tbt'),
```

Refinamento Zod: `CACHE_DRIVER=redis` **exige** `REDIS_URL`, crash no boot com mensagem clara
(seção 7 do CLAUDE.md). Em `test`, driver forçado para `off` — teste com cache implícito mente.

---

## 4. Namespace de chaves

Formato: `{prefix}:{env}:{domínio}:{versão}:{discriminantes}`

`tbt:prod:feed:v41:p1:30`

- `env` no meio evita que dev e prod compartilhem chave se alguém apontar o mesmo Redis.
- Chave é montada **só** em `cache-keys.ts`, com função tipada por endpoint. String solta espalhada
  pelo código é como se perde invalidação.
- Query de texto livre entra como `sha1(query.trim().toLowerCase()).slice(0,12)`, nunca crua.

---

## 5. Invalidação — versão (epoch), não `SCAN`

O feed é paginado por `page`/`perPage`. Invalidar "o feed" por padrão de chave exigiria `SCAN`
(O(n), bloqueante em Redis grande) ou `KEYS` (proibido). A alternativa é **contador de versão**:

```
tbt:prod:ver:rankings   -> 41      # bump em mutação que afeta listagem pública
tbt:prod:ver:album:{id} -> 7
tbt:prod:ver:user:{id}  -> 12
```

A versão entra **dentro** da chave de leitura. Bump = `INCR` (O(1)) → todas as chaves da versão
antiga ficam órfãs e morrem no TTL. Sem `SCAN`, sem `DEL` em massa, sem lista de chaves para manter.

Custo: 1 `GET` de versão antes do `GET` de dado. Resolve-se com **pipeline** (1 RTT) e, para o feed,
memoizando a versão em processo por 1s.

### 5.1 Mapa mutação → bump

| Use case / rota | `ver:rankings` | `ver:album:{id}` | `ver:user:{id}` |
| --- | --- | --- | --- |
| `CreateOrGetRanking` (novo) | — | — | ✅ |
| `RateTrack` | ✅ *se o ranking está ou ficou completo* | ✅ | ✅ |
| `SetTrackIgnored` | ✅ *idem* | ✅ | ✅ |
| `SaveReview` | ✅ | ✅ | ✅ |
| `ResetRanking` | ✅ | ✅ | ✅ |
| `DeleteRanking` | ✅ | ✅ | ✅ |
| `UpdateProfile` (displayName) | ✅ | ✅ | ✅ |
| `UploadAvatar` | ✅ | ✅ | ✅ |
| `DeleteAccount` | ✅ | ✅ | ✅ |
| Comentários (CRUD) | — | — | — |

Duas armadilhas que esse mapa endereça:

1. **`UpdateProfile` e `UploadAvatar` invalidam o feed.** O feed embute `userDisplayName` e
   `userAvatarUrl` via `$lookup` em `users`
   ([discovery.service.ts:81-89](../api/src/modules/discovery/discovery.service.ts#L81-L89)).
   Trocar o nome e não bumpar deixa o nome antigo na timeline. É o esquecimento clássico.
2. **`RateTrack` só bumpa o global se o ranking está ou ficou completo**, porque `feed` e
   `top-albums` filtram `completedAt: { $ne: null }`. Nota em ranking incompleto não aparece em
   nenhuma listagem pública, e bumpar ali jogaria fora o cache do feed a cada clique de estrela.
   Já trocar a nota de um ranking **já completo** muda a média exibida no feed, então bumpa.
   Implementado em [`invalidate-ranking-cache.ts`](../api/src/modules/ranking/application/invalidate-ranking-cache.ts),
   um lugar só, com teste por linha desta tabela.

### 5.2 Onde o bump é chamado

`CacheInvalidatorPort` (Symbol) injetado nos use cases de Ranking e Identity. Um método por
intenção — `rankingPublished(albumId, userId)`, `rankingChanged(albumId, userId)`,
`userProfileChanged(userId)` — não um `invalidate(key)` genérico, que só empurra a decisão para
quem chama.

Use case não sabe o que é Redis; sabe que publicou um ranking. Em teste unitário, o fake registra
as chamadas e o teste afirma o mapa da tabela 5.1 — invalidação testada é invalidação que sobrevive
a refactor.

Alternativa considerada e recusada por ora: despachar os `DomainEvent` que o `AggregateRoot` já
acumula (`pullDomainEvents()`) e ter um listener de cache. É mais elegante e desacopla de verdade,
mas exige um event bus que hoje não existe — fica registrado como evolução, não como pré-requisito.

---

## 6. Tabela de TTL

| Chave | TTL | Invalidação explícita | Racional |
| --- | --- | --- | --- |
| `spotify:search:{hash}:{limit}:{offset}` | 24h | não | catálogo público, imóvel |
| `spotify:album:{id}:missing` | 1h | não | 404 pode virar 200 se o álbum aparecer |
| `spotify:token` | `expires_in − 60s` | não | espelha o Spotify |
| `top-albums:v{ver}:p{page}:{perPage}` | 5min | `ver:rankings` | agregação global |
| `feed:v{ver}:p{page}:{perPage}` | 60s | `ver:rankings` | TTL curto é a rede de segurança do bump esquecido |
| `album-stats:v{ver}:{albumId}` | 10min | `ver:album` | |
| `album-reviews:v{ver}:{albumId}:p{page}` | 5min | `ver:album` | |
| `user-stats:v{ver}:{userId}` | 5min | `ver:user` | |
| `user-rankings:v{ver}:{userId}:{sort}:p{page}` | 60s | `ver:user` | só quando `search` vazio |
| `ver:*` | sem TTL | — | perder a versão só causa um miss geral, é seguro |

TTL curto **e** invalidação explícita, sempre os dois. Bump errado ou esquecido tem prazo de
validade; TTL sozinho deixa dado velho na tela do usuário que acabou de publicar.

---

## 7. Observabilidade

- Contador `hit`/`miss`/`error` por prefixo de chave, exposto em `GET /v1/health` (ou `/metrics`).
  Sem hit ratio medido, "coloquei Redis" é fé, não engenharia.
- Log `warn` quando `factory()` de um `getOrSet` passa de 200ms — é o candidato seguinte a otimizar.
- Aceite de cada fase referencia número medido, igual à tabela da seção 0.

---

## 8. Testes

- **Unit**: `InMemoryCache` real (não mock) nos testes de service; `FakeCacheInvalidator` que grava
  as chamadas nos use cases, afirmando a tabela 5.1.
- **Invalidação**: cachear → mutar via use case → ler de novo → afirmar valor novo. Um teste por
  linha da tabela 5.1.
- **E2E**: `CACHE_DRIVER=off` no padrão dos e2e existentes (determinismo) + um arquivo dedicado
  `cache.e2e-spec.ts` com driver `memory` cobrindo hit, invalidação e degradação (adapter que
  lança erro em todo comando → resposta continua 200).
- **Resiliência**: teste que aponta o adapter Redis para porta morta e afirma que o endpoint
  responde 200 com dado do Mongo.

---

## 9. Fases

> **Estado: fases 1–4, 6 e 7 implementadas e medidas.** Resultado real, mesma máquina e base da
> seção 0:
>
> | Aceite | Antes | Depois |
> | --- | --- | --- |
> | `albums/search?q=lorde` (2ª chamada) | 617ms | **3ms** |
> | `albums/search` com caixa/espaço diferente | 617ms | **2ms** (chave normalizada) |
> | `albums/{id inexistente}` (2ª chamada) | 152ms | **3ms** |
> | `albums/{id malformado}` | **500** em 384ms | **404** em 4ms |
> | `discovery/feed?perPage=30` (2ª chamada) | 5ms | **2ms** + `Cache-Control` |
> | `top-albums` (2ª chamada) | 12ms | **3ms** |
> | Feed: 20 páginas por cursor | — | **630 itens, 0 duplicata** |
> | Feed profundo | `$skip page=100`: 16ms | cursor pág. 20: **11ms** |
> | Peso de capas por tela de feed | 2.7MB (640px) | **0.91MB** (300px) |
> | Redis fora do ar, API no ar | — | **todas as rotas 200**, health `cache.status: down` |
>
> Fase 5 (throttler distribuído + métricas por prefixo) segue pendente — só faz sentido com mais de
> uma instância em produção. `Cache-Control` já foi entregue junto da fase 3.

### Fase 1 — Fundação (sem mudar comportamento)

`CachePort`, `InMemoryCache`, `NullCache`, `CacheModule` global, `cache-keys.ts`, env
(`CACHE_DRIVER`/`REDIS_URL`/`CACHE_PREFIX`), `redis` no `docker-compose.yml`, `redis` no
`/v1/health`.

**Aceite:** `CACHE_DRIVER=off` → toda resposta byte-idêntica à de hoje; `memory` → idem;
suíte atual passa sem alteração; `docker compose up -d redis` sobe e o health reporta `up`.

### Fase 2 — Spotify (o ganho real)

`search` com TTL 24h, negative cache de álbum 404, token de app movido para a porta de cache com
lock `NX`.

**Aceite:** 2ª chamada de `search?q=lorde` **abaixo de 20ms** (hoje 617ms — número da seção 0);
`GET /v1/albums/{id-inexistente}` repetido abaixo de 20ms (hoje 152ms); com duas instâncias
apontando ao mesmo Redis, apenas **uma** request a `accounts.spotify.com/api/token`;
`CACHE_DRIVER=off` mantém o comportamento antigo (bate no Spotify sempre).

### Fase 3 — Discovery com epoch

`getOrSet` em `top-albums`, `feed`, `album stats`, `album reviews`, `user stats`, rankings do
usuário (só sem `search`). Versões `ver:rankings` / `ver:album` / `ver:user`.

**Aceite:** hit ratio > 80% após navegação normal (feed → álbum → perfil → top);
nenhuma chamada a `SCAN`/`KEYS` no código; leitura cacheada faz no máximo 2 RTT ao Redis.

### Fase 4 — Invalidação completa

`CacheInvalidatorPort` nos use cases conforme tabela 5.1 + testes de invalidação.

**Aceite:** publicar ranking aparece no feed **na request seguinte** (não em 60s);
trocar `displayName` reflete no feed na request seguinte; avaliar faixa sem completar o ranking
**não** invalida o feed (assertivo no teste do fake).

### Fase 5 — Escala e borda

`ThrottlerStorageRedis`, `Cache-Control`/`ETag` nas leituras públicas, métricas de hit/miss,
`Dockerfile`/deploy com `REDIS_URL` de produção (Upstash/Redis Cloud/Railway).

**Aceite:** rate limit respeitado com 2 instâncias (61ª request em 60s toma 429 mesmo alternando
instância); `feed` responde `304` quando o `ETag` bate.

### Fase 6 — Capas em 300px (seção 11)

`imageUrlSmall` no catálogo, projeções do Discovery servindo o pequeno, backfill dos álbuns já
cacheados, web consumindo o campo novo.

**Aceite:** peso de uma tela de feed **abaixo de 800kb** (hoje 2.7MB — medido na seção 11);
nenhuma capa em branco durante o carregamento; detalhe do álbum continua em 640px.

### Fase 7 — Feed por cursor (seção 12)

`cursor` opcional em `GET /v1/discovery/feed`, `nextCursor` no `meta`, web usando cursor no
`useInfiniteQuery`. `page` continua funcionando (contrato aditivo, seção 2.3 do CLAUDE.md).

**Aceite:** 100ª página por cursor com o mesmo tempo da 1ª (hoje `$skip` descarta 2.970 docs);
`explain()` da query de cursor sem `SKIP` no plano; feed da web sem duplicata nem item perdido
entre páginas.

---

## 10. Riscos e o que não fazer

- **Não cachear resposta que embute dado de usuário sem bumpar no `UpdateProfile`.** É o bug de
  cache mais provável deste projeto (seção 5.1, item 1).
- **Não usar `KEYS`/`SCAN` para invalidar.** É o motivo de existir o esquema de versão.
- **Não cachear entidade de domínio nem documento Mongoose.** Só DTO de resposta — VO reidratado de
  JSON burla o construtor privado que garante a invariante (seção 4.3).
- **Não deixar cache virar fonte da verdade.** Nada que só exista no Redis. Flush de Redis tem que
  ser um evento chato (latência sobe), nunca perda de dado.
- **Não subir Redis em produção sem `maxmemory-policy`.** Sem política, o Redis enche e passa a
  recusar escrita em vez de descartar chave velha.
- **Não cachear `search` de "minhas avaliações"** (texto livre): cardinalidade de chave sem teto e
  4ms de resposta hoje.
- **Não instalar Redis antes de decidir a topologia de deploy.** Uma instância → `memory` já entrega
  as fases 2 e 3. A porta de cache existe exatamente para essa decisão custar uma variável de
  ambiente, não um refactor.
- **Não usar cache como desculpa para não consertar a query.** Fases 6 e 7 são exatamente os dois
  problemas que Redis maquiaria: capa pesada continua pesada no primeiro acesso de cada usuário, e
  `$skip` profundo continua caro em toda página ainda não cacheada.

---

## 11. Capas: 640px servidas para exibir em 210px

Medido nas 30 capas da primeira página do feed:

```
prefixo de imagem: ab67616d0000b273 (=640px) em 30/30 capas
média 93kb por capa   =>  30 capas ≈ 2.7MB por tela
protocolo do i.scdn.co: HTTP/1.1
```

Três problemas empilhados:

1. **9x mais pixel do que aparece.** O card do grid renderiza ~210px de largura; a capa vem em 640px.
   `normalizeAlbumSummary` pega `raw.images[0]`
   ([spotify-normalizer.ts:58](../api/src/modules/album-catalog/spotify-normalizer.ts#L58)), que é
   sempre o maior dos três tamanhos que o Spotify devolve (640 / 300 / 64).
2. **2.7MB por tela de feed.**
3. **`i.scdn.co` responde em HTTP/1.1**, não h2 → o browser limita ~6 conexões por host, e as 30
   capas entram em fila de 6 em 6. As últimas da fila são as que aparecem em branco — o sintoma que
   parecia bug de lazy loading.

Correção: guardar os dois tamanhos e servir cada um onde faz sentido.

| Onde | Tamanho | Campo |
| --- | --- | --- |
| Card do grid (feed, top, perfil, busca) | 300px | `imageUrlSmall` |
| Página de detalhe do álbum | 640px | `imageUrl` |

- `AlbumSummary.imageUrlSmall = raw.images[1]?.url ?? raw.images[0]?.url` — vem do próprio Spotify,
  não de heurística de URL.
- Projeções do Discovery usam `$ifNull: ['$album.imageUrlSmall', '$album.imageUrl']`, então álbum
  cacheado antes da mudança continua funcionando (só pesado) até o backfill.
- **Backfill** dos ~N álbuns já em cache: o CDN do Spotify usa o mesmo id de imagem com prefixo por
  tamanho, então `ab67616d0000b273` → `ab67616d00001e02` converte 640 em 300 sem chamar a API.
  Script idempotente, só toca documento sem `imageUrlSmall` e cujo `imageUrl` casa com o prefixo de
  640; o que não casar fica como está (fallback do `$ifNull` cobre).

Esperado: 93kb → ~22kb por capa, **2.7MB → ~0.65MB** por tela. Mesmo número de requests, cada uma 4x
mais curta — a fila de 6 esvazia rápido e o branco desaparece.

---

## 12. Feed por cursor em vez de `$skip`

Hoje ([discovery.service.ts:162-170](../api/src/modules/discovery/discovery.service.ts#L162-L170)):

```js
{ $match: { completedAt: { $ne: null } } },
{ $sort:  { createdAt: -1 } },
{ $skip:  (page - 1) * perPage },
{ $limit: perPage },
```

`$skip` não pula — percorre e descarta. `page=50, perPage=30` lê 1.500 entradas de índice para
entregar 30; `page=100` descarta 2.970. O custo cresce com a profundidade do scroll, e cache não
resolve porque cada página é uma chave distinta: a primeira visita de cada página paga integral.

Cursor (keyset) com o índice `(completedAt, createdAt)` que já existe:

```js
{ $match: { completedAt: { $ne: null }, $or: [
    { createdAt: { $lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },  // desempate estável
] } },
{ $sort:  { createdAt: -1, _id: -1 } },
{ $limit: perPage },
```

- Cursor opaco: base64 de `{createdAt ISO}|{id}`. Cliente não interpreta, só devolve.
- `_id` no desempate evita o clássico item duplicado/perdido quando dois rankings têm o mesmo
  `createdAt` na fronteira de página.
- Contrato **aditivo**: `cursor` é query param opcional, `meta.nextCursor` é campo novo, `page`
  continua funcionando para quem já usa. `meta.total` continua vindo (agora do cache, TTL 60s,
  invalidado por `ver:rankings`) — é o único pedaço que ainda custa O(n).
- Custo constante em qualquer profundidade. Perde "pular para a página 7", que o scroll infinito
  nunca usou.
