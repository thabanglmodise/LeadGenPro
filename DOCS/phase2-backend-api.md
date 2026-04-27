# LeadAI Pro — Phase 2: Backend API Server

## Objective

Add a dedicated Express.js API server (`api/`) that handles all sensitive and data-access operations.
Angular services replace direct Supabase queries and browser-facing API calls with tRPC procedure calls.
tRPC shares the `AppRouter` type between the backend and Angular, enforcing end-to-end type safety with no manual interface duplication.

---

## Architecture

```
/LeadGenPro
├── leadGenPro/       Angular 21 SSR frontend (existing)
└── api/              Express + tRPC + Drizzle backend (new)
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── src/
        ├── index.ts              Express entry point
        ├── trpc.ts               initTRPC, context type, protectedProcedure
        ├── context.ts            createContext — JWT → user, inject db
        ├── router.ts             Root router; exports AppRouter type
        ├── db/
        │   ├── schema.ts         Drizzle table definitions (mirrors Supabase SQL schema)
        │   └── index.ts          postgres connection + drizzle() client
        ├── middleware/
        │   └── auth.ts           supabaseAdmin.auth.getUser() JWT verifier
        └── routers/
            ├── places.ts         Google Places Text Search (server-to-server, no CORS proxy)
            ├── ai.ts             Claude scoring + email draft
            ├── leads.ts          Leads CRUD
            ├── config.ts         User config — keys write-only; responses return booleans
            ├── activity.ts       Activity log CRUD
            ├── email.ts          Sent email log CRUD
            └── profile.ts        Business profile CRUD
```

### Key security properties

- API keys (`gp_key`, `cl_key`) are saved to `user_config` and retrieved server-side per request — they are **never returned to the browser** after being written.
- All protected procedures verify the Supabase JWT from the `Authorization: Bearer <token>` header before executing.
- Google Places and Claude calls are server-to-server — no CORS proxy, no key in browser network traffic.

---

## Phase 18 — API server scaffold

### Dependencies

```bash
cd /home/skywizard/source/LeadGenPro
mkdir api && cd api
npm init -y
npm install express @trpc/server @trpc/client drizzle-orm postgres zod \
            @supabase/supabase-js dotenv cors
npm install --save-dev typescript tsx @types/express @types/node @types/cors \
            drizzle-kit
```

### `api/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### `api/package.json` scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### `api/.env.example`

