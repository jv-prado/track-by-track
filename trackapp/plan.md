# Plano — Track by Track Mobile (Expo/React Native)

> **Regra inegociável, vale pra TODA fase abaixo, sem exceção:**
> **1:1 com o web.** Mesmos componentes, mesmas cores, mesma tipografia, mesmo fluxo, mesma
> hierarquia visual. Não inventar layout novo, não "melhorar" nada por conta própria, não
> adicionar tela/feature que não existe no `src/` hoje. Cada fase termina com checagem: "isso
> bate pixel-a-pixel/comportamento-a-comportamento com o componente web equivalente?" — se não
> bate, não tá pronto. Dúvida de design → pergunta antes de inventar.

Gerado em 2026-08-14. App fica em `trackapp/` (raiz do repo, irmão de `api/` e `src/`).

---

## 0. Por que não é WebView (recapitulando a decisão)

Capacitor (WebView) já funciona — APK debug rodou, API em prod, front em prod. Troca pra Expo é
por **performance/feel nativo** (scroll, animação, startup, gestos — ver conversa), não porque o
Capacitor tava quebrado. Web (`src/`, Vite) **não muda em nada** — continua sendo o app que roda
no browser, servido pela Vercel. `trackapp/` é um **terceiro codebase** (web / api / mobile),
consumindo a mesma API (`https://trackbytrack.fly.dev/v1`), sem reuso de UI com o web — só reuso
de contrato (tipos, formato de request/response) e, onde der, lógica de query.

## 1. Stack decidida

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Expo (managed workflow) + React Native** | EAS Build resolve iOS sem Mac; SDK gerenciado evita configurar Xcode/Gradle nativo à mão |
| Navegação | **Expo Router** | File-based, mesma cabeça mental do TanStack Router que o web já usa |
| Estilo | **NativeWind** | Sintaxe Tailwind — reaproveita os tokens do `@theme` do web quase direto (tabela §3) |
| Server state | **TanStack Query** | Mesma lib do web, funciona em RN sem adaptação |
| Client state | **Zustand** | Mesma lib do web, só sessão/UI (mesma regra da seção 5.4 do `CLAUDE.md`) |
| HTTP | **Axios** | Mesma lib do web; instância própria (sem cookie jar de browser — ver §5) |
| Forms | **React Hook Form + Zod** | Mesma lib do web |
| Storage seguro | **expo-secure-store** | Keychain (iOS) / Keystore (Android) pro refresh token — substitui o cookie httpOnly do web |
| Ícones | **lucide-react-native** | Mesma família do `lucide-react` usado no web, nomes de ícone idênticos |
| TypeScript | `strict: true` | Igual ao resto do projeto |

**Não entra:** Redux/MobX, styled-components, componente de UI de terceiro (RN Paper, Tamagui,
etc) — os componentes são os **mesmos** do design system do web, só reimplementados em RN
primitives + NativeWind, não trocados por lib de terceiro com visual próprio.

## 2. Fonts

Web usa `SF Pro Display` local (`src/assets/fonts/*.otf`, 6 pesos: Regular, RegularItalic,
Medium, Semibold, Bold, Heavy). Mobile carrega os **mesmos arquivos `.otf`**, copiados pra
`trackapp/assets/fonts/`, via `expo-font` (`useFonts` no `_layout.tsx` raiz, tela de loading até
carregar — igual princípio do `FormField`/Skeleton do web pra estado de loading).

## 3. Design tokens — mapeamento 1:1

Fonte: `src/index.css` (`@theme`). Direto pro `tailwind.config.js` do NativeWind, mesmos nomes de
classe (`bg-roxo`, `text-dourado`, etc) — zero tradução mental ao portar um componente.

