# DailyBrief

Monorepo do aplicativo agregador de notícias **DailyBrief** (`pnpm` workspaces + TypeScript).

## Estrutura
- `apps/backend` — API NestJS + scripts standalone de coleta e validação de feeds RSS
- `apps/mobile` — App React Native com Expo Router e Zustand
- `packages/shared` — Tipos e schemas (Zod) compartilhados
- `supabase/migrations` — Migrations do banco Postgres (Supabase)

## Pré-requisitos
- Node.js 22+
- `pnpm` 10+

## Instalação
```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env

pnpm install
```

## Como rodar

### Backend (API NestJS)
```bash
pnpm dev:backend
# Healthcheck: GET http://localhost:3000/health -> {"status":"ok"}
```

### Mobile (Expo Router)
```bash
pnpm dev:mobile
```

### Testar Feeds RSS
```bash
pnpm --filter backend exec tsx scripts/test-feeds.ts
```

### Rodar Coleta (Standalone)
```bash
pnpm --filter backend collect
```

### Lint e Build
```bash
pnpm lint
pnpm build
```
