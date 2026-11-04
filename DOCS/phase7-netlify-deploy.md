# Phase 7: Netlify Deployment (UI only)

> **Status: ARCHIVED** — superseded by [phase 8 Render deploy](phase8-render-deploy.md). `netlify.toml` kept for reference only.

## Objective

Deploy `ui/` to Netlify as a static build. No secrets committed to repo — Supabase URL/anon key injected at Netlify build time from Netlify env vars. API deploy is out of scope, addressed in a later phase.

---

## Architecture

```
netlify.toml (repo root)
  ├── base = "ui"
  ├── command = "node scripts/write-env.js && npm run build -- --output-mode=static"
  └── publish = "dist/leadGenPro/browser"

ui/scripts/write-env.js
  ├── reads process.env.SUPABASE_URL / process.env.SUPABASE_ANON_KEY
  ├── errors out if either is missing (fail build, not silent placeholder)
  └── writes src/environments/environment.prod.ts with real values

Netlify site env vars (set in Netlify UI, not committed)
  ├── SUPABASE_URL
  └── SUPABASE_ANON_KEY
```

`environment.prod.ts` (and `environment.ts`) are gitignored (`ui/.gitignore` → `/src/environments/*`) — neither file is tracked in git at all. `write-env.js` regenerates the local, ignored `environment.prod.ts` at build time only.

Static build note: `angular.json` currently defaults `outputMode` to `"server"` (SSR). We override per-build with `--output-mode=static` via the Netlify build command, so no changes to `angular.json`/`server.ts` are needed and local `npm start` / SSR behavior is untouched.

---

## Files created / modified

- `ui/scripts/write-env.js` — new, generates `environment.prod.ts` from env vars
- `netlify.toml` — new, root of repo, defines base/command/publish
- `DOCS/phase7-netlify-deploy.md` — this file

---

## Implementation stages

- [x] Create DOCS/phase7-netlify-deploy.md (this file)
- [x] **Stage 1** — `ui/scripts/write-env.js`: reads `SUPABASE_URL`/`SUPABASE_ANON_KEY` from env, writes `ui/src/environments/environment.prod.ts`; fails loudly if vars missing
- [x] **Stage 2** — `netlify.toml`: base/command/publish wiring, static output mode
- [x] **Stage 3** — Verify: ran the Netlify build command locally with test env vars, confirmed `dist/leadGenPro/browser` output contains real (non-placeholder) Supabase values baked into the bundle and 27 routes prerendered. `ui/dist` is gitignored so no artifact left behind.
