# Features novas — o que foi entregue e o que sobrou

> **Revisão 2.** As quatro features do plano foram implementadas. O plano detalhado original
> (decisões de abordagem, riscos avaliados) está no histórico do git; aqui fica o resultado, como
> foi verificado, e o que ficou de fora de propósito.

---

## 0. Estado

| Verificação | `api/` | raiz (web) |
| --- | --- | --- |
| typecheck | ✅ | ✅ |
| lint | ✅ | ✅ |
| test | ✅ **219/219** (33 suítes) | ✅ **4/4** (Vitest, novo) |
| build | — | ✅ |

Contrato regenerado (`openapi:gen` → `api:types`): os tipos das rotas novas saem do OpenAPI, nada
escrito à mão na web.

---

## 1. F1 — Busca full-text no catálogo cacheado

**Como ficou:** `AlbumCatalogService.search` consulta o índice de texto local antes do Spotify;
só a **primeira página** usa o local (misturar as duas paginações repetiria e pularia item).
Resultado do Spotify passa a alimentar a coleção `albums`, senão o índice nasceria vazio.

Arquivos: `album.schema.ts` (índice `album_text`, peso 3 no título), `album-catalog.service.ts`
(`searchLocal` + `rememberSearchResults`).

**A parte que não podia dar errado:** doc criado por busca **não tem faixas**. Ele entra com
`cachedAt: new Date(0)` — nasce stale, e o primeiro `getAlbum` busca o álbum completo. Com data
de agora, `getAlbum` devolveria um álbum sem faixa nenhuma e quebraria a criação de ranking.

**Verificado rodando:** busca que casa com o catálogo respondeu em **48 ms**, contra **722 ms** da
que foi ao Spotify. Álbum inserido pela busca (0 faixas) foi hidratado para 10 faixas no primeiro
`GET /albums/:id`, com `cachedAt` atualizado.

## 2. F2 — Seguir usuários / feed personalizado

**API:** módulo `follows` (simples) com `POST/DELETE /v1/users/:id/follow`, `follow-stats`,
`followers`, `following`. Seguir é **idempotente** (duplo clique não vira 409 nem duplicata) e
devolve `true` só quando o vínculo nasce — é o que impede notificar o mesmo seguidor duas vezes.

`GET /v1/discovery/feed?scope=following` filtra por quem o usuário segue. Sem cache neste caminho
(a chave seria por usuário; cardinalidade é assunto da Fase 5 do `CACHE-REDIS.md`), e sem ninguém
seguido devolve página vazia em vez de cair pro global.

**Web:** `queries/follows/`, botão Seguir/Seguindo no perfil público (otimista), abas
Global/Seguindo no feed com o escopo na querystring (sobrevive a reload e a link compartilhado).

**Duas correções que apareceram no caminho:**
- `JwtAuthGuard` agora identifica o usuário em rota pública quando há token válido — é o que
  permite `isFollowing` numa rota pública. Token ausente ou inválido segue anônimo, nunca 401.
- `PublicCacheInterceptor` não marca mais `Cache-Control: public` em resposta que depende de quem
  pergunta. Sem isso, um proxy compartilhado poderia servir o feed pessoal de um usuário a outro.

## 3. F3 — Notificações in-app

Porta `NotificationSender` (`shared/application/ports/`) + módulo `notifications` como adapter,
no mesmo padrão do `CacheInvalidator`. Emissores: `CommentsService.create` (comentário na sua
review) e `FollowsService.follow` (novo seguidor). Para saber a quem notificar um comentário,
entrou `RankingDirectoryService` no módulo Ranking — espelho do `UserDirectoryService`.

Endpoints: `GET /v1/notifications`, `unread-count`, `PATCH /:id/read`, `POST /read-all` — todos
escopados ao `sub` do token, nenhum aceita `userId` do cliente.

**Regras que têm teste:** não notifica a si mesmo; falha ao gravar **não derruba** a ação que a
originou (comentar funciona com a coleção quebrada); marcar como lida a notificação de outro
usuário não funciona (o `userId` está no filtro do update, não numa checagem depois).

**Web:** sino no `AppHeader` com badge, painel com marcar-como-lida ao clicar e "marcar todas".
Contador repolla a cada 60 s — única query do app com `refetchInterval`, intervalo longo de
propósito.

## 4. F4 — Compartilhar ranking como imagem

Card 1080×1350 (formato story) desenhado no cliente com `<canvas>`: capa, álbum, artista, nota e
top 3 faixas. `navigator.canShare({ files })` decide entre menu nativo (celular) e download
(desktop) — `navigator.share` sozinho existe em browser que recusa arquivo.

**Único backend necessário:** `GET /v1/albums/:id/cover`, que serve a capa pelo nosso domínio.
Imagem de outra origem sem CORS **contamina** o canvas e `toBlob` passa a estourar `SecurityError`
— justamente no celular, onde compartilhar importa. O proxy só aceita host de CDN do Spotify
(evita virar proxy aberto) e responde com cache de 7 dias.

Descartado: gerar o PNG no servidor (satori/resvg). Exigiria embutir arquivo de fonte e mais uma
dependência pesada, e o ganho real (`og:image` em preview de link) não existe enquanto a web for
SPA estática sem SSR.

---

## 5. O que ficou de fora (de propósito)

- **`og:image` / preview de link** — depende de SSR ou prerender, que a web não tem hoje.
- **Cache do feed personalizado** — Fase 5 do `CACHE-REDIS.md`; hoje conta e consulta direto.
- **Listas de seguidores/seguindo na UI** — a API expõe (`/followers`, `/following`) e os hooks
  existem (`useFollowersQuery`, `useFollowingQuery`), mas nenhuma tela consome ainda. Só o
  contador aparece no perfil.
- **Notificação de curtida/menção** — não existem essas ações no produto.
- **Push** — a porta já está desenhada pra isso; hoje o adapter só grava no Mongo.

## 6. Verificação de ponta a ponta (API rodando, Mongo em docker)

| Cenário | Resultado |
| --- | --- |
| seguir → seguir de novo | 200 nas duas, 1 seguidor, sem duplicata |
| seguir a si mesmo | 422 `CANNOT_FOLLOW_SELF` |
| `follow-stats` sem token | 200 com `isFollowing: false` |
| notificação de novo seguidor | criada, tipo `follow`, ator correto |
| marcar lida notificação de outro | 404 `NOTIFICATION_NOT_FOUND` (não vaza existência) |
| marcar a própria | 204, contador zera |
| `feed?scope=following` sem token | 401 |
| feed global sem `scope` | 200 — contrato antigo intacto |
| busca local vs Spotify | 48 ms vs 722 ms |
| álbum vindo de busca, ao ser aberto | hidratado de 0 → 10 faixas |
| proxy de capa | 200 `image/jpeg`, `max-age=604800, immutable` |

## 7. Pendência de infra que isto criou

`npm test` na raiz agora existe (Vitest + jsdom, 4 testes do card). Vale rodar junto do `pre-push`
e do CI, que hoje só cobrem a API — ver seção de tooling do `CLAUDE.md`.
