import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUser } from './supabase';

// Use in every API route to get the authenticated DB user
// Returns { dbUser, clerkId } or throws a 401 response
export async function requireAuth() {
  const { userId } = await auth();

  if (!userId) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clerkUser = await currentUser();
  const dbUser = await getOrCreateUser(userId, {
    name: clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
      : null,
    email: clerkUser?.emailAddresses?.[0]?.emailAddress || null,
  });

  return { dbUser, clerkId: userId };
}
