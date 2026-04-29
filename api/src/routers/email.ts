import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { sent_emails } from '../db/schema.js';

export const emailRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: sent_emails.id,
        to_email: sent_emails.to_email,
        subject: sent_emails.subject,
        sent_at: sent_emails.sent_at,
      })
      .from(sent_emails)
      .where(eq(sent_emails.user_id, ctx.user.id))
      .orderBy(desc(sent_emails.sent_at));
  }),

  log: protectedProcedure
    .input(z.object({
      to_email: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .insert(sent_emails)
        .values({ user_id: ctx.user.id, ...input })
        .returning({
          id: sent_emails.id,
          to_email: sent_emails.to_email,
          subject: sent_emails.subject,
          sent_at: sent_emails.sent_at,
        });
      return entry;
    }),

  clearLog: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(sent_emails).where(eq(sent_emails.user_id, ctx.user.id));
  }),
});
