"use client";
import { useState, useMemo } from "react";

const T = "#2dd4bf";
const HS = { fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:0, letterSpacing:"-0.02em" };
const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };

// ══════════════════════════════════════════════════════════════
// TimelineView — unified chronological story of the user's protocol
//
// Pulls from:
//   - Blood panels
//   - Compound additions / removals
//   - Daily logs (with notable side effects or physique notes)
//   - Training PRs
//   - Symptom entries with flags
//
// Builds a unified event list, sorts by date, renders as a timeline
// with events grouped by month.
// ══════════════════════════════════════════════════════════════

export function TimelineView({ panels, compounds, logs, training, symptoms, cycles }) {
  const events = useMemo(() => buildEvents({ panels, compounds, logs, training, symptoms, cycles }), [panels, compounds, logs, training, symptoms, cycles]);

  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? events : events.filter(e => e.category === filter);
  const grouped = groupByMonth(filtered);

  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>Timeline</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:20 }}>{events.length} events across your protocol</p>

      {/* Filter pills */}
      <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
        {[
          { id:"all", label:"All", count:events.length },
          { id:"bloodwork", label:"Labs", count:events.filter(e => e.category === "bloodwork").length },
          { id:"compound", label:"Protocol", count:events.filter(e => e.category === "compound").length },
          { id:"training", label:"Training", count:events.filter(e => e.category === "training").length },
          { id:"symptom", label:"Symptoms", count:events.filter(e => e.category === "symptom").length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding:"7px 12px",
              background: filter === f.id ? "rgba(45,212,191,0.06)" : "transparent",
              border: `1px solid ${filter === f.id ? "rgba(45,212,191,0.25)" : "#1e1e22"}`,
              color: filter === f.id ? T : "#52525b",
              fontSize:10,
              fontFamily:"'JetBrains Mono',monospace",
              cursor:"pointer",
              whiteSpace:"nowrap",
              textTransform:"uppercase",
              letterSpacing:"0.05em",
              flexShrink:0,
            }}
          >
            {f.label} <span style={{ opacity:0.5, marginLeft:3 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {grouped.length === 0 && (
        <div className="c" style={{ padding:40, textAlign:"center" }}>
          <svg width="32" height="32" fill="none" stroke={T} strokeWidth="1.2" viewBox="0 0 24 24" style={{ margin:"0 auto 14px", opacity:.4 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p style={{ fontSize:12, color:"#52525b", margin:0 }}>Nothing here yet. Log labs, compounds, or training to build your timeline.</p>
        </div>
      )}

      {grouped.map(({ month, events: monthEvents }) => (
        <div key={month} style={{ marginBottom:28 }}>
          <div style={{ ...LS, marginBottom:12 }}>{month}</div>
          <div style={{ position:"relative", paddingLeft:16 }}>
            {/* Vertical line */}
            <div style={{ position:"absolute", left:3, top:8, bottom:8, width:1, background:"#1e1e22" }} />

            {monthEvents.map((event, i) => (
              <TimelineEvent key={event.id || i} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildEvents({ panels, compounds, logs, training, symptoms, cycles }) {
  const events = [];

  // ── Blood panels ──
  (panels || []).forEach(p => {
    const flagged = (p.markers || []).filter(m => m.flagged_low || m.flagged_high);
    events.push({
      id: `panel-${p.id}`,
      date: p.date,
      category: "bloodwork",
      type: "panel",
      title: "Blood panel",
      subtitle: p.lab_name || "Lab results",
      detail: `${(p.markers || []).length} markers${flagged.length > 0 ? ` · ${flagged.length} flagged` : ""}`,
      color: T,
      flagged: flagged.slice(0, 3).map(m => ({
        name: m.display_name,
        direction: m.flagged_high ? "high" : "low",
      })),
    });
  });

  // ── Compounds added (use created_at date) ──
  (compounds || []).forEach(c => {
    const createdDate = c.created_at ? c.created_at.split("T")[0] : null;
    if (!createdDate) return;
    events.push({
      id: `comp-add-${c.id}`,
      date: createdDate,
      category: "compound",
      type: "compound_added",
      title: `Added ${c.name}`,
      subtitle: `${c.dose} ${c.unit} ${c.frequency}`,
      detail: c.category,
      color: "#a78bfa",
    });

    // If compound is now inactive, also show the removal
    if (c.status !== "active" && c.updated_at && c.updated_at !== c.created_at) {
      events.push({
        id: `comp-rm-${c.id}`,
        date: c.updated_at.split("T")[0],
        category: "compound",
        type: "compound_removed",
        title: `Removed ${c.name}`,
        subtitle: `Status: ${c.status}`,
        detail: "",
        color: "#f87171",
      });
    }
  });

  // ── Training PRs ──
  (training || []).forEach(t => {
    if (!t.is_pr) return;
    events.push({
      id: `pr-${t.id}`,
      date: t.date,
      category: "training",
      type: "pr",
      title: `${t.exercise} PR`,
      subtitle: `${Math.round(t.estimated_1rm)} lbs est. 1RM`,
      detail: t.active_compounds?.length ? `On: ${t.active_compounds.slice(0, 3).join(", ")}` : "",
      color: "#fbbf24",
    });
  });

  // ── Notable logs (with side effects or physique notes) ──
  (logs || []).forEach(l => {
    if (!l.side_effects && !l.physique_notes) return;
    events.push({
      id: `log-${l.id}`,
      date: l.date,
      category: "symptom",
      type: "log_note",
      title: l.side_effects ? "Side effects noted" : "Physique note",
      subtitle: l.side_effects || "",
      detail: l.physique_notes || "",
      color: l.side_effects ? "#f87171" : "#60a5fa",
    });
  });

  // ── Symptom entries with boolean flags ──
  (symptoms || []).forEach(s => {
    const flags = [];
    if (s.headaches) flags.push("headaches");
    if (s.joint_pain) flags.push("joint pain");
    if (s.acne) flags.push("acne");
    if (s.bloating) flags.push("bloating");
    if (s.night_sweats) flags.push("night sweats");
    if (s.insomnia) flags.push("insomnia");
    if (s.gyno_symptoms) flags.push("gyno symptoms");

    if (flags.length === 0 && !s.notes) return;

    events.push({
      id: `sym-${s.id}`,
      date: s.date,
      category: "symptom",
      type: "symptom",
      title: flags.length ? `Symptoms: ${flags.slice(0, 3).join(", ")}` : "Symptom note",
      subtitle: s.notes || "",
      detail: "",
      color: "#f87171",
    });
  });

  // ── Cycle starts ──
  (cycles || []).forEach(c => {
    if (!c.start_date) return;
    events.push({
      id: `cycle-${c.id}`,
      date: c.start_date,
      category: "compound",
      type: "cycle_start",
      title: `Started "${c.name}"`,
      subtitle: c.goals?.join(", ") || "",
      detail: `Planned ${c.planned_weeks} weeks`,
      color: T,
    });
  });

  // Sort newest first
  return events.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function groupByMonth(events) {
  const groups = {};
  events.forEach(e => {
    const d = new Date(e.date + (e.date.length === 10 ? "T12:00:00" : ""));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = { month: label, events: [] };
    groups[key].events.push(e);
  });
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);
}

function TimelineEvent({ event }) {
  const d = new Date(event.date + (event.date.length === 10 ? "T12:00:00" : ""));
  const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div style={{ position:"relative", marginBottom:12 }}>
      {/* Dot on timeline */}
      <div style={{
        position:"absolute",
        left:-17,
        top:14,
        width:9,
        height:9,
        borderRadius:"50%",
        background:event.color,
        border:"2px solid #000",
      }} />

      <div className="c" style={{ padding:"12px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{event.title}</div>
          <div style={{ fontSize:9, color:"#3f3f46", fontFamily:"'JetBrains Mono',monospace", flexShrink:0, marginLeft:10 }}>{dayLabel}</div>
        </div>
        {event.subtitle && (
          <div style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.5 }}>{event.subtitle}</div>
        )}
        {event.detail && (
          <div style={{ fontSize:10, color:"#52525b", marginTop:4, lineHeight:1.5 }}>{event.detail}</div>
        )}
        {event.flagged?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
            {event.flagged.map((f, i) => (
              <span key={i} style={{
                fontSize:9,
                padding:"2px 7px",
                background:f.direction === "high" ? "rgba(239,68,68,0.06)" : "rgba(234,179,8,0.06)",
                color:f.direction === "high" ? "#f87171" : "#fbbf24",
                border:`1px solid ${f.direction === "high" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)"}`,
              }}>
                {f.name} {f.direction === "high" ? "↑" : "↓"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
