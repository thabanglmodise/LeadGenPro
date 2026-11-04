# Fix Setup page key tests (412) + retire legacy user_config keys

## Objective
`config.testGoogle` / `config.testClaude` return 412 "No … key saved" even when user has key in Settings → API Keys or global key available.
Cause: `config` router reads legacy `user_config.gp_key/cl_key`. Phase 4 moved keys to `user_api_keys` (encrypted) + `resolveKey()`. Setup page Save + Find Leads banners also still use legacy table.

Goal: all key reads/writes go via `user_api_keys` / `resolveKey()`. `user_config` keeps `gm_email` only (table untouched).

## Implementation
- `api/src/routers/config.ts`
  - `testGoogle` / `testClaude`: optional input `{ key?: string }`. Use input key if given, else `resolveKey()` (tier-aware 412 msgs).
  - helpers `pingGoogle(key)`, `pingClaude(key)`
  - `load`: `hasGpKey/hasClKey` = `resolveKey()` succeeds (`canResolve` helper)
  - `save`: `gm_email` only
- `api/src/routers/config.spec.ts`: unit tests
- `ui/.../settings/setup/setup.ts`: keys saved via `userApiKeys.save`; Test sends typed key
- `ui/.../core/services/config.service.ts`: `save()` gm_email only

## To-do
- [x] **Stage 1** — API: testGoogle/testClaude use resolveKey + optional input key
- [ ] **Stage 2** — API: config.load flags via resolveKey; config.save gm_email only; config.spec.ts
- [ ] **Stage 3** — UI: Setup page save via userApiKeys, Test passes typed key, ConfigService.save narrowed
- [ ] **Stage 4** — UI: verify Find Leads banners reflect resolvable keys
