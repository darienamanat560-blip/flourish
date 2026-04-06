"use client";
import { useState, useEffect, useRef } from "react";

const T = "#2dd4bf";

const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };
const IS = { width:"100%", height:42, background:"rgba(255,255,255,0.02)", border:"1px solid #1e1e22", padding:"0 14px", color:"#e4e4e7", fontSize:13, fontFamily:"'JetBrains Mono',monospace" };
const HS = { fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:0, letterSpacing:"-0.02em" };

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CATEGORY_ORDER = ["hormones", "lipids", "hematology", "liver", "kidney", "thyroid", "metabolic", "inflammation", "vitamins", "electrolytes", "other"];
const CATEGORY_NAMES = {
  hormones: "Hormones",
  lipids: "Lipid Panel",
  hematology: "CBC / Hematology",
  liver: "Liver",
  kidney: "Kidney",
  thyroid: "Thyroid",
  metabolic: "Metabolic",
  inflammation: "Inflammation",
  vitamins: "Vitamins / Minerals",
  electrolytes: "Electrolytes",
  other: "Other",
};

// ══════════════════════════════════════
// MAIN LABS VIEW
// ══════════════════════════════════════

export function LabsView({ panels, onRefresh }) {
  const [view, setView] = useState("list"); // list | upload | manual | detail
  const [selectedPanel, setSelectedPanel] = useState(null);

  const openDetail = (panel) => {
    setSelectedPanel(panel);
    setView("detail");
  };

  const back = () => {
    setView("list");
    setSelectedPanel(null);
  };

  if (view === "upload") return <UploadFlow onBack={back} onSaved={() => { onRefresh(); back(); }} onSwitchToManual={() => setView("manual")} />;
  if (view === "manual") return <ManualEntryFlow onBack={back} onSaved={() => { onRefresh(); back(); }} />;
  if (view === "detail" && selectedPanel) return <PanelDetail panel={selectedPanel} onBack={back} />;

  // ── List view ──
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={HS}>Labs</h1>
          <p style={{ fontSize:11, color:"#3f3f46", marginTop:4 }}>{panels.length} {panels.length === 1 ? "panel" : "panels"}</p>
        </div>
        <button onClick={() => setView("upload")} style={{ height:36, padding:"0 16px", background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>+ Add Panel</button>
      </div>

      {panels.length === 0 ? (
        <div className="c" style={{ padding:40, textAlign:"center" }}>
          <svg width="32" height="32" fill="none" stroke={T} strokeWidth="1.2" viewBox="0 0 24 24" style={{ margin:"0 auto 16px", opacity:.5 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <div style={{ fontSize:13, color:"#71717a", marginBottom:6, fontFamily:"'Inter',sans-serif" }}>No bloodwork yet</div>
          <p style={{ fontSize:11, color:"#52525b", marginBottom:18, lineHeight:1.6 }}>Upload a PDF or enter values manually to start tracking trends and cause/effect.</p>
          <button onClick={() => setView("upload")} style={{ fontSize:11, color:T, background:"transparent", border:"1px solid rgba(45,212,191,0.2)", padding:"8px 18px", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.05em", textTransform:"uppercase" }}>Add First Panel</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {panels.map(panel => {
            const flagged = (panel.markers || []).filter(m => m.flagged_low || m.flagged_high);
            return (
              <button key={panel.id} onClick={() => openDetail(panel)} className="c" style={{ padding:"16px 18px", textAlign:"left", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{fmtDate(panel.date)}</div>
                    <div style={{ fontSize:10, color:"#3f3f46", marginTop:3 }}>{panel.lab_name || "Unknown lab"} · {panel.fasting ? "Fasted" : "Non-fasted"}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:14, fontWeight:600, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>{(panel.markers || []).length}</div>
                    <div style={{ fontSize:9, color:"#3f3f46", marginTop:3, textTransform:"uppercase", letterSpacing:"0.08em" }}>markers</div>
                  </div>
                </div>
                {flagged.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:10, paddingTop:10, borderTop:"1px solid #141416" }}>
                    {flagged.slice(0, 5).map(m => (
                      <span key={m.id} style={{ fontSize:9, padding:"3px 8px", background:m.flagged_high ? "rgba(239,68,68,0.06)" : "rgba(234,179,8,0.06)", color:m.flagged_high ? "#f87171" : "#fbbf24", border:`1px solid ${m.flagged_high ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)"}`, fontWeight:500 }}>
                        {m.display_name} {m.flagged_high ? "↑" : "↓"}
                      </span>
                    ))}
                    {flagged.length > 5 && <span style={{ fontSize:9, color:"#52525b", padding:"3px 4px" }}>+{flagged.length - 5}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// UPLOAD FLOW
// ══════════════════════════════════════

function UploadFlow({ onBack, onSaved, onSwitchToManual }) {
  const [step, setStep] = useState("select"); // select | parsing | review | saving | error
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setStep("parsing");

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          const b64 = result.split(",")[1];
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      const res = await fetch("/api/bloodwork/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pdf", data: base64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to parse PDF");
      }

      const data = await res.json();
      if (!data.markers || data.markers.length === 0) {
        throw new Error("No markers could be extracted from this PDF");
      }
      setParsed(data);
      setStep("review");
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  };

  const save = async (panelData) => {
    setStep("saving");
    try {
      const res = await fetch("/api/bloodwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(panelData),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  };

  return (
    <div>
      <button onClick={onBack} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#52525b", display:"flex", alignItems:"center", gap:6, fontFamily:"'JetBrains Mono',monospace", fontSize:11, marginBottom:20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Back
      </button>

      <h1 style={{ ...HS, marginBottom:4 }}>Add Bloodwork</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Upload PDF or enter manually</p>

      {step === "select" && (
        <div>
          <div className="c" style={{ padding:32, textAlign:"center", marginBottom:12 }}>
            <svg width="36" height="36" fill="none" stroke={T} strokeWidth="1.2" viewBox="0 0 24 24" style={{ margin:"0 auto 14px", opacity:.6 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <div style={{ fontSize:14, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif", marginBottom:6 }}>Upload Lab PDF</div>
            <p style={{ fontSize:11, color:"#52525b", marginBottom:16, lineHeight:1.6 }}>Quest, LabCorp, or any lab. Flourish reads it automatically.</p>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={e => handleFile(e.target.files?.[0])} style={{ display:"none" }} />
            <button onClick={() => fileRef.current?.click()} style={{ height:40, padding:"0 24px", background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>Choose File</button>
          </div>

          <button onClick={onSwitchToManual} className="c" style={{ width:"100%", padding:"16px 18px", textAlign:"left", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:14 }}>
            <svg width="20" height="20" fill="none" stroke="#71717a" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>Enter manually</div>
              <div style={{ fontSize:10, color:"#3f3f46", marginTop:3 }}>Type values from your report</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}

      {step === "parsing" && (
        <div className="c" style={{ padding:60, textAlign:"center" }}>
          <div style={{ width:32, height:32, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 18px", animation:"spin .7s linear infinite" }} />
          <div style={{ fontSize:13, color:"#a1a1aa", marginBottom:6, fontFamily:"'Inter',sans-serif", fontWeight:600 }}>Parsing your report...</div>
          <p style={{ fontSize:11, color:"#52525b" }}>Extracting markers with AI. This usually takes 5-15 seconds.</p>
        </div>
      )}

      {step === "review" && parsed && (
        <ReviewPanel parsed={parsed} onSave={save} onCancel={() => setStep("select")} />
      )}

      {step === "saving" && (
        <div className="c" style={{ padding:60, textAlign:"center" }}>
          <div style={{ width:32, height:32, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 18px", animation:"spin .7s linear infinite" }} />
          <div style={{ fontSize:13, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>Saving...</div>
        </div>
      )}

      {step === "error" && (
        <div className="c" style={{ padding:24, borderColor:"rgba(239,68,68,0.2)" }}>
          <div style={{ fontSize:13, color:"#f87171", marginBottom:8, fontWeight:600, fontFamily:"'Inter',sans-serif" }}>Something went wrong</div>
          <p style={{ fontSize:11, color:"#71717a", marginBottom:18, lineHeight:1.6 }}>{error}</p>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { setError(null); setStep("select"); }} style={{ flex:1, height:40, background:"transparent", border:"1px solid #1e1e22", color:"#71717a", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Try Again</button>
            <button onClick={onSwitchToManual} style={{ flex:1, height:40, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.05em" }}>Enter Manually</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// REVIEW PARSED PANEL (post-parse confirmation)
// ══════════════════════════════════════

function ReviewPanel({ parsed, onSave, onCancel }) {
  const [date, setDate] = useState(parsed.collectionDate || new Date().toISOString().split("T")[0]);
  const [labName, setLabName] = useState(parsed.labName || "");
  const [fasting, setFasting] = useState(parsed.fasting !== false);
  const [markers, setMarkers] = useState(parsed.markers);

  const updateMarker = (i, field, value) => {
    setMarkers(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const removeMarker = (i) => {
    setMarkers(p => p.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    onSave({
      date,
      labName,
      fasting,
      markers: markers.map(m => ({
        name: m.displayName || m.rawName,
        value: parseFloat(m.value),
        unit: m.unit,
        refLow: m.refLow,
        refHigh: m.refHigh,
      })),
      rawData: parsed,
    });
  };

  return (
    <div>
      <div className="c" style={{ padding:14, marginBottom:18, borderColor:"rgba(45,212,191,0.15)", background:"rgba(45,212,191,0.02)" }}>
        <div style={{ fontSize:11, color:T, fontWeight:600 }}>✓ Found {markers.length} markers</div>
        <p style={{ fontSize:10, color:"#52525b", margin:"4px 0 0", lineHeight:1.5 }}>Review and edit before saving. Tap any value to fix it.</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px", marginBottom:12 }}>
        <div><label style={LS}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={IS} /></div>
        <div><label style={LS}>Lab</label><input type="text" placeholder="Quest, LabCorp..." value={labName} onChange={e => setLabName(e.target.value)} style={IS} /></div>
      </div>
      <div style={{ marginBottom:18 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#71717a", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>
          <input type="checkbox" checked={fasting} onChange={e => setFasting(e.target.checked)} style={{ accentColor:T }} />
          Fasted at time of draw
        </label>
      </div>

      <div style={LS}>Markers ({markers.length})</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18, maxHeight:400, overflowY:"auto" }}>
        {markers.map((m, i) => (
          <div key={i} className="c" style={{ padding:"10px 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:600, color:m.recognized ? "#fff" : "#a1a1aa", fontFamily:"'Inter',sans-serif" }}>{m.displayName || m.rawName}</span>
              <button onClick={() => removeMarker(i)} style={{ background:"transparent", border:"none", color:"#3f3f46", cursor:"pointer", fontSize:13 }}>×</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:6 }}>
              <input type="number" step="0.01" value={m.value} onChange={e => updateMarker(i, "value", e.target.value)} style={{ ...IS, height:30, fontSize:11 }} />
              <input type="text" value={m.unit || ""} onChange={e => updateMarker(i, "unit", e.target.value)} placeholder="unit" style={{ ...IS, height:30, fontSize:11, textAlign:"center" }} />
            </div>
            {(m.flaggedLow || m.flaggedHigh) && (
              <div style={{ marginTop:6, fontSize:9, color:m.flaggedHigh ? "#f87171" : "#fbbf24" }}>
                {m.flaggedHigh ? "↑ Above" : "↓ Below"} reference range ({m.refLow}-{m.refHigh})
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onCancel} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#71717a", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Cancel</button>
        <button onClick={handleSave} disabled={markers.length === 0} style={{ flex:2, height:44, background:markers.length === 0 ? "#111114" : T, color:markers.length === 0 ? "#3f3f46" : "#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:markers.length === 0 ? "default" : "pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Save Panel</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MANUAL ENTRY FLOW
// ══════════════════════════════════════

const COMMON_MARKERS = [
  { name: "Total Testosterone", unit: "ng/dL", refLow: 264, refHigh: 916 },
  { name: "Free Testosterone", unit: "pg/mL", refLow: 47, refHigh: 244 },
  { name: "Estradiol", unit: "pg/mL", refLow: 15, refHigh: 60 },
  { name: "SHBG", unit: "nmol/L", refLow: 16.5, refHigh: 55.9 },
  { name: "IGF-1", unit: "ng/mL", refLow: 88, refHigh: 246 },
  { name: "HDL", unit: "mg/dL", refLow: 40, refHigh: 120 },
  { name: "LDL", unit: "mg/dL", refLow: 0, refHigh: 100 },
  { name: "Triglycerides", unit: "mg/dL", refLow: 0, refHigh: 150 },
  { name: "Hematocrit", unit: "%", refLow: 38.3, refHigh: 48.6 },
  { name: "Hemoglobin", unit: "g/dL", refLow: 13.2, refHigh: 16.6 },
  { name: "ALT", unit: "U/L", refLow: 0, refHigh: 44 },
  { name: "AST", unit: "U/L", refLow: 0, refHigh: 40 },
  { name: "TSH", unit: "mIU/L", refLow: 0.45, refHigh: 4.5 },
];

function ManualEntryFlow({ onBack, onSaved }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [labName, setLabName] = useState("");
  const [fasting, setFasting] = useState(true);
  const [markers, setMarkers] = useState(COMMON_MARKERS.map(m => ({ ...m, value: "" })));
  const [saving, setSaving] = useState(false);

  const update = (i, field, value) => {
    setMarkers(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const addBlank = () => {
    setMarkers(p => [...p, { name: "", value: "", unit: "", refLow: null, refHigh: null }]);
  };

  const remove = (i) => {
    setMarkers(p => p.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    const filled = markers.filter(m => m.name && m.value !== "" && !isNaN(parseFloat(m.value)));
    if (filled.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/bloodwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          labName,
          fasting,
          markers: filled.map(m => ({
            name: m.name,
            value: parseFloat(m.value),
            unit: m.unit,
            refLow: m.refLow,
            refHigh: m.refHigh,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filledCount = markers.filter(m => m.value !== "").length;

  return (
    <div>
      <button onClick={onBack} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#52525b", display:"flex", alignItems:"center", gap:6, fontFamily:"'JetBrains Mono',monospace", fontSize:11, marginBottom:20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Back
      </button>

      <h1 style={{ ...HS, marginBottom:4 }}>Manual Entry</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Type values from your lab report</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px", marginBottom:12 }}>
        <div><label style={LS}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={IS} /></div>
        <div><label style={LS}>Lab</label><input type="text" placeholder="Quest, LabCorp..." value={labName} onChange={e => setLabName(e.target.value)} style={IS} /></div>
      </div>
      <div style={{ marginBottom:18 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#71717a", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>
          <input type="checkbox" checked={fasting} onChange={e => setFasting(e.target.checked)} style={{ accentColor:T }} />
          Fasted at time of draw
        </label>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={LS}>Markers ({filledCount} filled)</span>
        <button onClick={addBlank} style={{ fontSize:10, color:T, background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>+ Custom</button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18 }}>
        {markers.map((m, i) => (
          <div key={i} className="c" style={{ padding:"10px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <input type="text" value={m.name} onChange={e => update(i, "name", e.target.value)} placeholder="Marker name" style={{ ...IS, height:30, fontSize:12, fontWeight:600, flex:1 }} />
              <button onClick={() => remove(i)} style={{ width:24, height:24, background:"transparent", border:"none", color:"#3f3f46", cursor:"pointer", fontSize:14 }}>×</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 1fr", gap:6 }}>
              <input type="number" step="0.01" value={m.value} onChange={e => update(i, "value", e.target.value)} placeholder="Value" style={{ ...IS, height:30, fontSize:11 }} />
              <input type="text" value={m.unit || ""} onChange={e => update(i, "unit", e.target.value)} placeholder="unit" style={{ ...IS, height:30, fontSize:11, textAlign:"center" }} />
              <input type="text" value={m.refLow !== null && m.refHigh !== null ? `${m.refLow}-${m.refHigh}` : ""} placeholder="ref range" disabled style={{ ...IS, height:30, fontSize:10, color:"#52525b" }} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving || filledCount === 0} style={{ width:"100%", height:44, background:filledCount === 0 || saving ? "#111114" : T, color:filledCount === 0 || saving ? "#3f3f46" : "#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:filledCount === 0 || saving ? "default" : "pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>
        {saving ? "Saving..." : `Save Panel (${filledCount})`}
      </button>
    </div>
  );
}

// ══════════════════════════════════════
// PANEL DETAIL — view single panel + cause/effect
// ══════════════════════════════════════

function PanelDetail({ panel, onBack }) {
  const [tab, setTab] = useState("markers"); // markers | causeeffect | trends
  const [causeEffect, setCauseEffect] = useState(null);
  const [loadingCE, setLoadingCE] = useState(false);

  useEffect(() => {
    if (tab !== "causeeffect" || causeEffect) return;
    setLoadingCE(true);
    fetch(`/api/bloodwork/causeeffect?panelId=${panel.id}`)
      .then(r => r.json())
      .then(d => setCauseEffect(d))
      .catch(() => setCauseEffect({ hasComparison: false, message: "Failed to analyze" }))
      .finally(() => setLoadingCE(false));
  }, [tab, panel.id]);

  // Group markers by category
  const byCategory = {};
  (panel.markers || []).forEach(m => {
    const cat = getMarkerCategory(m.marker_name);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(m);
  });

  return (
    <div>
      <button onClick={onBack} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#52525b", display:"flex", alignItems:"center", gap:6, fontFamily:"'JetBrains Mono',monospace", fontSize:11, marginBottom:20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Back
      </button>

      <div style={{ marginBottom:24 }}>
        <h1 style={HS}>{fmtDate(panel.date)}</h1>
        <div style={{ fontSize:11, color:"#3f3f46", marginTop:6 }}>{panel.lab_name || "Unknown lab"} · {panel.fasting ? "Fasted" : "Non-fasted"} · {(panel.markers || []).length} markers</div>
        {panel.active_compounds_snapshot?.length > 0 && (
          <div style={{ marginTop:10, padding:"10px 12px", background:"rgba(45,212,191,0.03)", border:"1px solid rgba(45,212,191,0.08)" }}>
            <div style={{ fontSize:9, color:T, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>On at time of draw</div>
            <div style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.6 }}>{panel.active_compounds_snapshot.join(", ")}</div>
          </div>
        )}
      </div>

      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid #1e1e22" }}>
        {[{ id:"markers", l:"Markers" }, { id:"causeeffect", l:"What Changed" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"12px 0", background:"transparent", border:"none", borderBottom:`2px solid ${tab === t.id ? T : "transparent"}`, color:tab === t.id ? T : "#52525b", fontSize:11, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "markers" && (
        <div>
          {CATEGORY_ORDER.filter(c => byCategory[c]?.length).map(catId => (
            <div key={catId} style={{ marginBottom:24 }}>
              <div style={{ ...LS, marginBottom:10 }}>{CATEGORY_NAMES[catId]}</div>
              <div className="c" style={{ overflow:"hidden" }}>
                {byCategory[catId].map((m, i) => {
                  const flagged = m.flagged_low || m.flagged_high;
                  return (
                    <div key={m.id} style={{ padding:"12px 16px", borderBottom: i < byCategory[catId].length - 1 ? "1px solid #141416" : "none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>{m.display_name}</div>
                        {(m.reference_low !== null || m.reference_high !== null) && (
                          <div style={{ fontSize:9, color:"#3f3f46", marginTop:3 }}>Ref: {m.reference_low}-{m.reference_high}</div>
                        )}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:14, fontWeight:700, color:flagged ? (m.flagged_high ? "#f87171" : "#fbbf24") : "#fff", fontFamily:"'Inter',sans-serif" }}>
                          {m.value} <span style={{ fontSize:10, fontWeight:400, color:"#52525b" }}>{m.unit}</span>
                        </div>
                        {flagged && <div style={{ fontSize:9, color:m.flagged_high ? "#f87171" : "#fbbf24", marginTop:2 }}>{m.flagged_high ? "HIGH" : "LOW"}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "causeeffect" && (
        <div>
          {loadingCE && (
            <div style={{ textAlign:"center", padding:40 }}>
              <div style={{ width:24, height:24, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 12px", animation:"spin .7s linear infinite" }} />
              <div style={{ fontSize:11, color:"#52525b" }}>Analyzing changes...</div>
            </div>
          )}
          {!loadingCE && causeEffect && !causeEffect.hasComparison && (
            <div className="c" style={{ padding:24, textAlign:"center" }}>
              <p style={{ fontSize:12, color:"#71717a", lineHeight:1.6, margin:0 }}>{causeEffect.message}</p>
            </div>
          )}
          {!loadingCE && causeEffect?.hasComparison && (
            <div>
              <div className="c" style={{ padding:14, marginBottom:18, background:"rgba(45,212,191,0.02)", borderColor:"rgba(45,212,191,0.1)" }}>
                <div style={{ fontSize:10, color:T, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Compared to</div>
                <div style={{ fontSize:13, color:"#fff", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>{fmtDate(causeEffect.previousPanel.date)}</div>
                <div style={{ fontSize:10, color:"#52525b", marginTop:3 }}>{causeEffect.daysApart} days apart</div>
              </div>

              {causeEffect.compoundChanges?.added?.length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <div style={LS}>Compounds added</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {causeEffect.compoundChanges.added.map(c => (
                      <span key={c.id} style={{ fontSize:10, padding:"4px 10px", background:"rgba(45,212,191,0.06)", color:T, border:"1px solid rgba(45,212,191,0.1)" }}>
                        + {c.name} {c.dose}{c.unit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {causeEffect.compoundChanges?.removed?.length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <div style={LS}>Compounds removed</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {causeEffect.compoundChanges.removed.map(c => (
                      <span key={c.id} style={{ fontSize:10, padding:"4px 10px", background:"rgba(239,68,68,0.06)", color:"#f87171", border:"1px solid rgba(239,68,68,0.1)" }}>
                        − {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={LS}>Significant changes ({causeEffect.correlations?.length || 0})</div>
              {(!causeEffect.correlations || causeEffect.correlations.length === 0) ? (
                <div className="c" style={{ padding:20, textAlign:"center" }}>
                  <p style={{ fontSize:11, color:"#52525b", margin:0 }}>No significant changes detected.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {causeEffect.correlations.map((c, i) => {
                    const isBad = ["hdl", "igf_1", "total_testosterone", "free_testosterone"].includes(c.marker);
                    const wentBad = isBad ? c.change.direction === "down" : c.change.direction === "up";
                    const color = wentBad ? "#f87171" : T;
                    return (
                      <div key={i} className="c" style={{ padding:"14px 16px", borderColor:wentBad ? "rgba(239,68,68,0.15)" : "rgba(45,212,191,0.15)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{c.displayName}</span>
                          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                            <span style={{ fontSize:10, color:"#52525b" }}>{c.change.from}</span>
                            <span style={{ fontSize:10, color:"#3f3f46" }}>→</span>
                            <span style={{ fontSize:14, fontWeight:700, color, fontFamily:"'Inter',sans-serif" }}>{c.change.to}</span>
                            <span style={{ fontSize:10, color }}>({c.change.deltaStr})</span>
                          </div>
                        </div>
                        <p style={{ fontSize:11, color:"#a1a1aa", margin:0, lineHeight:1.6 }}>{c.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

function getMarkerCategory(canonical) {
  const hormones = ["total_testosterone", "free_testosterone", "estradiol", "shbg", "lh", "fsh", "prolactin", "dht", "igf_1"];
  const lipids = ["total_cholesterol", "hdl", "ldl", "triglycerides", "vldl"];
  const hematology = ["hematocrit", "hemoglobin", "rbc", "wbc", "platelets"];
  const liver = ["alt", "ast", "alkaline_phosphatase", "bilirubin_total", "ggt"];
  const kidney = ["creatinine", "bun", "egfr", "cystatin_c"];
  const thyroid = ["tsh", "free_t3", "free_t4", "reverse_t3"];
  const metabolic = ["glucose", "hba1c", "insulin"];
  const inflammation = ["hs_crp", "homocysteine"];
  const vitamins = ["vitamin_d", "ferritin", "vitamin_b12"];
  const electrolytes = ["sodium", "potassium"];

  if (hormones.includes(canonical)) return "hormones";
  if (lipids.includes(canonical)) return "lipids";
  if (hematology.includes(canonical)) return "hematology";
  if (liver.includes(canonical)) return "liver";
  if (kidney.includes(canonical)) return "kidney";
  if (thyroid.includes(canonical)) return "thyroid";
  if (metabolic.includes(canonical)) return "metabolic";
  if (inflammation.includes(canonical)) return "inflammation";
  if (vitamins.includes(canonical)) return "vitamins";
  if (electrolytes.includes(canonical)) return "electrolytes";
  return "other";
}
