import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { user_config } from '../db/schema.js';

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  international_phone_number?: string;
  geometry: { location: { lat: number; lng: number } };
}

interface PlacesApiResponse {
  status: string;
  results: PlaceResult[];
  error_message?: string;
}

export const placesRouter = router({
  search: protectedProcedure
    .input(z.object({ type: z.string().min(1), city: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [config] = await ctx.db
        .select({ gp_key: user_config.gp_key })
        .from(user_config)
        .where(eq(user_config.id, ctx.user.id));

      if (!config?.gp_key) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Places API key not configured. Add it in Settings → API Setup.',
        });
      }

      const query = encodeURIComponent(`${input.type} in ${input.city}`);
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${config.gp_key}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Google Places request failed' });
      }

      const data: PlacesApiResponse = await res.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: data.error_message ?? `Google Places error: ${data.status}`,
        });
      }

      return data.results ?? [];
    }),
});
