import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const { name, dose, unit, freq, cat } = body;
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", max_tokens: 600,
        messages: [{ role: "user", content: `Research this compound for a biohacking/optimization tracker: "${name}"${dose ? ` (${dose}${unit} ${freq})` : ""}\n\nRespond ONLY with a JSON object (no markdown, start with {):\n{"name":"official name","aliases":["alt names"],"category":"${cat||"supplement"}","mechanism":"how it works (2-3 sentences)","primary_effects":["effect1","effect2","effect3"],"side_effects":["side1","side2"],"synergies":["compound1","compound2"],"timing":"optimal timing","summary":"1-2 sentence plain English description","dosing_notes":"key dosing considerations"}` }]
      })
    });

    let research = null;
    if (aiRes.ok) {
      const d = await aiRes.json();
      const txt = (d.content||[]).map(i=>i.text||"").join("");
      try { const s=txt.indexOf("{"),e=txt.lastIndexOf("}"); if(s!==-1&&e>s) research=JSON.parse(txt.slice(s,e+1)); } catch {}
    }

    const db = supabaseAdmin();
    const { data, error } = await db.from('user_compound_library').upsert({
      user_id: dbUser.id,
      name: research?.name || name,
      aliases: research?.aliases || [],
      category: research?.category || cat || 'other',
      mechanism: research?.mechanism || null,
      primary_effects: research?.primary_effects || [],
      side_effects: research?.side_effects || [],
      synergies: research?.synergies || [],
      timing: research?.timing || null,
      summary: research?.summary || null,
      dosing_notes: research?.dosing_notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,name' }).select().single();

    if (error) { console.error("library save:", error.message); return NextResponse.json({ research, saved: false }); }
    return NextResponse.json({ research: data, saved: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { dbUser } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const db = supabaseAdmin();
    let q = db.from('user_compound_library').select('*').eq('user_id', dbUser.id);
    if (name) q = q.ilike('name', `%${name}%`);
    const { data, error } = await q.order('name');
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
