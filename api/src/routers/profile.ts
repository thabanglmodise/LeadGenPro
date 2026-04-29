import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { profiles } from '../db/schema.js';

const ProfilePatchSchema = z.object({
  biz_name: z.string().optional(),
  full_name: z.string().optional(),
  role: z.string().optional(),
  offering: z.string().optional(),
  benefits: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
});

export const profileRouter = router({
  load: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await ctx.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id));
    return profile ?? null;
  }),

  save: protectedProcedure
    .input(ProfilePatchSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .insert(profiles)
        .values({ id: ctx.user.id, ...input, updated_at: new Date() })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { ...input, updated_at: new Date() },
        })
        .returning();
      return updated;
    }),
});
