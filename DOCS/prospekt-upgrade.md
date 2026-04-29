# Plan: Prospekt Full Application Upgrade

> Source: `DOCS/poc/prospekt.html` + grilling session (2026-04-29)

## Testing Approach

Applies across all phases:

- **Angular units**: Jasmine + Angular `TestBed` for components, services, and guards
- **tRPC procedures**: Jest with a mocked Drizzle `db` and mocked Supabase admin client — no real DB calls
- **Pure utilities** (key resolver, CSV serialiser, progress calculator): Jest, no mocking needed
- **Guards**: test the guard function directly with a mocked `AuthService` signal
- Every new tRPC router added in a phase gets a matching `.spec.ts` in the same directory
- Every new Angular service or guard gets a matching `.spec.ts` alongside it
- Component tests cover: rendering the correct UI state given inputs, and emitting the correct outputs — not implementation internals

---

## Architectural Decisions

Durable decisions that apply across all phases:

- **App name**: Prospekt (rename everywhere — title, metadata, branding)
- **Routes**:
  - `/auth/login`, `/auth/signup`, `/auth/reset`, `/auth/verify` — public
  - `/` → redirects to `/dashboard` — requires `active` status
  - `/admin/**` — requires JWT role claim `admin`
  - `/settings/profile`, `/settings/setup` — authenticated users
  - `/settings/smtp` — authenticated users (client SMTP config)
- **Theme**: Tailwind `@theme` block in global CSS; all color/typography tokens as CSS custom properties; dark/light mode via `.dark` / `.light` class on `<html>`; no JS needed to swap themes
- **Fonts**: Syne (headings, logo, weights 600/700/800) + DM Sans (body, mono labels, weights 300–700) via Google Fonts
- **Schema additions**:
  - `profiles`: add `status` (`pending_verification | pending_approval | active | suspended`), `tier` (`basic | plus | pro`), `onboarding` (jsonb), `key_list` (`default | whitelisted | blacklisted`)
  - `platform_settings`: new table — `auto_approve` (bool), `global_key_mode` (`whitelist | blacklist | disabled`), `global_gp_key` (text), `global_cl_key` (text)
  - `user_api_keys`: new table — `user_id`, `gp_key` (encrypted text), `cl_key` (encrypted text)
- **Role system**: role stored in Supabase `app_metadata.role` → baked into JWT; checked client-side from `session.user.app_metadata.role`; RLS policies use `auth.jwt() ->> 'role'`; first admin provisioned manually via Supabase dashboard
- **Key resolution order** (server-side): user's own key (if set + tier allows) → global key (if tier + policy permits) → block with 402
- **Email send modes**: SMTP relay (nodemailer, credentials stored per-user in `user_api_keys`) + mailto/clipboard fallback — always both available in compose UI, SMTP gated on credentials being configured
- **Pipeline stages**: `new | contacted | replied | converted` — status stored on `leads.status`, changed via inline select on lead card

---

## Phase 1: Design System & Rebrand

**User stories**:
- As a user I see the Prospekt brand and dark design language throughout the app
- As a user I can toggle between dark and light mode
- As a developer a theme can be swapped by changing one CSS class on `<html>`

### What to build

Install Syne and DM Sans from Google Fonts. Define a Tailwind `@theme` block that maps all design tokens to CSS custom properties: background layers (`--bg`, `--bg-2`, `--bg-3`, `--bg-4`, `--bg-5`), border levels, accent teal (`--accent`), accent purple (`--accent-admin`), semantic text colours, status colours (hot/warm/cold/success/danger). Define a `.dark` and `.light` token set that overrides these variables. Migrate all existing component styles to consume the new token names. Rename the app to Prospekt in `index.html`, `app.ts`, sidebar branding, page titles. Add a theme-toggle button to the sidebar footer (persists preference to `localStorage`).

### Acceptance criteria

