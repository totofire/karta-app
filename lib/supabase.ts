import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton — una sola instancia en toda la app (HMR-safe en dev)
declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

function getClient(): SupabaseClient {
  if (globalThis.__supabaseClient) return globalThis.__supabaseClient;

  globalThis.__supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return globalThis.__supabaseClient;
}

export const supabase = getClient();