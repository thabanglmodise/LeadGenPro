import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, adminProcedure } from '../trpc.js';
import { profiles, platform_settings } from '../db/schema.js';
import { supabaseAdmin } from '../middleware/auth.js';

export const adminRouter = router({
  listUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: profiles.id,
        biz_name: profiles.biz_name,
        full_name: profiles.full_name,
        role: profiles.role,
        status: profiles.status,
        tier: profiles.tier,
        key_list: profiles.key_list,
        updated_at: profiles.updated_at,
      })
      .from(profiles);
  }),

  approveUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(profiles)
        .set({ status: 'active' })
        .where(eq(profiles.id, input.userId));

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        input.userId,
        { app_metadata: { role: 'user' } },
      );

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { ok: true };
    }),

  suspendUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(profiles)
        .set({ status: 'suspended' })
        .where(eq(profiles.id, input.userId));

      return { ok: true };
    }),

  inviteUser: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { ok: true };
    }),

  getSettings: adminProcedure.query(async ({ ctx }) => {
    const [_settings] = await ctx.db
      .select({ auto_approve: platform_settings.auto_approve })
      .from(platform_settings)
      .limit(1);

    return { auto_approve: _settings?.auto_approve ?? true };
  }),

  setAutoApprove: adminProcedure
    .input(z.object({ value: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [_existing] = await ctx.db
        .select({ id: platform_settings.id })
        .from(platform_settings)
        .limit(1);

      if (_existing) {
        await ctx.db
          .update(platform_settings)
          .set({ auto_approve: input.value });
      } else {
        await ctx.db
          .insert(platform_settings)
          .values({ auto_approve: input.value });
      }

      return { ok: true };
    }),
});
