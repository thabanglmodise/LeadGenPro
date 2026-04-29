import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { leads } from '../db/schema.js';

const LeadInsertSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),
  types: z.array(z.string()).optional(),
  rating: z.number().nullable().optional(),
  total_ratings: z.number().optional(),
  place_id: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  ai_score: z.string().nullable().optional(),
  ai_reason: z.string().optional(),
  offering: z.string().optional(),
  status: z.string().optional(),
});

export const leadsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(leads)
      .where(eq(leads.user_id, ctx.user.id))
      .orderBy(desc(leads.created_at));
  }),

  createMany: protectedProcedure
    .input(z.array(LeadInsertSchema))
    .mutation(async ({ ctx, input }) => {
      const rows = input.map(l => ({ ...l, user_id: ctx.user.id }));
      return ctx.db.insert(leads).values(rows).returning();
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), patch: LeadInsertSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(leads)
        .set(input.patch)
        .where(and(eq(leads.id, input.id), eq(leads.user_id, ctx.user.id)))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(leads)
        .where(and(eq(leads.id, input.id), eq(leads.user_id, ctx.user.id)));
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(leads).where(eq(leads.user_id, ctx.user.id));
  }),
});