- [x] Tailwind `@theme` block defines all colour and typography tokens as CSS variables
- [x] `.dark` and `.light` classes on `<html>` fully swap the visual theme with no JS logic beyond the class toggle
- [x] Syne font applied to all headings, logo mark, and stat values
- [x] DM Sans applied to body text and monospace labels
- [x] App title, sidebar logo, and `<title>` all read "Prospekt"
- [x] Theme toggle button in sidebar persists choice to localStorage and restores on load
- [x] All existing pages (dashboard, leads, pipeline, compose, sent, settings) render correctly under both themes
- [x] POC colour values (`#080B12`, `#00E5B0`, `#7B61FF`) are reflected in dark mode tokens

### Unit tests — Phase 1

- [x] `ThemeService`: toggling dark→light→dark updates the `<html>` class and writes to `localStorage`
- [x] `ThemeService`: on init, reads `localStorage` and applies the stored class before first render
- [x] `ThemeService`: defaults to dark mode when `localStorage` has no entry

---

## Phase 2: Auth & Role Foundation

**User stories**:
- As a new user I can register with email + password and must verify my email before accessing the app
- As a new user (when auto-approve is OFF) I see a "pending approval" screen after email verification
- As an admin I can toggle auto-approve for new registrations
- As an admin my role is enforced at JWT level — no separate login needed

### What to build

Add `status`, `tier`, `key_list`, and `onboarding` columns to the `profiles` table via a Drizzle migration. Create the `platform_settings` table. Update the Supabase Auth hook (or DB trigger) to set `profiles.status = 'pending_verification'` on new sign-up, then advance to `pending_approval` or `active` after email confirmation depending on the `platform_settings.auto_approve` flag. Update `AuthService` to expose `role` (read from `session.user.app_metadata.role`) and `profileStatus` signals. Create an `adminGuard` that checks JWT role claim. Update the existing `authGuard` to redirect `pending_verification` users to `/auth/verify-prompt` and `pending_approval` users to `/auth/pending` holding pages. Update the signup flow UI to reflect the new states.

### Acceptance criteria

- [ ] `profiles` table has `status`, `tier` (default `basic`), `key_list` (default `default`), `onboarding` columns via migration
- [ ] `platform_settings` table exists with `auto_approve` (default `true`) and `global_key_mode` (default `disabled`)
- [ ] New sign-up sets `status = pending_verification`; email confirmation advances to `active` (auto-approve ON) or `pending_approval` (auto-approve OFF)
- [ ] `AuthService.role` signal reads `app_metadata.role` from JWT
- [ ] `adminGuard` blocks non-admin users from `/admin/**` and redirects to `/dashboard`
- [ ] `authGuard` redirects `pending_verification` → `/auth/verify-prompt`, `pending_approval` → `/auth/pending`
- [ ] `/auth/verify-prompt` page explains email confirmation step
- [ ] `/auth/pending` page explains awaiting admin approval
- [ ] First admin can be provisioned by manually setting `app_metadata: { role: 'admin' }` in Supabase dashboard

### Unit tests — Phase 2

- [ ] `AuthService`: `role` signal returns `'admin'` when `app_metadata.role` is `'admin'`
- [ ] `AuthService`: `role` signal returns `null` when `app_metadata` is absent
- [ ] `AuthService`: `profileStatus` signal reflects the value from the session's profile
- [ ] `authGuard`: returns `true` for an `active` user
- [ ] `authGuard`: redirects to `/auth/verify-prompt` for `pending_verification`
- [ ] `authGuard`: redirects to `/auth/pending` for `pending_approval`
- [ ] `authGuard`: redirects to `/auth/login` for unauthenticated user
- [ ] `adminGuard`: returns `true` for a user with `role === 'admin'`
- [ ] `adminGuard`: redirects to `/dashboard` for a user with any other role
- [ ] `auth.signup` tRPC procedure: creates profile with `status = 'pending_verification'`
- [ ] status-advancement logic: sets `active` when `auto_approve` is `true`
- [ ] status-advancement logic: sets `pending_approval` when `auto_approve` is `false`

---

## Phase 3: Admin Panel Shell & User Management

