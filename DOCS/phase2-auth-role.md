# Phase 2: Auth & Role Foundation

## Objective

Wire up JWT-based roles and profile status so that:

- New sign-ups land in `pending_verification` until email is confirmed
- After confirmation, status advances to `active` (auto-approve ON) or `pending_approval` (auto-approve OFF)
- `authGuard` gates the main app on `active` status; `pending_*` and `suspended` users see holding pages
- `adminGuard` gates `/admin/**` on `app_metadata.role === 'admin'`
- First admin is provisioned manually in the Supabase dashboard

No new UI pages beyond the three holding pages. No admin panel UI yet (Phase 3).

---

## Implementation stages

- [x] Create DOCS/phase2-auth-role.md (this file)
- [x] `api/src/db/schema.ts` — add `status`, `tier`, `key_list`, `onboarding` to `profiles`; add `platform_settings` table
- [x] Run `drizzle-kit generate` to produce migration SQL
- [x] `api/src/middleware/auth.ts` — include `role` (from `app_metadata`) in returned user object
- [x] `api/src/trpc.ts` — add `adminProcedure` (extends `protectedProcedure`, checks `role === 'admin'`)
- [x] `api/src/routers/auth.ts` — `initProfile` (upsert profile with `pending_verification`), `advanceStatus` (read auto_approve, set active or pending_approval)
- [x] `api/src/router.ts` — register `authRouter`
- [x] `ui/src/app/core/services/auth.service.ts` — add `role`, `profileStatus` signals; `ensureProfileLoaded()` method
- [x] `ui/src/app/core/guards/auth.guard.ts` — async; check profileStatus; redirect to holding pages
- [x] `ui/src/app/core/guards/admin.guard.ts` — new; checks `role === 'admin'`
- [x] `/auth/verify-prompt` page — "check your email"; detects post-confirm return; calls `advanceStatus`
- [x] `/auth/pending` page — "awaiting admin approval"
- [x] `/auth/suspended` page — "account suspended"
- [x] `ui/src/app/features/auth/auth.routes.ts` — add new routes
- [x] `ui/src/app/features/auth/signup/signup.ts` — call `trpc.auth.initProfile` after successful sign-up
- [x] `ui/src/app/app.routes.ts` — add `/admin` stub route guarded by `adminGuard`
- [x] Unit tests: `auth.service.spec.ts`, `auth.guard.spec.ts`, `admin.guard.spec.ts`, `auth.router.spec.ts`
- [x] Tick off DOCS/prospekt-upgrade.md Phase 2 checklist