```
PORT=3001
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

> `DATABASE_URL` is the direct PostgreSQL connection string from Supabase → Settings → Database → Connection string (not the JS client URL).
> `SUPABASE_SERVICE_ROLE_KEY` is used only to verify JWTs via `supabaseAdmin.auth.getUser()`.

- [ ] Scaffold complete

---

## Phase 19 — Drizzle schema + DB connection

### `api/src/db/schema.ts`

Mirrors the SQL schema from `DOCS/implementation-plan.md §4.4` exactly.

```ts
import { pgTable, uuid, text, numeric, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  bizName: text('biz_name'),
  fullName: text('full_name'),
  role: text('role'),
  offering: text('offering'),
  benefits: text('benefits'),
  website: text('website'),
  phone: text('phone'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  type: text('type'),
  types: jsonb('types').$type<string[]>().default([]),
  rating: numeric('rating'),
  totalRatings: integer('total_ratings').default(0),
  placeId: text('place_id'),
  website: text('website'),
  phone: text('phone'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  aiScore: text('ai_score'),
  aiReason: text('ai_reason'),
  offering: text('offering'),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sentEmails = pgTable('sent_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  toEmail: text('to_email').notNull(),
  subject: text('subject'),
  body: text('body'),
  sentAt: timestamp('sent_at').defaultNow(),
});

export const userConfig = pgTable('user_config', {
  id: uuid('id').primaryKey(),
  gpKey: text('gp_key'),
  clKey: text('cl_key'),
  gmEmail: text('gm_email'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### `api/src/db/index.ts`

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
export type DB = typeof db;
```

- [ ] Schema complete
- [ ] DB connection complete

---

## Phase 20 — tRPC init + context

### `api/src/middleware/auth.ts`

```ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getUserFromToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email! };
}
```

### `api/src/context.ts`

```ts
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db } from './db';
import { getUserFromToken } from './middleware/auth';

export async function createContext({ req }: CreateExpressContextOptions) {
  let user: { id: string; email: string } | null = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    user = await getUserFromToken(auth.slice(7));
  }
  return { user, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### `api/src/trpc.ts`

```ts
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

- [ ] tRPC init complete
- [ ] Context complete
- [ ] protectedProcedure complete

---

## Phase 21 — Backend routers

### `api/src/routers/places.ts`

Fetches the user's stored `gp_key` from `user_config`, then calls Google Places server-side.
No CORS proxy — direct server-to-server HTTP.

```ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { eq } from 'drizzle-orm';
import { userConfig } from '../db/schema';
import { TRPCError } from '@trpc/server';

export const placesRouter = router({
  search: protectedProcedure
    .input(z.object({ type: z.string(), city: z.string() }))
    .query(async ({ ctx, input }) => {
      const [config] = await ctx.db
        .select({ gpKey: userConfig.gpKey })
        .from(userConfig)
        .where(eq(userConfig.id, ctx.user.id));

      if (!config?.gpKey) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Google Places API key not configured' });
      }

      const query = encodeURIComponent(`${input.type} in ${input.city}`);
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${config.gpKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: data.error_message ?? data.status });
      }

      return (data.results ?? []) as PlaceResult[];
    }),
});
```

### `api/src/routers/ai.ts`

Fetches `cl_key` from `user_config`, calls Anthropic server-side.

```ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { eq } from 'drizzle-orm';
import { userConfig } from '../db/schema';
import { TRPCError } from '@trpc/server';

const LeadInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  rating: z.number().nullable().optional(),
  city: z.string().optional(),
  offering: z.string().optional(),
});

export const aiRouter = router({
  score: protectedProcedure
    .input(z.object({ leads: z.array(LeadInputSchema), offering: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const clKey = await getClaudeKey(ctx);
      const prompt = buildScoringPrompt(input.leads, input.offering);
      const text = await callClaude(prompt, 400, clKey);
      return JSON.parse(text.replace(/```json|```/g, '').trim()) as ScoreResult[];
    }),

  draft: protectedProcedure
    .input(z.object({
      leadName: z.string(),
      contactName: z.string(),
      website: z.string(),
      tone: z.string(),
      template: z.string(),
      senderName: z.string(),
      senderBiz: z.string(),
      offering: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const clKey = await getClaudeKey(ctx);
      const prompt = buildEmailPrompt(input);
      const text = await callClaude(prompt, 700, clKey);
      const subjMatch = text.match(/SUBJECT:\s*(.+)/);
      const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);
      return {
        subject: subjMatch?.[1]?.trim() ?? 'A quick introduction',
        body: bodyMatch?.[1]?.trim() ?? text,
      };
    }),
});

async function getClaudeKey(ctx: { user: { id: string }; db: any }) {
  const [config] = await ctx.db
    .select({ clKey: userConfig.clKey })
    .from(userConfig)
    .where(eq(userConfig.id, ctx.user.id));
  if (!config?.clKey) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Claude API key not configured' });
  }
  return config.clKey;
}

