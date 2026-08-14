# Loading states — skeletons, spinners e feedback

> Levantamento completo de toda chamada HTTP do app (`src/queries/**`, 39 hooks em 7 domínios) e do
> tratamento de loading em cada tela/componente que os consome. Objetivo: decidir **skeleton vs
> spinner vs inline vs nada**, tela por tela, web + mobile (Capacitor/responsivo), e onde um texto
> de feedback abaixo do spinner é necessário.

---

## 0. Contexto que muda a decisão em cada caso

- `staleTime` global é **60s** (`app/query-client.ts`) — skeleton/spinner só aparecem em load
  **frio de verdade** (primeira visita, ou depois de 60s parado). Navegação normal entre telas já
  visitadas não pisca nada disso. Isso já limita bastante onde vale investir.
- `AlbumCatalogService` (API) cacheia álbum do Spotify em Mongo depois do primeiro `GET`
  (ver `docs/PLANO-FEATURES.md`, F1). Primeira visita a um álbum nunca visto por ninguém: ~700ms+
  (Spotify). Álbum já visto por qualquer usuário: cache local, rápido. **A duração do load de
  álbum é imprevisível** — é exatamente o cenário onde um texto de feedback compensa.
  `AlbumRatingView` ainda soma **outra** chamada em sequência (cria o ranking só depois que a
  leitura confirma que não existe — não é paralelo), o que piora ainda mais o pior caso.
- Mutações de toggle (nota por estrela, ignorar faixa, seguir/deixar de seguir) já são
  **otimistas** (`onMutate` escreve no cache antes da resposta) — a UI muda no clique, não no
  round-trip. Nenhuma dessas precisa de spinner; colocar um seria regressão, não melhoria.
- Mobile aqui é **responsivo** (Tailwind `sm:`/`md:`), não view nativa separada — o mesmo build
  roda como PWA e dentro do Capacitor (`android/`). Não existe pull-to-refresh nem layout mobile
  divergente hoje; loading não precisa de tratamento por breakpoint, só o **grid** (colunas) já
  muda por `GRID_CLASSES`, e skeleton deve seguir a mesma classe pra não desalinhar.

## 1. Regra de decisão

| Situação | Usar | Texto abaixo? |
| --- | --- | --- |
| 1º load de tela cujo layout final é grid/lista de cards | **Skeleton** no formato exato do card real (mesma `GRID_CLASSES`) | Não — o skeleton já é a comunicação |
| 1º load de tela com layout fixo não-lista (cabeçalho + seções) | **Skeleton** aproximando os blocos reais (avatar redondo, barras de texto, linhas de faixa) | Só se a chamada depende de API externa lenta/imprevisível (ver §0) |
| Paginação / scroll infinito ("carregar mais") | **Spinner pequeno centralizado** na sentinela | Não — o conteúdo já visível dá o contexto |
| Ação pontual sem otimismo (delete, reset, salvar review, upload) | **Spinner inline no botão** (ícone `Loader2` substituindo o ícone da ação) + texto do botão troca pro gerúndio | Não — o texto do botão já é o feedback |
| Ação pontual com update otimista (estrela, ignorar faixa, seguir) | **Nada** — UI já mudou no clique | Não |
| Conteúdo secundário que pode simplesmente não existir (stats de comunidade, "continuar avaliando", reviews da comunidade) | **Nada visível** — aparece quando chega, não reserva espaço | Não |
| Dropdown/modal com lista própria (notificações, seguidores/seguindo) | **Spinner pequeno centralizado** dentro do container já visível | Não |
| Splash de bootstrap da sessão (`AppProviders`) | Já correto, é branding — não é spinner nem skeleton | — |

---

## 2. Primitivos a criar/ajustar (`shared/ui`, `shared/lib`)

1. **`Button` ganha prop `isLoading?: boolean`** (`shared/ui/Button.tsx`). Hoje cada tela resolve
   isso na mão — três variações diferentes convivem (só troca texto; texto + `Loader2` manual;
   nada visível). Padronizar: quando `isLoading`, renderiza `Spinner` no lugar do ícone da ação,
   mantém o texto (ou aceita um `loadingText` opcional), e já aplica `disabled`. Sem quebrar a API
   atual — todo `disabled={x.isPending}` existente continua funcionando, só passa a también receber
   `isLoading={x.isPending}`.
