import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { user_config } from '../db/schema.js';
import { resolveKey, type KeyType } from '../lib/resolve-key.js';
import type { DB } from '../db/index.js';

export const configRouter = router({
  load: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db
      .select({ gm_email: user_config.gm_email })
      .from(user_config)
      .where(eq(user_config.id, ctx.user.id));
    return {
      hasGpKey: await canResolve(ctx.db, ctx.user.id, 'gp'),
      hasClKey: await canResolve(ctx.db, ctx.user.id, 'cl'),
      gmEmail: config?.gm_email ?? '',
    };
  }),

  save: protectedProcedure
    .input(z.object({
      gp_key: z.string().optional(),
      cl_key: z.string().optional(),
      gm_email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // keys live in user_api_keys (userApiKeys.save); user_config holds gm_email only
      const _patch = { gm_email: input.gm_email, updated_at: new Date() };
      await ctx.db
        .insert(user_config)
        .values({ id: ctx.user.id, ..._patch })
        .onConflictDoUpdate({ target: user_config.id, set: _patch });
    }),

  testGoogle: protectedProcedure
    .input(z.object({ key: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const _key = input?.key?.trim() || await resolveKey(ctx.db, ctx.user.id, 'gp');
      return pingGoogle(_key);
    }),

  testClaude: protectedProcedure
    .input(z.object({ key: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const _key = input?.key?.trim() || await resolveKey(ctx.db, ctx.user.id, 'cl');
      return pingClaude(_key);
    }),
});

async function pingGoogle(key: string): Promise<{ ok: boolean; status: string }> {
  const _res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=test+cafe&key=${encodeURIComponent(key)}`,
  );
  const _data = await _res.json() as { status: string };
  return { ok: _data.status !== 'REQUEST_DENIED', status: _data.status };
}

async function pingClaude(key: string): Promise<{ ok: boolean; status: number }> {
  const _res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-5-5',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  });
  return { ok: _res.ok, status: _res.status };
}

async function canResolve(db: DB, userId: string, keyType: KeyType): Promise<boolean> {
  try {
    await resolveKey(db, userId, keyType);
    return true;
  } catch {
    return false;
  }
}
