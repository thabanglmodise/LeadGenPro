import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { leads } from '../db/schema.js';

const LEAD_STATUSES = ['new', 'contacted', 'replied', 'converted'] as const;

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

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ user_id: leads.user_id })
        .from(leads)
        .where(eq(leads.id, input.id));
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }
      if (existing.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your lead' });
      }
      const [updated] = await ctx.db
        .update(leads)
        .set({ status: input.status })
        .where(eq(leads.id, input.id))
        .returning();
      return updated;
    }),
});
