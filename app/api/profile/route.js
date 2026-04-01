import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { dbUser } = await requireAuth();
    return NextResponse.json(dbUser);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const db = supabaseAdmin();

    const allowed = ['name', 'age', 'weight_lbs', 'height_in', 'experience', 'goals', 'health_notes'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await db
      .from('users')
      .update(updates)
      .eq('id', dbUser.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
