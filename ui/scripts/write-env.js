// Generates environment.prod.ts from env vars at Netlify build time. Not committed with real values.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const _supabaseUrl = process.env.SUPABASE_URL;
const _supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!_supabaseUrl || !_supabaseAnonKey) {
  console.error('write-env.js: missing SUPABASE_URL or SUPABASE_ANON_KEY env var');
  process.exit(1);
}

const _outPath = fileURLToPath(new URL('../src/environments/environment.prod.ts', import.meta.url));

const _contents = `export const environment = {
  production: true,
  supabaseUrl: '${_supabaseUrl}',
  supabaseAnonKey: '${_supabaseAnonKey}',
};
`;

writeFileSync(_outPath, _contents);
console.log('write-env.js: wrote environment.prod.ts');
