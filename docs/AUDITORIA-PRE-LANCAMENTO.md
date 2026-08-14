# Track by Track — o que falta

> **Revisão 4 — 2026-08-13.** Tudo que já foi corrigido saiu deste documento (está no histórico
> do git). Ficou só o que **não** foi feito. Repo verde no momento desta revisão: typecheck,
> lint e build limpos nas duas pastas; `202/202` testes na API; fluxo de auth, ranking e feed
> exercitado contra a API rodando.

---

## 1. Bloqueia publicar — depende de decisão sua

### 1.1 Valores reais do `api/.env.production`

`api/.env.production.example` está completo e cobre todas as chaves que o `env.schema.ts` valida,
incluindo `REDIS_URL` (comentado, obrigatório se `CACHE_DRIVER=redis`). Os valores reais vivem no
host de deploy — **conferir lá antes de publicar**. Secret de JWT e credenciais de Spotify e
Cloudinary precisam ser de produção, não os de dev.

### 1.2 Topologia de deploy → decide a Fase 5 do `docs/CACHE-REDIS.md`

Ponto concreto: o `ThrottlerModule` usa storage **em memória**. Com N instâncias, o limite de
5 req/min do login vira 5×N/min — o rate limit de auth deixa de valer como proteção de brute
force.

- **Uma instância** → nada a fazer, Fase 5 fica pra depois.
- **Mais de uma** → Fase 5 do `CACHE-REDIS.md` é obrigatória (throttler com storage Redis;
  métricas de hit/miss e `ETag` entram junto).

### 1.3 Observabilidade de erro (Sentry ou equivalente)

Precisa de conta/DSN e é decisão de custo e de onde os dados ficam — por isso nenhuma dependência
foi instalada. Hoje um 500 aparece só no `Logger.error`, já dentro do pino (log estruturado com
request id), o que é o mínimo aceitável mas não avisa ninguém.

**Quando decidir:** instalar o SDK, ler o DSN do env validado por Zod (crash se faltar em
produção, como o resto), e reportar do `DomainExceptionFilter` apenas o que cai no branch de 500 —
erro de domínio (4xx) é comportamento esperado, não incidente.

---

## 2. Dívida conhecida — não bloqueia, mas cobra juros

| Item | Onde | Por quê |
| --- | --- | --- |
| Criação de ranking dentro de `useEffect` | `src/shared/album/AlbumRatingView.tsx` | É efeito de criação, não fetch, mas fica na mesma vizinhança da regra 9 do `CLAUDE.md`. O jeito certo é criar no `loader`/`beforeLoad` da rota, ou deixar o `GET` responder já criando. |
| `src/componentes/` | pasta em português, fora de `features/`/`shared/` | Ainda em uso (rotas legais, `AppSidebar`). Migrar pra convenção quando mexer nesses arquivos — não vale um refactor dedicado agora. |
| `plan.md` na raiz | único arquivo não versionado da limpeza | Não foi apagado justamente por ser irrecuperável. Conferir se foi absorvido pelo `CLAUDE.md` e apagar você mesmo se sim. |

### 2.1 Comportamento a decidir (não é bug)

`persistRanking` apaga o ranking quando ele fica **sem nota, sem ignore e sem review** — é o que
impede rascunho vazio de contar como "álbum avaliado". Consequência: desfazendo a última
marcação, o `rankingId` que o cliente tem em mãos deixa de existir e a próxima chamada crua
àquele id responde 404. A web se recupera sozinha (invalida → `GET` volta `null` → `AlbumRatingView`
recria via create-or-get), então isso só machuca quem consumir a API direto.

Alternativa, se um dia incomodar: parar de apagar e confiar no filtro que o Discovery já aplica
(`HAS_RATED_TRACK_MATCH` exclui ranking sem faixa avaliada de listagem e estatística). Custo:
linhas vazias acumulam no banco.

---

## 3. Antes de publicar — checklist

- [ ] Conferir `api/.env.production` no host (1.1).
- [ ] Decidir topologia de deploy e, se for multi-instância, fazer a Fase 5 do `CACHE-REDIS.md` (1.2).
- [ ] Decidir observabilidade de erro (1.3).
- [ ] Rodar nas duas pastas: `npm run typecheck && npm run lint && npm test` (API) e
      `npm run typecheck && npm run lint && npm run build` (web).
- [ ] Testar no browser o fluxo completo: registro → login → criar ranking → avaliar →
      review → feed. O `curl` cobre a API, não cobre a UI.
- [ ] Se mexer em qualquer contrato da API: `npm run openapi:gen` (api) + `npm run api:types` (raiz)
      e commitar `openapi.json` e `schema.d.ts` juntos.

---

## 4. Roadmap de features (nada aqui foi implementado)

O produto já cobre o núcleo — ranking faixa a faixa, review, feed, perfil público, top álbuns.
As ideias abaixo partem do domínio existente, sem inventar bounded context novo; ordenadas por
esforço crescente:

1. **Compartilhar ranking como imagem** — card com capa, top 3 faixas e nota. Maior alavanca de
   aquisição orgânica pra esse tipo de produto, e o dado já está inteiro no agregado `AlbumRanking`.
2. **Exportar dados do usuário** — existe `DeleteAccount`, falta exportação. Fácil de justificar
   (LGPD) e barato: um endpoint que serializa rankings + reviews em JSON.
3. **Seguir usuários / feed personalizado** — hoje o feed é só global. `following` é coleção CRUD
   simples (mesma categoria de `comments` na seção 4.1 do `CLAUDE.md`) e o feed ganha um `$in`
   nos autores seguidos.
4. **Notificações in-app** — comentário na sua review, alguém te seguiu. `NotificationPort` copiando
   o padrão do `EmailSenderPort`: adapter "grava no Mongo" hoje, push depois.
5. **Comparar ranking com outro usuário** — diff visual "onde vocês concordam/discordam". Só este
   produto pode ter, dado que o agregado central já é uma ordenação completa das faixas.
6. **Filtros de Discovery por gênero/época** — `genres` já vem do Spotify e o Album Catalog já
   cacheia o álbum; sem chamada externa nova.
7. **Busca full-text no catálogo cacheado** — índice de texto no Mongo poupa rate limit do Spotify
   em busca repetida por título/artista já visto.
8. **PWA instalável** — `manifest.json` + service worker. Continua sendo a alternativa mais barata
   ao Capacitor: os scripts `cap:sync`/`cap:open` existem, mas o projeto Gradle segue precisando de
   manutenção própria.
9. **Embed público de ranking** — endpoint read-only + rota `iframe`-friendly pra plugar "meu top 10
   do álbum X" num blog. Reaproveita o `RankingView` que a API já serializa.