| Token web | Valor | Uso |
|---|---|---|
| `roxo` | `#5d1f89` | cor de marca primária |
| `roxo-escuro` | `#341e49` | variante escura |
| `roxo-vivo` | `#7c3aed` | destaque/CTA |
| `dourado` | `#ffba08` | destaque secundário (rating, badges) |
| `dourado-claro` | `#f0c878` | variante clara |
| `grafite` | `#01080e` | fundo base (`body`, `html`) |
| `cinza-escuro` | `#171d1f` | superfícies elevadas (cards) |
| `cinza` | `#3e3e3f` | bordas/divisores |
| `cinza-medio` | `#888888` | texto secundário |
| `cinza-claro` | `#bcbcbc` | texto terciário |
| `offwhite` | `#e1e1e1` | texto sobre fundo escuro |
| `branco` | `#ffffff` | texto primário sobre fundo escuro |

Escala de fonte (`--font-heading`, `--font-subtitle`, etc, todos `SF Pro Display`) também migra
1:1 como `fontSize`/`fontWeight`/`lineHeight` no `tailwind.config.js`, mesmos nomes de variante
(`heading`, `heading-small`, `subtitle-large`, `subtitle`, `paragraph-large`, `paragraph`,
`paragraph-small`, `label`).

Animações CSS (`sheetSlideIn/Out`, `overlayFadeIn/Out`, `modalZoomIn/Out`, `toastSlideIn`) não
portam como CSS — viram `react-native-reanimated` com a **mesma curva de easing e duração**
(`cubic-bezier(0.16, 1, 0.3, 1)` etc já documentados no `index.css`, só troca a API, não o
resultado visual/timing).

## 4. Auth — mudança de contrato (cookie → secure storage)

RN não tem cookie jar de browser automático. Ajuste **aditivo** na API (não quebra o web):

- **API (`api/src/modules/identity/presentation/auth.controller.ts`)**: endpoints de login/
  register/refresh passam a também devolver o refresh token no **corpo** da resposta quando a
  request vier com header `X-Client: mobile` (além de continuar setando o cookie httpOnly pro
  web, que não manda esse header). Refresh (`POST /v1/auth/refresh`) aceita o token via header
  `Authorization` ou corpo, além do cookie.
- **Mobile**: `expo-secure-store` guarda o refresh token (Keychain/Keystore, não AsyncStorage
  puro — mesmo nível de proteção que o cookie httpOnly buscava no web). Access token em memória
  (Zustand sem persist), igual ao web (seção 5.3/5.4 do `CLAUDE.md`).
- Interceptor axios do mobile replica a lógica de single-flight refresh do `http.ts` do web
  (mesmo comportamento: 401 → refresh → reexecuta original 1x → falha limpa store e manda pra
  tela de login), só troca "lê cookie" por "lê secure-store".

Isso é trabalho de **fase própria** (fase 2 abaixo), feito antes de qualquer tela, porque toda
tela autenticada depende disso.

## 5. Inventário de telas (rotas web → Expo Router)

Cada rota do `src/routes/` vira 1 arquivo/grupo em `trackapp/app/`, mesmo conteúdo/fluxo:

