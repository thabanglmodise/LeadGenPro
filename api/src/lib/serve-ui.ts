// Serves the static Angular build + SPA fallback from the API (single-service deploy).
import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';

const DEFAULT_UI_DIST_DIR = '../ui/dist/leadGenPro/browser';

export function resolveUiDistDir(): string {
  return path.resolve(process.cwd(), process.env['UI_DIST_DIR'] ?? DEFAULT_UI_DIST_DIR);
}

// Prefer the CSR shell (non-prerendered routes); fall back to root index.html.
export function pickIndexFile(dir: string): string | null {
  const _csr = path.join(dir, 'index.csr.html');
  if (existsSync(_csr)) return _csr;
  const _index = path.join(dir, 'index.html');
  if (existsSync(_index)) return _index;
  return null;
}

export function serveUi(app: Express, dir: string = resolveUiDistDir()): boolean {
  const _indexFile = pickIndexFile(dir);
  if (!_indexFile) {
    console.log(`serveUi: no UI build at ${dir}, skipping static serving`);
    return false;
  }

  app.use(express.static(dir));

  app.get('*', function spaFallback(req, res, next) {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(_indexFile);
  });

  console.log(`serveUi: serving UI from ${dir}`);
  return true;
}
