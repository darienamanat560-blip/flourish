"use client";
import { useState, useEffect } from "react";

const T = "#2dd4bf";
const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };
const HS = { fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:0, letterSpacing:"-0.02em" };

const SCALE_FIELDS = [
  { key: "libido", label: "Libido" },
  { key: "energy", label: "Energy" },
  { key: "mood", label: "Mood" },
  { key: "sleep_quality", label: "Sleep Quality" },
  { key: "pumps", label: "Pumps" },
  { key: "motivation", label: "Motivation" },
  { key: "appetite", label: "Appetite" },
  { key: "aggression", label: "Aggression" },
  { key: "anxiety", label: "Anxiety" },
];

const FLAG_FIELDS = [
  { key: "headaches", label: "Headaches" },
  { key: "joint_pain", label: "Joint pain" },
  { key: "acne", label: "Acne" },
  { key: "bloating", label: "Bloating" },
  { key: "night_sweats", label: "Night sweats" },
  { key: "insomnia", label: "Insomnia" },
  { key: "hair_loss", label: "Hair loss" },
  { key: "gyno_symptoms", label: "Gyno symptoms" },
];

// ══════════════════════════════════════════════════════════════
// SymptomsView — full symptom tracking page
// ══════════════════════════════════════════════════════════════

export function SymptomsView() {
  const [symptoms, setSymptoms] = useState([]);
  const [today, setToday] = useState(getTodayDefaults());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSymptoms();
  }, []);

  const loadSymptoms = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/symptoms?limit=14");
      const j = await r.json();
      setSymptoms(j.symptoms || []);

      // Pre-fill if today already has an entry
      const todayDate = new Date().toISOString().split("T")[0];
      const todayEntry = (j.symptoms || []).find(s => s.date === todayDate);
      if (todayEntry) {
        setToday({
          libido: todayEntry.libido || 5,
          energy: todayEntry.energy || 5,
          mood: todayEntry.mood || 5,
          sleep_quality: todayEntry.sleep_quality || 5,
          pumps: todayEntry.pumps || 5,
          motivation: todayEntry.motivation || 5,
          appetite: todayEntry.appetite || 5,
          aggression: todayEntry.aggression || 5,
          anxiety: todayEntry.anxiety || 5,
          headaches: todayEntry.headaches || false,
          joint_pain: todayEntry.joint_pain || false,
          acne: todayEntry.acne || false,
          bloating: todayEntry.bloating || false,
          night_sweats: todayEntry.night_sweats || false,
          insomnia: todayEntry.insomnia || false,
          hair_loss: todayEntry.hair_loss || false,
          gyno_symptoms: todayEntry.gyno_symptoms || false,
          notes: todayEntry.notes || "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(today),
      });
      if (!res.ok) throw new Error("Failed");
      await loadSymptoms();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Compute averages from recent symptoms
  const averages = {};
  for (const f of SCALE_FIELDS) {
    const vals = symptoms.map(s => s[f.key]).filter(v => v != null);
    if (vals.length) averages[f.key] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
  }

  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>Symptoms</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Track subjective measures daily for correlation insights</p>

      {loading ? (
        <div style={{ textAlign:"center", padding:40 }}>
          <div style={{ width:20, height:20, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto", animation:"spin .7s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* ── Sliders ── */}
          <div style={LS}>How are you feeling today?</div>
          <div className="c" style={{ padding:"18px 18px 4px", marginBottom:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              {SCALE_FIELDS.map(f => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label style={{ ...LS, display:"flex", justifyContent:"space-between" }}>
                    <span>{f.label}</span>
                    <span style={{ color:"#a1a1aa" }}>{today[f.key]}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={today[f.key]}
                    onChange={e => setToday(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    style={{ width:"100%", marginTop:4 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Flags ── */}
          <div style={LS}>Anything happening?</div>
          <div className="c" style={{ padding:"14px 14px 6px", marginBottom:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 8px" }}>
              {FLAG_FIELDS.map(f => {
                const on = today[f.key];
                return (
                  <button
                    key={f.key}
                    onClick={() => setToday(p => ({ ...p, [f.key]: !p[f.key] }))}
                    style={{
                      padding:"10px 12px",
                      background:"transparent",
                      border:`1px solid ${on ? "rgba(239,68,68,0.25)" : "#1e1e22"}`,
                      color: on ? "#f87171" : "#52525b",
                      fontSize:11,
                      fontFamily:"'JetBrains Mono',monospace",
                      cursor:"pointer",
                      textAlign:"left",
                      marginBottom:8,
                      display:"flex",
                      alignItems:"center",
                      gap:8,
                    }}
                  >
                    <div style={{ width:5, height:5, borderRadius:"50%", background: on ? "#f87171" : "#27272a" }} />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Notes ── */}
          <div style={{ marginBottom:18 }}>
            <label style={LS}>Notes (optional)</label>
            <textarea
              value={today.notes || ""}
              onChange={e => setToday(p => ({ ...p, notes: e.target.value }))}
              placeholder="Anything notable today..."
              style={{
                width:"100%",
                minHeight:60,
                background:"rgba(255,255,255,0.02)",
                border:"1px solid #1e1e22",
                padding:"10px 14px",
                color:"#e4e4e7",
                fontSize:13,
                fontFamily:"'JetBrains Mono',monospace",
                resize:"vertical",
              }}
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            style={{
              width:"100%",
              height:46,
              background: saving ? "#111114" : T,
              color: saving ? "#3f3f46" : "#000",
              border:"none",
              fontSize:11,
              fontWeight:700,
              fontFamily:"'JetBrains Mono',monospace",
              cursor: saving ? "default" : "pointer",
              letterSpacing:"0.08em",
              textTransform:"uppercase",
              marginBottom:28,
            }}
          >
            {saving ? "Saving..." : "Log Today's Symptoms"}
          </button>

          {/* ── Recent averages ── */}
          {symptoms.length > 0 && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={LS}>Recent Averages</span>
                <span style={{ fontSize:9, color:"#3f3f46", fontFamily:"'JetBrains Mono',monospace" }}>{symptoms.length} days tracked</span>
              </div>
              <div className="c" style={{ padding:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px 12px" }}>
                  {SCALE_FIELDS.filter(f => averages[f.key] != null).map(f => {
                    const v = averages[f.key];
                    const color = v >= 7 ? T : v >= 4 ? "#fbbf24" : "#f87171";
                    return (
                      <div key={f.key}>
                        <div style={{ fontSize:9, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{f.label}</div>
                        <div style={{ fontSize:14, fontWeight:700, color, fontFamily:"'Inter',sans-serif" }}>{v}<span style={{ fontSize:9, color:"#3f3f46", fontWeight:400 }}>/10</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getTodayDefaults() {
  return {
    libido: 5, energy: 5, mood: 5, sleep_quality: 5, pumps: 5,
    motivation: 5, appetite: 5, aggression: 5, anxiety: 5,
    headaches: false, joint_pain: false, acne: false, bloating: false,
    night_sweats: false, insomnia: false, hair_loss: false, gyno_symptoms: false,
    notes: "",
  };
}