| Rota web (`src/routes/`) | Tela mobile (`trackapp/app/`) | Conteúdo |
|---|---|---|
| `_auth.tsx` | `(auth)/_layout.tsx` | layout público |
| `_auth.login.tsx` | `(auth)/login.tsx` | login |
| `_auth.register.tsx` | `(auth)/register.tsx` | registro |
| `_app.tsx` | `(app)/_layout.tsx` | shell autenticado + guard (redirect se sem sessão) |
| `_app.index.tsx` | `(app)/index.tsx` | home |
| `_app.feed.tsx` | `(app)/feed.tsx` | feed global |
| `_app.feed_.$userId.album.$albumId.tsx` | `(app)/feed/[userId]/album/[albumId].tsx` | review de álbum a partir do feed |
| `_app.discover.tsx` | `(app)/discover/index.tsx` | descoberta |
| `_app.discover_.$albumId.tsx` | `(app)/discover/[albumId].tsx` | detalhe álbum via descoberta |
| `_app.search.tsx` | `(app)/search/index.tsx` | busca |
| `_app.search_.$albumId.tsx` | `(app)/search/[albumId].tsx` | detalhe álbum via busca |
| `_app.top-albums.tsx` | `(app)/top-albums/index.tsx` | top álbuns |
| `_app.top-albums_.$albumId.tsx` | `(app)/top-albums/[albumId].tsx` | detalhe álbum via top |
| `_app.album.$albumId.tsx` | `(app)/album/[albumId].tsx` | ranking do álbum (tela principal de avaliação) |
| `_app.my-rankings.tsx` | `(app)/my-rankings.tsx` | meus rankings |
| `_app.profile.index.tsx` | `(app)/profile/index.tsx` | meu perfil |
| `_app.profile.$userId.tsx` | `(app)/profile/[userId]/index.tsx` | perfil público |
| `_app.profile.$userId_.album.$albumId.tsx` | `(app)/profile/[userId]/album/[albumId].tsx` | review via perfil público |
| `_app.delete-account.tsx` | `(app)/delete-account.tsx` | exclusão de conta |
| `about.tsx` | `about.tsx` | sobre |
| `privacy-policy.tsx` | `privacy-policy.tsx` | política de privacidade |
| `terms-of-use.tsx` | `terms-of-use.tsx` | termos de uso |

