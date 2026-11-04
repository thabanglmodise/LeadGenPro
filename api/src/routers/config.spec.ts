import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';

vi.mock('../lib/resolve-key.js', () => ({ resolveKey: vi.fn() }));

import { resolveKey } from '../lib/resolve-key.js';
import { configRouter } from './config.js';

const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function noKey(): TRPCError {
  return new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No API key available.' });
}

function makeCtx(configRow: { gm_email: string | null } | null = null) {
  const _selectWhere = vi.fn().mockResolvedValue(configRow ? [configRow] : []);
  const _select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: _selectWhere }) });

  const _onConflict = vi.fn().mockResolvedValue(undefined);
  const _values = vi.fn().mockReturnValue({ onConflictDoUpdate: _onConflict });
  const _insert = vi.fn().mockReturnValue({ values: _values });

  return {
    ctx: { user: { id: USER_ID }, db: { select: _select, insert: _insert } as unknown },
    _values,
  };
}

function mockFetchJson(body: unknown, ok = true, status = 200) {
  const _fetch = vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', _fetch);
  return _fetch;
}

beforeEach(() => {
  vi.mocked(resolveKey).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('config.testGoogle', () => {
  it('passes through resolveKey PRECONDITION_FAILED', async () => {
    vi.mocked(resolveKey).mockRejectedValue(noKey());
    const _caller = configRouter.createCaller(makeCtx().ctx as never);
    await expect(_caller.testGoogle()).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('uses resolved key when no input key', async () => {
    vi.mocked(resolveKey).mockResolvedValue('resolved-gp');
    const _fetch = mockFetchJson({ status: 'OK' });
    const _caller = configRouter.createCaller(makeCtx().ctx as never);
    const _result = await _caller.testGoogle();
    expect(_result).toEqual({ ok: true, status: 'OK' });
    expect(resolveKey).toHaveBeenCalledWith(expect.anything(), USER_ID, 'gp');
    expect(_fetch.mock.calls[0][0]).toContain('key=resolved-gp');
  });

  it('uses input key and skips resolveKey', async () => {
    const _fetch = mockFetchJson({ status: 'OK' });
    const _caller = configRouter.createCaller(makeCtx().ctx as never);
    await _caller.testGoogle({ key: ' typed-gp ' });
    expect(resolveKey).not.toHaveBeenCalled();
    expect(_fetch.mock.calls[0][0]).toContain('key=typed-gp');
  });

  it('reports not ok on REQUEST_DENIED', async () => {
    vi.mocked(resolveKey).mockResolvedValue('bad');
    mockFetchJson({ status: 'REQUEST_DENIED' });
    const _caller = configRouter.createCaller(makeCtx().ctx as never);
    expect(await _caller.testGoogle()).toEqual({ ok: false, status: 'REQUEST_DENIED' });
  });
});

describe('config.testClaude', () => {
  it('passes through resolveKey PRECONDITION_FAILED', async () => {
    vi.mocked(resolveKey).mockRejectedValue(noKey());
    const _caller = configRouter.createCaller(makeCtx().ctx as never);
    await expect(_caller.testClaude()).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('sends input key as x-api-key', async () => {
    const _fetch = mockFetchJson({}, false, 401);
    const _caller = configRouter.createCaller(makeCtx().ctx as never);
    const _result = await _caller.testClaude({ key: 'typed-cl' });
    expect(_result).toEqual({ ok: false, status: 401 });
    expect(_fetch.mock.calls[0][1].headers['x-api-key']).toBe('typed-cl');
  });
});

describe('config.load', () => {
  it('flags true when keys resolvable', async () => {
    vi.mocked(resolveKey).mockResolvedValue('k');
    const _caller = configRouter.createCaller(makeCtx({ gm_email: 'me@gmail.com' }).ctx as never);
    expect(await _caller.load()).toEqual({ hasGpKey: true, hasClKey: true, gmEmail: 'me@gmail.com' });
  });

  it('flags false when resolveKey throws', async () => {
    vi.mocked(resolveKey).mockRejectedValue(noKey());
    const _caller = configRouter.createCaller(makeCtx().ctx as never);
    expect(await _caller.load()).toEqual({ hasGpKey: false, hasClKey: false, gmEmail: '' });
  });
});

describe('config.save', () => {
  it('writes gm_email only, never keys', async () => {
    const { ctx, _values } = makeCtx();
    const _caller = configRouter.createCaller(ctx as never);
    await _caller.save({ gm_email: 'me@gmail.com' });
    const _written = _values.mock.calls[0][0];
    expect(_written.gm_email).toBe('me@gmail.com');
    expect(_written.gp_key).toBeUndefined();
    expect(_written.cl_key).toBeUndefined();
  });
});
