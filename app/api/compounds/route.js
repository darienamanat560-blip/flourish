import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { dbUser } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycle_id');
    const db = supabaseAdmin();

    let query = db.from('compounds').select('*').eq('user_id', dbUser.id);
    if (cycleId) query = query.eq('cycle_id', cycleId);

    const { data, error } = await query.order('created_at', { ascending: true });
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
      .from('compounds')
      .insert({
        user_id: dbUser.id,
        cycle_id: body.cycle_id,
        name: body.name,
        category: body.category || 'other',
        dose: body.dose,
        unit: body.unit || 'mg',
        frequency: body.frequency || 'daily',
        status: body.status || 'active',
        titration: body.titration || [],
        notes: body.notes || null,
        start_date: body.start_date || null,
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
