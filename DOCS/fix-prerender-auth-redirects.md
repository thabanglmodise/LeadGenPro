# Fix: prerendered auth-guard redirects

## Objective

Static build prerenders all routes (`'**'` → `RenderMode.Prerender`). Prerender has no session → `authGuard`/`adminGuard` redirect → protected routes baked as `<meta refresh>` stubs → `/auth/login`. Logged-in user refreshing/deep-linking `/pipeline` etc. gets bounced to login + "Redirecting to …" flash.

## Implementation

`ui/src/app/app.routes.server.ts`:
- `auth` (bare, redirect-only) → `RenderMode.Client` → no meta-refresh stub (splash covers it, see `splash-loader.md`)
- `auth/**` → `RenderMode.Prerender` (public, no guard)
- `**` → `RenderMode.Client` → no static file → `serveUi` fallback serves `index.csr.html` → client router + guards run with real session

## Stages

- [x] Stage 1 — Create this doc
- [x] Stage 2 — Update `app.routes.server.ts`
- [x] Stage 3 — Verify: rebuild static, no protected route emits a `Redirecting` stub; auth pages still prerendered
