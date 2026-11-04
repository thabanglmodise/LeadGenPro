import { describe, it, expect, vi } from 'vitest';
import { TRPCError } from '@trpc/server';

vi.mock('../lib/encrypt.js', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ''),
}));

/* ─── inline re-implementations ─────────────────────────────────────────── */

type UserKeyRow = { gp_key: string | null; cl_key: string | null; prefer_global: boolean };

async function load(userId: string, db: { findUserKey: (id: string) => Promise<UserKeyRow | null> }) {
  const _row = await db.findUserKey(userId);
  return {
    has_gp_key: !!_row?.gp_key,
    has_cl_key: !!_row?.cl_key,
    prefer_global: _row?.prefer_global ?? false,
  };
}

async function save(
  userId: string,
  input: { gp_key?: string; cl_key?: string; prefer_global?: boolean },
  db: { upsertUserKey: (id: string, patch: Partial<UserKeyRow>) => Promise<void> },
) {
  const { encrypt } = await import('../lib/encrypt.js');
  const _patch: Partial<UserKeyRow> = {};
  if (input.gp_key !== undefined) _patch.gp_key = input.gp_key ? encrypt(input.gp_key) : null;
  if (input.cl_key !== undefined) _patch.cl_key = input.cl_key ? encrypt(input.cl_key) : null;
  if (input.prefer_global !== undefined) _patch.prefer_global = input.prefer_global;
  await db.upsertUserKey(userId, _patch);
  return { ok: true };
}

/* ─── tests ─────────────────────────────────────────────────────────────── */

describe('userApiKeys.load', () => {
  it('returns false flags when no row exists', async () => {
    const _db = { findUserKey: vi.fn().mockResolvedValue(null) };
    const result = await load('user-1', _db);
    expect(result).toEqual({ has_gp_key: false, has_cl_key: false, prefer_global: false });
  });

  it('returns true flags when keys are stored', async () => {
    const _db = { findUserKey: vi.fn().mockResolvedValue({ gp_key: 'enc:k', cl_key: 'enc:k', prefer_global: true }) };
    const result = await load('user-1', _db);
    expect(result).toEqual({ has_gp_key: true, has_cl_key: true, prefer_global: true });
  });

  it('does NOT return plain key values', async () => {
    const _db = { findUserKey: vi.fn().mockResolvedValue({ gp_key: 'enc:secret', cl_key: null, prefer_global: false }) };
    const result = await load('user-1', _db);
    expect((result as Record<string, unknown>).gp_key).toBeUndefined();
  });
});

describe('userApiKeys.save', () => {
  it('encrypts keys before upsert', async () => {
    const _db = { upsertUserKey: vi.fn().mockResolvedValue(undefined) };
    await save('user-1', { gp_key: 'my-key' }, _db);
    expect(_db.upsertUserKey).toHaveBeenCalledWith('user-1', expect.objectContaining({ gp_key: 'enc:my-key' }));
  });

  it('stores null when key is empty string (clear)', async () => {
    const _db = { upsertUserKey: vi.fn().mockResolvedValue(undefined) };
    await save('user-1', { gp_key: '' }, _db);
    expect(_db.upsertUserKey).toHaveBeenCalledWith('user-1', expect.objectContaining({ gp_key: null }));
  });

  it('stores prefer_global flag', async () => {
    const _db = { upsertUserKey: vi.fn().mockResolvedValue(undefined) };
    await save('user-1', { prefer_global: true }, _db);
    expect(_db.upsertUserKey).toHaveBeenCalledWith('user-1', expect.objectContaining({ prefer_global: true }));
  });

  it('does not include fields not provided in input', async () => {
    const _db = { upsertUserKey: vi.fn().mockResolvedValue(undefined) };
    await save('user-1', { gp_key: 'k' }, _db);
    const _call = _db.upsertUserKey.mock.calls[0][1] as Record<string, unknown>;
    expect('cl_key' in _call).toBe(false);
    expect('prefer_global' in _call).toBe(false);
  });
});
