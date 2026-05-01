import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { user_api_keys } from '../db/schema.js';
import { encrypt } from '../lib/encrypt.js';

export const userApiKeysRouter = router({
  load: protectedProcedure.query(async ({ ctx }) => {
    const [_row] = await ctx.db
      .select({
        has_gp_key: user_api_keys.gp_key,
        has_cl_key: user_api_keys.cl_key,
        prefer_global: user_api_keys.prefer_global,
      })
      .from(user_api_keys)
      .where(eq(user_api_keys.user_id, ctx.user.id));

    return {
      has_gp_key: !!_row?.has_gp_key,
      has_cl_key: !!_row?.has_cl_key,
      prefer_global: _row?.prefer_global ?? false,
    };
  }),

  save: protectedProcedure
    .input(z.object({
      gp_key: z.string().optional(),
      cl_key: z.string().optional(),
      prefer_global: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const _patch: Partial<typeof user_api_keys.$inferInsert> = {};
      if (input.gp_key !== undefined) _patch.gp_key = input.gp_key ? encrypt(input.gp_key) : null;
      if (input.cl_key !== undefined) _patch.cl_key = input.cl_key ? encrypt(input.cl_key) : null;
      if (input.prefer_global !== undefined) _patch.prefer_global = input.prefer_global;

      await ctx.db
        .insert(user_api_keys)
        .values({ user_id: ctx.user.id, ..._patch })
        .onConflictDoUpdate({ target: user_api_keys.user_id, set: _patch });

      return { ok: true };
    }),
});
