import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { dbUser } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycle_id');
    const db = supabaseAdmin();

    let query = db
      .from('training_sessions')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('date', { ascending: false })
      .limit(100);

    if (cycleId) query = query.eq('cycle_id', cycleId);

    const { data, error } = await query;
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
      .from('training_sessions')
      .insert({
        user_id: dbUser.id,
        cycle_id: body.cycle_id,
        date: body.date || new Date().toISOString().split('T')[0],
        type: body.type,
        exercise: body.exercise,
        sets: body.sets || [],
        duration_min: body.duration_min || null,
        distance_mi: body.distance_mi || null,
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
