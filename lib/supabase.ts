import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — createClient() is deferred to first use so it never runs
// during Next.js module evaluation at build time (when env vars aren't injected yet).
let _client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
