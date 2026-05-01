import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

vi.mock('../lib/encrypt.js', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace('enc:', ''),
}));

import nodemailer from 'nodemailer';
import { emailRouter } from './email.js';

const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

const SMTP_ROW = {
  smtp_host: 'smtp.example.com',
  smtp_port: 587,
  smtp_user: 'user@example.com',
  smtp_pass: 'enc:secret',
  smtp_from_name: 'Test User',
  smtp_from_email: 'user@example.com',
};

function makeDb(smtpRow: typeof SMTP_ROW | null) {
  const _insertReturning = vi.fn().mockResolvedValue([{
    id: 'id-1', to_email: 'to@x.com', subject: 'Hi', send_method: 'smtp', sent_at: new Date(),
  }]);
  const _insertValues = vi.fn().mockReturnValue({ returning: _insertReturning });
  const _insert = vi.fn().mockReturnValue({ values: _insertValues });

  const _selectWhere = vi.fn().mockResolvedValue(smtpRow ? [smtpRow] : []);
  const _selectFrom = vi.fn().mockReturnValue({ where: _selectWhere });
  const _select = vi.fn().mockReturnValue({ from: _selectFrom });

  return { _select, _insert, _insertReturning };
}

function makeCtx(smtpRow: typeof SMTP_ROW | null) {
  const { _select, _insert } = makeDb(smtpRow);
  return {
    ctx: {
      user: { id: USER_ID },
      db: { select: _select, insert: _insert } as unknown,
    },
  };
}

describe('email.sendSmtp', () => {
  beforeEach(() => {
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    } as never);
  });

  it('sends via nodemailer when SMTP credentials exist', async () => {
    const { ctx } = makeCtx(SMTP_ROW);
    const _caller = emailRouter.createCaller(ctx as never);
    const _result = await _caller.sendSmtp({ to_email: 'to@x.com', subject: 'Hi', body: 'Body' });
    expect(_result).toMatchObject({ send_method: 'smtp' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.example.com',
      port: 587,
    }));
  });

  it('throws PRECONDITION_FAILED when no SMTP credentials stored', async () => {
    const { ctx } = makeCtx(null);
    const _caller = emailRouter.createCaller(ctx as never);
    await expect(_caller.sendSmtp({ to_email: 'to@x.com', subject: 'Hi', body: 'Body' }))
      .rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('decrypts smtp_pass before creating transporter', async () => {
    const { ctx } = makeCtx({ ...SMTP_ROW, smtp_pass: 'enc:mysecret' });
    const _caller = emailRouter.createCaller(ctx as never);
    await _caller.sendSmtp({ to_email: 'to@x.com', subject: 'Hi', body: 'Body' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      auth: expect.objectContaining({ pass: 'mysecret' }),
    }));
  });
});

describe('email.testSmtp', () => {
  it('returns ok:true when SMTP verify succeeds', async () => {
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      verify: vi.fn().mockResolvedValue(true),
    } as never);
    const { ctx } = makeCtx(SMTP_ROW);
    const _caller = emailRouter.createCaller(ctx as never);
    const _result = await _caller.testSmtp();
    expect(_result).toEqual({ ok: true });
  });

  it('throws PRECONDITION_FAILED when no SMTP credentials', async () => {
    const { ctx } = makeCtx(null);
    const _caller = emailRouter.createCaller(ctx as never);
    await expect(_caller.testSmtp()).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('throws INTERNAL_SERVER_ERROR when SMTP verify fails', async () => {
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      verify: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as never);
    const { ctx } = makeCtx(SMTP_ROW);
    const _caller = emailRouter.createCaller(ctx as never);
    await expect(_caller.testSmtp()).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  });
});
