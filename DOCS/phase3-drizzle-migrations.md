# LeadAI Pro — Phase 3: Drizzle Schema Migrations

## Objective

Set up `drizzle-kit` so the database schema defined in `api/src/db/schema.ts` is managed as versioned SQL migration files. This replaces the manual "run SQL in Supabase editor" step from Phase 1 with a repeatable, code-reviewed workflow.

Key constraints:
- Supabase's PgBouncer pooler (port 6543) does **not** support DDL migrations — migrations must use the **direct connection** (port 5432).
- A separate `DIRECT_URL` env var provides the direct connection; `DATABASE_URL` keeps the pooler URL for runtime queries.
- Migration files are committed to git; the schema is the source of truth.

---

## Architecture

```
api/
├── drizzle.config.ts          drizzle-kit config (points to DIRECT_URL)
├── drizzle/
│   └── 0000_initial_schema.sql  generated migration
└── src/
    └── db/
        └── schema.ts          source of truth
```

---

## Phase 27 — Install drizzle-kit + direct connection env var

```bash
cd api
npm install --save-dev drizzle-kit
```

Add `DIRECT_URL` to `api/.env`:
```
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

> The direct URL uses port **5432** (not 6543). Get it from:
> Supabase → Settings → Database → Connection string → "URI" (not the pooler)

- [ ] `drizzle-kit` installed as dev dependency
- [ ] `DIRECT_URL` added to `api/.env` (port 5432)

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
  },
});
```

- [ ] `drizzle.config.ts` created

---

## Phase 29 — Generate initial migration

```bash
cd api
npx drizzle-kit generate
```

This reads `src/db/schema.ts` and writes `drizzle/0000_initial_schema.sql`.

- [ ] `drizzle/0000_initial_schema.sql` generated

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

- [ ] Migration scripts added to `package.json`

---

## Phase 31 — Apply initial migration

```bash
cd api
npm run db:migrate
```

Verifies the migration applies cleanly. If the tables already exist in Supabase (created manually in Phase 1), the migration will fail with "already exists". Options:
- Skip applying if Supabase already has the schema
- Or mark migration as applied: `npx drizzle-kit migrate --skip-already-applied` (if supported)
- Or use `db:push` for the first sync: `npm run db:push`

- [ ] Migration applied (or schema verified in sync with Supabase)

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
