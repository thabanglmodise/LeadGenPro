import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { resolveKey } from '../lib/resolve-key.js';

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
      const _gpKey = await resolveKey(ctx.db, ctx.user.id, 'gp');

      const query = encodeURIComponent(`${input.type} in ${input.city}`);
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${_gpKey}`;

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
