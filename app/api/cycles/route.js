import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { dbUser } = await requireAuth();
    const db = supabaseAdmin();

    const { data, error } = await db
      .from('cycles')
      .select(`
        *,
        compounds(*),
        logs(*),
        training_sessions(*)
      `)
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const db = supabaseAdmin();

    const { data, error } = await db
      .from('cycles')
      .insert({
        user_id: dbUser.id,
        name: body.name,
        goals: body.goals || [],
        start_date: body.start_date || new Date().toISOString().split('T')[0],
        weeks: body.weeks || 12,
        active: true,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
