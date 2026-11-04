import { vi } from 'vitest';
import { LoadTracker } from './load-tracker';

function deferred() {
  let _resolve!: () => void;
  let _reject!: (err: unknown) => void;
  const _promise = new Promise<void>(function executor(res, rej) { _resolve = res; _reject = rej; });
  return { promise: _promise, resolve: _resolve, reject: _reject };
}

describe('LoadTracker', () => {
  it('starts not loaded, not loading', () => {
    const _t = new LoadTracker();
    expect(_t.loaded()).toBe(false);
    expect(_t.loading()).toBe(false);
  });

  it('loading while in flight, loaded after success', async () => {
    const _t = new LoadTracker();
    const _d = deferred();
    const _p = _t.run(() => _d.promise);
    expect(_t.loading()).toBe(true);
    expect(_t.loaded()).toBe(false);
    _d.resolve();
    await _p;
    expect(_t.loading()).toBe(false);
    expect(_t.loaded()).toBe(true);
  });

  it('marks loaded after failure and rethrows', async () => {
    const _t = new LoadTracker();
    await expect(_t.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(_t.loaded()).toBe(true);
    expect(_t.loading()).toBe(false);
  });

  it('dedupes concurrent runs', async () => {
    const _t = new LoadTracker();
    const _d = deferred();
    const _fn = vi.fn(() => _d.promise);
    const _a = _t.run(_fn);
    const _b = _t.run(_fn);
    expect(_fn).toHaveBeenCalledTimes(1);
    expect(_a).toBe(_b);
    _d.resolve();
    await _a;
  });

  it('allows a new run after previous settles (background refresh)', async () => {
    const _t = new LoadTracker();
    const _fn = vi.fn(() => Promise.resolve());
    await _t.run(_fn);
    await _t.run(_fn);
    expect(_fn).toHaveBeenCalledTimes(2);
    expect(_t.loaded()).toBe(true);
  });
});
