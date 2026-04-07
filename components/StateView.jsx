"use client";
import { useState, useEffect } from "react";

const T = "#2dd4bf";
const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };

// ══════════════════════════════════════════════════════════════
// StateView — risk dashboard + concerns + reminders
//
// Drop this into the home screen below "Latest Metrics" or as
// its own section. Loads from /api/state and /api/reminders.
// ══════════════════════════════════════════════════════════════

export function StateView({ onOpenChat, onOpenWhatChanged }) {
  const [state, setState] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/state").then(r => r.json()).catch(() => null),
      fetch("/api/reminders").then(r => r.json()).catch(() => ({ reminders: [] })),
    ]).then(([s, r]) => {
      setState(s);
      setReminders(r.reminders || []);
      setLoading(false);
    });
  }, []);

  const regenerateReminders = async () => {
    await fetch("/api/reminders", { method: "POST" });
    const r = await fetch("/api/reminders").then(r => r.json());
    setReminders(r.reminders || []);
  };

  const dismissReminder = async (id) => {
    setReminders(p => p.filter(r => r.id !== id));
    await fetch(`/api/reminders?id=${id}&action=dismiss`, { method: "PATCH" });
  };

  if (loading) {
    return (
      <div className="c" style={{ padding:30, textAlign:"center" }}>
        <div style={{ width:20, height:20, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto", animation:"spin .7s linear infinite" }} />
      </div>
    );
  }

  if (!state) return null;

  const phaseColors = {
    bulking: "#a78bfa",
    cutting: "#fbbf24",
    recomp: T,
    cruise: "#71717a",
    blast: "#f87171",
    pct: "#60a5fa",
    off: "#52525b",
    unknown: "#52525b",
  };

  return (
    <div style={{ marginBottom:28 }}>
      {/* ── Phase + cycle summary ── */}
      <div className="c" style={{ padding:"16px 18px", marginBottom:12, background:"linear-gradient(180deg, rgba(45,212,191,0.02) 0%, rgba(0,0,0,0) 100%)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:state.cycle ? 12 : 0 }}>
          <div>
            <div style={{ fontSize:9, color:"#3f3f46", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>Current Phase</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span style={{ fontSize:20, fontWeight:700, color:phaseColors[state.phase.name] || T, fontFamily:"'Inter',sans-serif", textTransform:"capitalize" }}>{state.phase.name}</span>
              <span style={{ fontSize:9, color:"#3f3f46", textTransform:"uppercase", letterSpacing:"0.05em" }}>{state.phase.confidence}</span>
            </div>
          </div>
          {state.cycle && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, color:"#3f3f46", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>Week</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>
                {state.cycle.weeksElapsed}<span style={{ color:"#3f3f46", fontSize:13, fontWeight:400 }}>/{state.cycle.plannedWeeks}</span>
              </div>
            </div>
          )}
        </div>
        {state.cycle && (
          <div style={{ height:3, background:"#141416", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${state.cycle.percentComplete}%`, background:T, opacity:0.6, borderRadius:2 }} />
          </div>
        )}
      </div>

      {/* ── Risk scores grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        <RiskCard label="Lipid" risk={state.risk.lipid} />
        <RiskCard label="Cardio" risk={state.risk.cardiovascular} />
        <RiskCard label="Liver" risk={state.risk.hepatic} />
        <RiskCard label="Hormonal" risk={state.risk.hormonal_volatility} />
      </div>

      {/* ── Concerns ── */}
      {state.concerns.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <SLabel right={`${state.concerns.length} active`}>Concerns</SLabel>
          {state.concerns.slice(0, expanded ? 99 : 3).map((c, i) => (
            <div key={i} className="c" style={{ padding:"12px 14px", marginBottom:5, borderColor:c.severity === "high" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.15)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:9, padding:"2px 6px", background:c.severity === "high" ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.08)", color:c.severity === "high" ? "#f87171" : "#fbbf24", textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:700 }}>{c.severity}</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{c.title}</span>
              </div>
              <p style={{ fontSize:11, color:"#71717a", margin:"2px 0 0", lineHeight:1.5 }}>{c.detail}</p>
            </div>
          ))}
          {state.concerns.length > 3 && (
            <button onClick={() => setExpanded(!expanded)} style={{ fontSize:10, color:"#52525b", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", marginTop:4 }}>
              {expanded ? "show less" : `show all ${state.concerns.length}`}
            </button>
          )}
        </div>
      )}

      {/* ── Reminders ── */}
      {reminders.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, padding:"0 2px" }}>
            <span style={LS}>Reminders</span>
            <button onClick={regenerateReminders} style={{ fontSize:9, color:"#52525b", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.05em", textTransform:"uppercase" }}>refresh</button>
          </div>
          {reminders.slice(0, 4).map(r => (
            <div key={r.id} className="c" style={{ padding:"11px 14px", marginBottom:5, display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:r.priority === "high" ? "#f87171" : r.priority === "medium" ? "#fbbf24" : "#52525b", marginTop:6, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{r.title}</div>
                <div style={{ fontSize:10, color:"#71717a", marginTop:3, lineHeight:1.5 }}>{r.message}</div>
              </div>
              <button onClick={() => dismissReminder(r.id)} style={{ background:"transparent", border:"none", color:"#3f3f46", cursor:"pointer", fontSize:14, padding:"0 4px", flexShrink:0 }}>×</button>
            </div>
          ))}
          {reminders.length === 0 && (
            <button onClick={regenerateReminders} className="c" style={{ width:"100%", padding:"12px 14px", textAlign:"center", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T }}>
              Generate reminders
            </button>
          )}
        </div>
      )}

      {reminders.length === 0 && (
        <button onClick={regenerateReminders} className="c" style={{ width:"100%", padding:"12px 14px", marginBottom:12, textAlign:"center", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T, background:"rgba(45,212,191,0.02)", borderColor:"rgba(45,212,191,0.1)" }}>
          + Generate Smart Reminders
        </button>
      )}

      {/* ── Quick actions ── */}
      {state.bloodwork.hasPanels && (
        <button onClick={onOpenWhatChanged} className="c" style={{ width:"100%", padding:"14px 16px", textAlign:"left", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:12 }}>
          <svg width="18" height="18" fill="none" stroke={T} strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>What changed since last labs?</div>
            <div style={{ fontSize:10, color:"#52525b", marginTop:2 }}>Compounds, weight, symptoms, training</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Risk score card
// ──────────────────────────────────────────────

function RiskCard({ label, risk }) {
  const colors = {
    low: T,
    medium: "#fbbf24",
    high: "#fb923c",
    critical: "#f87171",
  };
  const color = colors[risk.level] || "#52525b";
  return (
    <div className="c" style={{ padding:"14px 16px" }}>
      <div style={{ fontSize:9, color:"#3f3f46", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>{label} Risk</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
        <span style={{ fontSize:20, fontWeight:700, color, fontFamily:"'Inter',sans-serif", textTransform:"capitalize" }}>{risk.level}</span>
      </div>
      <div style={{ height:3, background:"#141416", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${risk.score}%`, background:color, opacity:0.6, borderRadius:2 }} />
      </div>
      {risk.factors.length > 0 && (
        <div style={{ fontSize:9, color:"#52525b", marginTop:6, lineHeight:1.4 }}>
          {risk.factors[0]}
        </div>
      )}
    </div>
  );
}

function SLabel({ children, right }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8, padding:"0 2px" }}>
      <span style={LS}>{children}</span>
      {right && <span style={{ fontSize:9, color:"#3f3f46", fontFamily:"'JetBrains Mono',monospace" }}>{right}</span>}
    </div>
  );
}
