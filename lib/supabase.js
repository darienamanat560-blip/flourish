import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (uses service role key — bypasses RLS)
// Used in API routes where we've already verified the user via Clerk
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Client-side Supabase client (uses anon key — respects RLS)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
