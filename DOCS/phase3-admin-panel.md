# Phase 3: Admin Panel Shell & User Management

## Objective

Build a fully functional admin panel behind `/admin/**` (guarded by `adminGuard`) with:

- An admin-accented shell layout (purple sidebar using `--accent-admin` tokens)
- Users table: list all profiles, approve or suspend users
- Approval Queue: filtered view of `pending_approval` users
- Invite User: send Supabase invite email to a new address
- Platform Settings stub: auto-approve toggle

No tier/key policy management yet (Phase 4). No onboarding wizard (Phase 5).

---

## Implementation stages

- [x] Create DOCS/phase3-admin-panel.md (this file)
- [x] `api/src/routers/admin.ts` — `listUsers`, `approveUser`, `suspendUser`, `inviteUser`, `setAutoApprove`, `getSettings` (all `adminProcedure`)
- [x] `api/src/routers/admin.spec.ts` — Vitest unit tests for all procedures
- [x] `api/src/router.ts` — register `adminRouter`
- [x] `ui/src/app/features/admin/admin-shell/admin-shell.ts` + `.html` — shell layout with admin sidebar
- [x] `ui/src/app/features/admin/admin.routes.ts` — restructure to use shell as parent, add child routes
- [x] `ui/src/app/features/admin/overview/overview.ts` — replace stub with summary stats
- [x] `ui/src/app/features/admin/users/users.ts` + `.html` — users table with approve/suspend actions
- [x] `ui/src/app/features/admin/approval-queue/approval-queue.ts` + `.html` — pending_approval filtered view
- [x] `ui/src/app/features/admin/invite/invite.ts` + `.html` — invite user by email form
- [x] `ui/src/app/features/admin/platform-settings/platform-settings.ts` + `.html` — auto-approve toggle
- [x] `ui/src/app/shared/components/sidebar/sidebar.html` — add admin section visible only when `role === 'admin'`
- [x] `ui/src/styles.css` — add admin sidebar + admin page styles
- [x] `ui/src/app/features/admin/users/users.spec.ts` — Jasmine unit tests
- [x] `ui/src/app/features/admin/approval-queue/approval-queue.spec.ts` — Jasmine unit tests
- [x] Tick off DOCS/prospekt-upgrade.md Phase 3 checklist