2. **`useRotatingLoadingText`** sai de dentro de `DiscoverPage.tsx` (hoje é uma função local) para
   `shared/lib/use-rotating-loading-text.ts`. É o único lugar do app que já resolve bem "spinner +
   texto que muda", e o padrão vale para os outros dois pontos que batem no Spotify (§3.7, §3.8).
3. **`AlbumHeaderSkeleton`** (novo, `shared/album/AlbumHeaderSkeleton.tsx`): bloco de capa
   (28×28 mobile / 36×36 desktop, mesmo breakpoint do real), duas barras de texto (título/artista),
   score fake, barra de progresso fake, e N `TrackRowSkeleton` (linha com número + capa pequena +
   duas barras). Usado por `AlbumRatingView` e `PublicAlbumRankingView` — hoje os dois têm layout
   idêntico e os dois só mostram um `Spinner` solto.
4. **`ProfileHeaderSkeleton`** (novo, `features/discovery/components/ProfileHeaderSkeleton.tsx`):
   avatar redondo + duas barras de texto + dois `StatCard` fake + grid de `FeedCardSkeleton`
   (reaproveita o que já existe). Usado só por `PublicProfilePage` — `MyRankingsPage` já resolve
   isso certo porque não depende de um "dono" carregado antes do resto.

Nenhum desses exige biblioteca nova — tudo em cima do `Skeleton`/`Spinner` que já existem.

---

## 3. Inventário completo, tela por tela

### 3.1 Feed (`/feed` → `FeedPage.tsx`)
- HTTP: `useFeedInfiniteQuery`, `useGenresQuery`.
- Atual: skeleton grid (10× `FeedCardSkeleton`) no 1º load, spinner na paginação. **Correto, é o padrão-ouro — não mexer.**

### 3.2 Top Álbuns (`/top-albums` → `TopAlbumsPage.tsx`)
- HTTP: `useTopAlbumsInfiniteQuery`, `useGenresQuery`.
- Atual: mesmo padrão do Feed. **Correto, não mexer.**

### 3.3 Meus Rankings (`/my-rankings` → `MyRankingsPage.tsx`)
- HTTP: `useProfileInfiniteQuery`, `useUserStatsQuery`, `useGenresQuery`.
- Atual: skeleton grid no 1º load, spinner na paginação; os dois `StatCard` mostram `–` enquanto
  `useUserStatsQuery` não resolve. **Correto — `–` como placeholder de número é aceitável pra dado
  secundário, mesmo padrão do "continuar avaliando" na sidebar.**

### 3.4 Perfil público (`/profile/$userId` → `PublicProfilePage.tsx`) — **gap**
- HTTP: `useProfileInfiniteQuery`, `useUserStatsQuery`, `useFollowStatsQuery`, `useGenresQuery`.
- Atual: `Spinner` central de página inteira (`h-8 w-8`, sem texto) cobrindo cabeçalho + stats +
  grid — inconsistente com a Meus Rankings, que é literalmente a mesma listagem.
- Alvo: trocar pelo novo `ProfileHeaderSkeleton` (§2.4). Sem texto — layout previsível, delay é só
  Mongo (rápido).
- Responsivo: o skeleton do cabeçalho precisa dos dois arranjos que o real já tem —
  `flex-col items-center` no mobile, `sm:flex-row sm:items-start` no desktop — senão o salto do
  skeleton pro conteúdo real pula de layout.

### 3.5 Pesquisar (`/search` → `SearchPage.tsx`) — **gap**
- HTTP: `useSearchAlbumsInfiniteQuery`.
- Atual: `Spinner` central simples (sem skeleton, sem texto) enquanto `query.trim() && isLoading`.
- Alvo: grid skeleton igual ao do Feed/Top Álbuns (`FeedCardSkeleton` serve — mesmo card,
  `AlbumCard` tem o mesmo formato de imagem+título+artista). Sem texto: busca full-text local
  responde em dezenas de ms na maioria dos casos (F1 do `PLANO-FEATURES.md`); só cai no Spotify
  em query nova, e mesmo assim é uma ação que o próprio usuário disparou (digitou e já espera
  alguma espera).

