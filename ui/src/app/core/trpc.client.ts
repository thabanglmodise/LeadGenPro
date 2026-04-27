import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@api/router';
import { supabase } from './supabase.client';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      async headers() {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