**Decisão confirmada pelo usuário:** vira tab bar. E não precisa inventar nada — o web **já tem**
uma variante mobile (bottom nav) da própria `AppSidebar`, em
[`src/shared/layout/AppSidebar.tsx:239-335`](../src/shared/layout/AppSidebar.tsx#L239-L335)
(`<nav className="md:hidden fixed bottom-0 ...">`). É essa variante que porta 1:1, não a
sidebar desktop. Spec exata a reproduzir:

- **6 slots**: `Home`→`/feed`, `Search`→`/search`, `Sparkles`→`/discover`,
  `ListMusic`→`/my-rankings`, `Trophy`→`/top-albums` (via `Link`, navegação direta) + `UserIcon`
  (6º slot — **não é link**, abre menu popover com Perfil / Configurações / seletor de idioma /
  Sair, replicado no mobile como `BottomSheet`/menu nativo, mesmas 4 opções, mesma ordem).
- **Indicador ativo**: barra fina dourada (`bg-dourado`, `h-0.5`) que desliza via `translateX`
  proporcional ao índice ativo (`activeTabIndex`), largura `100% / 6`. Portar com
  `react-native-reanimated` (`withTiming`, mesma duração/easing `duration-300 ease-out`).
- **Ícone ativo**: `text-dourado` + `scale-110` (label aparece embaixo, fade-in ~150ms);
  **inativo**: `text-gray-400`, ícone sozinho sem label.
- **Fundo**: `bg-cinza-escuro`, borda superior `border-white/10`, respeita safe-area inferior
  (`env(safe-area-inset-bottom)` → `useSafeAreaInsets` do RN).
- **Card "continuar avaliando"**: flutua acima da tab bar, só nas rotas Feed/Search, some se o
  usuário dispensar aquele álbum específico (web usa `sessionStorage` por `albumId` — mobile usa
  estado em memória equivalente, comportamento idêntico por sessão do app).
- **Ativo em rota aninhada**: `/search/$albumId`, `/top-albums/$albumId`,
  `/feed/$userId/album/$albumId`, `/profile/$userId/album/$albumId` mantêm o tab pai ativo (não
  o próprio tab de Perfil quando é o álbum de outro usuário visto via Feed) — mesma lógica de
  `isNavActive`/`activePath` do arquivo original, portar 1:1.

## 6. Inventário de componentes — mapeamento 1:1

### 6.1 `shared/ui/` → `trackapp/components/ui/` (design system base)

Todos os 19 arquivos, mesmo nome, mesma responsabilidade, reimplementados em RN primitives:

`BottomSheet` `BrandIcon` `Button` `Card` `EmptyState` `ErrorState` `FormField` `GenreFilter`
`Input` `Modal` `Pagination` `PasswordInput` `ProgressBar` `Select` `Skeleton` `Spinner`
`StatCard` `TextArea` `Toast` (+ `toast-store.ts`, reuso direto — é lógica Zustand, não UI)
`ViewToggle`

### 6.2 `shared/album/` → `trackapp/components/album/`

`AlbumRatingView` `AlbumReviewsList` `AlbumStatsSection` `FavoriteWorstPicker` `RankingActions`
`ReviewForm` `ShareCardButton` `StarRating` `TrackPreviewCell` `TrackPreviewPlayer`
(+ `share-card.ts` — lógica de geração de card de compartilhamento, portar cuidando que RN não
tem `<canvas>` DOM; usar `react-native-view-shot` ou equivalente pra manter o resultado visual
idêntico)

### 6.3 `shared/layout/` → `trackapp/components/layout/`

`AppHeader` `AppSidebar` (vira tab bar, ver §5) `NotificationsBell`

### 6.4 `shared/social/` → `trackapp/components/social/`

`FollowButton` `FollowListModal`

### 6.5 `features/*/components/` → `trackapp/features/*/components/`

Mesma divisão por domínio do web:

- **album-catalog**: `AlbumCard` `AlbumDetailPage` `SearchPage`
- **auth**: `AccountDeletionPage` `LoginForm` `OwnProfilePage` `RegisterForm`
- **comments**: `CommentThread`
- **discovery**: `DiscoverPage` `FeedCard` `FeedCardSkeleton` `FeedPage` `MyRankingsPage`
  `PublicProfilePage` `TopAlbumsPage`
- **ranking**: `PublicAlbumRankingView` `UserAlbumRankingPage`

### 6.6 `shared/lib/` → `trackapp/lib/` (lógica pura, sem UI — reuso quase direto)

`cn.ts` (clsx+tailwind-merge, funciona igual em RN), `date.ts`, `genreLabel.ts`, `initials.ts`,
`scoreColor.ts`, `appleMusic.ts`, `youtube.ts`, `decode-waveform.ts`,
`use-track-preview-player.ts` (troca `<audio>` DOM por `expo-av`, mesmo comportamento/UX),
`use-infinite-scroll.ts` (troca scroll listener DOM por `onEndReached` de `FlatList`, mesmo
gatilho de paginação).

## 7. Camada de dados — o que reaproveita de verdade

- **`shared/api/schema.d.ts`**: gerado do mesmo `openapi.json` da API — copiar o script
  `api:types` pro `trackapp/package.json`, mesma fonte, zero tipo escrito à mão (mesma regra do
  `CLAUDE.md` seção 2.2/5.1).
- **`shared/api/types.ts`, `errors.ts`**: reuso quase 1:1 (código puro TS, sem DOM).
- **`queries/*`** (54 hooks TanStack Query no web, listados no inventário): a **assinatura e
  lógica** de cada hook (query key, `queryFn`, `staleTime`, invalidação) é portável quase
  copy-paste — só troca a instância axios importada (`shared/api/http.ts` do web → equivalente
  mobile do §4). Refeito arquivo por arquivo em `trackapp/queries/`, mesma estrutura de pasta por
  domínio (`auth/`, `ranking/`, `album-catalog/`, `discovery/`, `comments/`, `follows/`,
  `notifications/`), mesmo padrão de `index.ts` barril por domínio que o `CLAUDE.md` já definiu
  pro web (seção 5.1).
- **`shared/auth/auth.store.ts`**: reuso quase direto (Zustand, mesma forma), só troca onde o
  refresh token é lido/escrito (secure-store em vez de só depender do cookie).

## 8. Fases

Cada fase termina com checagem de paridade 1:1 antes de seguir pra próxima — não é opcional.

### Fase 1 — Scaffold + fundação
`npx create-expo-app trackapp` (TypeScript), Expo Router, NativeWind configurado com os tokens
da §3, fonts da §2 carregando, `tsconfig` `strict: true`. Estrutura de pasta espelhando §6
(`components/ui`, `components/album`, `components/layout`, `components/social`, `features/*`,
`lib/`, `queries/*`). `.env`/`app.config.ts` com `EXPO_PUBLIC_API_URL=https://trackbytrack.fly.dev/v1`.
**Aceite:** app roda no Expo Go/simulador, mostra 1 tela com token de cor/fonte aplicado
corretamente (prova visual de que os tokens batem com o web lado a lado).

### Fase 2 — Auth + camada de dados
Ajuste aditivo na API (§4), `shared/api` portado, `auth.store` + interceptor axios com refresh
via secure-store, telas `(auth)/login` e `(auth)/register` — **1:1 com `LoginForm`/`RegisterForm`
do web** (mesmos campos, mesma validação Zod, mesmas mensagens de erro em pt-BR).
**Aceite:** login/registro funcionam contra a API de prod, token persiste entre fechamentos do
app (Keychain/Keystore), refresh automático em 401 funciona.

### Fase 3 — Design system base (`components/ui/`)
Os 19 componentes da §6.1, cada um comparado lado a lado com o equivalente web antes de dar por
pronto. Confirma com o usuário a decisão sidebar→tabbar (§5) antes de montar o `(app)/_layout.tsx`.
**Aceite:** cada componente revisado 1:1 (cor, espaçamento, estado hover/press, estado
disabled/loading) contra o componente web correspondente.

### Fase 4 — Telas principais
Home, feed, ranking de álbum (`AlbumRatingView`, `StarRating`, `ReviewForm`,
`FavoriteWorstPicker`, `RankingActions` — o coração do produto) + `components/album/`.
**Aceite:** fluxo completo de avaliar um álbum funciona idêntico ao web (mesmas etapas, mesmo
resultado, mesmo average calculado — sempre vindo do servidor, nunca calculado no cliente,
regra da seção 0 do `CLAUDE.md` vale igual aqui).

### Fase 5 — Discovery + social + comments
`DiscoverPage`, `SearchPage`, `TopAlbumsPage`, `FeedPage`/`FeedCard`, `PublicProfilePage`,
`OwnProfilePage`, `FollowButton`/`FollowListModal`, `CommentThread`, notificações
(`NotificationsBell`).
**Aceite:** paginação infinita (`FlatList` + `onEndReached`) equivalente ao infinite scroll web,
mesmos filtros/estados (loading/empty/error, seção 5.7 do `CLAUDE.md` vale igual em RN).

### Fase 6 — Polish + build
Ícones (`lucide-react-native`), animações Reanimated (§3), `share-card` via
`react-native-view-shot`, ícone/splash do app, `eas.json` configurado, primeiro build EAS
(Android + iOS) — resolve o build de iOS sem Mac.
**Aceite:** build EAS sobe pros dois SOs, instala em device físico/simulador, fluxo ponta a ponta
testado (login → ranking → feed → perfil → logout) nos dois.

## 9. Anti-metas (herda a seção 9 do `CLAUDE.md`, mais específico daqui)

- Não usar lib de UI de terceiro com visual próprio (RN Paper, Tamagui, Gluestack) — o design
  já existe, só precisa ser portado.
- Não redesenhar nenhuma tela "porque no mobile fica melhor assim" sem perguntar antes.
- Não adicionar tela/feature que não existe no web hoje.
- Não pular a checagem de paridade 1:1 no fim de cada fase pra "ir mais rápido".
- Não deixar tipo escrito à mão pra request/response — igual web, vem do `schema.d.ts`.

---

**Próximo passo:** revisar este plano, confirmar decisão de navegação (sidebar→tabbar, §5) e
partir pra Fase 1.
