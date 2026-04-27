# LeadAI Pro — Phase 3: Drizzle Schema Migrations

## Objective

Set up `drizzle-kit` so the database schema defined in `api/src/db/schema.ts` is managed as versioned SQL migration files. This replaces the manual "run SQL in Supabase editor" step from Phase 1 with a repeatable, code-reviewed workflow.

Key constraints:

- Supabase's PgBouncer pooler (port 6543) does **not** support DDL migrations — use the session-mode pooler (port 5432) instead.
- A separate `DIRECT_URL` env var provides the session-mode connection; `DATABASE_URL` keeps the transaction-mode pooler URL for runtime queries.
- Migration files are committed to git; the schema is the source of truth.

---

## Architecture

```text
api/
├── drizzle.config.ts          drizzle-kit config (points to DIRECT_URL)
├── drizzle/
│   └── 0000_initial_schema.sql  generated migration
└── src/
    └── db/
        └── schema.ts          source of truth
```

---

## Phase 27 — Install drizzle-kit + session-mode env var

```bash
cd api
npm install --save-dev drizzle-kit
```

Add `DIRECT_URL` to `api/.env`:

```env
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

> Uses Supabase's **session-mode pooler** (port 5432 on the pooler host, NOT the direct `db.*.supabase.co` host).
> The true direct connection (`db.*.supabase.co:5432`) is blocked by most residential/corporate networks.
> Session mode supports advisory locks and DDL — the same things drizzle-kit needs.
> Transaction mode (port 6543) does NOT work for migrations.

- [x] `drizzle-kit` installed as dev dependency
- [x] `DIRECT_URL` added to `api/.env` (session-mode pooler port 5432)

---

## Phase 28 — drizzle.config.ts

Create `api/drizzle.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL!,
    ssl: true,
  },
});
```

- [x] `drizzle.config.ts` created

---

## Phase 29 — Generate initial migration

```bash
cd api
npx drizzle-kit generate
```

This reads `src/db/schema.ts` and writes `drizzle/0000_glamorous_barracuda.sql` (5 tables).

- [x] Initial migration SQL generated

---

## Phase 30 — Migration scripts in package.json

Add to `api/package.json` scripts:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio",
  "db:push": "drizzle-kit push"
}
```

- `db:generate` — generate migration SQL from schema changes
- `db:migrate` — apply pending migrations to the database
- `db:studio` — open Drizzle Studio (browser DB explorer)
- `db:push` — push schema directly to DB without migration files (dev only)

- [x] Migration scripts added to `package.json`

---

## Phase 31 — Sync schema with Supabase

Tables already existed from the Phase 1 manual SQL, so `db:push` was used to sync:

```bash
cd api
npm run db:push
```

Output: `[✓] Changes applied` — schema is in sync.

- [x] Schema verified in sync with Supabase via `db:push`

---

## Workflow going forward

```bash
# 1. Edit api/src/db/schema.ts
# 2. Generate migration file
npm run db:generate

# 3. Review the generated SQL in drizzle/
# 4. Apply to database
npm run db:migrate
```

All migration files are committed to git — schema changes are code-reviewed alongside the code that uses them.
