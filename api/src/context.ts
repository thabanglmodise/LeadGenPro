import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db } from './db/index.js';
import { getUserFromToken } from './middleware/auth.js';

export async function createContext({ req }: CreateExpressContextOptions) {
  let user: { id: string; email: string; role: string | null } | null = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    user = await getUserFromToken(auth.slice(7));
  }
  return { user, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
