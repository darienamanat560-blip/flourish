import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    const { dbUser } = await requireAuth();
    const db = supabaseAdmin();

    const { error } = await db
      .from('logs')
      .delete()
      .eq('id', params.id)
      .eq('user_id', dbUser.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
