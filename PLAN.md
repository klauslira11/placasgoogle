# QR Flow — Plano de Implementação

## 1. Configuração Centralizada do Nome
`src/config/app.ts` exportará `APP_NAME = "QR Flow"` e `APP_DOMAIN`. Todo branding, títulos, emails e metadados importarão deste arquivo para troca fácil.

---

## 2. Arquitetura

### Stack escolhida (estável, compatível - Set/2026)
| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js App Router | 15.x |
| Linguagem | TypeScript | 5.6+ |
| UI | React 19 + Tailwind CSS 4 |
| Banco | Prisma ORM 6 + **SQLite (dev) / PostgreSQL (prod)** |
| Auth | Auth.js (NextAuth) 5 + bcryptjs + JWT (credentials) |
| QR | `qrcode` (npm, 1.5.x) geração PNG server-side + client preview |
| Validação | Zod 3.x |
| Gráficos | Recharts |
| Testes | Vitest + Testing Library |
| Infra local | `docker-compose.yml` com Postgres 16 (quando Docker disponível) |

**Justificativa de desvio do stack recomendado:** O ambiente atual não possui Docker. Para entregar produto 100% funcional sem dependência externa, o Prisma será configurado com `provider = "sqlite"` em desenvolvimento e `provider = "postgresql"` em produção. A troca exige apenas alterar `provider` e `DATABASE_URL` e rodar `prisma migrate`. O `docker-compose.yml` será entregue para quem tiver Docker, garantindo paridade com o recomendado. Todas as queries são compatíveis com ambos.

### Arquitetura de Alto Nível
```
[Browser] -> Next.js App Router (RSC + Route Handlers)
              ├─ / (site público - RSC)
              ├─ /(auth) /login /register /forgot-password
              ├─ /(dashboard) /dashboard (protegido, USER)
              ├─ /admin (protegido, ADMIN)
              ├─ /r/[slug] (Route Handler público, redirect 302)
              ├─ /api/qr/* (CRUD + geração PNG)
              ├─ /api/auth/* (Auth.js)
              └─ middleware.ts (proteção de rotas + RBAC)
                         |
                    Prisma Client
                         |
              SQLite (dev) / PostgreSQL (prod)
```

### Autenticação
- `Credentials` provider (email/senha) com `bcryptjs` (12 rounds).
- Sessão JWT (stateless, sem adapter obrigatório). `auth.ts` centraliza config.
- `middleware.ts` protege `/dashboard/*` e `/admin/*`; verifica `suspendedAt` e `role`.
- Recovery: token aleatório `crypto.randomBytes(32)` salvo hash SHA256 em `PasswordResetToken` com expiração 1h, enviado via log (infra de email plugável).
- `VerificationToken` opcional para verificação de e-mail.

---

## 3. Modelo de Dados (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  emailVerified DateTime?
  password      String   // bcrypt hash
  role          Role     @default(USER) // USER | ADMIN
  suspendedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  qrCodes       QrCode[]
  resetTokens   PasswordResetToken[]
}

model QrCode {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  slug          String   @unique // ex: abc123
  destinationUrl String
  status        QrStatus @default(ACTIVE) // ACTIVE | PAUSED
  // customização visual
  fgColor       String   @default("#000000")
  bgColor       String   @default("#ffffff")
  margin        Int      @default(4)
  size          Int      @default(1000)
  errorLevel    String   @default("M") // L M Q H
  transparentBg Boolean  @default(false)
  scans         Scan[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([userId])
  @@index([slug])
}

model Scan {
  id            String   @id @default(cuid())
  qrCodeId      String
  qrCode        QrCode   @relation(fields: [qrCodeId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
  // anonimizado
  anonVisitorId String?  // hash anonimizado
  country       String?
  device        String?
  browser       String?
  os            String?
  referer       String?
  utmSource     String?
  utmMedium     String?
  utmCampaign   String?
  // IP nunca armazenado completo: hash com salt, retenção 30d via job
  ipHash        String?
  @@index([qrCodeId, createdAt])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

enum Role { USER ADMIN }
enum QrStatus { ACTIVE PAUSED }
```

- **Palavras reservadas para slug:** `api, r, admin, dashboard, login, register, ...` bloqueadas via Zod.
- **Índices:** `slug` único + index em `userId` e `Scan(qrCodeId, createdAt)` para relatórios.
- **Anonimização IP:** `SHA256(ip + SALT)` + expurgo lógico após 30 dias (campo `ipHash`).

---

## 4. Fluxos Críticos

### QR Dinâmico
1. Criação: valida URL (http/https, bloqueia `javascript:`, `data:`, `file:`, `ftp:`), gera slug `nanoid(6)` se vazio, salva.
2. Imagem: QR encode = `https://dominio.com/r/{slug}` (nunca destino). `qrcode` lib gera PNG 1000x1000.
3. Download: route handler `/api/qr/[id]/png` gera buffer PNG com cores/margem.
4. Redirect: `GET /r/[slug]` → busca slug, se 404 → página amigável, se PAUSED → página pausado, senão registra `Scan` (fire-and-forget, `waitUntil` friendly) e `redirect(307, destinationUrl)` com `Cache-Control: no-store`.

### Estatísticas
Queries Prisma agregadas: `groupBy createdAt (dia)`, `device`, `browser`, `country`. Gráficos Recharts em `/dashboard/qr/[id]`.

---

## 5. Etapas de Implementação (incremental, testando cada)

1. **Scaffold** Next.js + Tailwind + Prisma + Auth.js + config central.
2. **Banco + Auth** (register/login/logout/forgot/reset, middleware, hash, bloqueio suspenso, seed admin).
3. **CRUD QR** + validação Zod + slug + cores.
4. **Geração PNG real** + teste de conteúdo (jsQR / qrcode decode).
5. **Rota /r/[slug]** + analytics anonimizado.
6. **UI**: site público (7 páginas), dashboard cliente, admin.
7. **Testes**: unit Zod/validations, integration rotas `/r` e `/api/qr`.

---

## 6. Verificação
- `npm run build` sem erros.
- `npm test` (Vitest) passa.
- Teste manual: criar QR → baixar PNG → decodificar QR → deve conter `/r/{slug}` → acessar `/r/{slug}` → 307 → destino.
- Teste pausa: pausar → acessar → página pausado, sem redirect.