**User stories**:
- As an admin I have a dedicated admin section in the sidebar (visible only to me)
- As an admin I can see all registered users with their status and tier
- As an admin I can approve or suspend users
- As an admin I can invite a new user by email
- As an admin I can toggle auto-approve for new registrations

### What to build

Add an `/admin` route group guarded by `adminGuard` with its own shell layout (admin-accented sidebar using `--accent-admin` tokens). Build the admin sidebar with sections: Overview, Users (Manage Users, Approval Queue, Invite User), System (Platform Settings, API Keys, Activity Log). Build the Users list page: a table of all profiles with columns for name, email, status badge, tier badge, and actions (approve / suspend). Build the Approval Queue page: filtered view of `pending_approval` users with approve/reject actions — each action calls a tRPC admin procedure that updates `profiles.status` and (on approve) sets `app_metadata.role = 'user'` via the Supabase admin API. Build the Invite User modal: admin enters an email, triggers `supabase.auth.admin.inviteUserByEmail()`. Add auto-approve toggle to Platform Settings page (stub — full settings built in Phase 5).

### Acceptance criteria

- [ ] `/admin` route renders an admin-accented layout; redirects non-admins to `/dashboard`
- [ ] Admin sidebar section appears in the main sidebar only when `role === 'admin'`
- [ ] Users table lists all profiles with status and tier badges
- [ ] Approve action sets `profiles.status = 'active'` and `app_metadata.role = 'user'`; user can then sign in
- [ ] Suspend action sets `profiles.status = 'suspended'`; suspended users are blocked by `authGuard`
- [ ] Invite modal sends a Supabase invite email; invited user appears in users table as `pending_verification`
- [ ] Auto-approve toggle reads and writes `platform_settings.auto_approve` via tRPC
- [ ] All admin tRPC procedures are protected by role check in the tRPC context middleware

### Unit tests — Phase 3

- [ ] `admin.approveUser` procedure: sets `profiles.status = 'active'` and calls Supabase admin API to set `app_metadata.role = 'user'`
- [ ] `admin.suspendUser` procedure: sets `profiles.status = 'suspended'`
- [ ] `admin.inviteUser` procedure: calls `supabase.auth.admin.inviteUserByEmail` with the provided email
- [ ] All three admin procedures: throw `UNAUTHORIZED` when caller does not have `role = 'admin'` in JWT
- [ ] `admin.listUsers` procedure: returns all profiles; throws `UNAUTHORIZED` for non-admins
- [ ] `admin.setAutoApprove` procedure: writes the boolean to `platform_settings.auto_approve`
- [ ] `AdminUsersComponent`: renders approve and suspend buttons only for non-admin profiles
- [ ] `ApprovalQueueComponent`: renders empty state when no `pending_approval` users exist

---

## Phase 4: Tier System & API Key Policy

**User stories**:
- As an admin I can assign tiers to users and manage which users can access shared global API keys
- As an admin I can set the global key policy (whitelist / blacklist / disabled) with one toggle
- As a basic-tier user my API usage is rate-limited and I use shared global keys transparently
- As a plus-tier user I can enter my own API keys in settings
- As a pro-tier user I can use my own keys or opt into shared global keys

### What to build

Create the `user_api_keys` table via migration. Add `global_gp_key` and `global_cl_key` to `platform_settings`. Build the server-side key resolver: a shared utility that, given a `user_id`, returns the correct Google Places and Anthropic keys based on tier + policy + list membership. Update the Places and AI tRPC routers to use the resolver instead of reading directly from `user_config`. Build the admin API Keys page: fields for global keys with save/test actions, the policy mode toggle (`whitelist | blacklist | disabled`), and a user table filterable by list type with add-to-list / remove-from-list actions. Build the client BYOK settings page (`/settings/api-keys`): fields for personal Google Places and Anthropic keys, visible only to `plus` and `pro` tier users. Pro-tier users also see a toggle to prefer global keys over their own.

### Acceptance criteria

