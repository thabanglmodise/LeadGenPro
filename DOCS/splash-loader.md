# Splash loader between redirects

## Objective

Replace blank screen / redirect flash with a branded loader: logo mark (`favicon.svg`) centered, animated glowing border (spinning accent conic ring + pulsing glow).

## When it shows

**Rule: splash only appears if loading takes longer than `SPLASH_SHOW_DELAY_MS` (300ms).** Fast loads/navigations never show it.

| Moment | Mechanism |
| --- | --- |
| JS bundle downloading (CSR routes via `index.csr.html`) | static markup in `src/index.html` with `.splash--delayed` → CSS fade-in after 300ms |
| Angular boots after static splash already visible | `SplashComponent` starts visible if `performance.now()` ≥ delay (seamless hand-off, no gap) |
| Any navigation incl. initial + guard redirects | `NavigationStart` → show after 300ms unless `NavigationEnd/Cancel/Error` first |
| Prerendered auth pages (`ng-server-context` on `<app-root>`) | never shown initially — content already visible |

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
- [x] Stage 5 — Delay-only: static splash CSS fade-in delay, component initial state from elapsed time, delay 150→300ms, spec updated
