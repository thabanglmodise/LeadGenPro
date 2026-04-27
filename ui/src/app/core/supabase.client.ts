import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }
  return _client;
}

export const supabase = {
  get auth() { return getClient().auth; },
  from(table: string) { return getClient().from(table); },
};
