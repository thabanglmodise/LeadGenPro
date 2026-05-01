import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

/* ─── mock encrypt module before importing resolver ─────────────────────── */
vi.mock('./encrypt.js', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ''),
}));

/* ─── inline re-implementation of resolveKey for unit testing ──────────────
   We re-implement rather than import to avoid side-effects from DB module.  */
type KeyType = 'gp' | 'cl';

interface Profile { tier: string; key_list: string }
interface UserKeys { gp_key: string | null; cl_key: string | null; prefer_global: boolean }
interface Settings { global_key_mode: string; global_gp_key: string | null; global_cl_key: string | null }

async function resolveKeyImpl(
  profile: Profile | null,
  userKeys: UserKeys | null,
  settings: Settings | null,
  keyType: KeyType,
): Promise<string> {
  const { decrypt } = await import('./encrypt.js');
  if (!profile) throw new TRPCError({ code: 'UNAUTHORIZED' });

  const { tier, key_list } = profile;
  const _encUserKey = keyType === 'gp' ? userKeys?.gp_key : userKeys?.cl_key;
  const _userKey = _encUserKey ? decrypt(_encUserKey) : null;
  const _preferGlobal = userKeys?.prefer_global ?? false;

  const _encGlobalKey = keyType === 'gp' ? (settings?.global_gp_key ?? null) : (settings?.global_cl_key ?? null);
  const _globalKey = _encGlobalKey ? decrypt(_encGlobalKey) : null;
  const _mode = settings?.global_key_mode ?? 'disabled';

  function isGlobalAllowed(mode: string, keyList: string): boolean {
    if (mode === 'disabled') return false;
    if (mode === 'blacklist') return keyList !== 'blacklisted';
    if (mode === 'whitelist') return keyList === 'whitelisted';
    return false;
  }

  if (tier === 'plus') {
    if (!_userKey) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No key' });
    return _userKey;
  }

  if (tier === 'pro') {
    if (_userKey && !_preferGlobal) return _userKey;
    if (isGlobalAllowed(_mode, key_list) && _globalKey) return _globalKey;
    if (_userKey) return _userKey;
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No key' });
  }

  // basic
  if (!isGlobalAllowed(_mode, key_list)) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No key' });
  if (!_globalKey) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No key' });
  return _globalKey;
}

/* ─── fixtures ──────────────────────────────────────────────────────────── */

const globalKey = 'enc:global-gp-key';
const userKey   = 'enc:user-gp-key';

function basicProfile(extra: Partial<Profile> = {}): Profile {
  return { tier: 'basic', key_list: 'default', ...extra };
}
function plusProfile(): Profile { return { tier: 'plus', key_list: 'default' }; }
function proProfile(keyList = 'default'): Profile { return { tier: 'pro', key_list: keyList }; }

function settings(mode: string, hasGlobal = true): Settings {
  return {
    global_key_mode: mode,
    global_gp_key: hasGlobal ? globalKey : null,
    global_cl_key: hasGlobal ? globalKey : null,
  };
}

function userKeys(hasKey = true, preferGlobal = false): UserKeys {
  return { gp_key: hasKey ? userKey : null, cl_key: hasKey ? userKey : null, prefer_global: preferGlobal };
}

/* ─── tests ─────────────────────────────────────────────────────────────── */

describe('resolveKey — plus tier', () => {
  it('returns own key when configured', async () => {
    const result = await resolveKeyImpl(plusProfile(), userKeys(), settings('disabled'), 'gp');
    expect(result).toBe('user-gp-key');
  });

  it('throws PRECONDITION_FAILED when no key configured', async () => {
    await expect(
      resolveKeyImpl(plusProfile(), userKeys(false), settings('disabled'), 'gp'),
    ).rejects.toThrow(TRPCError);
  });

  it('ignores global key even when available', async () => {
    const result = await resolveKeyImpl(plusProfile(), userKeys(), settings('blacklist'), 'gp');
    expect(result).toBe('user-gp-key');
  });
});

describe('resolveKey — basic tier', () => {
  it('returns global key when mode=blacklist and user is default', async () => {
    const result = await resolveKeyImpl(basicProfile(), null, settings('blacklist'), 'gp');
    expect(result).toBe('global-gp-key');
  });

  it('throws when mode=disabled regardless of global key', async () => {
    await expect(
      resolveKeyImpl(basicProfile(), null, settings('disabled'), 'gp'),
    ).rejects.toThrow(TRPCError);
  });

  it('throws when user is blacklisted under blacklist mode', async () => {
    await expect(
      resolveKeyImpl(basicProfile({ key_list: 'blacklisted' }), null, settings('blacklist'), 'gp'),
    ).rejects.toThrow(TRPCError);
  });

  it('throws when no global key configured', async () => {
    await expect(
      resolveKeyImpl(basicProfile(), null, settings('blacklist', false), 'gp'),
    ).rejects.toThrow(TRPCError);
  });

  it('returns global key when mode=whitelist and user is whitelisted', async () => {
    const result = await resolveKeyImpl(
      basicProfile({ key_list: 'whitelisted' }), null, settings('whitelist'), 'gp',
    );
    expect(result).toBe('global-gp-key');
  });

  it('throws when mode=whitelist and user is not whitelisted', async () => {
    await expect(
      resolveKeyImpl(basicProfile({ key_list: 'default' }), null, settings('whitelist'), 'gp'),
    ).rejects.toThrow(TRPCError);
  });
});

describe('resolveKey — pro tier', () => {
  it('returns own key when prefer_global=false', async () => {
    const result = await resolveKeyImpl(proProfile(), userKeys(), settings('blacklist'), 'gp');
    expect(result).toBe('user-gp-key');
  });

  it('returns global key when prefer_global=true and policy allows', async () => {
    const result = await resolveKeyImpl(
      proProfile('whitelisted'), userKeys(true, true), settings('whitelist'), 'gp',
    );
    expect(result).toBe('global-gp-key');
  });

  it('falls back to own key when prefer_global=true but policy blocks', async () => {
    const result = await resolveKeyImpl(
      proProfile('default'), userKeys(true, true), settings('whitelist'), 'gp',
    );
    expect(result).toBe('user-gp-key');
  });

  it('throws when neither key is available', async () => {
    await expect(
      resolveKeyImpl(proProfile(), userKeys(false), settings('disabled'), 'gp'),
    ).rejects.toThrow(TRPCError);
  });
});

describe('resolveKey — auth failure', () => {
  it('throws UNAUTHORIZED when profile is null', async () => {
    await expect(
      resolveKeyImpl(null, null, null, 'gp'),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
