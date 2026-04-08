"use client";
import { useState, useEffect, useRef } from "react";

const T = "#2dd4bf";
const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };
const IS = { width:"100%", height:42, background:"rgba(255,255,255,0.02)", border:"1px solid #1e1e22", padding:"0 14px", color:"#e4e4e7", fontSize:13, fontFamily:"'JetBrains Mono',monospace" };
const HS = { fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:0, letterSpacing:"-0.02em" };

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

const CATEGORY_ORDER = ["hormones","lipids","hematology","liver","kidney","thyroid","metabolic","inflammation","vitamins","electrolytes","other"];
const CATEGORY_NAMES = {
  hormones:"Hormones", lipids:"Lipid Panel", hematology:"CBC / Hematology",
  liver:"Liver", kidney:"Kidney", thyroid:"Thyroid", metabolic:"Metabolic",
  inflammation:"Inflammation", vitamins:"Vitamins / Minerals", electrolytes:"Electrolytes", other:"Other",
};

function getMarkerCategory(canonical) {
  const map = {
    total_testosterone:"hormones", free_testosterone:"hormones", estradiol:"hormones",
    shbg:"hormones", lh:"hormones", fsh:"hormones", prolactin:"hormones", dht:"hormones", igf_1:"hormones",
    total_cholesterol:"lipids", hdl:"lipids", ldl:"lipids", triglycerides:"lipids", vldl:"lipids",
    hematocrit:"hematology", hemoglobin:"hematology", rbc:"hematology", wbc:"hematology", platelets:"hematology",
    alt:"liver", ast:"liver", alkaline_phosphatase:"liver", bilirubin_total:"liver", ggt:"liver",
    creatinine:"kidney", bun:"kidney", egfr:"kidney", cystatin_c:"kidney",
    tsh:"thyroid", free_t3:"thyroid", free_t4:"thyroid", reverse_t3:"thyroid",
    glucose:"metabolic", hba1c:"metabolic", insulin:"metabolic",
    hs_crp:"inflammation", homocysteine:"inflammation",
    vitamin_d:"vitamins", ferritin:"vitamins", vitamin_b12:"vitamins",
    sodium:"electrolytes", potassium:"electrolytes",
  };
  return map[canonical] || "other";
}

// Back button shared style
const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#52525b", display:"flex", alignItems:"center", gap:6, fontFamily:"'JetBrains Mono',monospace", fontSize:11, marginBottom:20 }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Back
  </button>
);