### 3.6 Descobrir (`/discover` → `DiscoverPage.tsx`)
- HTTP: `useNewReleasesInfiniteQuery` / `useTopChartInfiniteQuery` (Apple Music, sem cache local
  equivalente ao do catálogo), `useNewReleasesGenresQuery` / `useTopChartGenresQuery`.
- Atual: **já é o único lugar do app com spinner + texto rotativo** (`discover.loading1/2/3`,
  troca a cada 5s). Correto — é a chamada mais lenta e menos previsível do app.
- Alvo: só extrair o hook pra `shared/lib` (§2.2) pra reaproveitar em 3.7/3.8. Comportamento
  visual não muda.

### 3.7 Avaliar álbum (`AlbumRatingView.tsx` — rotas `/album/$albumId`, `/search_/$albumId`,
`/discover_/$albumId`, `/feed_/$userId/album/$albumId` e `/profile/.../album/$albumId` quando é
o próprio usuário) — **gap prioritário**
- HTTP: `useAlbumDetailQuery` (Spotify, cacheado por álbum), `useMyRankingForAlbumQuery`,
  `useAlbumStatsQuery`, `useCreateOrGetRankingMutation` (dispara **depois** da leitura confirmar
  que não existe ranking — sequencial, não paralelo).
- Atual: `Spinner` central de página inteira (`h-8 w-8`, sem texto) cobrindo tudo — cabeçalho,
  capa, tracklist inteira — até as três chamadas resolverem. É a tela mais visitada do app
  (é o fluxo central do produto) e a que tem o pior-caso de latência (álbum nunca visto +
  criação de ranking em sequência).
- Alvo: `AlbumHeaderSkeleton` (§2.3) com o número de linhas de faixa aproximado (usar um número
  fixo tipo 10, não dá pra saber quantas faixas tem antes do álbum carregar). **Mais um texto de
  feedback rotativo** abaixo do bloco de capa, reaproveitando `useRotatingLoadingText`
  (ex.: "Buscando o álbum..." → "Preparando seu ranking..."), porque o pior caso passa fácil de
  2s e o skeleton sozinho não explica a segunda etapa (criar o ranking).
- Responsivo: skeleton precisa espelhar exatamente o breakpoint do cabeçalho real
  (`flex-col items-center text-center` → `sm:flex-row sm:items-start`, capa 28×28 → `sm:36×36`).

### 3.8 Ver ranking de outro usuário (`PublicAlbumRankingView.tsx`) — **gap**
- HTTP: `useAlbumDetailQuery`, `useUserRankingForAlbumQuery`, `useProfileQuery` (só pra
  nome/avatar de quem avaliou).
- Atual: mesmo `Spinner` central simples do item anterior.
- Alvo: reaproveitar o mesmo `AlbumHeaderSkeleton` (mesma tracklist, cabeçalho um pouco diferente
  — sem botão "Sua review", com bloco de reviewer no lugar). **Sem** texto rotativo aqui: não tem
  a etapa extra de criar ranking, e o álbum quase sempre já está em cache (alguém já rankeou antes
  de existir uma URL pra essa tela). Se quiser um fallback pro raro caso de demora, um texto único
  ("Carregando álbum...") depois de ~2s é suficiente — não precisa rotacionar.

### 3.9 Stats de comunidade (`AlbumStatsSection.tsx`)
- HTTP: `useAlbumStatsQuery`.
- Atual: `isLoading || !data || ratingsCount === 0` → `return null`. Card só aparece quando (e se)
  tem dado. **Correto — conteúdo secundário, colapsar até ter dado é melhor que reservar espaço
  vazio.**

### 3.10 Reviews da comunidade (`AlbumReviewsList.tsx`)
- HTTP: `useAlbumReviewsInfiniteQuery`.
- Atual: mesmo padrão do item anterior (`isLoading || items.length === 0` → `null`), paginação com
  spinner correto. **Aceitável, baixa prioridade** — é seção secundária abaixo da dobra.

