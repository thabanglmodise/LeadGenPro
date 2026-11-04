# Phase 8: Render Deployment (single web service)

## Objective

Deploy UI + API to Render as **one web service**. Express serves `/api/*` (tRPC) and the static Angular build from same origin → UI's relative `/api/trpc` works unchanged, no CORS/rewrite changes. Supersedes phase 7 (Netlify, UI only) — Netlify config removed (Stage 6).

---

## Architecture

```
render.yaml (repo root, Blueprint)
  └── web service "prospekt" (node, free)
        build:  api: npm ci && npm run build      ← first: ui tsconfig maps @api/* → ../api/dist/*
                ui:  npm ci && node scripts/write-env.js && npm run build -- --output-mode=static
        start:  cd api && npm start
        health: /api/health

Express (api/src/index.ts)
  ├── /api/health
  ├── /api/trpc        → tRPC router
  └── serveUi(app)     → api/src/lib/serve-ui.ts
        ├── express.static(UI_DIST_DIR)   default ../ui/dist/leadGenPro/browser
        └── SPA fallback (non-/api GET) → index.csr.html || index.html
        └── no-op when dir missing (local dev unaffected)
```

---

## Env vars (Render dashboard, `sync: false`)

| Var | Used by |
| --- | --- |
| `SUPABASE_URL` | ui build (write-env.js) + api |
| `SUPABASE_ANON_KEY` | ui build (write-env.js) |
| `SUPABASE_SERVICE_ROLE_KEY` | api |
| `DATABASE_URL` | api |
| `API_KEY_ENCRYPTION_SECRET` | api (32-byte hex) |

`NODE_VERSION=24`, `NODE_ENV=production` set in blueprint (installs use `--include=dev` so tsc/ng still present; hides tRPC error stacks). `PORT` injected by Render. `DIRECT_URL` not needed — migrations stay manual (`cd api && npm run db:migrate` locally).

---

## Files created / modified

- `DOCS/phase8-render-deploy.md` — this file
- `api/src/lib/serve-ui.ts` — new, static + SPA fallback
- `api/src/lib/serve-ui.spec.ts` — new, vitest
- `api/src/index.ts` — wire `serveUi`
- `render.yaml` — new
- `netlify.toml` — deleted; `DOCS/phase7-netlify-deploy.md` — marked removed
- `README.md` — deploy section

---

## Implementation stages

- [x] **Stage 1** — Create DOCS/phase8-render-deploy.md (this file)
- [x] **Stage 2** — `serve-ui.ts` + spec; wire into `api/src/index.ts`
- [x] **Stage 3** — `render.yaml` Blueprint
- [x] **Stage 4** — Archive Netlify (`netlify.toml` header, phase7 doc status) + README deploy section
- [x] **Stage 5** — Verify: run render build command locally, start api, curl `/api/health`, `/`, deep route, `/api/trpc`
- [x] **Stage 6** — Remove Netlify: delete `netlify.toml`, drop README note, update phase7 doc status + write-env.js comment
