# Favicon → Prospekt logo mark

## Objective

Replace default Angular `favicon.ico` with the login-form logo mark (`.auth__logo-mark`, `ui/src/styles.css`): `#00E5B0` rounded square (radius 10/40), dark `#080B12` bold "P".

## Implementation

- `ui/public/favicon.svg` — 32×32 viewBox, rounded rect + "P" drawn as path (favicons can't load Syne web font)
- `ui/public/favicon.ico` — regenerated from SVG (fallback for browsers w/o SVG favicon support)
- `ui/src/index.html` — `<link rel="icon" type="image/svg+xml" href="favicon.svg">` + keep `.ico` fallback

## Stages

- [x] Stage 1 — Create this doc
- [x] Stage 2 — `favicon.svg` + regenerate `favicon.ico`
- [x] Stage 3 — `index.html` links + verify in build output
