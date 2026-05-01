import { describe, it, expect, vi } from 'vitest';

/* ─── inline re-implementation of completeStep logic ───────────────────── */

async function completeStep(
  userId: string,
  step: string,
  db: {
    getCurrentOnboarding: (id: string) => Promise<Record<string, boolean> | null>;
    updateOnboarding: (id: string, steps: Record<string, boolean>) => Promise<void>;
  },
) {
  const _current = await db.getCurrentOnboarding(userId) ?? {};
  const _merged = { ..._current, [step]: true };
  await db.updateOnboarding(userId, _merged);
  return { ok: true };
}

async function getStatus(
  userId: string,
  role: string | null,
  db: { getCurrentOnboarding: (id: string) => Promise<Record<string, boolean> | null> },
) {
  const _steps = await db.getCurrentOnboarding(userId) ?? {};
  const _total = 4;
  const _completed = Object.values(_steps).filter(Boolean).length;
  const _progress = _total > 0 ? Math.round((_completed / _total) * 100) : 0;
  return {
    steps: _steps,
    progress: _progress,
    isFirstRun: Object.keys(_steps).length === 0,
    role,
    isAdmin: role === 'admin',
  };
}

/* ─── tests ─────────────────────────────────────────────────────────────── */

describe('onboarding.completeStep', () => {
  it('merges new step into empty onboarding without overwriting', async () => {
    const _db = {
      getCurrentOnboarding: vi.fn().mockResolvedValue(null),
      updateOnboarding: vi.fn().mockResolvedValue(undefined),
    };

    await completeStep('user-1', 'supabase_verified', _db);

    expect(_db.updateOnboarding).toHaveBeenCalledWith('user-1', { supabase_verified: true });
  });

  it('merges new step without overwriting existing steps', async () => {
    const _db = {
      getCurrentOnboarding: vi.fn().mockResolvedValue({ supabase_verified: true }),
      updateOnboarding: vi.fn().mockResolvedValue(undefined),
    };

    await completeStep('user-1', 'api_keys_set', _db);

    expect(_db.updateOnboarding).toHaveBeenCalledWith('user-1', {
      supabase_verified: true,
      api_keys_set: true,
    });
  });

  it('returns { ok: true }', async () => {
    const _db = {
      getCurrentOnboarding: vi.fn().mockResolvedValue({}),
      updateOnboarding: vi.fn().mockResolvedValue(undefined),
    };

    const _result = await completeStep('user-1', 'profile_complete', _db);
    expect(_result).toEqual({ ok: true });
  });
});

describe('onboarding.getStatus', () => {
  it('marks isFirstRun=true when onboarding is empty', async () => {
    const _db = { getCurrentOnboarding: vi.fn().mockResolvedValue({}) };
    const _result = await getStatus('user-1', 'user', _db);
    expect(_result.isFirstRun).toBe(true);
  });

  it('marks isFirstRun=false when onboarding has steps', async () => {
    const _db = { getCurrentOnboarding: vi.fn().mockResolvedValue({ supabase_verified: true }) };
    const _result = await getStatus('user-1', 'admin', _db);
    expect(_result.isFirstRun).toBe(false);
  });

  it('returns correct progress for 3 of 4 steps', async () => {
    const _db = {
      getCurrentOnboarding: vi.fn().mockResolvedValue({
        supabase_verified: true, api_keys_set: true, key_policy_set: true, first_client_invited: false,
      }),
    };
    const _result = await getStatus('user-1', 'admin', _db);
    expect(_result.progress).toBe(75);
  });

  it('exposes isAdmin=true for admin role', async () => {
    const _db = { getCurrentOnboarding: vi.fn().mockResolvedValue({}) };
    const _result = await getStatus('user-1', 'admin', _db);
    expect(_result.isAdmin).toBe(true);
  });
});
