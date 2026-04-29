import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { activity_log } from '../db/schema.js';

export const activityRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(activity_log)
      .where(eq(activity_log.user_id, ctx.user.id))
      .orderBy(desc(activity_log.created_at))
      .limit(20);
  }),

  add: protectedProcedure
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .insert(activity_log)
        .values({ user_id: ctx.user.id, message: input.message })
        .returning();
      return entry;
    }),
});
