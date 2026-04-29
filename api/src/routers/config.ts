import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { user_config } from '../db/schema.js';

export const configRouter = router({
  load: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db
      .select()
      .from(user_config)
      .where(eq(user_config.id, ctx.user.id));
    return {
      hasGpKey: !!config?.gp_key,
      hasClKey: !!config?.cl_key,
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
      await ctx.db
        .insert(user_config)
        .values({ id: ctx.user.id, ...input, updated_at: new Date() })
        .onConflictDoUpdate({
          target: user_config.id,
          set: { ...input, updated_at: new Date() },
        });
    }),

  testGoogle: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db
      .select({ gp_key: user_config.gp_key })
      .from(user_config)
      .where(eq(user_config.id, ctx.user.id));

    if (!config?.gp_key) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No Google Places key saved' });
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=test+cafe&key=${config.gp_key}`,
    );
    const data = await res.json() as { status: string };
    return { ok: data.status !== 'REQUEST_DENIED', status: data.status };
  }),

  testClaude: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db
      .select({ cl_key: user_config.cl_key })
      .from(user_config)
      .where(eq(user_config.id, ctx.user.id));

    if (!config?.cl_key) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No Claude key saved' });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.cl_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    return { ok: res.ok, status: res.status };
  }),
});
