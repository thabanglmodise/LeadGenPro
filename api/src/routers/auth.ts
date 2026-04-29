import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { profiles, platform_settings } from '../db/schema.js';

export const authRouter = router({
  /** Called from the signup component immediately after supabase.auth.signUp() succeeds.
   *  Creates the profile row with pending_verification status. Safe to call multiple times. */
  initProfile: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .insert(profiles)
      .values({
        id: ctx.user.id,
        status: 'pending_verification',
        tier: 'basic',
        key_list: 'default',
      })
      .onConflictDoNothing();
  }),

  /** Called from the verify-prompt page after the user returns from their email confirmation link.
   *  Reads auto_approve from platform_settings and advances status accordingly. */
  advanceStatus: protectedProcedure.mutation(async ({ ctx }) => {
    const [_profile] = await ctx.db
      .select({ status: profiles.status })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id));

    if (!_profile || _profile.status !== 'pending_verification') {
      return { status: _profile?.status ?? null };
    }

    const [_settings] = await ctx.db
      .select({ auto_approve: platform_settings.auto_approve })
      .from(platform_settings)
      .limit(1);

    const _newStatus = (_settings?.auto_approve ?? true) ? 'active' : 'pending_approval';

    await ctx.db
      .update(profiles)
      .set({ status: _newStatus })
      .where(eq(profiles.id, ctx.user.id));

    return { status: _newStatus };
  }),
});
