# Phase 5: Onboarding Wizards & Platform Setup

## Objective

Guide new admins and clients through first-time setup via a full-screen stepped modal wizard. Surface progress on the dashboard via a widget. Persist completion state to `profiles.onboarding` (jsonb). Provide an Admin Platform Setup page at `/admin/platform-setup` for post-onboarding access.

---

## Step schemas

| Role | Steps (key → label) |
|------|---------------------|
| admin | `supabase_verified`, `api_keys_set`, `key_policy_set`, `first_client_invited` |
| client | `profile_complete`, `smtp_configured`, `first_lead_found`, `first_email_sent` |

Progress = `(completed steps / 4) * 100`. Widget hides at ≥ 80%.

---

## Architecture

```
OnboardingService (Angular)
  ├── loads onboarding JSON from trpc.onboarding.getStatus on init
  ├── exposes: steps signal, progress computed, showWizard signal
  └── completeStep(key) → trpc.onboarding.completeStep → updates local state

app-shell.ts
  └── mounts <app-onboarding-wizard> overlay when showWizard() is true

OnboardingWizardComponent (shared, generic)
  ├── @Input() steps: WizardStep[] (label, description, routerLink, key)
  └── emits (markDone) → OnboardingService.completeStep(key)

OnboardingWidgetComponent (dashboard)
  ├── @Input() progress: number, steps: WizardStep[]
  └── hides self at progress ≥ 80

platform-setup (admin)
  ├── Supabase health indicator (trpc.onboarding.healthCheck)
  ├── API keys status + link
  └── Key policy status + link
```

---

## Files created / modified

### Backend (`api/`)
- `api/src/lib/onboarding.ts` — `computeOnboardingProgress(steps, total)` pure function
- `api/src/lib/onboarding.spec.ts` — Vitest unit tests
- `api/src/routers/onboarding.ts` — `getStatus`, `completeStep`, `healthCheck`
- `api/src/routers/onboarding.spec.ts` — Vitest unit tests
- `api/src/router.ts` — register `onboardingRouter`

### Frontend (`ui/`)
- `ui/src/app/core/services/onboarding.service.ts` — signals: steps, progress, showWizard; methods: load, completeStep, toggleWizard
- `ui/src/app/shared/components/onboarding-wizard/onboarding-wizard.ts` + `.html` — generic stepped modal
- `ui/src/app/shared/components/onboarding-widget/onboarding-widget.ts` + `.html` + `.spec.ts` — dashboard widget
- `ui/src/app/features/dashboard/dashboard.ts` — add widget import + onboarding service
- `ui/src/app/features/admin/platform-setup/platform-setup.ts` + `.html` — admin platform setup page
- `ui/src/app/features/admin/admin.routes.ts` — add `platform-setup` route
- `ui/src/app/features/admin/admin-shell/admin-shell.html` — add Platform Setup nav link
- `ui/src/app/app-shell.ts` — mount wizard overlay; inject OnboardingService
- `ui/src/app/shared/components/sidebar/sidebar.html` — "Setup checklist" link in footer
- `ui/src/app/shared/components/sidebar/sidebar.ts` — expose onboardingService
- `ui/src/styles.css` — wizard + widget styles

---

## Implementation stages

- [x] Create DOCS/phase5-onboarding.md (this file)
- [x] **Stage 1** — `api/src/lib/onboarding.ts` + `api/src/lib/onboarding.spec.ts`
- [x] **Stage 2** — `api/src/routers/onboarding.ts` + spec + register in router.ts
- [x] **Stage 3** — `ui/src/app/core/services/onboarding.service.ts`
- [x] **Stage 4** — `OnboardingWizardComponent` (generic stepped modal)
- [x] **Stage 5** — `OnboardingWidgetComponent` + dashboard integration + sidebar "Setup checklist" link
- [x] **Stage 6** — Admin Platform Setup page (`/admin/platform-setup`)
- [x] **Stage 7** — Wire wizard into `app-shell.ts` + Jasmine widget tests