- [ ] `user_api_keys` table exists; keys are stored encrypted (pgcrypto or app-layer AES)
- [ ] Key resolver returns correct key for each tier/policy combination; returns `null` (→ 402) when no key is available
- [ ] Basic users: only global key used; rate limit enforced server-side (configurable in platform settings)
- [ ] Plus users: only their own key used; error shown in settings if not configured
- [ ] Pro users: own key preferred; falls back to global if toggle is ON and policy allows
- [ ] Admin API Keys page saves and tests both global keys
- [ ] Global key policy toggle cycles through `whitelist / blacklist / disabled`; change takes effect immediately
- [ ] Admin user table shows list membership; admin can add/remove users from whitelist or blacklist
- [ ] Client `/settings/api-keys` page visible to `plus` and `pro` tiers only

### Unit tests — Phase 4

- [ ] `resolveApiKey`: returns user's own key for `plus` tier regardless of global policy
- [ ] `resolveApiKey`: returns global key for `basic` tier when policy is `disabled` → returns `null`
- [ ] `resolveApiKey`: returns global key for `basic` tier when policy is `blacklist` and user is not blacklisted
- [ ] `resolveApiKey`: returns `null` for `basic` tier when user is blacklisted under `blacklist` policy
- [ ] `resolveApiKey`: returns global key for `pro` tier when user prefers global and is whitelisted under `whitelist` policy
- [ ] `resolveApiKey`: returns `null` when no key is available at any level
- [ ] `admin.setGlobalKeyMode` procedure: writes mode to `platform_settings`; throws `UNAUTHORIZED` for non-admins
- [ ] `admin.setUserKeyList` procedure: updates `profiles.key_list`; throws `UNAUTHORIZED` for non-admins
- [ ] `admin.setUserTier` procedure: updates `profiles.tier`; throws `UNAUTHORIZED` for non-admins
- [ ] `userApiKeys.save` procedure: encrypts and stores keys; only accessible to the owning user
- [ ] `ApiKeysSettingsComponent`: hidden entirely for `basic` tier users

---

## Phase 5: Onboarding Wizards & Platform Setup

**User stories**:
- As a new admin I am guided through platform configuration before seeing the main dashboard
- As a new client I am guided through profile setup and first outreach before the wizard hides
- As any user I can revisit my onboarding progress from the profile menu
- As a user whose onboarding is ≥80% complete the dashboard widget is hidden

### What to build

Define the onboarding step schemas:
- Admin steps: `{ supabase_verified, api_keys_set, key_policy_set, first_client_invited }` (4 steps → 80% = 3/4 done)
- Client steps: `{ profile_complete, smtp_configured, first_lead_found, first_email_sent }` (4 steps → 80% = 3/4 done)

Build the admin first-run wizard: a full-screen stepped modal that appears on first login if `onboarding` is empty. Steps: (1) Supabase connection health check, (2) set global API keys, (3) set key policy, (4) invite first client. Each completed step updates `profiles.onboarding` via tRPC. Build the client first-run wizard: same stepped modal pattern. Steps: (1) complete business profile, (2) configure SMTP or skip, (3) find first leads, (4) compose + send first email. Build the dashboard onboarding widget: shows step checklist and % progress bar; auto-hides when progress ≥80% but sets a "show again" link in the profile dropdown. Build the Platform Setup page at `/admin/platform-setup`: Supabase health indicator, API keys section, key policy section, tier defaults, accessible post-onboarding from admin sidebar.

### Acceptance criteria

- [ ] `profiles.onboarding` JSON is updated on each completed wizard step via tRPC mutation
- [ ] Admin first-run wizard appears on first admin login (empty `onboarding`); can be dismissed and resumed
- [ ] Client first-run wizard appears on first client login; each step links to the relevant page
- [ ] Dashboard widget shows checklist + progress bar; disappears when ≥80% complete
- [ ] Profile dropdown always shows "Setup checklist" link regardless of completion
- [ ] Platform Setup page at `/admin/platform-setup` shows live Supabase connection status
- [ ] Wizard completion state survives logout/login (persisted to DB, not localStorage)

