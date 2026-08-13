# Multi-stage build — ver seção 9 do CLAUDE.md.
# node:*-slim (Debian/glibc), não alpine: @node-rs/argon2 é um binário nativo (Rust/N-API)
# e evita qualquer atrito com musl libc.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nestjs
USER nestjs

EXPOSE 3333
CMD ["node", "dist/main"]
