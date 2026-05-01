# Phase 4: Tier System & API Key Policy

## Objective

Implement a server-side key resolution system so that:
- **Basic** users transparently consume shared global API keys (Google Places + Anthropic), subject to the platform's key policy (whitelist / blacklist / disabled)
- **Plus** users supply their own keys; usage is gated on those keys being configured
- **Pro** users prefer their own keys but can opt into shared global keys when the policy permits

Admins manage global keys and the key policy from a new Admin → API Keys page. Per-user keys are stored encrypted in a new `user_api_keys` table using AES-256-GCM (app-layer). A `/settings/api-keys` page (visible to `plus` and `pro` only) lets clients configure their own keys.

---

## Architecture

```
user request (places.search / ai.score / ai.draft)
  ↓
key resolver (api/src/lib/resolve-key.ts)
  reads: profiles.tier, profiles.key_list
         user_api_keys (user's own keys, if any)
         platform_settings (global keys + mode)
  returns: resolved key string OR throws PAYMENT_REQUIRED
  ↓
upstream API call (Google / Anthropic)
```

### Key resolution order (server-side)

| Tier | Resolver behaviour |
|------|-------------------|
| `basic` | global key only; mode=`disabled` → 402; blacklisted under `blacklist` → 402; not whitelisted under `whitelist` → 402 |
| `plus` | user's own key only; not configured → 402 |
| `pro` | user's key preferred; if `prefer_global=true` AND policy allows → global key; neither available → 402 |

### Encryption

App-layer AES-256-GCM via Node `crypto`. Secret loaded from `API_KEY_ENCRYPTION_SECRET` env var (32-byte hex string). IV prepended to cipher text, stored as `<iv_hex>:<cipher_hex>`.

---

## Files created / modified

### Backend (`api/`)
- `api/src/db/schema.ts` — add `user_api_keys` table
- `api/drizzle/0001_user_api_keys.sql` — migration SQL
- `api/src/lib/encrypt.ts` — AES-256-GCM encrypt/decrypt helpers
- `api/src/lib/resolve-key.ts` — key resolver utility
- `api/src/lib/resolve-key.spec.ts` — unit tests for resolver
- `api/src/routers/admin.ts` — add `setGlobalKeyMode`, `setGlobalKeys`, `setUserKeyList`, `setUserTier`
- `api/src/routers/user-api-keys.ts` — `save`, `load` procedures
- `api/src/routers/user-api-keys.spec.ts` — unit tests
- `api/src/routers/places.ts` — use key resolver
- `api/src/routers/ai.ts` — use key resolver
- `api/src/router.ts` — register `userApiKeysRouter`

### Frontend (`ui/`)
- `ui/src/app/features/admin/api-keys/api-keys.ts` + `.html` — admin API keys page
- `ui/src/app/features/settings/api-keys/api-keys.ts` + `.html` — client BYOK settings page
- `ui/src/app/features/admin/admin.routes.ts` — add `api-keys` route
- `ui/src/app/features/admin/admin-shell/admin-shell.html` — add API Keys nav link
- `ui/src/app/features/settings/settings.routes.ts` — add `api-keys` route
- `ui/src/app/core/services/auth.service.ts` — expose `tier` signal

---

## Implementation stages

- [x] Create DOCS/phase4-tier-api-keys.md (this file)
- [x] **Stage 1** — Add `user_api_keys` table to `api/src/db/schema.ts`; add `prefer_global` boolean; generate migration SQL; add `API_KEY_ENCRYPTION_SECRET` to `.env`
- [x] **Stage 2** — `api/src/lib/encrypt.ts` (AES-256-GCM helpers); `api/src/lib/resolve-key.ts` (resolver logic)
- [x] **Stage 3** — Extend `api/src/routers/admin.ts`: `setGlobalKeyMode`, `setGlobalKeys`, `setUserKeyList`, `setUserTier`
- [x] **Stage 4** — `api/src/routers/user-api-keys.ts`: `save` (encrypt + upsert), `load` (booleans only)
- [x] **Stage 5** — Update `places.ts` and `ai.ts` to call `resolveKey()` instead of reading `user_config` directly
- [x] **Stage 6** — Admin API Keys UI: global key fields, policy toggle, user list membership table
- [x] **Stage 7** — Client `/settings/api-keys` page (plus/pro only): personal key inputs + prefer-global toggle for pro
- [x] **Stage 8** — Unit tests: `resolve-key.spec.ts` (all tier/policy combos); `user-api-keys.spec.ts` (save/load/auth)
