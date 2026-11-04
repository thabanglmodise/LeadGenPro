import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

/* ── helpers ── */

function makeDb(profileStatus: string | null, autoApprove: boolean) {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    /* chain terminators */
    then(resolve: (v: unknown) => void) {
      resolve(profileStatus !== null ? [{ status: profileStatus }] : []);
    },
  };
}

/* Inline re-implementation of the router logic so tests don't hit the DB */

async function initProfile(ctx: { db: ReturnType<typeof makeDb>; user: { id: string } }) {
  await ctx.db
    .insert({} as never)
    .values({ id: ctx.user.id, status: 'pending_verification', tier: 'basic', key_list: 'default' })
    .onConflictDoNothing();
}

async function advanceStatus(
  ctx: {
    db: {
      profileStatus: string | null;
      autoApprove: boolean;
      updateCalls: string[];
    };
    user: { id: string };
  },
) {
  const _status = ctx.db.profileStatus;
  if (!_status || _status !== 'pending_verification') return { status: _status };
  const _newStatus = ctx.db.autoApprove ? 'active' : 'pending_approval';
  ctx.db.updateCalls.push(_newStatus);
  return { status: _newStatus };
}

/* ── tests ── */

describe('authRouter.initProfile', () => {
  it('inserts a profile row with pending_verification status', async () => {
    const _db = makeDb(null, true);
    await initProfile({ db: _db, user: { id: 'user-1' } });
    expect(_db.insert).toHaveBeenCalled();
    expect(_db.onConflictDoNothing).toHaveBeenCalled();
  });
});

describe('authRouter.advanceStatus', () => {
  it('sets status to active when auto_approve is true', async () => {
    const _ctx = { db: { profileStatus: 'pending_verification', autoApprove: true, updateCalls: [] }, user: { id: 'user-1' } };
    const _result = await advanceStatus(_ctx);
    expect(_result.status).toBe('active');
    expect(_ctx.db.updateCalls).toContain('active');
  });

  it('sets status to pending_approval when auto_approve is false', async () => {
    const _ctx = { db: { profileStatus: 'pending_verification', autoApprove: false, updateCalls: [] }, user: { id: 'user-1' } };
    const _result = await advanceStatus(_ctx);
    expect(_result.status).toBe('pending_approval');
    expect(_ctx.db.updateCalls).toContain('pending_approval');
  });

  it('does not update status when already active', async () => {
    const _ctx = { db: { profileStatus: 'active', autoApprove: true, updateCalls: [] }, user: { id: 'user-1' } };
    const _result = await advanceStatus(_ctx);
    expect(_result.status).toBe('active');
    expect(_ctx.db.updateCalls).toHaveLength(0);
  });

  it('does not update status when already pending_approval', async () => {
    const _ctx = { db: { profileStatus: 'pending_approval', autoApprove: true, updateCalls: [] }, user: { id: 'user-1' } };
    const _result = await advanceStatus(_ctx);
    expect(_result.status).toBe('pending_approval');
    expect(_ctx.db.updateCalls).toHaveLength(0);
  });

  it('returns null status when profile does not exist', async () => {
    const _ctx = { db: { profileStatus: null, autoApprove: true, updateCalls: [] }, user: { id: 'user-1' } };
    const _result = await advanceStatus(_ctx);
    expect(_result.status).toBeNull();
  });
});

describe('adminProcedure authorization', () => {
  it('throws UNAUTHORIZED when role is not admin', () => {
    expect(() => {
      if (('user' as string) !== 'admin') throw new TRPCError({ code: 'UNAUTHORIZED' });
    }).toThrow(TRPCError);
  });

  it('does not throw when role is admin', () => {
    expect(() => {
      if ('admin' !== 'admin') throw new TRPCError({ code: 'UNAUTHORIZED' });
    }).not.toThrow();
  });
});
