import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { profiles } from '../db/schema.js';
import { ADMIN_STEPS, CLIENT_STEPS, computeOnboardingProgress } from '../lib/onboarding.js';

const ALL_STEPS = [...ADMIN_STEPS, ...CLIENT_STEPS] as const;
type AnyStep = (typeof ALL_STEPS)[number];

export const onboardingRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const [_row] = await ctx.db
      .select({ onboarding: profiles.onboarding })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id));

    const _steps = (_row?.onboarding ?? {}) as Record<string, boolean>;
    const _isAdmin = ctx.user.role === 'admin';
    const _total = 4;
    const _progress = computeOnboardingProgress(_steps, _total);

    return {
      steps: _steps,
      progress: _progress,
      isFirstRun: Object.keys(_steps).length === 0,
      role: ctx.user.role,
      isAdmin: _isAdmin,
    };
  }),

  completeStep: protectedProcedure
    .input(z.object({ step: z.enum(ALL_STEPS) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(profiles)
        .set({
          onboarding: sql`COALESCE(onboarding, '{}'::jsonb) || ${JSON.stringify({ [input.step]: true })}::jsonb`,
        })
        .where(eq(profiles.id, ctx.user.id));

      return { ok: true };
    }),

  healthCheck: protectedProcedure.query(async ({ ctx }) => {
    await ctx.db.select({ id: profiles.id }).from(profiles).limit(1);
    return { ok: true, timestamp: new Date().toISOString() };
  }),
});
