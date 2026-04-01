import { createClient } from '@supabase/supabase-js';

// Server-side client (uses service role key — full access, bypasses RLS)
// Only use in API routes, never expose to browser
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Get or create a user record from their Clerk ID
export async function getOrCreateUser(clerkId, profile = {}) {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (existing) return existing;

  const { data: created, error } = await db
    .from('users')
    .insert({
      clerk_id: clerkId,
      name: profile.name || null,
      email: profile.email || null,
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}
