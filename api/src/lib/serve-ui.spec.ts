import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { serveUi, pickIndexFile } from './serve-ui.js';

function makeDist(withCsr: boolean): string {
  const _dir = mkdtempSync(path.join(tmpdir(), 'serve-ui-'));
  writeFileSync(path.join(_dir, 'index.html'), 'ROOT');
  if (withCsr) writeFileSync(path.join(_dir, 'index.csr.html'), 'CSR');
  mkdirSync(path.join(_dir, 'dashboard'));
  writeFileSync(path.join(_dir, 'dashboard', 'index.html'), 'DASHBOARD');
  return _dir;
}

describe('pickIndexFile', () => {
  it('prefers index.csr.html', () => {
    const _dir = makeDist(true);
    expect(pickIndexFile(_dir)).toBe(path.join(_dir, 'index.csr.html'));
    rmSync(_dir, { recursive: true });
  });

  it('falls back to index.html', () => {
    const _dir = makeDist(false);
    expect(pickIndexFile(_dir)).toBe(path.join(_dir, 'index.html'));
    rmSync(_dir, { recursive: true });
  });

  it('returns null when no build', () => {
    expect(pickIndexFile(path.join(tmpdir(), 'does-not-exist-xyz'))).toBeNull();
  });
});

describe('serveUi', () => {
  let _dir: string;
  let _server: Server;
  let _base: string;

  beforeAll(async () => {
    _dir = makeDist(true);
    const _app = express();
    _app.get('/api/health', function health(_req, res) { res.json({ ok: true }); });
    serveUi(_app, _dir);
    _server = _app.listen(0);
    await new Promise<void>(function wait(resolve) { _server.once('listening', resolve); });
    _base = `http://127.0.0.1:${(_server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    _server.close();
    rmSync(_dir, { recursive: true });
  });

  it('serves prerendered route', async () => {
    const _res = await fetch(`${_base}/dashboard/`);
    expect(await _res.text()).toBe('DASHBOARD');
  });

  it('falls back to CSR shell for unknown route', async () => {
    const _res = await fetch(`${_base}/some/deep/route`);
    expect(_res.status).toBe(200);
    expect(await _res.text()).toBe('CSR');
  });

  it('does not intercept /api routes', async () => {
    const _health = await fetch(`${_base}/api/health`);
    expect(await _health.json()).toEqual({ ok: true });
    const _missing = await fetch(`${_base}/api/nope`);
    expect(_missing.status).toBe(404);
  });

  it('returns false and registers nothing when build missing', () => {
    const _app = express();
    expect(serveUi(_app, path.join(tmpdir(), 'does-not-exist-xyz'))).toBe(false);
  });
});
