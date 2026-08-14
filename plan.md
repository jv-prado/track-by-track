# Plano de Deploy — Track by Track

> Front (Vercel) + Back (Railway) + Mobile (Android/Capacitor), separados.
> Gerado em 2026-08-14. Repo: `jv-prado/track-by-track`, branch `main`.

## 0. Estado atual (antes de tudo)

- Working tree com **220 arquivos alterados/novos/deletados**, nada commitado — migração
  fase 8 do `CLAUDE.md` (NestJS + TanStack Router/Query) em curso direto na `main`.
- Firebase removido por completo (`.firebaserc`, `firebase.json`, `firebase.rules.json`,
  `cors.json` deletados — confirma seção 5.1 do `CLAUDE.md`).
- `api/` já tem: Dockerfile multi-stage pronto, `env.schema.ts` com Zod (crash se faltar var),
  Cloudinary e cache (`CACHE_DRIVER`) além do que a seção 7 do `CLAUDE.md` documentava.
- Mobile é **Capacitor** (não app nativo separado) — empacota o mesmo build do `dist/` do Vite
  dentro de `android/`. `applicationId com.joao.trackbytrackcom`, já em `versionCode 3` (app já
  publicado antes, essa é uma atualização).
- Bug corrigido nesta sessão: cookie de refresh (`auth.controller.ts`) tinha `sameSite: 'lax'`
  fixo — quebraria refresh em produção (front e back em domínios diferentes = cross-site).
  Corrigido para `sameSite: isProduction ? 'none' : 'lax'`.

**Passo zero, antes das 3 partes abaixo — obrigatório:**

```bash
git add -A
git commit -m "feat: migração fase 8 — api NestJS + frontend TanStack"
git push origin main
```

Sem isso, Vercel e Railway (que puxam do GitHub) não veem nada novo.

---

## 1. BACK — Railway (API NestJS)

Dockerfile já pronto em `api/Dockerfile` (multi-stage, `node:22-slim`, roda como non-root).
Fase 9 do `CLAUDE.md` (host da API) resolve-se com Railway.

### 1.1 Mongo Atlas (banco de produção)

1. [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) → cluster free (M0).
2. Database Access → cria user/senha dedicados a produção.
3. Network Access → `Allow Access from Anywhere` (`0.0.0.0/0`) — Railway não tem IP fixo.
4. Connect → copia a connection string:
   `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/trackbytrack?retryWrites=true&w=majority`

### 1.2 Deploy no Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo →
   `jv-prado/track-by-track`.
2. Settings → **Root Directory = `api`** (Railway acha o Dockerfile sozinho ali dentro).
3. Settings → Networking → Generate Domain → gera algo como
   `https://api-production-xxxx.up.railway.app`.

### 1.3 Variáveis de ambiente (Railway → Variables)

Confirmado contra `api/src/config/env.schema.ts` — lista **completa**, tudo obrigatório
crasha o boot se faltar (exceto onde marcado opcional):

| Variável | Valor em produção | Observação |
|---|---|---|
| `NODE_ENV` | `production` | ativa `secure: true` e `sameSite: 'none'` no cookie |
| `PORT` | `3333` | Railway injeta a própria porta pública, mas mantenha consistente |
| `MONGODB_URI` | connection string do Atlas (1.1) | — |
| `JWT_ACCESS_SECRET` | novo valor, 32+ chars random | **não reaproveitar o de dev**; gerar com `openssl rand -hex 32` |
| `JWT_ACCESS_TTL` | `15m` | igual dev |
| `JWT_REFRESH_TTL` | `7d` | igual dev |
| `WEB_ORIGIN` | URL do Vercel (parte 2) | precisa ser exata, sem barra final — CORS falha se não bater |
| `SPOTIFY_CLIENT_ID` | igual dev (`fc70ea11d5414f3ca0d81d376fe3dc76`) ou credencial própria de prod | Client Credentials, sem OAuth de usuário — pode reaproveitar |
| `SPOTIFY_CLIENT_SECRET` | idem | nunca vai pro front |
| `EMAIL_SENDER_ADAPTER` | `console` | único adapter implementado hoje — reset de senha loga link nos logs do Railway, não envia e-mail real |
| `CLOUDINARY_CLOUD_NAME` | credencial de prod (ou reaproveita dev) | usado pra upload de imagem — confirmar se conta free aguenta prod |
| `CLOUDINARY_API_KEY` | idem | — |
| `CLOUDINARY_API_SECRET` | idem | — |
| `CACHE_DRIVER` | `memory` | suficiente com 1 instância Railway; mudar pra `redis` só se escalar horizontalmente |
| `REDIS_URL` | — | só obrigatório se `CACHE_DRIVER=redis` |
| `CACHE_PREFIX` | `tbt` | default, sem necessidade de mudar |

**Atenção:** `WEB_ORIGIN` só existe depois da parte 2 (Vercel) rodar. Sobe o back primeiro com
um valor placeholder, ajusta depois (passo 3 abaixo fecha o ciclo).

### 1.4 Validar

```bash
curl https://<url-railway>/v1/health   # espera 200
```
Abrir `https://<url-railway>/v1/docs` — Swagger deve carregar.

---

## 2. FRONT — Vercel (Vite + React)

### 2.1 Deploy

