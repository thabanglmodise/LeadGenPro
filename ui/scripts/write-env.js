// Generates environment.prod.ts from env vars at Netlify build time. Not committed with real values.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const _supabaseUrl = process.env.SUPABASE_URL;
const _supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!_supabaseUrl || !_supabaseAnonKey) {
  console.error('write-env.js: missing SUPABASE_URL or SUPABASE_ANON_KEY env var');
  process.exit(1);
}

// environments/ is gitignored → absent on fresh CI clones; create it.
const _envDir = fileURLToPath(new URL('../src/environments/', import.meta.url));
mkdirSync(_envDir, { recursive: true });

function buildEnvContents(production) {
  return `export const environment = {
  production: ${production},
  supabaseUrl: '${_supabaseUrl}',
  supabaseAnonKey: '${_supabaseAnonKey}',
};
`;
}

writeFileSync(path.join(_envDir, 'environment.prod.ts'), buildEnvContents(true));
console.log('write-env.js: wrote environment.prod.ts');

// angular.json fileReplacements needs environment.ts to exist; don't clobber a local dev copy.
const _devPath = path.join(_envDir, 'environment.ts');
if (!existsSync(_devPath)) {
  writeFileSync(_devPath, buildEnvContents(false));
  console.log('write-env.js: wrote environment.ts');
}
