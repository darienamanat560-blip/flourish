"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { useFlourish } from "@/lib/useFlourish";
import { useChat } from "@/lib/useChat";
import { StateView } from "@/components/StateView";
import { LabsView } from "@/components/LabsView";
import { SymptomsView } from "@/components/SymptomsView";
import { AddCompoundView } from "@/components/AddCompoundView";
import { WhatChangedView } from "@/components/WhatChangedView";
import { TimelineView } from "@/components/TimelineView";

const T = "#2dd4bf";

const FREQS = ["daily","EOD","E3D","2x/week","3x/week","weekly","biweekly","as needed"];
const GOALS = ["Body recomposition","Fat loss","Lean mass gain","Strength","Recovery & healing","Cognitive enhancement","Longevity","Hormone optimization"];
const LIFTS = ["Bench Press","Squat","Deadlift","Overhead Press","Barbell Row","Front Squat","Romanian Deadlift","Incline Bench"];
const CARDIO = ["Running","Cycling","Rowing","Swimming","Stairmaster"];

function td() { return new Date().toISOString().split("T")[0]; }
function fmtDate(d) { if (!d) return ""; return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" }); }

function normalizeLog(l) {
  return { id: l.id, date: l.date, weight: l.weight, sleep: l.sleep_score, hrv: l.hrv, mood: l.mood, stress: l.stress, appetite: l.appetite, energy: l.energy, sideEffects: l.side_effects, physique: l.physique_notes, doses: l.doses || {} };
}
function normalizeCompound(c) {
  return { id: c.id, name: c.name, dose: c.dose, unit: c.unit, freq: c.frequency, frequency: c.frequency, status: c.status, category: c.category, titration: c.titration || [] };
}
function normalizeTraining(t) {
  return { id: t.id, date: t.date, type: t.type, exercise: t.exercise, sets: t.sets, duration: t.duration_minutes, distance: t.distance, estimated1RM: t.estimated_1rm, isPR: t.is_pr, activeCompounds: t.active_compounds || [] };
}

const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };
const IS = { width:"100%", height:42, background:"rgba(255,255,255,0.02)", border:"1px solid #1e1e22", padding:"0 14px", color:"#e4e4e7", fontSize:13, fontFamily:"'JetBrains Mono',monospace" };
const HS = { fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:0, letterSpacing:"-0.02em" };

function Sp({ data, h = 28 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1, W = 200;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width:"100%", height:h }}>
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T} stopOpacity="0.12"/><stop offset="100%" stopColor={T} stopOpacity="0"/></linearGradient></defs>
      <polygon fill="url(#sg)" points={`0,${h} ${data.map((v,i)=>`${(i/(data.length-1))*W},${h-((v-mn)/r)*(h-8)-4}`).join(" ")} ${W},${h}`} />
      <polyline fill="none" stroke={T} strokeWidth="1.5" strokeLinecap="round" points={data.map((v,i)=>`${(i/(data.length-1))*W},${h-((v-mn)/r)*(h-8)-4}`).join(" ")} />
      <circle cx={W} cy={h-((data[data.length-1]-mn)/r)*(h-8)-4} r="3" fill={T} />
    </svg>
  );
}

function SL({ children, right }) {
  return <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12, padding:"0 2px" }}><span style={LS}>{children}</span>{right && <span style={{ fontSize:10, color:"#3f3f46", fontFamily:"'JetBrains Mono',monospace" }}>{right}</span>}</div>;
}

