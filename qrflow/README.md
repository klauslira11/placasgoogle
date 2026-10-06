# QR Flow — SaaS de QR Codes Dinâmicos

SaaS completo com Next.js 15, Prisma (SQLite dev / PostgreSQL prod), Auth.js, geração real de PNG e redirecionamento 307.

Nome centralizado em `src/config/app.ts` (`APP_NAME`).

## Stack
Next.js 15 App Router, TypeScript, Tailwind 4, Prisma 6, Auth.js 5 (Credentials + bcryptjs), qrcode, Zod, Recharts, Vitest, Jimp + jsQR para testes.

> **Desvio justificado**: sem Docker no ambiente, o banco dev é SQLite (`file:./dev.db`). Para produção, troque `provider` para `postgresql` em `prisma/schema.prisma` e `DATABASE_URL` para Postgres. `docker-compose.yml` incluso.

## Rodar local

```bash
cd qrflow
npm install
# .env já configurado para SQLite dev
npx prisma db push
npx tsx prisma/seed.ts
npm run dev  # http://localhost:3000
npm test     # 12 testes, inclui decodificação real do PNG
npm run build
```

Credenciais seed:
- Admin: `admin@qrflow.com` / `admin123`
- Demo: `demo@qrflow.com` / `demo1234`

## Funcionalidades entregues

**Site público**: `/`, `/recursos`, `/precos`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/termos`, `/privacidade`

**Auth**: cadastro/login/logout, hash bcrypt 12, recovery via token SHA256 (1h, logado no console em dev), verificação de suspensão, JWT, middleware protege `/dashboard` e `/admin`, roles USER/ADMIN.

**Painel cliente** (`/dashboard`): cards total/ativos/pausados/acessos, lista com prévia, nome, slug, destino, status, acessos, ações (ver/ver estatística, editar nome/destino, pausar/ativar, duplicar, baixar PNG, copiar URL dinâmica, testar redirect, excluir), formulário com slug opcional, cores, margem, tamanho, correção, fundo transparente.

**PNG real**: `GET /api/qr/[id]/png` gera 1000×1000 via `qrcode`, com teste que decodifica e garante conteúdo = `https://dominio/r/slug` (não destino).

**QR dinâmico**: `GET /r/[slug]` → 307, headers `no-store`, registra `Scan` (anonVisitorId, country, device/browser/os, referer, utm, ipHash SHA256+salt, retenção 30d), 404 amigável, 503 quando pausado, alteração de destino imediata sem mudar slug.

**Estatísticas**: total, 7/30/90 dias, dispositivos/navegadores/países, recentes, gráficos Recharts.

**Admin** (`/admin`): lista usuários, busca, suspender/reativar, bloqueio impede login e filtra QrCodes.

## Modelo de dados
Vide `PLAN.md` e `prisma/schema.prisma` (User, QrCode, Scan, PasswordResetToken, enums).

## Teste de QR

Após `npm test`, o teste `tests/qr.test.ts` gera PNG, lê com Jimp e decodifica com jsQR confirmando que o conteúdo é a URL dinâmica.

## Deploy Postgres
```bash
docker compose up -d
# .env: DATABASE_URL="postgresql://qrflow:qrflow@localhost:5432/qrflow"
npx prisma migrate dev
```
