"use client";
import { useState, useEffect } from "react";

const T = "#2dd4bf";
const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };

// ══════════════════════════════════════════════════════════════
// WhatChangedView — diff display, drops into a modal
//
// Loads from /api/whatchanged?since=lastBloodwork by default,
// or accepts custom from/to dates.
// ══════════════════════════════════════════════════════════════

export function WhatChangedView({ since = "lastBloodwork", from = null, to = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const url = since
      ? `/api/whatchanged?since=${since}`
      : `/api/whatchanged?from=${from}&to=${to}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.message || d.error);
        else setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [since, from, to]);

  if (loading) {
    return (
      <div style={{ padding:40, textAlign:"center" }}>
        <div style={{ width:24, height:24, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 12px", animation:"spin .7s linear infinite" }} />
        <div style={{ fontSize:11, color:"#52525b" }}>Analyzing changes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="c" style={{ padding:24, textAlign:"center" }}>
        <p style={{ fontSize:12, color:"#71717a", margin:0 }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {/* ── Header summary ── */}
      <div className="c" style={{ padding:14, marginBottom:18, background:"rgba(45,212,191,0.02)", borderColor:"rgba(45,212,191,0.1)" }}>
        <div style={{ fontSize:9, color:T, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>{data.daysSpan} days · {data.fromDate} → {data.toDate}</div>
        <p style={{ fontSize:12, color:"#a1a1aa", lineHeight:1.6, margin:0 }}>{data.summary}</p>
      </div>

      {/* ── Compound changes ── */}
      {(data.compounds.added.length > 0 || data.compounds.removed.length > 0) && (
        <div style={{ marginBottom:18 }}>
          <div style={LS}>Protocol Changes</div>
          {data.compounds.added.map((c, i) => (
            <div key={`a-${i}`} className="c" style={{ padding:"10px 14px", marginBottom:5, borderColor:"rgba(45,212,191,0.15)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14, color:T }}>+</span>
                <span style={{ flex:1, fontSize:12, color:"#fff", fontWeight:600, fontFamily:"'Inter',sans-serif" }}>{c.name}</span>
                <span style={{ fontSize:10, color:"#71717a" }}>{c.dose} {c.unit} {c.frequency}</span>
              </div>
            </div>
          ))}
          {data.compounds.removed.map((c, i) => (
            <div key={`r-${i}`} className="c" style={{ padding:"10px 14px", marginBottom:5, borderColor:"rgba(239,68,68,0.15)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14, color:"#f87171" }}>−</span>
                <span style={{ flex:1, fontSize:12, color:"#fff", fontWeight:600, fontFamily:"'Inter',sans-serif" }}>{c.name}</span>
                <span style={{ fontSize:10, color:"#52525b" }}>removed</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Bloodwork changes ── */}
      {data.bloodwork?.changes?.length > 0 && (
        <div style={{ marginBottom:18 }}>
          <div style={LS}>Marker Changes</div>
          {data.bloodwork.changes.slice(0, 8).map((c, i) => {
            const isBad = ["hdl", "igf_1", "total_testosterone", "free_testosterone"].includes(c.marker);
            const wentBad = isBad ? c.direction === "down" : c.direction === "up";
            const color = wentBad ? "#f87171" : T;
            return (
              <div key={i} className="c" style={{ padding:"10px 14px", marginBottom:5 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{c.displayName}</span>
                  <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
                    <span style={{ fontSize:10, color:"#52525b" }}>{c.from}</span>
                    <span style={{ fontSize:9, color:"#3f3f46" }}>→</span>
                    <span style={{ fontSize:13, fontWeight:700, color, fontFamily:"'Inter',sans-serif" }}>{c.to}</span>
                    <span style={{ fontSize:9, color }}>({c.pctChange > 0 ? "+" : ""}{c.pctChange}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Metrics ── */}
      {(data.metrics.weight?.hasData || data.metrics.sleep?.hasData || data.metrics.mood?.hasData) && (
        <div style={{ marginBottom:18 }}>
          <div style={LS}>Metrics</div>
          <div className="c" style={{ padding:"12px 14px" }}>
            {data.metrics.weight?.hasData && (
              <MetricRow label="Weight" m={data.metrics.weight} unit="lbs" />
            )}
            {data.metrics.sleep?.hasData && (
              <MetricRow label="Sleep" m={data.metrics.sleep} unit="" />
            )}
            {data.metrics.mood?.hasData && (
              <MetricRow label="Mood" m={data.metrics.mood} unit="/10" />
            )}
            {data.metrics.hrv?.hasData && (
              <MetricRow label="HRV" m={data.metrics.hrv} unit="ms" />
            )}
          </div>
        </div>
      )}

      {/* ── Symptom changes ── */}
      {data.symptoms?.significantChanges && Object.keys(data.symptoms.significantChanges).length > 0 && (
        <div style={{ marginBottom:18 }}>
          <div style={LS}>Symptom Shifts</div>
          <div className="c" style={{ padding:"12px 14px" }}>
            {Object.entries(data.symptoms.significantChanges).map(([key, change]) => {
              const color = change.delta > 0 ? T : "#f87171";
              const label = key.replace(/_/g, " ");
              return (
                <div key={key} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:11 }}>
                  <span style={{ color:"#a1a1aa", textTransform:"capitalize" }}>{label}</span>
                  <span>
                    <span style={{ color:"#52525b" }}>{change.from}</span>
                    <span style={{ color:"#3f3f46", margin:"0 5px" }}>→</span>
                    <span style={{ color, fontWeight:700 }}>{change.to}</span>
                    <span style={{ color, marginLeft:5, fontSize:10 }}>({change.delta > 0 ? "+" : ""}{change.delta})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Training ── */}
      {data.training?.newPRs?.length > 0 && (
        <div style={{ marginBottom:18 }}>
          <div style={LS}>New PRs</div>
          {data.training.newPRs.map((pr, i) => (
            <div key={i} className="c" style={{ padding:"10px 14px", marginBottom:5, borderColor:"rgba(45,212,191,0.15)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#fff", fontWeight:600, fontFamily:"'Inter',sans-serif" }}>{pr.exercise}</span>
                <span style={{ fontSize:13, fontWeight:700, color:T, fontFamily:"'Inter',sans-serif" }}>{Math.round(pr.estimated1RM)} lbs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {data.compounds.totalChanges === 0 && (!data.bloodwork?.changes?.length) && !data.metrics.weight?.hasData && (
        <div className="c" style={{ padding:24, textAlign:"center" }}>
          <p style={{ fontSize:12, color:"#71717a", margin:0 }}>Nothing significant has changed in this window.</p>
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, m, unit }) {
  const color = m.direction === "up" ? T : m.direction === "down" ? "#fbbf24" : "#71717a";
  const dir = m.delta > 0 ? "+" : "";
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:11, borderBottom:"1px solid #141416" }}>
      <span style={{ color:"#a1a1aa" }}>{label}</span>
      <span>
        <span style={{ color:"#52525b" }}>{m.from}{unit}</span>
        <span style={{ color:"#3f3f46", margin:"0 5px" }}>→</span>
        <span style={{ color:"#fff", fontWeight:700 }}>{m.to}{unit}</span>
        <span style={{ color, marginLeft:6, fontSize:10 }}>({dir}{m.delta})</span>
      </span>
    </div>
  );
}
