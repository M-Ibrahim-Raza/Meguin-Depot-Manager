# MMS — Meguin Depot Manager

Back-office app for a lubricants depot: customers with credit limits, billing
with line items, payments with admin approval, and a product catalogue. Built for
two roles — **user** (records bills + payments) and **admin** (approves or
rejects payments).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Tailwind v4** + **shadcn/ui** (`base-nova` preset), `lucide-react` icons
- **tRPC 11** (server + react-query client) + **TanStack Query** — typed API layer
- **Zod** — schemas shared between client forms and the tRPC boundary
- **Auth.js v5** (NextAuth) — Credentials provider, JWT sessions, role on user
- **Drizzle ORM** + **Postgres (Neon)** + **drizzle-kit** migrations
- **react-hook-form** (`zodResolver`)
- **Vitest** + **@testing-library/react**
- **Husky** + **lint-staged** + **Prettier** + **ESLint** (Next config)
- **Deployed on Vercel**

All money is stored as `bigint` paisas (1 Rs = 100 paisas) for exact
arithmetic. Display goes through `<Money paisas={...} />`.

## Prerequisites

- **Node 22+**
- **pnpm 11+**
- A Postgres database (Neon free tier works out of the box)

## Setup

```bash
pnpm install
cp .env.example .env.local
# Fill in DATABASE_URL and AUTH_SECRET (see below)

pnpm db:generate   # generate SQL from the Drizzle schema (if needed)
pnpm db:migrate    # apply migrations to the database in DATABASE_URL
pnpm db:seed       # load demo data + two users

pnpm dev           # http://localhost:3000
```

> **Existing local DBs:** the baseline migration was regenerated for the
> article-number primary key. If your database was created from the old
> baseline, `pnpm db:migrate` will fail with "relation already exists" — drop &
> recreate the database (or the `public` schema), then re-run `pnpm db:migrate`
> and `pnpm db:seed`.

### Environment

`.env.local` must contain:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true
```

`src/server/env.ts` validates these at module load via zod; missing or invalid
values throw a clear error at startup.

### Seeded dev users

Both passwords are throwaway — change them before any non-local deploy.

| Email               | Password   | Role  |
| ------------------- | ---------- | ----- |
| `admin@meguin.test` | `admin123` | admin |
| `user@meguin.test`  | `user123`  | user  |

## Scripts

| Command             | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `pnpm dev`          | Next dev server (Turbopack)                                          |
| `pnpm build`        | Production build                                                     |
| `pnpm start`        | Run the production build                                             |
| `pnpm typecheck`    | `tsc --noEmit`                                                       |
| `pnpm lint`         | ESLint                                                               |
| `pnpm format`       | Prettier write                                                       |
| `pnpm format:check` | Prettier check (no writes)                                           |
| `pnpm test`         | Vitest, one shot                                                     |
| `pnpm test:watch`   | Vitest watch mode                                                    |
| `pnpm db:generate`  | drizzle-kit: emit SQL from current schema diff                       |
| `pnpm db:migrate`   | drizzle-kit: apply pending migrations to `DATABASE_URL`              |
| `pnpm db:seed`      | Reset + load demo data (users, products, customers, bills, payments) |

`pnpm db:seed` truncates and re-inserts — do **not** run it against a database
that holds real data.

## Project layout

```
src/
  app/                          # routes only — pages compose features
    (authed)/                   # route group, gated by proxy.ts
      layout.tsx                # header, nav, sign-out
      loading.tsx               # skeleton shell
      error.tsx                 # error boundary
      dashboard/page.tsx
      customers/page.tsx
      customers/[id]/page.tsx
      customers/[id]/bills/new/page.tsx
      payments/page.tsx
      products/page.tsx
    api/auth/[...nextauth]/     # Auth.js handlers
    login/page.tsx
    not-found.tsx
    page.tsx                    # redirect → /dashboard
  components/                   # shared (Money, StatusBadge, CreditBar, KpiCard, NavLinks, …)
    ui/                         # shadcn primitives (do not edit by hand)
  features/                     # feature-scoped: schemas + actions + components
    auth/  products/  customers/  bills/  payments/
  lib/                          # cn, format, constants
  server/
    auth/                       # Auth.js edge config + full config
    db/                         # client, schema, repos, migrations, seed
    env.ts                      # zod-validated process.env
  proxy.ts                      # Next 16 "proxy" (was "middleware") — gates (authed)
  test/setup.ts                 # vitest setup
```

## Deployment (Vercel + Neon)

1. **Create a Neon project**, copy the connection string with `?sslmode=require`.
2. **Push your branch to GitHub** and import the repo in Vercel.
3. In Vercel project settings → Environment Variables, add:
   - `DATABASE_URL` — Neon pooled or direct URL.
   - `AUTH_SECRET` — fresh `openssl rand -base64 32`.
   - `AUTH_TRUST_HOST=true` (Vercel sets headers behind a proxy).
4. Trigger a deploy. The build doesn't connect to Postgres; first-request DB
   calls happen at runtime.
5. Run `pnpm db:migrate` against the production DB once, locally, with
   `DATABASE_URL` pointed at Neon. Optionally `pnpm db:seed` if it's a fresh
   demo branch (do not seed real data).
6. Create real users by inserting rows into the `user` table with a
   bcrypt-hashed password (the seed script demonstrates the shape). A
   self-service signup flow is not part of this build.

## Testing

Unit tests cover the high-value targets — `src/lib/format.ts`, zod schemas for
each feature, and the server-action input boundary. Run with `pnpm test`. They
assume no DB; the schemas are pure.

## Conventions

- Money is `bigint` paisas everywhere except form input fields (rupees). One
  formatter at the display edge — `<Money paisas={...} />`.
- Server actions live in `src/features/<domain>/actions.ts`, are marked
  `"use server"`, and **always** start with `requireSession()` (and
  `requireAdmin()` where applicable).
- Mutations call `revalidatePath(...)` for any list/detail page that reads the
  same data.
- Zod schemas in `src/features/<domain>/schemas.ts` are shared between the
  client form (`zodResolver`) and the server action's first-line `safeParse`.

## Notes

- `proxy.ts` is the Next 16 rename of `middleware.ts`. Both work; `proxy.ts`
  is the new convention.
- `@hookform/resolvers@5.4.0` was published against an older `zod@4.x` minor
  and ships stale internal types. Form components use
  `zodResolver(schema as never)` as a one-line escape until the resolver
  re-pins. Runtime is unaffected.
