import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { leadsRouter } from './leads.js';

const OWNER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const LEAD_ID = 'cccccccc-0000-0000-0000-000000000003';

function makeCtx(userId: string, selectRows: { user_id: string }[] = []) {
  const _updateReturning = vi.fn().mockResolvedValue([{ id: LEAD_ID, status: 'contacted' }]);
  const _updateSet = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: _updateReturning }) });
  const _update = vi.fn().mockReturnValue({ set: _updateSet });

  const _selectWhere = vi.fn().mockResolvedValue(selectRows);
  const _selectFrom = vi.fn().mockReturnValue({ where: _selectWhere });
  const _select = vi.fn().mockReturnValue({ from: _selectFrom });

  return {
    ctx: {
      user: { id: userId },
      db: { select: _select, update: _update } as unknown,
    },
    mocks: { _select, _selectFrom, _selectWhere, _update, _updateSet, _updateReturning },
  };
}

describe('leads.updateStatus', () => {
  it('updates status for owning user', async () => {
    const { ctx, mocks } = makeCtx(OWNER_ID, [{ user_id: OWNER_ID }]);
    const _caller = leadsRouter.createCaller(ctx as never);
    const _result = await _caller.updateStatus({ id: LEAD_ID, status: 'contacted' });
    expect(_result).toMatchObject({ status: 'contacted' });
    expect(mocks._update).toHaveBeenCalled();
  });

  it('throws FORBIDDEN for a different user', async () => {
    const { ctx } = makeCtx(OTHER_ID, [{ user_id: OWNER_ID }]);
    const _caller = leadsRouter.createCaller(ctx as never);
    await expect(_caller.updateStatus({ id: LEAD_ID, status: 'replied' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws NOT_FOUND when lead does not exist', async () => {
    const { ctx } = makeCtx(OWNER_ID, []);
    const _caller = leadsRouter.createCaller(ctx as never);
    await expect(_caller.updateStatus({ id: LEAD_ID, status: 'converted' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects invalid status values', async () => {
    const { ctx } = makeCtx(OWNER_ID, [{ user_id: OWNER_ID }]);
    const _caller = leadsRouter.createCaller(ctx as never);
    await expect(_caller.updateStatus({ id: LEAD_ID, status: 'invalid' as never }))
      .rejects.toThrow();
  });
});