### 3.11 Prévia de áudio (`TrackPreviewCell.tsx` / `TrackPreviewPlayer.tsx`)
- HTTP: `useTrackPreviewQuery` (sob demanda, só no clique de play).
- Atual: `Spinner` de 14px substitui o ícone play dentro do botão circular de 28px, sem texto.
  **Correto** — elemento pequeno, ação local, sem espaço nem necessidade pra texto.

### 3.12 Favorita/pior faixa (`FavoriteWorstPicker.tsx`)
- HTTP: `useSaveReviewMutation` (×2, um por select).
- Atual: `Spinner` de 14px ao lado do label ("Faixa favorita"/"Pior faixa") enquanto salva, sem
  texto — o label já diz o que está sendo salvo. **Correto, é o padrão certo pra campo único.**

### 3.13 Review em texto (`ReviewForm.tsx`)
- HTTP: `useSaveReviewMutation`.
- Atual: botão só troca o texto pra "Salvando...", sem ícone. Funciona, mas diverge do padrão que
  vai virar `Button isLoading` (§2.1). **Ajuste de consistência, não é bug.**

### 3.14 Reset/remover ranking (`RankingActions.tsx`) — **gap**
- HTTP: `useResetRankingMutation`, `useDeleteRankingMutation`.
- Atual: botão de confirmar dentro do `Modal` fica `disabled` durante `isPending`, mas **sem
  nenhum feedback visual** — nem spinner, nem troca de texto. É ação destrutiva/importante
  (reiniciar ranking, remover álbum inteiro), merece deixar claro que está processando.
- Alvo: `Button isLoading` (§2.1) nos dois botões de confirmação, texto vira "Reiniciando..." /
  "Removendo...".

### 3.15 Seguir usuário (`FollowButton.tsx`)
- HTTP: `useFollowStatsQuery`, `useFollowMutation`, `useUnfollowMutation`.
- Atual: `useFollowMutation`/`useUnfollowMutation` são otimistas — o botão já muda ícone/texto no
  clique. `disabled` cobre o round-trip, sem spinner. **Correto por design — não adicionar spinner
  aqui, seria regressão (efeito "travou" onde antes era instantâneo).**

### 3.16 Nota por estrela / ignorar faixa (dentro de `AlbumRatingView.tsx`)
- HTTP: `useRateTrackMutation`, `useSetTrackIgnoredMutation`.
- Atual: ambas otimistas (`onMutate` escreve o cache antes da resposta, com rollback em erro).
  Comentário no próprio código já explica a decisão. **Correto, não mexer.**

### 3.17 Notificações (`NotificationsBell.tsx`)
- HTTP: `useUnreadCountQuery` (badge, silencioso), `useNotificationsQuery(open)` (só busca ao
  abrir o dropdown), `useMarkNotificationReadMutation`, `useMarkAllNotificationsReadMutation`.
- Atual: `Spinner` pequeno centralizado dentro do dropdown já aberto, sem texto. **Correto.**

### 3.18 Seguidores/seguindo (`FollowListModal.tsx`)
- HTTP: `useFollowersQuery`, `useFollowingQuery`.
- Atual: `Spinner` centralizado dentro do `Modal`, paginação com spinner na sentinela.
  **Correto.**

### 3.19 Comentários (`CommentThread.tsx`) — **gap menor**
- HTTP: `useCommentsByRankingQuery`, `useCreateCommentMutation`, `useUpdateCommentMutation`,
  `useDeleteCommentMutation`.
- Atual: lista usa `Spinner` centralizado sem texto (correto). Criar/editar/excluir só desabilitam
  o botão, sem spinner. **Baixa prioridade** — mesma inconsistência do item 3.13/3.14, resolve
  junto quando `Button isLoading` existir.

### 3.20 Login / Registro / Exclusão de conta (`LoginForm.tsx`, `RegisterForm.tsx`,
`AccountDeletionPage.tsx`) — **gap menor**
- HTTP: `useLoginMutation`, `useRegisterMutation` (+ login em sequência), `useDeleteAccountMutation`.
- Atual: os três só trocam o texto do botão ("Entrando...", "Criando conta...", "Excluindo...").
  Funciona, mas sem ícone — diverge do que `OwnProfilePage` já faz num dos dois botões dela.