// Compound chip selector — used in both ReviewPanel and PanelDetail edit mode
function CompoundSelector({ value, onChange, knownCompounds }) {
  const [input, setInput] = useState("");

  const add = (name) => {
    const n = name.trim();
    if (!n || value.includes(n)) return;
    onChange([...value, n]);
    setInput("");
  };

  const remove = (name) => onChange(value.filter(c => c !== name));

  return (
    <div style={{ marginBottom:18 }}>
      <label style={LS}>Compounds at time of draw</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8, minHeight:28 }}>
        {value.map(c => (
          <span key={c} style={{ fontSize:10, padding:"4px 10px", background:"rgba(45,212,191,0.06)", color:T, border:"1px solid rgba(45,212,191,0.15)", display:"flex", alignItems:"center", gap:5 }}>
            {c}
            <button onClick={() => remove(c)} style={{ background:"transparent", border:"none", color:"#52525b", cursor:"pointer", fontSize:12, padding:0, lineHeight:1 }}>×</button>
          </span>
        ))}
        {value.length === 0 && <span style={{ fontSize:10, color:"#3f3f46", fontFamily:"'JetBrains Mono',monospace" }}>None selected</span>}
      </div>
      {knownCompounds?.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
          {knownCompounds.filter(c => !value.includes(c)).map(c => (
            <button key={c} onClick={() => add(c)} style={{ fontSize:9, padding:"3px 8px", background:"transparent", border:"1px solid #1e1e22", color:"#52525b", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>+ {c}</button>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:6 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); } }}
          placeholder="Type compound name, press Enter…"
          style={{ ...IS, height:34, flex:1, fontSize:11 }}
        />
        <button onClick={() => add(input)} disabled={!input.trim()} style={{ height:34, padding:"0 12px", background:"transparent", border:`1px solid ${input.trim() ? "rgba(45,212,191,0.3)" : "#1e1e22"}`, color:input.trim() ? T : "#3f3f46", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:input.trim() ? "pointer" : "default" }}>Add</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN LABS VIEW
// ══════════════════════════════════════

export function LabsView({ panels, compounds, onRefresh }) {
  const [view, setView] = useState("list");
  const [selectedPanel, setSelectedPanel] = useState(null);

  const knownCompoundNames = (compounds || []).map(c => c.name);

  const openDetail = (panel) => { setSelectedPanel(panel); setView("detail"); };
  const back = () => { setView("list"); setSelectedPanel(null); };
  const handleSaved = () => { onRefresh(); back(); };
  const handlePanelUpdated = (updated) => {
    setSelectedPanel(updated);
    onRefresh();
  };

  if (view === "upload") return <UploadFlow onBack={back} onSaved={handleSaved} onSwitchToManual={() => setView("manual")} knownCompounds={knownCompoundNames} />;
  if (view === "manual") return <ManualEntryFlow onBack={back} onSaved={handleSaved} knownCompounds={knownCompoundNames} />;
  if (view === "detail" && selectedPanel) return <PanelDetail panel={selectedPanel} onBack={back} onUpdated={handlePanelUpdated} knownCompounds={knownCompoundNames} />;

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
          <p style={{ fontSize:11, color:"#52525b", marginBottom:18, lineHeight:1.6 }}>Upload a PDF or enter values manually to start tracking trends.</p>
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
                    {flagged.slice(0,5).map(m => (
                      <span key={m.id} style={{ fontSize:9, padding:"3px 8px", background:m.flagged_high?"rgba(239,68,68,0.06)":"rgba(234,179,8,0.06)", color:m.flagged_high?"#f87171":"#fbbf24", border:`1px solid ${m.flagged_high?"rgba(239,68,68,0.1)":"rgba(234,179,8,0.1)"}`, fontWeight:500 }}>
                        {m.display_name} {m.flagged_high?"↑":"↓"}
                      </span>
                    ))}
                    {flagged.length > 5 && <span style={{ fontSize:9, color:"#52525b", padding:"3px 4px" }}>+{flagged.length-5}</span>}
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

function UploadFlow({ onBack, onSaved, onSwitchToManual, knownCompounds }) {
  const [step, setStep] = useState("select");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (f) => {
    if (!f) return;
    setStep("parsing");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      const res = await fetch("/api/bloodwork/parse", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ type:"pdf", data:base64 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to parse PDF");
      }
      const data = await res.json();
      if (!data.markers?.length) throw new Error("No markers could be extracted from this PDF");
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
        method:"POST", headers:{"Content-Type":"application/json"},
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
      <BackBtn onClick={onBack} />
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
          <div style={{ fontSize:13, color:"#a1a1aa", marginBottom:6, fontFamily:"'Inter',sans-serif", fontWeight:600 }}>Parsing your report…</div>
          <p style={{ fontSize:11, color:"#52525b" }}>Extracting markers with AI. Usually takes 15–40 seconds.</p>
        </div>
      )}

      {step === "review" && parsed && (
        <ReviewPanel parsed={parsed} knownCompounds={knownCompounds} onSave={save} onCancel={() => setStep("select")} />
      )}

      {step === "saving" && (
        <div className="c" style={{ padding:60, textAlign:"center" }}>
          <div style={{ width:32, height:32, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 18px", animation:"spin .7s linear infinite" }} />
          <div style={{ fontSize:13, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>Saving…</div>
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
// REVIEW PANEL — post-parse confirmation
// ══════════════════════════════════════

function ReviewPanel({ parsed, onSave, onCancel, knownCompounds }) {
  const [date, setDate] = useState(parsed.collectionDate || new Date().toISOString().split("T")[0]);
  const [labName, setLabName] = useState(parsed.labName || "");
  const [fasting, setFasting] = useState(parsed.fasting !== false);
  const [activeCompounds, setActiveCompounds] = useState(knownCompounds || []);
  const [markers, setMarkers] = useState(parsed.markers);

  const suspicious = markers.filter(m => m.suspicious);

  const updateMarker = (i, field, val) =>
    setMarkers(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  const removeMarker = (i) =>
    setMarkers(p => p.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSave({
      date, labName, fasting,
      activeCompounds,
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
      {suspicious.length > 0 && (
        <div className="c" style={{ padding:14, marginBottom:16, borderColor:"rgba(234,179,8,0.3)", background:"rgba(234,179,8,0.03)" }}>
          <div style={{ fontSize:11, color:"#fbbf24", fontWeight:600, marginBottom:4 }}>⚠ {suspicious.length} suspicious value{suspicious.length > 1 ? "s" : ""} detected</div>
          <p style={{ fontSize:10, color:"#a1a1aa", margin:"0 0 8px", lineHeight:1.5 }}>
            These markers have values far outside their expected range — they may have been misidentified from the PDF. Review and correct or remove them before saving.
          </p>
          {suspicious.map((m, i) => (
            <div key={i} style={{ fontSize:10, color:"#fbbf24", fontFamily:"'JetBrains Mono',monospace" }}>{m.displayName || m.rawName}: {m.value} {m.unit} (ref max: {m.refHigh})</div>
          ))}
        </div>
      )}

      <div className="c" style={{ padding:14, marginBottom:16, borderColor:"rgba(45,212,191,0.15)", background:"rgba(45,212,191,0.02)" }}>
        <div style={{ fontSize:11, color:T, fontWeight:600 }}>✓ Found {markers.length} markers</div>
        <p style={{ fontSize:10, color:"#52525b", margin:"4px 0 0", lineHeight:1.5 }}>Review and edit before saving. Tap any value to fix it.</p>
        {parsed._truncated && (
          <p style={{ fontSize:10, color:"#fbbf24", margin:"6px 0 0", lineHeight:1.5 }}>⚠ PDF was very long — some markers near the end may have been cut off. Check for missing values.</p>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px", marginBottom:12 }}>
        <div><label style={LS}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={IS} /></div>
        <div><label style={LS}>Lab</label><input type="text" placeholder="Quest, LabCorp…" value={labName} onChange={e => setLabName(e.target.value)} style={IS} /></div>
      </div>
      <div style={{ marginBottom:18 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#71717a", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>
          <input type="checkbox" checked={fasting} onChange={e => setFasting(e.target.checked)} style={{ accentColor:T }} />
          Fasted at time of draw
        </label>
      </div>

      <CompoundSelector value={activeCompounds} onChange={setActiveCompounds} knownCompounds={knownCompounds} />

      <div style={LS}>Markers ({markers.length})</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18, maxHeight:420, overflowY:"auto" }}>
        {markers.map((m, i) => (
          <div key={i} className="c" style={{ padding:"10px 12px", borderColor: m.suspicious ? "rgba(234,179,8,0.3)" : undefined }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:600, color: m.suspicious ? "#fbbf24" : m.recognized ? "#fff" : "#a1a1aa", fontFamily:"'Inter',sans-serif" }}>
                {m.suspicious ? "⚠ " : ""}{m.displayName || m.rawName}
              </span>
              <button onClick={() => removeMarker(i)} style={{ background:"transparent", border:"none", color:"#3f3f46", cursor:"pointer", fontSize:13 }}>×</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:6 }}>
              <input type="number" step="0.01" value={m.value} onChange={e => updateMarker(i, "value", e.target.value)} style={{ ...IS, height:30, fontSize:11, borderColor: m.suspicious ? "rgba(234,179,8,0.3)" : undefined }} />
              <input type="text" value={m.unit || ""} onChange={e => updateMarker(i, "unit", e.target.value)} placeholder="unit" style={{ ...IS, height:30, fontSize:11, textAlign:"center" }} />
            </div>
            {(m.flaggedLow || m.flaggedHigh) && !m.suspicious && (
              <div style={{ marginTop:5, fontSize:9, color:m.flaggedHigh ? "#f87171" : "#fbbf24" }}>
                {m.flaggedHigh ? "↑ Above" : "↓ Below"} ref range ({m.refLow}–{m.refHigh})
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
// PANEL DETAIL — view + edit saved panel
// ══════════════════════════════════════

function PanelDetail({ panel, onBack, onUpdated, knownCompounds }) {
  const [tab, setTab] = useState("markers");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  // Editable state
  const [editDate, setEditDate] = useState(panel.date || "");
  const [editLab, setEditLab] = useState(panel.lab_name || "");
  const [editFasting, setEditFasting] = useState(panel.fasting !== false);
  const [editCompounds, setEditCompounds] = useState(panel.active_compounds_snapshot || []);
  const [editMarkers, setEditMarkers] = useState((panel.markers || []).map(m => ({ ...m, editValue: m.value, editUnit: m.unit })));

  const [causeEffect, setCauseEffect] = useState(null);
  const [loadingCE, setLoadingCE] = useState(false);

  useEffect(() => {
    if (tab !== "causeeffect" || causeEffect) return;
    setLoadingCE(true);
    fetch(`/api/bloodwork/causeeffect?panelId=${panel.id}`)
      .then(r => r.json())
      .then(d => setCauseEffect(d))
      .catch(() => setCauseEffect({ hasComparison:false, message:"Failed to analyze" }))
      .finally(() => setLoadingCE(false));
  }, [tab, panel.id]);

  const startEdit = () => {
    setEditDate(panel.date || "");
    setEditLab(panel.lab_name || "");
    setEditFasting(panel.fasting !== false);
    setEditCompounds(panel.active_compounds_snapshot || []);
    setEditMarkers((panel.markers || []).map(m => ({ ...m, editValue: m.value, editUnit: m.unit })));
    setSaveErr(null);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setSaveErr(null); };

  const saveEdits = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const changedMarkers = editMarkers
        .filter(m => parseFloat(m.editValue) !== m.value || m.editUnit !== m.unit)
        .map(m => ({
          id: m.id,
          value: parseFloat(m.editValue),
          unit: m.editUnit,
          refLow: m.reference_low,
          refHigh: m.reference_high,
        }));

      const res = await fetch(`/api/bloodwork/${panel.id}`, {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          date: editDate,
          labName: editLab,
          fasting: editFasting,
          activeCompounds: editCompounds,
          markers: changedMarkers,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setEditing(false);
      onUpdated(data.panel);
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const byCategory = {};
  (editing ? editMarkers : (panel.markers || [])).forEach(m => {
    const cat = getMarkerCategory(m.marker_name);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(m);
  });

  return (
    <div>
      <BackBtn onClick={onBack} />

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={HS}>{fmtDate(editing ? editDate : panel.date)}</h1>
          <div style={{ fontSize:11, color:"#3f3f46", marginTop:6 }}>
            {(editing ? editLab : panel.lab_name) || "Unknown lab"} · {(editing ? editFasting : panel.fasting) ? "Fasted" : "Non-fasted"} · {(panel.markers || []).length} markers
          </div>
        </div>
        {!editing && (
          <button onClick={startEdit} style={{ height:32, padding:"0 12px", background:"transparent", border:"1px solid rgba(45,212,191,0.2)", color:T, fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Edit</button>
        )}
      </div>

      {editing ? (
        <div className="c" style={{ padding:18, marginBottom:20, borderColor:"rgba(45,212,191,0.2)" }}>
          <div style={{ fontSize:11, color:T, fontWeight:600, marginBottom:14 }}>Editing Panel</div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px", marginBottom:12 }}>
            <div><label style={LS}>Date</label><input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={IS} /></div>
            <div><label style={LS}>Lab</label><input type="text" value={editLab} onChange={e => setEditLab(e.target.value)} style={IS} /></div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#71717a", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>
              <input type="checkbox" checked={editFasting} onChange={e => setEditFasting(e.target.checked)} style={{ accentColor:T }} />
              Fasted at time of draw
            </label>
          </div>

          <CompoundSelector value={editCompounds} onChange={setEditCompounds} knownCompounds={knownCompounds} />

          <div style={{ ...LS, marginBottom:8 }}>Marker Values</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:360, overflowY:"auto", marginBottom:14 }}>
            {editMarkers.map((m, i) => (
              <div key={m.id} style={{ display:"grid", gridTemplateColumns:"1fr 80px 60px", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#a1a1aa", fontFamily:"'Inter',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.display_name}</span>
                <input
                  type="number" step="0.01"
                  value={m.editValue}
                  onChange={e => setEditMarkers(p => p.map((x, idx) => idx === i ? { ...x, editValue: e.target.value } : x))}
                  style={{ ...IS, height:30, fontSize:11, borderColor: parseFloat(m.editValue) !== m.value ? "rgba(45,212,191,0.3)" : undefined }}
                />
                <span style={{ fontSize:10, color:"#52525b", fontFamily:"'JetBrains Mono',monospace" }}>{m.editUnit || m.unit}</span>
              </div>
            ))}
          </div>

          {saveErr && <p style={{ fontSize:10, color:"#f87171", marginBottom:8 }}>{saveErr}</p>}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={cancelEdit} style={{ flex:1, height:36, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Cancel</button>
            <button onClick={saveEdits} disabled={saving} style={{ flex:2, height:36, background:saving?"#111114":T, color:saving?"#3f3f46":"#000", border:"none", fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:saving?"default":"pointer", textTransform:"uppercase", letterSpacing:"0.05em" }}>{saving?"Saving…":"Save Changes"}</button>
          </div>
        </div>
      ) : (
        panel.active_compounds_snapshot?.length > 0 && (
          <div style={{ marginBottom:16, padding:"10px 12px", background:"rgba(45,212,191,0.03)", border:"1px solid rgba(45,212,191,0.08)" }}>
            <div style={{ fontSize:9, color:T, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>On at time of draw</div>
            <div style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.6 }}>{panel.active_compounds_snapshot.join(", ")}</div>
          </div>
        )
      )}

      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid #1e1e22" }}>
        {[{ id:"markers", l:"Markers" }, { id:"causeeffect", l:"What Changed" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"12px 0", background:"transparent", border:"none", borderBottom:`2px solid ${tab===t.id?T:"transparent"}`, color:tab===t.id?T:"#52525b", fontSize:11, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>{t.l}</button>
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
                  const displayVal = editing ? m.editValue : m.value;
                  return (
                    <div key={m.id || i} style={{ padding:"12px 16px", borderBottom:i < byCategory[catId].length-1 ? "1px solid #141416" : "none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>{m.display_name}</div>
                        {(m.reference_low !== null || m.reference_high !== null) && (
                          <div style={{ fontSize:9, color:"#3f3f46", marginTop:3 }}>Ref: {m.reference_low}–{m.reference_high}</div>
                        )}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:14, fontWeight:700, color:flagged?(m.flagged_high?"#f87171":"#fbbf24"):"#fff", fontFamily:"'Inter',sans-serif" }}>
                          {displayVal} <span style={{ fontSize:10, fontWeight:400, color:"#52525b" }}>{m.unit}</span>
                        </div>
                        {flagged && <div style={{ fontSize:9, color:m.flagged_high?"#f87171":"#fbbf24", marginTop:2 }}>{m.flagged_high?"HIGH":"LOW"}</div>}
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
              <div style={{ fontSize:11, color:"#52525b" }}>Analyzing changes…</div>
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
                      <span key={c.id} style={{ fontSize:10, padding:"4px 10px", background:"rgba(45,212,191,0.06)", color:T, border:"1px solid rgba(45,212,191,0.1)" }}>+ {c.name} {c.dose}{c.unit}</span>
                    ))}
                  </div>
                </div>
              )}
              {causeEffect.compoundChanges?.removed?.length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <div style={LS}>Compounds removed</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {causeEffect.compoundChanges.removed.map(c => (
                      <span key={c.id} style={{ fontSize:10, padding:"4px 10px", background:"rgba(239,68,68,0.06)", color:"#f87171", border:"1px solid rgba(239,68,68,0.1)" }}>− {c.name}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={LS}>Significant changes ({causeEffect.correlations?.length || 0})</div>
              {(!causeEffect.correlations?.length) ? (
                <div className="c" style={{ padding:20, textAlign:"center" }}>
                  <p style={{ fontSize:11, color:"#52525b", margin:0 }}>No significant changes detected.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {causeEffect.correlations.map((c, i) => {
                    const goodUp = ["hdl","igf_1","total_testosterone","free_testosterone","vitamin_d","egfr"].includes(c.marker);
                    const wentBad = goodUp ? c.change.direction === "down" : c.change.direction === "up";
                    const color = wentBad ? "#f87171" : T;
                    return (
                      <div key={i} className="c" style={{ padding:"14px 16px", borderColor:wentBad?"rgba(239,68,68,0.15)":"rgba(45,212,191,0.15)" }}>
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
// MANUAL ENTRY FLOW
// ══════════════════════════════════════

const COMMON_MARKERS = [
  { name:"Total Testosterone", unit:"ng/dL", refLow:264, refHigh:916 },
  { name:"Free Testosterone", unit:"pg/mL", refLow:47, refHigh:244 },
  { name:"Estradiol", unit:"pg/mL", refLow:15, refHigh:60 },
  { name:"SHBG", unit:"nmol/L", refLow:16.5, refHigh:55.9 },
  { name:"IGF-1", unit:"ng/mL", refLow:88, refHigh:246 },
  { name:"HDL", unit:"mg/dL", refLow:40, refHigh:120 },
  { name:"LDL", unit:"mg/dL", refLow:0, refHigh:100 },
  { name:"Triglycerides", unit:"mg/dL", refLow:0, refHigh:150 },
  { name:"Hematocrit", unit:"%", refLow:38.3, refHigh:48.6 },
  { name:"Hemoglobin", unit:"g/dL", refLow:13.2, refHigh:16.6 },
  { name:"ALT", unit:"U/L", refLow:0, refHigh:44 },
  { name:"AST", unit:"U/L", refLow:0, refHigh:40 },
  { name:"TSH", unit:"mIU/L", refLow:0.45, refHigh:4.5 },
];

function ManualEntryFlow({ onBack, onSaved, knownCompounds }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [labName, setLabName] = useState("");
  const [fasting, setFasting] = useState(true);
  const [activeCompounds, setActiveCompounds] = useState(knownCompounds || []);
  const [markers, setMarkers] = useState(COMMON_MARKERS.map(m => ({ ...m, value:"" })));
  const [saving, setSaving] = useState(false);

  const update = (i, field, val) => setMarkers(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  const addBlank = () => setMarkers(p => [...p, { name:"", value:"", unit:"", refLow:null, refHigh:null }]);
  const remove = (i) => setMarkers(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    const filled = markers.filter(m => m.name && m.value !== "" && !isNaN(parseFloat(m.value)));
    if (!filled.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bloodwork", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          date, labName, fasting, activeCompounds,
          markers: filled.map(m => ({ name:m.name, value:parseFloat(m.value), unit:m.unit, refLow:m.refLow, refHigh:m.refHigh })),
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
      <BackBtn onClick={onBack} />
      <h1 style={{ ...HS, marginBottom:4 }}>Manual Entry</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Type values from your lab report</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px", marginBottom:12 }}>
        <div><label style={LS}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={IS} /></div>
        <div><label style={LS}>Lab</label><input type="text" placeholder="Quest, LabCorp…" value={labName} onChange={e => setLabName(e.target.value)} style={IS} /></div>
      </div>
      <div style={{ marginBottom:18 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"#71717a", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>
          <input type="checkbox" checked={fasting} onChange={e => setFasting(e.target.checked)} style={{ accentColor:T }} />
          Fasted at time of draw
        </label>
      </div>

      <CompoundSelector value={activeCompounds} onChange={setActiveCompounds} knownCompounds={knownCompounds} />

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
              <input type="text" value={m.refLow !== null && m.refHigh !== null ? `${m.refLow}–${m.refHigh}` : ""} placeholder="ref range" disabled style={{ ...IS, height:30, fontSize:10, color:"#52525b" }} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving || filledCount === 0} style={{ width:"100%", height:44, background:filledCount===0||saving?"#111114":T, color:filledCount===0||saving?"#3f3f46":"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:filledCount===0||saving?"default":"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>
        {saving ? "Saving…" : `Save Panel (${filledCount})`}
      </button>
    </div>
  );
}
