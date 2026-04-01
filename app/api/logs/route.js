import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { dbUser } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycle_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const db = supabaseAdmin();

    let query = db
      .from('logs')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('date', { ascending: false })
      .limit(limit);

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
      .from('logs')
      .insert({
        user_id: dbUser.id,
        cycle_id: body.cycle_id,
        date: body.date || new Date().toISOString().split('T')[0],
        weight_lbs: body.weight_lbs || null,
        sleep_score: body.sleep_score || null,
        hrv: body.hrv || null,
        mood: body.mood || null,
        stress: body.stress || null,
        appetite: body.appetite || null,
        energy: body.energy || null,
        libido: body.libido || null,
        side_effects: body.side_effects || null,
        physique_notes: body.physique_notes || null,
        general_notes: body.general_notes || null,
        doses: body.doses || {},
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