function Mod({ open, onClose, title, children, fullHeight = false }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:fullHeight?"stretch":"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }} />
      <div style={{ position:"relative", width:"100%", maxWidth:520, maxHeight: fullHeight?"100vh":"85vh", display:"flex", flexDirection:"column", background:"#0a0a0c", borderTop:"1px solid #1e1e22", animation:"slideUp .25s ease-out" }} onClick={e => e.stopPropagation()}>
        {!fullHeight && <div style={{ width:36, height:3, background:"#27272a", borderRadius:2, margin:"10px auto 0" }} />}
        <div style={{ flexShrink:0, background:"#0a0a0c", borderBottom:"1px solid #141416", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ width:28, height:28, background:"#141416", border:"1px solid #1e1e22", color:"#52525b", cursor:"pointer", fontSize:14 }}>×</button>
        </div>
        <div style={{ padding: fullHeight ? 0 : "20px 20px 24px", overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ minHeight:"100vh", background:"#000", color:"#e4e4e7", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono',monospace", gap:16 }}>
      <svg width="24" height="34" viewBox="0 0 24 34" fill="none"><rect x="6" y="1" width="12" height="5" rx="1" fill={T}/><path d="M7 6V9H17V6" stroke={T} strokeWidth="1.5" fill="none"/><path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke={T} strokeWidth="1.5" fill="none"/><path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill={T}/></svg>
      <div style={{ width:24, height:24, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", animation:"spin .7s linear infinite" }} />
      <div style={{ fontSize:11, color:"#52525b", letterSpacing:"0.1em" }}>LOADING</div>
    </div>
  );
}

// ══════════════════════════════════════
// ONBOARDING (with live AI generation)
// ══════════════════════════════════════

// ── Health & History field with examples ──────────────────────
function HealthHistoryField({ value, onChange }) {
  const [showExamples, setShowExamples] = useState(false);
  const EXAMPLES = [
    "First cycle. No prior PEDs. No known health issues.",
    "2 prior Test-E cycles (500mg/wk, 12wk). Mild acne on last cycle. Bloodwork showed elevated hematocrit — donating blood quarterly.",
    "On TRT (150mg/wk Test-C). Adding peptides for first time. Family history of high cholesterol. On Finasteride 1mg/day.",
    "Intermediate. 3 cycles. Sensitive to high estrogen — gyno flare at 600mg. Use Aromasin as AI. Good bloodwork history.",
  ];

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <label style={LS}>Prior Cycles & Health</label>
        <button onClick={()=>setShowExamples(v=>!v)} style={{ fontSize:10, color:T, background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", padding:0 }}>
          {showExamples ? "hide examples ↑" : "see examples ↓"}
        </button>
      </div>

      {showExamples && (
        <div style={{ marginBottom:10, display:"flex", flexDirection:"column", gap:6 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => onChange(ex)} style={{ padding:"10px 12px", background:"rgba(45,212,191,0.02)", border:"1px solid rgba(45,212,191,0.08)", color:"#52525b", fontSize:11, fontFamily:"'Inter',sans-serif", cursor:"pointer", textAlign:"left", lineHeight:1.5 }}>
              <span style={{ color:"#27272a", fontSize:9, fontFamily:"'JetBrains Mono',monospace", display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.08em" }}>Example {i+1} — tap to use</span>
              {ex}
            </button>
          ))}
        </div>
      )}

      <textarea
        placeholder={`Be specific — the AI uses this to avoid conflicts and tailor doses.

Examples:
• "First cycle, no prior PEDs, no health issues"
• "2x Test-E cycles, acne sensitive, high hematocrit"
• "On TRT 150mg/wk, adding peptides, family hx high cholesterol"`}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{...IS, height:"auto", minHeight:120, padding:"10px 14px", resize:"vertical", lineHeight:1.6}}
      />
      <p style={{ fontSize:10, color:"#3f3f46", marginTop:5, lineHeight:1.5 }}>
        Mention: previous cycles & compounds used · health conditions · known sensitivities · medications · bloodwork flags
      </p>
    </div>
  );
}

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ name:"", experience:"", age:"", weight:"", goals:[], health:"" });
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState(null);
  const [error, setError] = useState(null);
  const [bwParsed, setBwParsed] = useState(null);
  const [bwUploading, setBwUploading] = useState(false);
  const [bwError, setBwError] = useState(null);
  const bwFileRef = useRef(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error("Failed to generate protocol");
      const data = await res.json();
      setRec(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    await onComplete({ profile: p, cycle: rec, bloodwork: bwParsed });
  };

  const titles = ["Welcome to Flourish.", "About You", "Your Goals", "Health & History", "Baseline Bloodwork", "Your Protocol"];
  const subs = ["Let's personalize your experience.", "Stats for tailored recommendations.", "What are you optimizing for?", "For safe recommendations.", "Upload a recent panel for smarter recommendations. Optional.", "Built for you."];

  return (
    <div style={{ minHeight:"100vh", background:"#000", color:"#e4e4e7", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:480, padding:"40px 24px" }}>
        <div style={{ display:"flex", gap:4, marginBottom:32 }}>{titles.map((_, i) => <div key={i} style={{ flex:1, height:2, background:i<=step?T:"#1e1e22" }} />)}</div>
        <h1 style={{ fontSize:24, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:"0 0 4px" }}>{titles[step]}</h1>
        <p style={{ fontSize:12, color:"#3f3f46", marginBottom:28 }}>{subs[step]}</p>

        {step === 0 && (<div>
          <div className="c" style={{ padding:20, marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <svg width="16" height="22" viewBox="0 0 24 34" fill="none"><rect x="6" y="1" width="12" height="5" rx="1" fill={T}/><path d="M7 6V9H17V6" stroke={T} strokeWidth="1.5" fill="none"/><path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke={T} strokeWidth="1.5" fill="none"/><path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill={T}/></svg>
              <span style={{ fontSize:16, fontFamily:"'Inter',sans-serif", color:"#fff" }}><b>flour</b><span style={{ fontWeight:300 }}>ish</span></span>
            </div>
            <p style={{ fontSize:12, color:"#52525b", lineHeight:1.7, margin:0 }}>Personalized protocols, AI-powered insights, grounded in your actual data.</p>
          </div>
          <div style={{ marginBottom:14 }}><label style={LS}>Your name</label><input placeholder="Name" value={p.name} onChange={e=>setP(x=>({...x,name:e.target.value}))} style={IS}/></div>
          <button onClick={()=>setStep(1)} disabled={!p.name} style={{ width:"100%", height:44, background:p.name?T:"#111114", color:p.name?"#000":"#3f3f46", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:p.name?"pointer":"default", letterSpacing:"0.08em", textTransform:"uppercase" }}>Get Started</button>
        </div>)}

        {step === 1 && (<div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <div style={{marginBottom:14}}><label style={LS}>Age</label><input type="number" placeholder="28" value={p.age} onChange={e=>setP(x=>({...x,age:e.target.value}))} style={IS}/></div>
            <div style={{marginBottom:14}}><label style={LS}>Weight (lbs)</label><input type="number" placeholder="175" value={p.weight} onChange={e=>setP(x=>({...x,weight:e.target.value}))} style={IS}/></div>
          </div>
          <label style={LS}>Experience</label>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {["beginner","intermediate","advanced"].map(lv=>(<button key={lv} onClick={()=>setP(x=>({...x,experience:lv}))} style={{ flex:1, padding:"11px 0", border:`1px solid ${p.experience===lv?"rgba(45,212,191,0.3)":"#1e1e22"}`, background:p.experience===lv?"rgba(45,212,191,0.04)":"transparent", color:p.experience===lv?T:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"capitalize" }}>{lv}</button>))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setStep(0)} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Back</button>
            <button onClick={()=>setStep(2)} disabled={!p.experience} style={{ flex:2, height:44, background:p.experience?T:"#111114", color:p.experience?"#000":"#3f3f46", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:p.experience?"pointer":"default", textTransform:"uppercase", letterSpacing:"0.08em" }}>Continue</button>
          </div>
        </div>)}

        {step === 2 && (<div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
            {GOALS.map(g=>{const s=p.goals.includes(g);return(
              <button key={g} onClick={()=>setP(x=>({...x,goals:s?x.goals.filter(v=>v!==g):[...x.goals,g]}))} style={{ padding:"13px 16px", border:`1px solid ${s?"rgba(45,212,191,0.3)":"#1e1e22"}`, background:s?"rgba(45,212,191,0.04)":"transparent", color:s?"#fff":"#52525b", fontSize:12, fontFamily:"'Inter',sans-serif", cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                {g}{s&&<svg width="14" height="14" viewBox="0 0 20 20" fill={T}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
              </button>
            );})}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setStep(1)} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Back</button>
            <button onClick={()=>setStep(3)} disabled={!p.goals.length} style={{ flex:2, height:44, background:p.goals.length?T:"#111114", color:p.goals.length?"#000":"#3f3f46", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:p.goals.length?"pointer":"default", textTransform:"uppercase", letterSpacing:"0.08em" }}>Continue</button>
          </div>
        </div>)}

        {step === 3 && (<div>
          <HealthHistoryField value={p.health} onChange={v=>setP(x=>({...x,health:v}))} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setStep(2)} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Back</button>
            <button onClick={()=>setStep(4)} style={{ flex:2, height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em" }}>Continue</button>
          </div>
        </div>)}

        {step === 4 && (<div>
          {/* Bloodwork upload — optional */}
          <input ref={bwFileRef} type="file" accept="application/pdf" style={{ display:"none" }} onChange={async e => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBwUploading(true);
            setBwError(null);
            try {
              const base64 = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result.split(",")[1]);
                r.onerror = rej;
                r.readAsDataURL(f);
              });
              const resp = await fetch("/api/bloodwork/parse", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body: JSON.stringify({ type:"pdf", data:base64 }),
              });
              if (!resp.ok) {
                const err = await resp.json().catch(()=>({}));
                throw new Error(err.detail || err.error || "Parse failed");
              }
              const data = await resp.json();
              if (!data.markers?.length) throw new Error("No markers found in PDF");
              setBwParsed({ ...data, fileName: f.name });
            } catch(err) {
              setBwError(err.message);
            } finally {
              setBwUploading(false);
              if (bwFileRef.current) bwFileRef.current.value = "";
            }
          }} />

          {bwUploading ? (
            <div style={{ textAlign:"center", padding:40 }}>
              <div style={{ width:24, height:24, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 12px", animation:"spin .7s linear infinite" }}/>
              <p style={{ fontSize:12, color:"#a1a1aa" }}>Parsing bloodwork… 15-40s</p>
            </div>
          ) : bwParsed ? (
            <div>
              <div className="c" style={{ padding:14, marginBottom:14, borderColor:"rgba(45,212,191,0.15)" }}>
                <div style={{ fontSize:9, color:T, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>Panel Parsed</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{bwParsed.fileName}</div>
                <div style={{ fontSize:10, color:"#3f3f46", marginTop:4 }}>{bwParsed.markerCount} markers · {bwParsed.labName || "Unknown lab"}{bwParsed.collectionDate ? ` · ${bwParsed.collectionDate}` : ""}</div>
              </div>
              <button onClick={()=>setBwParsed(null)} style={{ width:"100%", height:36, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", marginBottom:12 }}>Upload Different File</button>
            </div>
          ) : (
            <div>
              <button onClick={()=>bwFileRef.current?.click()} className="c" style={{ width:"100%", padding:32, textAlign:"center", cursor:"pointer", borderStyle:"dashed", marginBottom:12 }}>
                <svg width="28" height="28" fill="none" stroke={T} strokeWidth="1.2" viewBox="0 0 24 24" style={{ margin:"0 auto 10px", opacity:.6 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <div style={{ fontSize:12, color:"#71717a", fontFamily:"'Inter',sans-serif" }}>Upload baseline bloodwork PDF</div>
                <div style={{ fontSize:10, color:"#3f3f46", marginTop:4 }}>Quest, LabCorp, any standard lab panel</div>
              </button>
              {bwError && <p style={{ fontSize:11, color:"#f87171", marginBottom:10, padding:"8px 12px", background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.1)" }}>{bwError}</p>}
            </div>
          )}

          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button onClick={()=>setStep(3)} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Back</button>
            <button onClick={()=>{setStep(5);generate();}} style={{ flex:2, height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              {bwParsed ? "Generate Protocol" : "Skip & Generate"}
            </button>
          </div>
        </div>)}

        {step === 5 && (<div>
          {loading ? (<div style={{ textAlign:"center", padding:40 }}>
            <div style={{ width:28, height:28, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 16px", animation:"spin .7s linear infinite" }}/>
            <p style={{ fontSize:12, color:"#a1a1aa", marginBottom:6, fontFamily:"'Inter',sans-serif", fontWeight:600 }}>Building your protocol...</p>
            <p style={{ fontSize:10, color:"#52525b" }}>AI is analyzing your profile. 5-15 seconds.</p>
          </div>
          ) : error ? (<div>
            <div className="c" style={{ padding:18, marginBottom:14, borderColor:"rgba(239,68,68,0.2)" }}>
              <p style={{ fontSize:12, color:"#f87171", margin:0 }}>{error}</p>
            </div>
            <button onClick={generate} style={{ width:"100%", height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Try Again</button>
          </div>
          ) : rec ? (<div>
            <div className="c" style={{ padding:18, marginBottom:16, borderColor:"rgba(45,212,191,0.15)" }}>
              <div style={{ fontSize:9, color:T, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>Recommended Cycle</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{rec.cycleName}</div>
              <p style={{ fontSize:11, color:"#a1a1aa", marginTop:6, lineHeight:1.6 }}>{rec.summary}</p>
              {rec.rationale && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #141416" }}>
                  <div style={{ fontSize:9, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Rationale</div>
                  <p style={{ fontSize:11, color:"#71717a", margin:0, lineHeight:1.6 }}>{rec.rationale}</p>
                </div>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16, maxHeight:280, overflowY:"auto" }}>
              {rec.compounds.map((c,i)=>(<div key={i} className="c" style={{ padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: c.reason ? 4 : 0 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{c.name}</span>
                  <span style={{ fontSize:10, color:"#3f3f46" }}>{c.dose} {c.unit} · {c.freq}</span>
                </div>
                {c.reason && <p style={{ fontSize:10, color:"#52525b", margin:"4px 0 0", lineHeight:1.5 }}>{c.reason}</p>}
              </div>))}
            </div>
            {rec.warnings?.length > 0 && (
              <div className="c" style={{ padding:12, marginBottom:16, borderColor:"rgba(234,179,8,0.15)", background:"rgba(234,179,8,0.02)" }}>
                <div style={{ fontSize:9, color:"#fbbf24", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>Watch for</div>
                <ul style={{ fontSize:10, color:"#a1a1aa", margin:0, paddingLeft:14, lineHeight:1.6 }}>
                  {rec.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            <button onClick={finish} style={{ width:"100%", height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Start This Protocol</button>
          </div>) : null}
        </div>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// CHAT VIEW
// ══════════════════════════════════════

function ChatView({ messages, sending, onSend }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, sending]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    onSend(input);
    setInput("");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:"60vh" }}>
      {messages.length === 0 && !sending && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px", textAlign:"center" }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(45,212,191,0.06)", border:"1px solid rgba(45,212,191,0.15)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
            <svg width="18" height="18" fill="none" stroke={T} strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif", marginBottom:6 }}>Ask Flourish anything</div>
          <p style={{ fontSize:11, color:"#52525b", maxWidth:260, lineHeight:1.6, margin:0 }}>Your compounds, metrics, bloodwork, and computed state are in context.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:20, width:"100%", maxWidth:280 }}>
            {["How am I progressing toward my goals?", "Any concerns with my current stack?", "What should I watch on next bloodwork?"].map((s, i) => (
              <button key={i} onClick={() => onSend(s)} disabled={sending} className="c" style={{ padding:"10px 14px", fontSize:11, color:"#71717a", textAlign:"left", cursor:sending?"default":"pointer", fontFamily:"'JetBrains Mono',monospace" }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"20px", display: messages.length === 0 && !sending ? "none" : "flex", flexDirection:"column", gap:12 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth:"85%", padding:"10px 14px", background: m.role === "user" ? "rgba(45,212,191,0.06)" : "#111114", border: `1px solid ${m.role === "user" ? "rgba(45,212,191,0.15)" : "#1e1e22"}`, color: m.role === "user" ? T : "#e4e4e7", fontSize:13, lineHeight:1.6, fontFamily:"'Inter',sans-serif", whiteSpace:"pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display:"flex", justifyContent:"flex-start" }}>
            <div style={{ padding:"10px 14px", background:"#111114", border:"1px solid #1e1e22", display:"flex", gap:4 }}>
              {[0, 150, 300].map(d => <div key={d} style={{ width:5, height:5, borderRadius:"50%", background:T, animation:`pulse 1.2s ease-in-out ${d}ms infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} style={{ padding:16, borderTop:"1px solid #141416", display:"flex", gap:8, flexShrink:0 }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." disabled={sending} style={{ ...IS, flex:1, height:40 }} />
        <button type="submit" disabled={!input.trim() || sending} style={{ height:40, padding:"0 18px", background: input.trim() && !sending ? T : "#111114", color: input.trim() && !sending ? "#000" : "#3f3f46", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor: input.trim() && !sending ? "pointer" : "default", letterSpacing:"0.08em", textTransform:"uppercase" }}>Send</button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════

function FlourishApp() {
  const f = useFlourish();
  const chat = useChat();

  const [tab, setTab] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [addCompoundOpen, setAddCompoundOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [whatChangedOpen, setWhatChangedOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [trainOpen, setTrainOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [todayDoses, setTodayDoses] = useState({});

  const compounds = useMemo(() => (f.data.compounds || []).map(normalizeCompound), [f.data.compounds]);
  const logs = useMemo(() => (f.data.logs || []).map(normalizeLog), [f.data.logs]);
  const training = useMemo(() => (f.data.training || []).map(normalizeTraining), [f.data.training]);
  const active = compounds.filter(c => c.status === "active");
  const latest = logs[0];
  const cy = f.data.cycle;

  if (f.loading) return <Loading />;

  if (!f.data.profile?.onboarded) {
    return <Onboarding onComplete={async ({ profile, cycle, bloodwork }) => {
      await f.saveProfile({ ...profile, onboarded: true });
      if (cycle) {
        await f.createCycle({
          name: cycle.cycleName,
          goals: profile.goals,
          weeks: cycle.suggestedWeeks || 12,
          compounds: cycle.compounds,
          aiGenerated: true,
        });
      }
      // Save baseline bloodwork if user uploaded one during onboarding
      if (bloodwork?.markers?.length) {
        try {
          await fetch("/api/bloodwork", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: bloodwork.collectionDate || new Date().toISOString().slice(0, 10),
              labName: bloodwork.labName,
              fasting: bloodwork.fasting ?? true,
              markers: bloodwork.markers,
              rawData: bloodwork,
            }),
          });
        } catch {
          // Non-fatal — user can re-upload in Labs tab
        }
      }
      await f.refresh();
    }} />;
  }

  const TABS = [
    { id:"home", label:"Home", d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" },
    { id:"log", label:"Log", d:"M12 4v16m8-8H4" },
    { id:"labs", label:"Labs", d:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M5 21h14M9 7h.01M9 11h.01M9 15h.01M13 7h2M13 11h2M13 15h2" },
    { id:"symptoms", label:"Symptoms", d:"M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { id:"stack", label:"Stack", d:"M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#000", color:"#e4e4e7", fontFamily:"'JetBrains Mono',monospace" }}>
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(0,0,0,0.94)", backdropFilter:"blur(16px)", borderBottom:"1px solid #1e1e22", padding:"14px 20px" }}>
        <div style={{ maxWidth:560, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <svg width="14" height="20" viewBox="0 0 24 34" fill="none"><rect x="6" y="1" width="12" height="5" rx="1" fill={T}/><path d="M7 6V9H17V6" stroke={T} strokeWidth="1.5" fill="none"/><path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke={T} strokeWidth="1.5" fill="none"/><path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill={T}/></svg>
            <div><div style={{ fontSize:15, letterSpacing:"0.1em", color:"#fff", fontFamily:"'Inter',sans-serif" }}><span style={{ fontWeight:700 }}>flour</span><span style={{ fontWeight:300 }}>ish</span></div><div style={{ fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", color:"#3f3f46", marginTop:-1 }}>{cy?.name || "No active cycle"}</div></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setChatOpen(true)} style={{ width:36, height:36, background:"transparent", border:"1px solid #1e1e22", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#52525b" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </button>
            <button onClick={() => setMenuOpen(true)} style={{ width:36, height:36, background:"transparent", border:"1px solid #1e1e22", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
              <div style={{ width:14, height:1.5, background:"#52525b" }}/><div style={{ width:14, height:1.5, background:"#52525b" }}/><div style={{ width:10, height:1.5, background:"#52525b" }}/>
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth:560, margin:"0 auto", padding:"24px 20px 100px" }}>
        {tab === "home" && (<div>
          <div style={{ marginBottom:24 }}>
            <h1 style={HS}>{f.data.profile?.name ? `Welcome back, ${f.data.profile.name}.` : "Welcome back."}</h1>
            <p style={{ fontSize:11, color:"#3f3f46", marginTop:5 }}>{new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}</p>
          </div>

          <StateView onOpenWhatChanged={() => setWhatChangedOpen(true)} />

          {latest && (<div style={{ marginBottom:28 }}><SL>Latest Metrics</SL><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[{l:"Weight",v:latest.weight,u:"lbs",d:logs.map(x=>x.weight).filter(Boolean).reverse()},{l:"Sleep",v:latest.sleep,u:"score",d:logs.map(x=>x.sleep).filter(Boolean).reverse()},{l:"Mood",v:latest.mood,u:"/10",d:logs.map(x=>x.mood).filter(Boolean).reverse()},{l:"HRV",v:latest.hrv,u:"ms",d:logs.map(x=>x.hrv).filter(Boolean).reverse()}].map((m,i)=>(
              <div key={i} className="c" style={{ padding:"16px 18px" }}>
                <div style={{ fontSize:10, color:"#3f3f46", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{m.l}</div>
                <div style={{ fontSize:26, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", lineHeight:1 }}>{m.v || "—"}<span style={{ fontSize:11, fontWeight:400, color:"#27272a", marginLeft:3 }}>{m.u}</span></div>
                {m.d?.length >= 2 && <div style={{ marginTop:10 }}><Sp data={m.d}/></div>}
              </div>
            ))}
          </div></div>)}

          <div style={{ marginBottom:28 }}><SL>Quick Actions</SL><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              {l:"Add Compound",icon:"M12 4v16m8-8H4",fn:()=>setAddCompoundOpen(true)},
              {l:"Log Training",icon:"M13 10V3L4 14h7v7l9-11h-7z",fn:()=>setTrainOpen(true)},
              {l:"Timeline",icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",fn:()=>setTimelineOpen(true)},
              {l:"Memory",icon:"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",fn:()=>setMemoryOpen(true)},
            ].map((b,i)=>(
              <button key={i} className="ab" onClick={b.fn} style={{ padding:"18px 16px", textAlign:"left", fontFamily:"'JetBrains Mono',monospace", display:"flex", flexDirection:"column", gap:10 }}>
                <div className="gl"/>
                <svg width="18" height="18" fill="none" stroke={T} strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity:.7 }}><path strokeLinecap="round" strokeLinejoin="round" d={b.icon}/></svg>
                <span style={{ fontSize:11, fontWeight:600, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>{b.l}</span>
              </button>
            ))}
          </div></div>

          <SL right={`${active.length} active`}>Today's Stack</SL>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:28 }}>
            {active.length === 0 ? (
              <div className="c" style={{ padding:20, textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#52525b", marginBottom:10 }}>No compounds in this cycle yet</div>
                <button onClick={() => setAddCompoundOpen(true)} style={{ fontSize:10, color:T, background:"transparent", border:"1px solid rgba(45,212,191,0.2)", padding:"6px 14px", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>+ Add Compound</button>
              </div>
            ) : active.map(c => {
              const dosed = todayDoses[c.id];
              return (
                <div key={c.id} className="c" style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ flex:1, display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:dosed?T:"#27272a" }}/>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{c.name}</div>
                      <div style={{ fontSize:10, color:"#3f3f46", marginTop:3 }}>{c.dose} {c.unit} · {c.freq}</div>
                    </div>
                  </div>
                  <button className="ql" onClick={() => { if (!dosed) setTodayDoses(p => ({ ...p, [c.id]: c.dose })); }}>
                    {dosed ? "✓ Logged" : "Log"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>)}

        {tab === "log" && <LogView active={active} onSave={async (data) => { await f.saveLog(data); setTab("home"); }} />}
        {tab === "labs" && <LabsView panels={f.data.panels || []} compounds={f.data.compounds || []} onRefresh={f.refresh} />}
        {tab === "symptoms" && <SymptomsView />}
        {tab === "stack" && <StackView compounds={compounds} onAdd={() => setAddCompoundOpen(true)} onUpdate={f.updateCompound} onDelete={f.deleteCompound} />}
      </div>

      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.94)", backdropFilter:"blur(16px)", borderTop:"1px solid #1e1e22", zIndex:50 }}>
        <div style={{ maxWidth:560, margin:"0 auto", display:"flex" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"10px 0 8px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", color:tab===t.id?T:"#27272a" }}>
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={t.d}/></svg>
              <span style={{ fontSize:9, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Mod open={addCompoundOpen} onClose={() => setAddCompoundOpen(false)} title="Add Compound">
        <AddCompoundView onAdded={() => { setAddCompoundOpen(false); f.refresh(); }} onClose={() => setAddCompoundOpen(false)} />
      </Mod>

      <Mod open={chatOpen} onClose={() => setChatOpen(false)} title="Ask Flourish" fullHeight>
        <ChatView messages={chat.messages} sending={chat.sending} onSend={chat.sendMessage} />
      </Mod>

      <Mod open={whatChangedOpen} onClose={() => setWhatChangedOpen(false)} title="What Changed" fullHeight>
        <div style={{ padding:20 }}>
          <WhatChangedView since="lastBloodwork" />
        </div>
      </Mod>

      <Mod open={timelineOpen} onClose={() => setTimelineOpen(false)} title="Timeline" fullHeight>
        <div style={{ padding:20 }}>
          <TimelineView
            panels={f.data.panels || []}
            compounds={f.data.compounds || []}
            logs={f.data.logs || []}
            training={f.data.training || []}
            symptoms={f.data.symptoms || []}
            cycles={f.data.cycles || []}
          />
        </div>
      </Mod>

      <Mod open={memoryOpen} onClose={() => setMemoryOpen(false)} title="What Flourish Knows">
        {Object.keys(f.data.memoryByCategory || {}).length === 0 ? (
          <div style={{ textAlign:"center", padding:30, color:"#3f3f46", fontSize:12 }}>No memories yet. They'll appear as you use the app.</div>
        ) : (
          <div>
            {Object.entries(f.data.memoryByCategory || {}).map(([cat, mems]) => (
              <div key={cat} style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, color:T, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8 }}>{cat.replace("_", " ")}</div>
                {mems.map(m => (
                  <div key={m.id} className="c" style={{ padding:"10px 14px", marginBottom:4, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1, fontSize:12, color:"#a1a1aa", lineHeight:1.6 }}>{m.content}</div>
                    <button onClick={() => f.deleteMemory(m.id)} style={{ background:"transparent", border:"none", color:"#3f3f46", cursor:"pointer", fontSize:14, flexShrink:0 }}>×</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Mod>

      <Mod open={trainOpen} onClose={() => setTrainOpen(false)} title="Log Training" fullHeight>
        <div style={{ padding:20 }}>
          <TrainView training={training} prs={f.data.prs || []} onSave={async (s) => { await f.saveTraining(s); setTrainOpen(false); }} />
        </div>
      </Mod>

      <Mod open={historyOpen} onClose={() => setHistoryOpen(false)} title="History" fullHeight>
        <div style={{ padding:20 }}>
          <HistoryView logs={logs} compounds={compounds} onDelete={f.deleteLog} />
        </div>
      </Mod>

      {menuOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"#000", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e1e22", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:15, fontFamily:"'Inter',sans-serif", color:"#fff" }}><b>flour</b><span style={{ fontWeight:300 }}>ish</span></span>
            <button onClick={() => setMenuOpen(false)} style={{ width:36, height:36, background:"#111114", border:"1px solid #1e1e22", color:"#52525b", cursor:"pointer", fontSize:18 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
            <div style={{ marginBottom:28 }}>
              <div style={LS}>Account</div>
              <div style={{ fontSize:20, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{f.data.profile?.name}</div>
              <div style={{ fontSize:11, color:"#3f3f46", marginTop:3, textTransform:"capitalize" }}>{f.data.profile?.experience} · {f.data.profile?.goals?.slice(0,2).join(", ")}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {[
                { l: "Timeline", fn: () => { setTimelineOpen(true); setMenuOpen(false); } },
                { l: "Training Log", fn: () => { setTrainOpen(true); setMenuOpen(false); } },
                { l: "Log History", fn: () => { setHistoryOpen(true); setMenuOpen(false); } },
                { l: "What Flourish Knows", fn: () => { setMemoryOpen(true); setMenuOpen(false); } },
                { l: "Ask Flourish", fn: () => { setChatOpen(true); setMenuOpen(false); } },
              ].map((item, i) => (
                <button key={i} onClick={item.fn} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0", background:"transparent", border:"none", borderBottom:"1px solid #141416", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", color:"#a1a1aa", fontSize:13 }}>
                  {item.l}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
                </button>
              ))}
              <div style={{ padding:"16px 0", borderBottom:"1px solid #141416" }}>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// SUB-VIEWS
// ══════════════════════════════════════

function LogView({ active, onSave }) {
  const [ck, setCk] = useState({});
  const [cd, setCd] = useState({});
  const [f, setF] = useState({ weight:"", sleep:"", hrv:"", mood:7, stress:5, appetite:5, sideEffects:"", physique:"" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const doses = {};
    Object.keys(ck).filter(k => ck[k]).forEach(id => {
      const c = active.find(x => x.id === id);
      doses[id] = cd[id] !== undefined ? Number(cd[id]) : c.dose;
    });
    setSaving(true);
    try {
      await onSave({ ...f, doses, date: td() });
      setCk({}); setCd({});
      setF({ weight:"", sleep:"", hrv:"", mood:7, stress:5, appetite:5, sideEffects:"", physique:"" });
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>Log Entry</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Select compounds taken today</p>
      <SL right={`${Object.values(ck).filter(Boolean).length} selected`}>Compounds</SL>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:28 }}>
        {active.map(c => { const on = ck[c.id]; return (
          <button key={c.id} onClick={() => setCk(p => ({ ...p, [c.id]: !p[c.id] }))} className="c" style={{ padding:"13px 14px", cursor:"pointer", textAlign:"left", fontFamily:"'JetBrains Mono',monospace", borderColor:on?"rgba(45,212,191,0.25)":undefined, background:on?"rgba(45,212,191,0.02)":"" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:on?6:0 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:on?T:"#27272a" }}/>
              <span style={{ fontSize:12, fontWeight:600, color:on?"#fff":"#52525b", fontFamily:"'Inter',sans-serif", flex:1 }}>{c.name}</span>
            </div>
            {on ? <input type="number" value={cd[c.id]!==undefined?cd[c.id]:c.dose} onChange={e=>{e.stopPropagation();setCd(p=>({...p,[c.id]:e.target.value}))}} onClick={e=>e.stopPropagation()} style={{ width:"100%", height:28, background:"transparent", border:"1px solid rgba(45,212,191,0.15)", padding:"0 8px", color:T, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}/> : <div style={{ fontSize:10, color:"#27272a", marginTop:2 }}>{c.dose} {c.unit} · {c.freq}</div>}
          </button>
        );})}
      </div>
      <SL>Biometrics</SL>
      <div className="c" style={{ padding:"18px 18px 4px", marginBottom:24 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          {[["Weight (lbs)","weight","160"],["Sleep score","sleep","80"],["HRV (ms)","hrv","64"]].map(([l,k,ph])=>(
            <div key={k} style={{marginBottom:14}}><label style={LS}>{l}</label><input type="number" placeholder={ph} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))} style={IS}/></div>
          ))}
          {[["Mood","mood"],["Stress","stress"],["Appetite","appetite"]].map(([l,k])=>(
            <div key={k} style={{marginBottom:14}}><label style={LS}>{l} ({f[k]}/10)</label><input type="range" min="1" max="10" value={f[k]} onChange={e=>setF(p=>({...p,[k]:Number(e.target.value)}))} style={{width:"100%",marginTop:8}}/></div>
          ))}
        </div>
      </div>
      <SL>Notes</SL>
      <div className="c" style={{ padding:"18px 18px 4px", marginBottom:24 }}>
        <div style={{ marginBottom:14 }}><label style={LS}>Side Effects</label><input placeholder="Acne, lethargy..." value={f.sideEffects} onChange={e=>setF(p=>({...p,sideEffects:e.target.value}))} style={IS}/></div>
        <div style={{ marginBottom:14 }}><label style={LS}>Physique Notes</label><textarea placeholder="Body composition..." value={f.physique} onChange={e=>setF(p=>({...p,physique:e.target.value}))} style={{...IS,height:"auto",minHeight:60,padding:"10px 14px",resize:"vertical"}}/></div>
      </div>
      <button onClick={save} disabled={saving} style={{ width:"100%", height:46, background:saving?"#111114":T, color:saving?"#3f3f46":"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:saving?"default":"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>{saving?"Saving...":"Log Entry"}</button>
    </div>
  );
}

function TrainView({ training, prs, onSave }) {
  const [mode, setMode] = useState("lift");
  const [exercise, setExercise] = useState(LIFTS[0]);
  const [sets, setSets] = useState([{ reps:"", weight:"" }]);
  const [cardioEx, setCardioEx] = useState(CARDIO[0]);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [saving, setSaving] = useState(false);

  const saveLift = async () => {
    const valid = sets.filter(s => s.reps && s.weight);
    if (!valid.length) return;
    setSaving(true);
    try { await onSave({ type:"lift", exercise, sets:valid.map(s => ({ reps:Number(s.reps), weight:Number(s.weight) })) }); setSets([{ reps:"", weight:"" }]); }
    catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const saveCardio = async () => {
    if (!duration) return;
    setSaving(true);
    try { await onSave({ type:"cardio", exercise:cardioEx, duration:Number(duration), distance:Number(distance)||0 }); setDuration(""); setDistance(""); }
    catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>Training</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Log lifts and cardio</p>
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {["lift","cardio"].map(m => (<button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:"10px 0", border:`1px solid ${mode===m?"rgba(45,212,191,0.3)":"#1e1e22"}`, background:mode===m?"rgba(45,212,191,0.04)":"transparent", color:mode===m?T:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"capitalize" }}>{m==="lift"?"Barbell Lifts":"Cardio"}</button>))}
      </div>
      {mode === "lift" ? (<div>
        <div style={{ marginBottom:14 }}><label style={LS}>Exercise</label><select value={exercise} onChange={e=>setExercise(e.target.value)} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{LIFTS.map(l=><option key={l}>{l}</option>)}</select></div>
        <div style={LS}>Sets</div>
        {sets.map((s, i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"60px 1fr 28px", gap:8, marginBottom:6, alignItems:"center" }}>
            <input type="number" placeholder="Reps" value={s.reps} onChange={e=>{const v=[...sets];v[i].reps=e.target.value;setSets(v)}} style={{...IS,height:36,textAlign:"center",fontSize:12}}/>
            <input type="number" placeholder="Weight (lbs)" value={s.weight} onChange={e=>{const v=[...sets];v[i].weight=e.target.value;setSets(v)}} style={{...IS,height:36,fontSize:12}}/>
            {sets.length > 1 && <button onClick={()=>setSets(p=>p.filter((_,j)=>j!==i))} style={{ width:28, height:28, background:"#111114", border:"1px solid #1e1e22", color:"#3f3f46", cursor:"pointer", fontSize:12 }}>×</button>}
          </div>
        ))}
        <button onClick={()=>setSets(p=>[...p,{reps:"",weight:""}])} style={{ fontSize:10, color:T, background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontWeight:600, marginBottom:20 }}>+ Add Set</button>
        <button onClick={saveLift} disabled={saving} style={{ width:"100%", height:44, background:saving?"#111114":T, color:saving?"#3f3f46":"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:saving?"default":"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>{saving?"Saving...":"Log Lift"}</button>
      </div>) : (<div>
        <div style={{ marginBottom:14 }}><label style={LS}>Activity</label><select value={cardioEx} onChange={e=>setCardioEx(e.target.value)} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{CARDIO.map(c=><option key={c}>{c}</option>)}</select></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          <div style={{ marginBottom:14 }}><label style={LS}>Duration (min)</label><input type="number" placeholder="30" value={duration} onChange={e=>setDuration(e.target.value)} style={IS}/></div>
          <div style={{ marginBottom:14 }}><label style={LS}>Distance (mi)</label><input type="number" placeholder="3.1" value={distance} onChange={e=>setDistance(e.target.value)} style={IS}/></div>
        </div>
        <button onClick={saveCardio} disabled={saving} style={{ width:"100%", height:44, background:saving?"#111114":T, color:saving?"#3f3f46":"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:saving?"default":"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>{saving?"Saving...":"Log Cardio"}</button>
      </div>)}
      {prs.length > 0 && (<div style={{ marginTop:28 }}><SL>Personal Records</SL><div className="c" style={{ padding:16 }}>
        {prs.map(pr => (
          <div key={pr.exercise} style={{ padding:"10px 0", borderBottom:"1px solid #141416" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#a1a1aa" }}>{pr.exercise}</span>
              <span style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{Math.round(pr.estimated_1rm)} lbs</span>
            </div>
            <div style={{ fontSize:9, color:"#3f3f46", marginTop:4 }}>{fmtDate(pr.date)}{pr.active_compounds?.length > 0 && ` · On: ${pr.active_compounds.slice(0,3).join(", ")}`}</div>
          </div>
        ))}
      </div></div>)}
    </div>
  );
}

function StackCompoundCard({ c, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ dose: c.dose, unit: c.unit || "", freq: c.freq || "" });

  const FREQ_OPTIONS = ["daily", "EOD", "E3D", "twice weekly", "weekly", "twice daily", "as needed"];

  const openEdit = () => {
    setForm({ dose: c.dose, unit: c.unit || "", freq: c.freq || "" });
    setErr(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!form.dose || !form.unit || !form.freq) return;
    setSaving(true);
    setErr(null);
    try {
      await onUpdate(c.id, { dose: parseFloat(form.dose), unit: form.unit, frequency: form.freq });
      setEditing(false);
    } catch {
      setErr("Save failed — try again");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => { setEditing(false); setErr(null); };

  return (
    <div className="c" style={{ padding:"16px 18px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: editing ? 16 : 14 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:c.status==="active"?T:"#27272a" }}/>
        <span style={{ flex:1, fontSize:14, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{c.name}</span>
        <span style={{ fontSize:9, padding:"2px 8px", background:c.status==="active"?"rgba(45,212,191,0.06)":"#111114", color:c.status==="active"?T:"#3f3f46", border:`1px solid ${c.status==="active"?"rgba(45,212,191,0.1)":"#1e1e22"}`, textTransform:"uppercase", fontWeight:600 }}>{c.status}</span>
      </div>

      {editing ? (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 10px", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:9, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>Dose</div>
              <input
                type="number"
                value={form.dose}
                onChange={e => setForm(p => ({ ...p, dose: e.target.value }))}
                style={{ width:"100%", height:36, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(45,212,191,0.2)", padding:"0 10px", color:"#e4e4e7", fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}
              />
            </div>
            <div>
              <div style={{ fontSize:9, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>Unit</div>
              <input
                type="text"
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                placeholder="mg, mcg, IU…"
                style={{ width:"100%", height:36, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(45,212,191,0.2)", padding:"0 10px", color:"#e4e4e7", fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}
              />
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>Frequency</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:6 }}>
              {FREQ_OPTIONS.map(fo => (
                <button key={fo} onClick={() => setForm(p => ({ ...p, freq: fo }))} style={{ padding:"5px 9px", fontSize:10, border:`1px solid ${form.freq===fo?"rgba(45,212,191,0.3)":"#1e1e22"}`, background:form.freq===fo?"rgba(45,212,191,0.06)":"transparent", color:form.freq===fo?T:"#52525b", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>{fo}</button>
              ))}
            </div>
            <input
              type="text"
              value={form.freq}
              onChange={e => setForm(p => ({ ...p, freq: e.target.value }))}
              placeholder="or type custom…"
              style={{ width:"100%", height:34, background:"rgba(255,255,255,0.02)", border:"1px solid #1e1e22", padding:"0 10px", color:"#e4e4e7", fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}
            />
          </div>
          {err && <p style={{ fontSize:10, color:"#f87171", margin:"0 0 8px" }}>{err}</p>}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={cancelEdit} style={{ flex:1, height:34, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Cancel</button>
            <button onClick={saveEdit} disabled={saving || !form.dose || !form.unit || !form.freq} style={{ flex:2, height:34, background:saving?"#111114":T, color:saving?"#3f3f46":"#000", border:"none", fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:saving?"default":"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
            {[{l:"Dose",v:`${c.dose} ${c.unit}`},{l:"Freq",v:c.freq},{l:"Category",v:c.category}].map((d,i)=>(<div key={i}><div style={{ fontSize:9, color:"#27272a", textTransform:"uppercase", letterSpacing:"0.1em" }}>{d.l}</div><div style={{ fontSize:13, fontWeight:600, color:"#52525b", marginTop:3 }}>{d.v}</div></div>))}
          </div>
          <div style={{ display:"flex", gap:6, paddingTop:12, borderTop:"1px solid #141416" }}>
            <button onClick={openEdit} style={{ flex:2, height:34, background:"transparent", border:"1px solid rgba(45,212,191,0.15)", color:T, fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Edit</button>
            <button onClick={()=>onUpdate(c.id,{status:c.status==="active"?"off":"active"})} style={{ flex:2, height:34, background:"transparent", border:"1px solid #1e1e22", color:"#3f3f46", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>{c.status==="active"?"Pause":"Activate"}</button>
            <button onClick={()=>onDelete(c.id)} style={{ flex:1, height:34, background:"transparent", border:"1px solid #7f1d1d", color:"#ef4444", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>✕</button>
          </div>
        </>
      )}
    </div>
  );
}

function StackView({ compounds, onAdd, onUpdate, onDelete }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div><h1 style={HS}>Stack</h1><p style={{ fontSize:11, color:"#3f3f46", marginTop:4 }}>{compounds.length} compounds</p></div>
        <button onClick={onAdd} style={{ height:36, padding:"0 16px", background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}>+ Add</button>
      </div>
      {compounds.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:"#27272a", fontSize:12 }}>No compounds yet.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {compounds.map(c => <StackCompoundCard key={c.id} c={c} onUpdate={onUpdate} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}

function HistoryView({ logs, compounds, onDelete }) {
  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>History</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>{logs.length} entries</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {logs.map(log => (
          <div key={log.id} className="c" style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{log.date}</span>
              <button onClick={()=>onDelete(log.id)} style={{ fontSize:10, color:"#27272a", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>delete</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 16px", marginBottom:12, fontSize:11 }}>
              {log.weight > 0 && <span style={{color:"#3f3f46"}}>Weight <span style={{color:"#71717a",fontWeight:600}}>{log.weight}lbs</span></span>}
              {log.sleep > 0 && <span style={{color:"#3f3f46"}}>Sleep <span style={{color:"#71717a",fontWeight:600}}>{log.sleep}</span></span>}
              {log.mood && <span style={{color:"#3f3f46"}}>Mood <span style={{color:"#71717a",fontWeight:600}}>{log.mood}/10</span></span>}
            </div>
            {log.sideEffects && <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:log.physique?10:0 }}>{log.sideEffects.split(",").map((s,i)=><span key={i} style={{ fontSize:9, padding:"3px 8px", background:"rgba(239,68,68,0.06)", color:"#f87171", border:"1px solid rgba(239,68,68,0.1)", fontWeight:600, textTransform:"uppercase" }}>{s.trim()}</span>)}</div>}
            {log.physique && <p style={{ fontSize:11, padding:"10px 12px", background:"rgba(45,212,191,0.03)", color:T, border:"1px solid rgba(45,212,191,0.08)", lineHeight:1.7, margin:0 }}>{log.physique}</p>}
          </div>
        ))}
        {!logs.length && <div style={{ textAlign:"center", padding:60, color:"#27272a", fontSize:12 }}>No logs yet.</div>}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <SignedIn>
        <FlourishApp />
      </SignedIn>
      <SignedOut>
        <div style={{ minHeight:"100vh", background:"#000", color:"#e4e4e7", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono',monospace", gap:20, padding:24 }}>
          <svg width="32" height="46" viewBox="0 0 24 34" fill="none"><rect x="6" y="1" width="12" height="5" rx="1" fill={T}/><path d="M7 6V9H17V6" stroke={T} strokeWidth="1.5" fill="none"/><path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke={T} strokeWidth="1.5" fill="none"/><path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill={T}/></svg>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", marginBottom:4 }}><b>flour</b><span style={{ fontWeight:300 }}>ish</span></div>
            <div style={{ fontSize:12, color:"#52525b" }}>Performance OS</div>
          </div>
          <SignInButton mode="modal">
            <button style={{ height:44, padding:"0 32px", background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>
    </>
  );
}