1. [vercel.com](https://vercel.com) → Add New Project → importa `jv-prado/track-by-track`.
2. Root Directory = `.` (raiz do repo — onde está `package.json`/`vite.config.ts`; Vercel
   detecta Vite automaticamente, não navegar pra dentro de `api/`).
3. Build command / output: default do preset Vite já serve (`npm run build`, saída `dist/`).
   `vercel.json` já tem o rewrite de SPA (`/(.*)` → `/index.html`), sem alteração necessária.

### 2.2 Variável de ambiente

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://<url-railway-da-parte-1>/v1` |

Confirmado contra `src/app/env.ts` — é a **única** env var que o front valida/usa (Zod,
crash em runtime se faltar ou não for URL válida).

### 2.3 Deploy e pega a URL final

Ex.: `https://track-by-track.vercel.app`.

---

## 3. Fechar o ciclo (back ↔ front)

1. Volta no Railway → Variables → `WEB_ORIGIN` = URL real do Vercel (passo 2.3), sem barra final.
2. Railway redeploya sozinho ao salvar a variável (ou força redeploy manual).
3. Reteste no browser real (não só `curl`): registro → login → refresh de página (sessão
   mantém) → logout. Abrir Network tab e confirmar:
   - cookie de refresh com `Secure` + `SameSite=None`;
   - sem erro de CORS no console.

---

## 4. MOBILE — Android (Capacitor)

Capacitor não builda nada sozinho — ele empacota o **build web já pronto** (`dist/`) dentro do
projeto Android. Ou seja: **partes 1 e 2 (back e front) precisam estar no ar primeiro**, porque
o app mobile vai apontar pra API de produção (não dá pra usar `localhost` num celular).

### 4.1 Aponta o build pra API de produção

O Capacitor não lê env var em runtime — ele empacota o que o Vite gerou em build time. Antes de
buildar pro mobile, o `.env` da raiz precisa ter a URL de produção, não `localhost`:

```bash
# na raiz do repo — TEMPORÁRIO só pra esse build, não commitar
echo "VITE_API_URL=https://<url-railway-da-parte-1>/v1" > .env
```

Depois do build mobile, reverte pra `http://localhost:3333/v1` se for continuar dev local.
(Alternativa mais limpa: criar `.env.production` e usar `vite build --mode production` —
mas o `cap:sync` do `package.json` hoje roda `npm run build` puro, então o mais direto é o
`.env` mesmo, ou ajustar o script se quiser evitar esse passo manual toda vez.)

### 4.2 Build + sync

```bash
npm run cap:sync    # = npm run build && cap sync android
```

Isso builda o Vite (`dist/`) e copia pra dentro de `android/app/src/main/assets/public/`.

### 4.3 Gerar o APK/AAB

Duas rotas, dependendo do destino:

**A) Teste rápido / instalar direto no celular (APK debug):**
```bash
npm run cap:open    # abre Android Studio
```
No Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s). Gera
`android/app/build/outputs/apk/debug/app-debug.apk`, instala via `adb install` ou transferindo
o arquivo.

**B) Atualização na Play Store (AAB assinado):**
1. `android/app/build.gradle` está em `versionCode 3` / `versionName "1.0.1"` — **bump antes de
   buildar** (ex.: `versionCode 4`, `versionName "1.1.0"`), senão a Play Store rejeita o upload.
2. Não há bloco de assinatura (`signingConfigs`) no `build.gradle` — assinatura deve estar
   configurada via Android Studio (Build → Generate Signed Bundle/APK) usando o keystore que já
   assinou as versões anteriores. **Sem o keystore original, não dá pra publicar update no
   mesmo listing** — confirma se ele está salvo em algum lugar seguro antes de seguir essa rota.
3. Build → Generate Signed Bundle / APK → Android App Bundle → seleciona o keystore → gera
   `.aab`.
4. Play Console → app existente (`com.joao.trackbytrackcom`) → Produção (ou trilha de teste) →
   novo release → sobe o `.aab`.

### 4.4 Sem push notifications configurado

Não há `google-services.json` no projeto — Firebase Cloud Messaging não está ativo. Se não for
usar push, ignora. Se for, é integração nova, fora do escopo deste plano.

---

## 5. Ordem recomendada de execução

1. Commit + push (passo 0).
2. Mongo Atlas.
3. Deploy back no Railway (`WEB_ORIGIN` com placeholder).
4. Deploy front no Vercel.
5. Volta no Railway, corrige `WEB_ORIGIN` com URL real do Vercel.
6. Testa fluxo completo no browser (registro/login/ranking/logout).
7. Só then mobile: aponta `.env` pra API de produção, `cap:sync`, gera APK/AAB.

## 6. Checklist final

- [ ] `git push` feito, Vercel e Railway vendo o commit certo.
- [ ] `/v1/health` responde 200 em produção.
- [ ] `/v1/docs` abre em produção.
- [ ] Login/registro funcionam no domínio real do Vercel (não localhost).
- [ ] Cookie de refresh com `Secure` + `SameSite=None` confirmado no Network tab.
- [ ] `WEB_ORIGIN` no Railway bate exatamente com a URL do Vercel (sem barra final).
- [ ] `JWT_ACCESS_SECRET` de produção é **diferente** do de dev.
- [ ] Mongo Atlas com Network Access liberado pro Railway.
- [ ] Mobile: `.env` revertido pra `localhost` depois do build, se for voltar a desenvolver.
- [ ] Mobile: `versionCode`/`versionName` incrementados se for update de Play Store.
