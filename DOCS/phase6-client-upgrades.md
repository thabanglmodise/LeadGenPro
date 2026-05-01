# Phase 6: Client Feature Upgrades

## Objective

Upgrade client-facing features: pipeline inline status select, dual-mode email compose (SMTP + mailto/clipboard), SMTP settings page, CSV export, and cross-device theme persistence.

---

## Architecture

```
DB schema additions (migration 0003)
  ├── profiles.theme (text, nullable)
  ├── sent_emails.send_method (text, nullable)
  └── user_api_keys: smtp_host, smtp_port, smtp_user, smtp_pass (encrypted),
                     smtp_from_name, smtp_from_email

leads.updateStatus (tRPC)
  └── ownership check → TRPCError FORBIDDEN → updates leads.status

email.sendSmtp (tRPC)
  ├── reads smtp_* from user_api_keys (decrypts smtp_pass)
  ├── throws PRECONDITION_FAILED if no SMTP credentials
  └── nodemailer.createTransport(...).sendMail(...)

exportToCsv (pure util: api/src/lib/export-csv.ts)
  ├── serialises Lead[] to CSV string (header row + value rows)
  └── escapes commas and double-quotes

PipelineCardComponent (ui/src/app/shared/components/pipeline-card/)
  ├── @Input() lead: Lead
  ├── (statusChange) EventEmitter<LeadStatus>
  └── optimistic revert on error (local status signal)

/settings/smtp (ui/src/app/features/settings/smtp/)
  ├── form: host, port, user, password, from-name, from-address
  ├── save → trpc.userApiKeys.saveSmtp
  └── "Send test email" → trpc.email.testSmtp

ComposeComponent (updated)
  ├── smtpConfigured signal (loaded from trpc.userApiKeys.load)
  ├── sendViaSMTP() → trpc.email.sendSmtp → log with send_method='smtp'
  ├── copyToClipboard() → navigator.clipboard.writeText → log send_method='clipboard'
  └── openMailto() → mailto: link → log send_method='mailto'

AuthService (updated)
  └── reads profiles.theme on load; syncs on toggle via trpc.profile.setTheme
```

---

## Files created / modified

### Backend (`api/`)
- `api/src/db/schema.ts` — add `theme` to profiles, `send_method` to sent_emails, smtp columns to user_api_keys
- `api/drizzle/0003_*.sql` — generated migration
- `api/src/lib/export-csv.ts` — `exportToCsv(leads: Lead[]): string` pure function
- `api/src/lib/export-csv.spec.ts` — Vitest unit tests
- `api/src/routers/leads.ts` — add `updateStatus` procedure
- `api/src/routers/leads.spec.ts` — Vitest unit tests for `updateStatus`
- `api/src/routers/email.ts` — add `sendSmtp`, `testSmtp` procedures
- `api/src/routers/email.spec.ts` — Vitest unit tests for `sendSmtp`
- `api/src/routers/user-api-keys.ts` — add `saveSmtp`, extend `load` to include smtp status
- `api/src/routers/profile.ts` — add `setTheme` procedure
- `api/package.json` — add `nodemailer` + `@types/nodemailer`

### Frontend (`ui/`)
- `ui/src/app/shared/components/pipeline-card/pipeline-card.ts` + `.html` + `.spec.ts` — inline status select card
- `ui/src/app/features/pipeline/pipeline.html` — replace inline cards with `<app-pipeline-card>`
- `ui/src/app/features/pipeline/pipeline.ts` — import PipelineCardComponent; add `onStatusChange`
- `ui/src/app/features/settings/smtp/smtp.ts` + `.html` — SMTP settings page
- `ui/src/app/features/settings/settings.routes.ts` — add `smtp` route
- `ui/src/app/shared/components/sidebar/sidebar.html` — add SMTP settings link
- `ui/src/app/features/compose/compose.ts` — dual-mode send (smtp/copy/mailto)
- `ui/src/app/features/compose/compose.html` — send button group
- `ui/src/app/features/compose/compose.spec.ts` — Jasmine tests
- `ui/src/app/features/leads/find/find-leads.ts` — add "Export CSV" button handler
- `ui/src/app/features/leads/find/find-leads.html` — add export button to toolbar
- `ui/src/app/core/services/auth.service.ts` — read/write profiles.theme
- `ui/src/styles.css` — pipeline card styles, SMTP page styles, compose send group styles

---

## Implementation stages

- [ ] Create DOCS/phase6-client-upgrades.md (this file)
- [x] **Stage 1** — DB schema additions + Drizzle migration (`api/src/db/schema.ts` + `api/drizzle/0003_*.sql`)
- [x] **Stage 2** — `leads.updateStatus` tRPC procedure + `api/src/routers/leads.spec.ts`
- [x] **Stage 3** — `email.sendSmtp` + `email.testSmtp` tRPC procedures + `api/src/routers/email.spec.ts`; install nodemailer; extend `user-api-keys.ts` with `saveSmtp`
- [x] **Stage 4** — `exportToCsv` pure util + spec; CSV export button on find-leads page
- [x] **Stage 5** — `PipelineCardComponent` (shared) + pipeline page wiring + Jasmine spec
- [x] **Stage 6** — `/settings/smtp` UI page + route + sidebar link
- [x] **Stage 7** — Compose dual-mode send UI + `compose.spec.ts`
- [x] **Stage 8** — Theme persistence (`profiles.theme` column, auth service read/write, `profile.setTheme` tRPC)
