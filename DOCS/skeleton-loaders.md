# Skeleton loaders (core pages)

## Objective

Rendered pages waiting on data show skeleton placeholders instead of empty states / zeroes ("0 leads", "No leads yet" flash). Splash (see `splash-loader.md`) stays reserved for whole-page loads > 300ms (boot, lazy chunk, guard redirects, pages w/o loaders).

Scope (this feature): **Dashboard, Leads (`/leads/find`), Pipeline, Sent**. Settings/compose/admin → follow-up.

## Behaviour

- **First load** of a data set → skeleton until request settles (success or failure).
- **Revisit** (data already loaded once) → cached data shown instantly, refreshed quietly in background, no skeleton.
- Concurrent `load()` calls share one in-flight request.
- Failed load still marks settled → page shows its normal empty state, not an infinite skeleton.
- `prefers-reduced-motion` → static skeleton, no shimmer.

## Architecture

```
core/utils/load-tracker.ts
  LoadTracker { loaded: Signal<boolean>, loading: Signal<boolean>, run(fn): Promise<void> }
    run → dedupes in-flight, sets loaded=true once settled

LeadsService.loadLeads / EmailService.load / ActivityService.load → wrapped in tracker.run
  expose: leadsLoaded / loaded signals

shared/components/skeleton/skeleton.ts   <app-skeleton variant width height />
styles.css  .skeleton, .skeleton--text|title|stat|card|row|circle, shimmer keyframes
           .skeleton-list (vertical stack helper)

Pages: @if (!service.loaded()) { skeleton markup } @else { existing markup }
```

## Pages

| Page | Skeleton |
| --- | --- |
| Dashboard | stat values → stat bars; each kanban col → 3 card blocks; activity → 5 rows |
| Leads | results table → header + 6 skeleton rows (hides "N leads total" until loaded) |
| Pipeline | each kanban col → 3 card blocks; **add `ngOnInit` → `loadLeads()`** (was relying on other pages) |
| Sent | table → 6 skeleton rows; Clear Log hidden until loaded |

## Known gap (pre-existing, not addressed)

Root services cache data across logout/login in same tab. Out of scope.

## Stages

- [x] Stage 1 — Create this doc
- [x] Stage 2 — `LoadTracker` util + spec; wire into Leads/Email/Activity services
- [x] Stage 3 — `SkeletonComponent` + skeleton CSS + spec
- [x] Stage 4 — Dashboard skeletons
- [x] Stage 5 — Leads page skeletons
- [x] Stage 6 — Pipeline (load on init + skeletons) + Sent skeletons
- [x] Stage 7 — Verify: tests 75/75, static build ok. Visual check pending (no headless browser locally)