async function callClaude(prompt: string, maxTokens: number, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if ('error' in data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: data.error.message });
  return data.content[0].text;
}
```

### `api/src/routers/leads.ts`

Full CRUD via Drizzle. All queries scoped to `ctx.user.id`.

```ts
export const leadsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(leads)
      .where(eq(leads.userId, ctx.user.id))
      .orderBy(desc(leads.createdAt));
  }),

  createMany: protectedProcedure
    .input(z.array(LeadInsertSchema))
    .mutation(async ({ ctx, input }) => {
      const rows = input.map(l => ({ ...l, userId: ctx.user.id }));
      return ctx.db.insert(leads).values(rows).returning();
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), patch: LeadPatchSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.update(leads)
        .set(input.patch)
        .where(and(eq(leads.id, input.id), eq(leads.userId, ctx.user.id)))
        .returning();
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(leads)
        .where(and(eq(leads.id, input.id), eq(leads.userId, ctx.user.id)));
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(leads).where(eq(leads.userId, ctx.user.id));
  }),
});
```

### `api/src/routers/config.ts`

Keys are never returned after being saved — only boolean flags and `gmEmail`.

```ts
export const configRouter = router({
  load: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db.select().from(userConfig)
      .where(eq(userConfig.id, ctx.user.id));
    return {
      hasGpKey: !!config?.gpKey,
      hasClKey: !!config?.clKey,
      gmEmail: config?.gmEmail ?? '',
    };
  }),

  save: protectedProcedure
    .input(z.object({
      gpKey: z.string().optional(),
      clKey: z.string().optional(),
      gmEmail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(userConfig)
        .values({ id: ctx.user.id, ...input, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: userConfig.id,
          set: { ...input, updatedAt: new Date() },
        });
    }),

  testGoogle: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db.select({ gpKey: userConfig.gpKey })
      .from(userConfig).where(eq(userConfig.id, ctx.user.id));
    if (!config?.gpKey) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No key saved' });
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=test&key=${config.gpKey}`
    );
    const data = await res.json();
    return { ok: data.status !== 'REQUEST_DENIED', status: data.status };
  }),

  testClaude: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db.select({ clKey: userConfig.clKey })
      .from(userConfig).where(eq(userConfig.id, ctx.user.id));
    if (!config?.clKey) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No key saved' });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': config.clKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] }),
    });
    return { ok: res.ok };
  }),
});
```

### `api/src/routers/activity.ts`, `email.ts`, `profile.ts`

Standard Drizzle CRUD following the same pattern as `leadsRouter` — all queries scoped to `ctx.user.id`.

### `api/src/router.ts`

```ts
import { router } from './trpc';
import { placesRouter } from './routers/places';
import { aiRouter } from './routers/ai';
import { leadsRouter } from './routers/leads';
import { configRouter } from './routers/config';
import { activityRouter } from './routers/activity';
import { emailRouter } from './routers/email';
import { profileRouter } from './routers/profile';

export const appRouter = router({
  places: placesRouter,
  ai: aiRouter,
  leads: leadsRouter,
  config: configRouter,
  activity: activityRouter,
  email: emailRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] `places` router complete
- [ ] `ai` router complete
- [ ] `leads` router complete
- [ ] `config` router complete
- [ ] `activity` router complete
- [ ] `email` router complete
- [ ] `profile` router complete
- [ ] Root router + `AppRouter` type export complete

---

## Phase 22 — Express wiring

### `api/src/index.ts`

```ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { createContext } from './context';

const app = express();

app.use(cors({ origin: ['http://localhost:4200', 'http://localhost:4000'] }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(
  '/api/trpc',
  createExpressMiddleware({ router: appRouter, createContext }),
);

const port = process.env.PORT ?? 3001;
app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
```

- [ ] Express app wired
- [ ] CORS configured for Angular dev + SSR ports
- [ ] `/api/trpc` handler mounted
- [ ] `/api/health` endpoint added

---

## Phase 23 — Angular dev proxy

### `leadGenPro/proxy.conf.json`

```json
{
  "/api": {
    "target": "http://localhost:3001",
    "secure": false,
    "changeOrigin": true
  }
}
```

Update `leadGenPro/angular.json` → `projects.leadGenPro.architect.serve.options`:

```json
{
  "proxyConfig": "proxy.conf.json"
}
```

- [ ] `proxy.conf.json` created
- [ ] `angular.json` updated with `proxyConfig`

---

## Phase 24 — Angular tRPC client

### `leadGenPro/src/app/core/trpc.client.ts`

```ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../../api/src/router';
import { supabase } from './supabase.client';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      async headers() {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

> The `import type { AppRouter }` is a type-only import — it is erased at build time and adds zero runtime bytes to the Angular bundle. TypeScript resolves it at compile time from the sibling `api/` package.

- [ ] tRPC client created with auth header interceptor

---

## Phase 25 — Frontend service refactor

Replace Supabase direct queries and browser-facing HTTP calls in all Angular services with tRPC calls.

### Services to refactor

| Service | Change |
| --- | --- |
| `leads.service.ts` | Replace `supabase.from('leads').*` with `trpc.leads.*` calls |
| `config.service.ts` | Replace `supabase.from('user_config').*` with `trpc.config.*`; `hasGpKey`/`hasClKey` become boolean signals from backend |
| `activity.service.ts` | Replace `supabase.from('activity_log').*` with `trpc.activity.*` |
| `email.service.ts` | Replace `supabase.from('sent_emails').*` with `trpc.email.*`; keep `openGmailCompose` and `exportCSV` as-is |
| `profile.service.ts` | Replace `supabase.from('profiles').*` with `trpc.profile.*` |
| `places.service.ts` | Replace `HttpClient` + corsproxy.io call with `trpc.places.search.query()` |
| `claude.service.ts` | Replace `HttpClient` Anthropic calls with `trpc.ai.score.mutate()` / `trpc.ai.draft.mutate()` |

### Pattern for each service

```ts
// Before (direct Supabase)
async loadLeads(): Promise<void> {
  const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  this._leads.set(data ?? []);
}

// After (tRPC)
async loadLeads(): Promise<void> {
  const data = await trpc.leads.list.query();
  this._leads.set(data);
}
```

### What to remove from the frontend

- `corsproxy.io` URL from `places.service.ts`
- All `x-api-key` / `anthropic-version` headers from `claude.service.ts`
- `HttpClient` usage in `places.service.ts` and `claude.service.ts` (replaced by tRPC)
- `apiKey` parameters from `PlacesService.search()` and `ClaudeService.scoreBatch()` / `draftEmail()` signatures

- [ ] `leads.service.ts` refactored
- [ ] `config.service.ts` refactored (boolean flags only)
- [ ] `activity.service.ts` refactored
- [ ] `email.service.ts` refactored (DB calls only; Gmail/CSV helpers unchanged)
- [ ] `profile.service.ts` refactored
- [ ] `places.service.ts` refactored (tRPC, no CORS proxy)
- [ ] `claude.service.ts` refactored (tRPC, no API key param)
- [ ] API key params removed from `find-leads.ts` component calls

---

## Phase 26 — Integration test + build audit

```bash
# Terminal 1 — start API server
cd api && npm run dev

# Terminal 2 — start Angular (proxies /api to localhost:3001)
cd leadGenPro && ng serve

# Terminal 3 — build both
cd api && npm run build
cd leadGenPro && ng build
```

### Checklist

- [ ] `GET /api/health` returns `{ ok: true }`
- [ ] Unauthenticated tRPC call returns `UNAUTHORIZED`
- [ ] Login flow works (Supabase Auth, client-side unchanged)
- [ ] Dashboard loads leads, sent emails, activity via tRPC
- [ ] Find Leads search calls `trpc.places.search` — no CORS proxy in network tab
- [ ] AI scoring calls `trpc.ai.score` — no Anthropic URL in browser network tab
- [ ] API key fields in Settings save via tRPC; retrieving settings shows boolean badges only
- [ ] Test Connection buttons hit backend, return real status
- [ ] Gmail compose opens pre-filled tab
- [ ] `ng build` passes under 600kB warning budget
- [ ] `npm run build` in `api/` compiles without TypeScript errors
