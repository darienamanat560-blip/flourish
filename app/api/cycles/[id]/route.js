import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const db = supabaseAdmin();

    const allowed = ['name', 'goals', 'start_date', 'end_date', 'weeks', 'active', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await db
      .from('cycles')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', dbUser.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { dbUser } = await requireAuth();
    const db = supabaseAdmin();

    const { error } = await db
      .from('cycles')
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
