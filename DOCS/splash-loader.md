# Splash loader between redirects

## Objective

Replace blank screen / redirect flash with a branded loader: logo mark (`favicon.svg`) centered, animated glowing border (spinning accent conic ring + pulsing glow).

## When it shows

| Moment | Mechanism |
| --- | --- |
| JS bundle downloading (CSR routes via `index.csr.html`) | static markup inside `<app-root>` in `src/index.html` → replaced on bootstrap |
| Initial navigation incl. guard checks/redirects (`authGuard` awaits session) | `SplashComponent` visible until first `NavigationEnd/Cancel/Error` |
| Later navigations | shown only if navigation > 150ms (no flash on fast clicks) |
| Prerendered auth pages (`ng-server-context` on `<app-root>`) | initial splash skipped — content already visible |

## Implementation

- `src/styles.css` — global BEM `.splash`, `.splash__ring`, `.splash__logo`, `.splash--hidden`; `@keyframes splash-spin`, `splash-glow`; `prefers-reduced-motion` respected
- `src/index.html` — static splash markup inside `<app-root>`
- `src/app/shared/components/splash/splash.ts` + `.html` + `.spec.ts` — router-event driven `visible` signal; `ngSkipHydration`
- `src/app/app.ts` — render `<app-splash ngSkipHydration />` above `<router-outlet />`

## Stages

- [x] Stage 1 — Create this doc
- [x] Stage 2 — Global splash CSS + static markup in `index.html`
- [x] Stage 3 — `SplashComponent` + spec, wire into `App`
- [x] Stage 4 — Verify: tests (64/64), static build ok, CSR shell contains splash, prerendered auth pages render it `splash--hidden`. Visual check pending (no headless browser locally)
