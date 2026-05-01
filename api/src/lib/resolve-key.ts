import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import type { DB } from '../db/index.js';
import { profiles, platform_settings, user_api_keys } from '../db/schema.js';
import { decrypt } from './encrypt.js';

export type KeyType = 'gp' | 'cl';

export async function resolveKey(db: DB, userId: string, keyType: KeyType): Promise<string> {
  const [_profile] = await db
    .select({ tier: profiles.tier, key_list: profiles.key_list })
    .from(profiles)
    .where(eq(profiles.id, userId));

  if (!_profile) throw new TRPCError({ code: 'UNAUTHORIZED' });

  const { tier, key_list } = _profile;

  const [_userKeys] = await db
    .select({ gp_key: user_api_keys.gp_key, cl_key: user_api_keys.cl_key, prefer_global: user_api_keys.prefer_global })
    .from(user_api_keys)
    .where(eq(user_api_keys.user_id, userId));

  const _encryptedUserKey = keyType === 'gp' ? _userKeys?.gp_key : _userKeys?.cl_key;
  const _userKey = _encryptedUserKey ? decrypt(_encryptedUserKey) : null;
  const _preferGlobal = _userKeys?.prefer_global ?? false;

  const [_settings] = await db
    .select({
      global_key_mode: platform_settings.global_key_mode,
      global_gp_key: platform_settings.global_gp_key,
      global_cl_key: platform_settings.global_cl_key,
    })
    .from(platform_settings)
    .limit(1);

  const _encryptedGlobalKey = keyType === 'gp' ? (_settings?.global_gp_key ?? null) : (_settings?.global_cl_key ?? null);
  const _globalKey = _encryptedGlobalKey ? decrypt(_encryptedGlobalKey) : null;
  const _mode = _settings?.global_key_mode ?? 'disabled';

  if (tier === 'plus') {
    if (!_userKey) throw noKey('Configure your API keys in Settings → API Keys.');
    return _userKey;
  }

  if (tier === 'pro') {
    if (_userKey && !_preferGlobal) return _userKey;
    const _allowed = isGlobalAllowed(_mode, key_list);
    if (_allowed && _globalKey) return _globalKey;
    if (_userKey) return _userKey;
    throw noKey('No API key available. Configure your own key or ask an admin to enable global keys.');
  }

  // basic tier — global key only
  if (!isGlobalAllowed(_mode, key_list)) {
    throw noKey('Your account does not have access to API features. Contact an admin.');
  }
  if (!_globalKey) throw noKey('Global API key not configured. Contact an admin.');
  return _globalKey;
}

function isGlobalAllowed(mode: string, keyList: string): boolean {
  if (mode === 'disabled') return false;
  if (mode === 'blacklist') return keyList !== 'blacklisted';
  if (mode === 'whitelist') return keyList === 'whitelisted';
  return false;
}

function noKey(message: string): TRPCError {
  return new TRPCError({ code: 'PRECONDITION_FAILED', message });
}