### Unit tests — Phase 5

- [ ] `computeOnboardingProgress`: returns 0 for empty steps object
- [ ] `computeOnboardingProgress`: returns 75 when 3 of 4 steps are complete
- [ ] `computeOnboardingProgress`: returns 100 when all steps complete
- [ ] `onboarding.completeStep` procedure: merges step into existing `profiles.onboarding` JSON without overwriting other steps
- [ ] `OnboardingWidgetComponent`: renders when progress < 80
- [ ] `OnboardingWidgetComponent`: does not render when progress ≥ 80
- [ ] `OnboardingWidgetComponent`: profile menu link always present regardless of progress

---

## Phase 6: Client Feature Upgrades

**User stories**:
- As a client I can move a lead to any pipeline stage by clicking its status badge
- As a client I can send an email via SMTP if configured, or use mailto/clipboard if not
- As a client I can enter SMTP credentials in settings to enable server-side sending
- As a client I can export my leads to CSV
- As any user I can toggle dark/light mode from the sidebar

### What to build

**Pipeline inline status**: Replace static stage badges on lead cards with a `<select>` element. On change, fire a tRPC `leads.updateStatus` mutation with optimistic update — card moves to the correct column immediately, reverts on error. All four stages (`new | contacted | replied | converted`) are selectable from any card.

**Dual-mode compose send**: In the compose page, resolve whether the current user has SMTP credentials configured. If yes, show a primary "Send via SMTP" button (calls tRPC `email.sendSmtp`). Always show a secondary "Copy to clipboard" button and an "Open in mail app" button (generates a `mailto:` link with subject + body pre-filled). Add a sent-via indicator to the sent emails log (`smtp | mailto | clipboard`).

**SMTP settings**: Add `/settings/smtp` route. Form fields: host, port, username, password, from-name, from-address. Save via tRPC to `user_api_keys` table. Include a "Send test email" action.

**CSV export**: Add an "Export CSV" button to the leads table toolbar. Client-side generation (no server round-trip) — serialises visible leads to CSV and triggers a download.

**Theme toggle**: Wire the theme-toggle button built in Phase 1 to also update a `profiles.theme` preference column so it persists across devices.

### Acceptance criteria

- [ ] Clicking a lead's stage badge opens a `<select>`; selecting a new stage updates the DB and moves the card optimistically
- [ ] All four pipeline stages are interactive end-to-end
- [ ] Compose page shows "Send via SMTP" only when SMTP is configured; always shows "Copy" and "Open in mail app"
- [ ] `email.sendSmtp` tRPC procedure sends via nodemailer using the caller's stored SMTP credentials
- [ ] Sent emails log records send method (`smtp | mailto | clipboard`)
- [ ] `/settings/smtp` saves credentials and "Send test email" confirms delivery
- [ ] "Export CSV" downloads a well-formed `.csv` of the current lead list
- [ ] Theme preference persists to `profiles.theme` and is restored on next login across devices

### Unit tests — Phase 6

- [ ] `leads.updateStatus` procedure: updates `leads.status` for the owning user; throws `FORBIDDEN` for other users
- [ ] `PipelineCardComponent`: emits status change event when a new stage is selected
- [ ] `PipelineCardComponent`: reverts displayed status when the mutation errors
- [ ] `email.sendSmtp` procedure: calls nodemailer `sendMail` with the caller's stored SMTP credentials
- [ ] `email.sendSmtp` procedure: throws `PRECONDITION_FAILED` when caller has no SMTP credentials stored
- [ ] `exportToCsv`: serialises a lead array to a correctly-formatted CSV string with a header row
- [ ] `exportToCsv`: escapes commas and quotes in field values
- [ ] `ComposeComponent`: shows "Send via SMTP" button only when `smtpConfigured` is true
- [ ] `ComposeComponent`: always renders copy and mailto buttons regardless of SMTP state
