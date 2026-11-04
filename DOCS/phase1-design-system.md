# Phase 1: Design System & Rebrand

## Objective

Rename the app to **Prospekt**, install the Syne + DM Sans font stack, and replace the existing ad-hoc CSS variables with a full Tailwind v4 `@theme inline` design token system. Implement dark (default) and light mode with a single CSS class toggle on `<html>`. Add a `ThemeService` that persists the user's preference to `localStorage` and restores it on load. Surface a theme-toggle button in the sidebar footer.

No layout changes, no routing changes, no API changes.

---

## Implementation stages

- [x] Create DOCS/phase1-design-system.md (this file)
- [x] `index.html` — rename title to "Prospekt", add Google Fonts (Syne + DM Sans), add `class="dark"` to `<html>`
- [x] `styles.css` — rewrite with `@theme inline` block, `:root / html.dark` dark tokens (POC colours), `html.light` light overrides, Syne headings, DM Sans body
- [x] `ThemeService` (`core/services/theme.service.ts`) — reads localStorage, applies class to `document.documentElement`, exposes `theme` signal and `toggle()`
- [x] `ThemeService` spec — tests: toggle dark→light→dark, init from localStorage, defaults to dark
- [x] `AppShellComponent` — inject `ThemeService` to trigger init on app load
- [x] `SidebarComponent` + `sidebar.html` — rebrand to "Prospekt", add theme-toggle button in footer
- [x] Update auth page branding (login, signup, reset) to use Prospekt logo mark
- [x] Remove stale Firebase comment from server.ts
- [x] Update DOCS/prospekt-upgrade.md Phase 1 checklist