- Alvo: padronizar com `Button isLoading` (§2.1) — spinner + texto, os três formulários e os dois
  botões de `OwnProfilePage` (perfil e avatar) ficam visualmente iguais.

### 3.21 Perfil próprio (`OwnProfilePage.tsx`)
- HTTP: `useUpdateProfileMutation`, `useUploadAvatarMutation`.
- Atual: botão "Salvar" já tem `Loader2` manual + texto; botão "Trocar avatar" só troca texto.
  Inconsistente **entre os dois botões da mesma tela**. Resolve com `Button isLoading` (§2.1).

### 3.22 Card de compartilhar (`ShareCardButton.tsx`)
- Não é HTTP (renderiza um canvas local) — texto do botão já troca pra "Gerando...".
  **Fora de escopo, já correto.**

### 3.23 Sidebar — "continuar avaliando" (`AppSidebar.tsx`)
- HTTP: `useLastEditedAlbumQuery`.
- Atual: card só aparece quando `data` existe, sem reservar espaço enquanto carrega.
  **Correto** — mesmo padrão do item 3.9, conteúdo totalmente opcional.

### 3.24 Bootstrap da sessão (`app/providers.tsx`)
- HTTP: `useSessionQuery` (dentro de `Suspense`).
- Atual: `SessionSplash` — logo animado em tela cheia, nem spinner nem skeleton.
  **Correto, é branding proposital — não mexer.**

---

## 4. Fora de escopo

- `useCurrentUserQuery`, `useRequestPasswordResetMutation`, `useResetPasswordMutation` — hooks
  existem em `queries/auth/` mas **não têm nenhuma tela consumindo** (não existe fluxo de "esqueci
  minha senha" na UI ainda). Nada a ajustar até essa tela existir.
- Filtros de gênero (`GenreFilter` alimentado por `useGenresQuery` /
  `useNewReleasesGenresQuery` / `useTopChartGenresQuery`) não mostram estado de loading — select
  fica com lista vazia por uma fração de segundo. Efeito é mínimo (lista curada, cache de 60s) e
  não compensa o esforço.
- Pull-to-refresh / refresh nativo do Capacitor — não existe hoje no app, não foi pedido, e é
  fora do escopo de "loading de chamada HTTP" (seria um gesto novo, não um estado visual).

---

## 5. Ordem de execução sugerida

1. **Primitivos** (§2): `Button.isLoading`, extrair `useRotatingLoadingText`, criar
   `AlbumHeaderSkeleton` e `ProfileHeaderSkeleton`. Zero mudança visual sozinha — só prepara o
   resto.
2. **Gap prioritário** (§3.7, §3.8): `AlbumRatingView` e `PublicAlbumRankingView` — maior tela,
   maior tráfego, pior latência hoje.
3. **Gaps de listagem** (§3.4, §3.5): `PublicProfilePage`, `SearchPage` — troca de spinner solto
   por skeleton grid, consistência com Feed/Top Álbuns/Meus Rankings.
4. **Gaps de botão** (§3.14, §3.19, §3.20, §3.21, §3.13): aplicar `Button isLoading` nos pontos
   listados — mudança mecânica, baixo risco, uma leva só.
5. **`DiscoverPage`**: só a extração do hook (§3.6), sem mudança visual.

## 6. Critérios de aceite

- Nenhuma tela listada como "gap" continua usando `Spinner` solto de página inteira sem skeleton
  onde o layout final é previsível.
- `AlbumRatingView` e `PublicAlbumRankingView` compartilham o mesmo componente de skeleton (sem
  duplicar JSX).
- Todo botão de ação destrutiva ou não-otimista (reset, deletar, salvar review, login, registro,
  excluir conta, salvar perfil, trocar avatar) usa `Button isLoading` — nenhum fica só com
  `disabled` mudo.
- Texto de feedback rotativo só nos dois pontos que batem em API externa sem cache garantido
  (`DiscoverPage`, `AlbumRatingView`) — não espalhar pra telas com load rápido, isso vira ruído.
- `npm run typecheck && npm run lint && npm test` limpos depois de cada fase da §5.
