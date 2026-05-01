import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, adminProcedure } from '../trpc.js';
import { profiles, platform_settings } from '../db/schema.js';
import { supabaseAdmin } from '../middleware/auth.js';
import { encrypt } from '../lib/encrypt.js';

const KEY_MODE_SCHEMA = z.enum(['whitelist', 'blacklist', 'disabled']);
const KEY_LIST_SCHEMA = z.enum(['default', 'whitelisted', 'blacklisted']);
const TIER_SCHEMA = z.enum(['basic', 'plus', 'pro']);

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

  getFullSettings: adminProcedure.query(async ({ ctx }) => {
    const [_s] = await ctx.db
      .select({
        auto_approve: platform_settings.auto_approve,
        global_key_mode: platform_settings.global_key_mode,
        has_gp_key: platform_settings.global_gp_key,
        has_cl_key: platform_settings.global_cl_key,
      })
      .from(platform_settings)
      .limit(1);

    return {
      auto_approve: _s?.auto_approve ?? true,
      global_key_mode: _s?.global_key_mode ?? 'disabled',
      has_gp_key: !!_s?.has_gp_key,
      has_cl_key: !!_s?.has_cl_key,
    };
  }),

  setGlobalKeyMode: adminProcedure
    .input(z.object({ mode: KEY_MODE_SCHEMA }))
    .mutation(async ({ ctx, input }) => {
      const [_existing] = await ctx.db.select({ id: platform_settings.id }).from(platform_settings).limit(1);
      if (_existing) {
        await ctx.db.update(platform_settings).set({ global_key_mode: input.mode });
      } else {
        await ctx.db.insert(platform_settings).values({ global_key_mode: input.mode });
      }
      return { ok: true };
    }),

  setGlobalKeys: adminProcedure
    .input(z.object({
      gp_key: z.string().optional(),
      cl_key: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const _patch: Partial<typeof platform_settings.$inferInsert> = {};
      if (input.gp_key !== undefined) _patch.global_gp_key = input.gp_key ? encrypt(input.gp_key) : null;
      if (input.cl_key !== undefined) _patch.global_cl_key = input.cl_key ? encrypt(input.cl_key) : null;

      const [_existing] = await ctx.db.select({ id: platform_settings.id }).from(platform_settings).limit(1);
      if (_existing) {
        await ctx.db.update(platform_settings).set(_patch);
      } else {
        await ctx.db.insert(platform_settings).values(_patch as typeof platform_settings.$inferInsert);
      }
      return { ok: true };
    }),

  setUserTier: adminProcedure
    .input(z.object({ userId: z.string().uuid(), tier: TIER_SCHEMA }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(profiles).set({ tier: input.tier }).where(eq(profiles.id, input.userId));
      return { ok: true };
    }),

  setUserKeyList: adminProcedure
    .input(z.object({ userId: z.string().uuid(), key_list: KEY_LIST_SCHEMA }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(profiles).set({ key_list: input.key_list }).where(eq(profiles.id, input.userId));
      return { ok: true };
    }),

  testGlobalKey: adminProcedure
    .input(z.object({ keyType: z.enum(['gp', 'cl']), key: z.string().min(1) }))
    .mutation(async ({ input }) => {
      if (input.keyType === 'gp') {
        const _res = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=test&key=${input.key}`,
        );
        const _data = await _res.json() as { status: string };
        if (_data.status === 'REQUEST_DENIED') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Google Places key rejected by API.' });
        }
        return { ok: true };
      }

      // Anthropic test
      const _res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': input.key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      if (_res.status === 401) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Anthropic key rejected by API.' });
      }
      return { ok: true };
    }),

});
