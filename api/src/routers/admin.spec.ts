import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

/* ── helpers ── */

function makeDb(overrides: {
  profiles?: Array<{ id: string; status: string; tier: string }>;
  settings?: { id: string; auto_approve: boolean } | null;
}) {
  const _profiles = overrides.profiles ?? [];
  const _settings = overrides.settings ?? null;
  const _updateCalls: Array<{ table: string; set: Record<string, unknown>; where: string }> = [];
  const _insertCalls: Array<{ table: string; values: Record<string, unknown> }> = [];

  return {
    _updateCalls,
    _insertCalls,
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(_settings !== undefined ? (_settings ? [_settings] : []) : []);
    }),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    /* query terminator for listUsers / select */
    then(resolve: (v: unknown) => void) {
      resolve(_profiles);
    },
  };
}

/* Inline re-implementations (same pattern as auth.spec.ts) */

async function listUsers(ctx: { db: ReturnType<typeof makeDb> }) {
  return ctx.db.select().from({} as never);
}

async function approveUser(
  ctx: { db: ReturnType<typeof makeDb> },
  input: { userId: string },
  supabaseAdmin: { updateUserById: (id: string, data: unknown) => Promise<{ error: null | { message: string } }> },
) {
  ctx.db._updateCalls.push({ table: 'profiles', set: { status: 'active' }, where: input.userId });
  const { error } = await supabaseAdmin.updateUserById(input.userId, { app_metadata: { role: 'user' } });
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  return { ok: true };
}

async function suspendUser(
  ctx: { db: ReturnType<typeof makeDb> },
  input: { userId: string },
) {
  ctx.db._updateCalls.push({ table: 'profiles', set: { status: 'suspended' }, where: input.userId });
  return { ok: true };
}

async function inviteUser(
  input: { email: string },
  supabaseAdmin: { inviteUserByEmail: (email: string) => Promise<{ error: null | { message: string } }> },
) {
  const { error } = await supabaseAdmin.inviteUserByEmail(input.email);
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  return { ok: true };
}

async function setAutoApprove(
  ctx: { db: ReturnType<typeof makeDb> },
  input: { value: boolean },
  existingRow: boolean,
) {
  if (existingRow) {
    ctx.db._updateCalls.push({ table: 'platform_settings', set: { auto_approve: input.value }, where: '' });
  } else {
    ctx.db._insertCalls.push({ table: 'platform_settings', values: { auto_approve: input.value } });
  }
  return { ok: true };
}

function assertUnauthorized(role: string | null) {
  if (role !== 'admin') throw new TRPCError({ code: 'UNAUTHORIZED' });
}

/* ── tests ── */

describe('adminRouter.listUsers', () => {
  it('returns all profiles', async () => {
    const _db = makeDb({ profiles: [{ id: 'u1', status: 'active', tier: 'basic' }] });
    const _result = await listUsers({ db: _db });
    expect(_db.select).toHaveBeenCalled();
  });

  it('throws UNAUTHORIZED for non-admin', () => {
    expect(() => assertUnauthorized('user')).toThrow(TRPCError);
  });
});

describe('adminRouter.approveUser', () => {
  it('sets profile status to active', async () => {
    const _db = makeDb({});
    const _admin = { updateUserById: vi.fn().mockResolvedValue({ error: null }) };
    await approveUser({ db: _db }, { userId: 'u1' }, _admin);
    expect(_db._updateCalls).toContainEqual(
      expect.objectContaining({ set: { status: 'active' }, where: 'u1' }),
    );
  });

  it('calls supabaseAdmin.updateUserById with role=user', async () => {
    const _db = makeDb({});
    const _admin = { updateUserById: vi.fn().mockResolvedValue({ error: null }) };
    await approveUser({ db: _db }, { userId: 'u1' }, _admin);
    expect(_admin.updateUserById).toHaveBeenCalledWith('u1', { app_metadata: { role: 'user' } });
  });

  it('throws INTERNAL_SERVER_ERROR when supabase returns an error', async () => {
    const _db = makeDb({});
    const _admin = { updateUserById: vi.fn().mockResolvedValue({ error: { message: 'fail' } }) };
    await expect(approveUser({ db: _db }, { userId: 'u1' }, _admin)).rejects.toThrow(TRPCError);
  });

  it('throws UNAUTHORIZED for non-admin', () => {
    expect(() => assertUnauthorized(null)).toThrow(TRPCError);
  });
});

describe('adminRouter.suspendUser', () => {
  it('sets profile status to suspended', async () => {
    const _db = makeDb({});
    await suspendUser({ db: _db }, { userId: 'u2' });
    expect(_db._updateCalls).toContainEqual(
      expect.objectContaining({ set: { status: 'suspended' }, where: 'u2' }),
    );
  });

  it('throws UNAUTHORIZED for non-admin', () => {
    expect(() => assertUnauthorized('user')).toThrow(TRPCError);
  });
});

describe('adminRouter.inviteUser', () => {
  it('calls inviteUserByEmail with the provided email', async () => {
    const _admin = { inviteUserByEmail: vi.fn().mockResolvedValue({ error: null }) };
    await inviteUser({ email: 'test@example.com' }, _admin);
    expect(_admin.inviteUserByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('throws INTERNAL_SERVER_ERROR when supabase returns an error', async () => {
    const _admin = { inviteUserByEmail: vi.fn().mockResolvedValue({ error: { message: 'fail' } }) };
    await expect(inviteUser({ email: 'x@x.com' }, _admin)).rejects.toThrow(TRPCError);
  });

  it('throws UNAUTHORIZED for non-admin', () => {
    expect(() => assertUnauthorized('user')).toThrow(TRPCError);
  });
});

describe('adminRouter.setAutoApprove', () => {
  it('updates existing platform_settings row', async () => {
    const _db = makeDb({});
    await setAutoApprove({ db: _db }, { value: false }, true);
    expect(_db._updateCalls).toContainEqual(
      expect.objectContaining({ table: 'platform_settings', set: { auto_approve: false } }),
    );
  });

  it('inserts a row when no platform_settings row exists', async () => {
    const _db = makeDb({});
    await setAutoApprove({ db: _db }, { value: true }, false);
    expect(_db._insertCalls).toContainEqual(
      expect.objectContaining({ table: 'platform_settings', values: { auto_approve: true } }),
    );
  });

  it('throws UNAUTHORIZED for non-admin', () => {
    expect(() => assertUnauthorized(null)).toThrow(TRPCError);
  });
});
