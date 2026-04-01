import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { dbUser } = await requireAuth();
    const db = supabaseAdmin();

    const { data, error } = await db
      .from('blood_panels')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('date', { ascending: false });

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
      .from('blood_panels')
      .insert({
        user_id: dbUser.id,
        date: body.date,
        lab_name: body.lab_name || null,
        file_url: body.file_url || null,
        markers: body.markers || {},
        ai_summary: body.ai_summary || null,
        raw_text: body.raw_text || null,
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
