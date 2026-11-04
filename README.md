```shell
-- run both apps
(cd api && npm run dev) & (cd ui && npm start) & wait
```
## Deploy (Render)

Single web service via `render.yaml` Blueprint — Express serves `/api` + static UI. Details: `DOCS/phase8-render-deploy.md`.

1. Render dashboard → New → Blueprint → select this repo
2. Set secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `API_KEY_ENCRYPTION_SECRET`
3. Migrations run locally, not on deploy: `cd api && npm run db:migrate`

Free plan sleeps when idle → first request slow.

> Netlify (`netlify.toml`, phase 7) is archived.
