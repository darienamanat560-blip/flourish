"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const T = "#2dd4bf";
const CDB = [
  { name:"BPC-157", unit:"mcg", cat:"recovery", dose:250, freq:"daily", desc:"Accelerates healing of tendons, ligaments, muscle, and gut. Strong anti-inflammatory.", stacks:["TB-500","GHK-Cu","HGH"] },
  { name:"TB-500", unit:"mcg", cat:"recovery", dose:2500, freq:"2x/week", desc:"Tissue repair, inflammation reduction, new blood vessel formation.", stacks:["BPC-157","GHK-Cu","HGH"] },
  { name:"GHK-Cu", unit:"mcg", cat:"recovery", dose:200, freq:"daily", desc:"Copper peptide for collagen, skin remodeling, wound healing, hair growth.", stacks:["BPC-157","TB-500","HGH"] },
  { name:"HGH", unit:"IU", cat:"growth", dose:4, freq:"daily", desc:"Fat loss, muscle growth, recovery, cellular regeneration, sleep quality.", stacks:["Testosterone","Retatrutide","Anavar"] },
  { name:"CJC-1295/Ipamorelin", unit:"mcg", cat:"growth", dose:300, freq:"daily", desc:"GH releasing blend for natural pulsatile release. Improves sleep and recovery.", stacks:["HGH","MK-677"] },
  { name:"Ipamorelin", unit:"mcg", cat:"growth", dose:200, freq:"daily", desc:"Selective GH secretagogue without cortisol or prolactin spikes.", stacks:["CJC-1295/Ipamorelin","HGH"] },
  { name:"MK-677", unit:"mg", cat:"growth", dose:25, freq:"daily", desc:"Oral GH secretagogue. Increases GH/IGF-1, appetite, sleep quality.", stacks:["HGH","Testosterone","RAD-140"] },
  { name:"Retatrutide", unit:"mg", cat:"metabolic", dose:2, freq:"weekly", desc:"Triple agonist (GLP-1/GIP/Glucagon). Potent fat loss and appetite suppression.", stacks:["HGH","Injectable L-Carnitine","BPC-157"] },
  { name:"Semaglutide", unit:"mg", cat:"metabolic", dose:0.5, freq:"weekly", desc:"GLP-1 agonist for appetite suppression and significant fat loss.", stacks:["HGH","Injectable L-Carnitine"] },
  { name:"Tirzepatide", unit:"mg", cat:"metabolic", dose:5, freq:"weekly", desc:"Dual GIP/GLP-1 agonist. More potent than semaglutide.", stacks:["HGH","Injectable L-Carnitine"] },
  { name:"Injectable L-Carnitine", unit:"mg", cat:"metabolic", dose:500, freq:"daily", desc:"Enhances fat oxidation and androgen receptor density.", stacks:["Retatrutide","HGH","Testosterone"] },
  { name:"Testosterone", unit:"mg", cat:"anabolic", dose:200, freq:"weekly", desc:"Base androgen for hormonal optimization. Muscle, mood, libido, recovery.", stacks:["HCG","Aromasin","Anavar","HGH"] },
  { name:"Testosterone Cypionate", unit:"mg", cat:"anabolic", dose:200, freq:"weekly", desc:"Long-ester testosterone. Foundation for TRT. 8-day half-life.", stacks:["HCG","Aromasin","Anavar"] },
  { name:"Nandrolone (Deca)", unit:"mg", cat:"anabolic", dose:200, freq:"weekly", desc:"19-nor for joint health, lean mass, collagen synthesis.", stacks:["Testosterone","HCG"] },
  { name:"Anavar", unit:"mg", cat:"anabolic", dose:20, freq:"daily", desc:"Mild oral for lean tissue, strength, recovery. Low androgenic.", stacks:["Testosterone","HCG","HGH"] },
  { name:"Primobolan", unit:"mg", cat:"anabolic", dose:200, freq:"weekly", desc:"Mild DHT-derivative. No aromatization. Lean mass and cutting.", stacks:["Testosterone","HGH"] },
  { name:"Trenbolone", unit:"mg", cat:"anabolic", dose:200, freq:"weekly", desc:"Potent 19-nor. Extreme hardening and fat loss. Advanced only.", stacks:["Testosterone","HCG"] },
  { name:"Winstrol", unit:"mg", cat:"anabolic", dose:25, freq:"daily", desc:"DHT oral for strength, vascularity, lean mass.", stacks:["Testosterone","Anavar"] },
  { name:"Dianabol", unit:"mg", cat:"anabolic", dose:30, freq:"daily", desc:"Classic mass-builder with water retention.", stacks:["Testosterone","Aromasin"] },
  { name:"HCG", unit:"IU", cat:"ancillary", dose:500, freq:"EOD", desc:"Maintains testicular function during TRT/cycles.", stacks:["Testosterone","Aromasin"] },
  { name:"Aromasin", unit:"mg", cat:"ancillary", dose:12.5, freq:"EOD", desc:"Suicidal aromatase inhibitor for estrogen management.", stacks:["Testosterone","HCG"] },
  { name:"Arimidex", unit:"mg", cat:"ancillary", dose:0.5, freq:"EOD", desc:"Reversible aromatase inhibitor.", stacks:["Testosterone","HCG"] },
  { name:"Nolvadex", unit:"mg", cat:"ancillary", dose:20, freq:"daily", desc:"SERM for gyno prevention and PCT.", stacks:["Clomid","HCG"] },
  { name:"Clomid", unit:"mg", cat:"ancillary", dose:25, freq:"daily", desc:"PCT SERM to restart natural testosterone.", stacks:["Nolvadex","HCG"] },
  { name:"Enclomiphene", unit:"mg", cat:"ancillary", dose:12.5, freq:"daily", desc:"Restores testosterone without estrogenic side effects.", stacks:["HCG"] },
  { name:"RAD-140", unit:"mg", cat:"SARM", dose:10, freq:"daily", desc:"SARM targeting muscle and bone tissue.", stacks:["Testosterone","MK-677"] },
  { name:"LGD-4033", unit:"mg", cat:"SARM", dose:10, freq:"daily", desc:"Potent SARM for lean mass. Suppressive.", stacks:["MK-677","Enclomiphene"] },
  { name:"Ostarine", unit:"mg", cat:"SARM", dose:20, freq:"daily", desc:"Mildest SARM for recomp and joints.", stacks:["MK-677","Cardarine"] },
  { name:"Cardarine", unit:"mg", cat:"SARM", dose:10, freq:"daily", desc:"PPARδ agonist for endurance and fat oxidation.", stacks:["Ostarine","Injectable L-Carnitine"] },
  { name:"Selank", unit:"mcg", cat:"nootropic", dose:300, freq:"daily", desc:"Anxiolytic peptide without sedation.", stacks:["Semax","9-MeBC"] },
  { name:"Semax", unit:"mcg", cat:"nootropic", dose:600, freq:"daily", desc:"Enhances focus, memory, neuroplasticity.", stacks:["Selank","9-MeBC"] },
  { name:"9-MeBC", unit:"mg", cat:"nootropic", dose:15, freq:"daily", desc:"Dopaminergic nootropic for neurogenesis.", stacks:["Adderall","Semax"] },
  { name:"Adderall", unit:"mg", cat:"nootropic", dose:20, freq:"daily", desc:"Prescription stimulant for focus and attention.", stacks:["9-MeBC","Selank"] },
  { name:"NAD+", unit:"mg", cat:"longevity", dose:100, freq:"daily", desc:"Coenzyme for cellular energy and DNA repair.", stacks:["Epitalon","DHEA"] },
  { name:"Epitalon", unit:"mg", cat:"longevity", dose:5, freq:"daily", desc:"Telomerase activator for telomere elongation.", stacks:["NAD+","DHEA"] },
  { name:"DHEA", unit:"mg", cat:"longevity", dose:50, freq:"daily", desc:"Precursor hormone for test/estrogen balance.", stacks:["NAD+","Testosterone"] },
  { name:"T3 (Cytomel)", unit:"mcg", cat:"metabolic", dose:25, freq:"daily", desc:"Active thyroid hormone for metabolism.", stacks:["HGH","T4"] },
  { name:"Clenbuterol", unit:"mcg", cat:"metabolic", dose:40, freq:"daily", desc:"Beta-2 agonist with thermogenic properties.", stacks:["T3 (Cytomel)","Injectable L-Carnitine"] },
];

const CATS = ["growth","metabolic","recovery","anabolic","ancillary","SARM","nootropic","longevity","other"];
const FREQS = ["daily","EOD","E3D","2x/week","3x/week","weekly","biweekly","as needed"];
const GOALS = ["Body recomposition","Fat loss","Lean mass gain","Strength","Recovery & healing","Cognitive enhancement","Longevity","Hormone optimization"];
const LIFTS = ["Bench Press","Squat","Deadlift","Overhead Press","Barbell Row","Front Squat","Romanian Deadlift","Incline Bench"];
const CARDIO = ["Running","Cycling","Rowing","Swimming","Stairmaster"];

function gid() { return "x" + Math.random().toString(36).slice(2, 9); }
function td() { return new Date().toISOString().split("T")[0]; }
function daw(c, w) { if (!c.titration?.length) return c.dose; let d = c.titration[0].dose; for (const t of c.titration) { if (t.week <= w) d = t.dose; } return d; }
function fmtDate(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" }); }


const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };
const IS = { width:"100%", height:42, background:"rgba(255,255,255,0.02)", border:"1px solid #1e1e22", padding:"0 14px", color:"#e4e4e7", fontSize:13, fontFamily:"'JetBrains Mono',monospace", transition:"border-color .2s" };
const HS = { fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:0, letterSpacing:"-0.02em" };

function Sp({ data, h = 28 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1, W = 200;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width:"100%", height:h, overflow:"visible" }}>
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

function Mod({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }} />
      <div style={{ position:"relative", width:"100%", maxWidth:520, maxHeight:"85vh", overflowY:"auto", background:"#0a0a0c", borderTop:"1px solid #1e1e22", animation:"slideUp .25s ease-out" }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:3, background:"#27272a", borderRadius:2, margin:"10px auto 0" }} />
        <div style={{ position:"sticky", top:0, background:"#0a0a0c", borderBottom:"1px solid #141416", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:1 }}>
          <span style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ width:28, height:28, background:"#141416", border:"1px solid #1e1e22", color:"#52525b", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>&times;</button>
        </div>
        <div style={{ padding:"20px 20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function AC({ value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState([]);
  const ref = useRef(null);
  useEffect(() => { if (value.length > 0) { setRes(CDB.filter(c => c.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8)); setOpen(true); } else { setOpen(false); setRes([]); } }, [value]);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div ref={ref} style={{ position:"relative", marginBottom:14 }}>
      <label style={LS}>Compound Name</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} onFocus={() => { if (res.length) setOpen(true); }} placeholder="Start typing..." style={IS} onFocus={e => e.target.style.borderColor = T} onBlur={e => { setTimeout(() => e.target.style.borderColor = "#1e1e22", 200); }} />
      {open && res.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200, marginTop:2, background:"#0a0a0c", border:"1px solid #1e1e22", maxHeight:260, overflowY:"auto", boxShadow:"0 16px 48px rgba(0,0,0,0.8)" }}>
          {res.map((r, i) => (
            <button key={i} onClick={() => { onSelect(r); setOpen(false); }} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", background:"transparent", border:"none", borderBottom:"1px solid #141416", cursor:"pointer", color:"#a1a1aa", textAlign:"left", fontFamily:"'JetBrains Mono',monospace" }}
              onMouseEnter={e => e.currentTarget.style.background = "#141416"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div><div style={{ fontSize:13, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{r.name}</div><div style={{ fontSize:10, color:"#3f3f46", marginTop:2 }}>{r.dose} {r.unit} · {r.freq}</div></div>
              <span style={{ fontSize:9, padding:"2px 8px", background:"rgba(45,212,191,0.06)", color:T, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, border:"1px solid rgba(45,212,191,0.1)" }}>{r.cat}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════
// ONBOARDING (fixed timeout)
// ══════════════════════════════
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ name:"", experience:"", age:"", weight:"", goals:[], priorCycles:"", health:"" });
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState(null);

  const fallback = () => {
    const b = p.experience === "beginner";
    const fat = p.goals.some(g => g.includes("Fat") || g.includes("recomp"));
    const mass = p.goals.some(g => g.includes("mass") || g.includes("Strength"));
    let c = [{ name:"Testosterone", dose:b?150:200, unit:"mg", freq:"weekly", cat:"anabolic", reason:"Foundation" }, { name:"HCG", dose:500, unit:"IU", freq:"EOD", cat:"ancillary", reason:"Fertility support" }, { name:"Aromasin", dose:12.5, unit:"mg", freq:"EOD", cat:"ancillary", reason:"Estrogen management" }];
    if (fat) c.push({ name:"Retatrutide", dose:b?1:2, unit:"mg", freq:"weekly", cat:"metabolic", reason:"Fat loss" });
    if (mass) c.push({ name:"Anavar", dose:b?10:20, unit:"mg", freq:"daily", cat:"anabolic", reason:"Lean mass" });
    c.push({ name:"HGH", dose:b?3:5, unit:"IU", freq:"daily", cat:"growth", reason:"Body comp & recovery" });
    return { cycleName: fat?"Recomp Protocol":"Optimization Protocol", compounds:c.slice(0,6), summary:`${p.experience} protocol targeting ${p.goals.slice(0,2).join(" and ").toLowerCase()}.` };
  };

  const generate = async () => {
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"Content-Type":"application/json"}, signal:ctrl.signal, body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800, messages:[{role:"user",content:`Protocol advisor. ${p.experience}, ${p.age}y, ${p.weight}lbs, goals:${p.goals.join(",")}. JSON only: {"cycleName":"","compounds":[{"name":"","dose":0,"unit":"","freq":"","cat":"","reason":""}],"summary":""}`}] }) });
      clearTimeout(timer);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setRec(JSON.parse((d.content||[]).map(i=>i.text||"").join("").replace(/```json|```/g,"").trim()));
    } catch { clearTimeout(timer); setRec(fallback()); }
    setLoading(false);
  };

  const finish = () => {
    onComplete({ profile:p, cycle:{ id:gid(), name:rec?.cycleName||"My Cycle", goals:p.goals, startDate:td(), weeks:12,
      compounds:(rec?.compounds||[]).map(c=>({id:gid(),name:c.name,dose:c.dose,unit:c.unit,freq:c.freq,status:"active",category:c.cat,titration:[{week:1,dose:c.dose}]})), logs:[], training:[] }});
  };

  const titles = ["Welcome to Flourish.","About You","Your Goals","Health & History","Your Protocol"];
  const subs = ["Let's personalize your experience.","Stats for tailored recommendations.","What are you optimizing for?","For safe recommendations.","Built for you."];

  return (
    <div style={{ minHeight:"100vh", background:"#000", color:"#e4e4e7", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", justifyContent:"center" }}>
      
      <div style={{ width:"100%", maxWidth:480, padding:"40px 24px" }}>
        <div style={{ display:"flex", gap:4, marginBottom:32 }}>{titles.map((_,i) => <div key={i} style={{ flex:1, height:2, background:i<=step?T:"#1e1e22", borderRadius:1, transition:"background .3s" }} />)}</div>
        <h1 style={{ fontSize:24, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:"0 0 4px" }}>{titles[step]}</h1>
        <p style={{ fontSize:12, color:"#3f3f46", marginBottom:28 }}>{subs[step]}</p>

        {step === 0 && (<div>
          <div className="c" style={{ padding:20, marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <svg width="16" height="22" viewBox="0 0 24 34" fill="none"><rect x="6" y="1" width="12" height="5" rx="1" fill={T}/><path d="M7 6V9H17V6" stroke={T} strokeWidth="1.5" fill="none"/><path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke={T} strokeWidth="1.5" fill="none"/><path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill={T}/></svg>
              <span style={{ fontSize:16, fontFamily:"'Inter',sans-serif", color:"#fff" }}><b>flour</b><span style={{ fontWeight:300 }}>ish</span></span>
            </div>
            <p style={{ fontSize:12, color:"#52525b", lineHeight:1.7, margin:0 }}>Personalized compound protocols, training tracking, and AI-powered insights.</p>
          </div>
          <div style={{ marginBottom:14 }}><label style={LS}>Your name</label><input placeholder="Name" value={p.name} onChange={e=>setP(x=>({...x,name:e.target.value}))} style={IS} onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
          <button onClick={()=>setStep(1)} disabled={!p.name} style={{ width:"100%", height:44, background:p.name?T:"#111114", color:p.name?"#000":"#3f3f46", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:p.name?"pointer":"default", letterSpacing:"0.08em", textTransform:"uppercase" }}>Get Started</button>
        </div>)}

        {step === 1 && (<div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            {[["Age","age","28","number"],["Weight (lbs)","weight","175","number"]].map(([l,k,ph,t])=>(<div key={k} style={{marginBottom:14}}><label style={LS}>{l}</label><input type={t} placeholder={ph} value={p[k]} onChange={e=>setP(x=>({...x,[k]:e.target.value}))} style={IS} onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>))}
          </div>
          <label style={LS}>Experience</label>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {["beginner","intermediate","advanced"].map(lv=>(<button key={lv} onClick={()=>setP(x=>({...x,experience:lv}))} style={{ flex:1, padding:"11px 0", border:`1px solid ${p.experience===lv?"rgba(45,212,191,0.3)":"#1e1e22"}`, background:p.experience===lv?"rgba(45,212,191,0.04)":"transparent", color:p.experience===lv?T:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"capitalize" }}>{lv}</button>))}
          </div>
          <div style={{ display:"flex", gap:8 }}><button onClick={()=>setStep(0)} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Back</button><button onClick={()=>setStep(2)} disabled={!p.experience} style={{ flex:2, height:44, background:p.experience?T:"#111114", color:p.experience?"#000":"#3f3f46", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:p.experience?"pointer":"default", textTransform:"uppercase", letterSpacing:"0.08em" }}>Continue</button></div>
        </div>)}

        {step === 2 && (<div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
            {GOALS.map(g=>{const s=p.goals.includes(g);return(<button key={g} onClick={()=>setP(x=>({...x,goals:s?x.goals.filter(v=>v!==g):[...x.goals,g]}))} style={{ padding:"13px 16px", border:`1px solid ${s?"rgba(45,212,191,0.3)":"#1e1e22"}`, background:s?"rgba(45,212,191,0.04)":"transparent", color:s?"#fff":"#52525b", fontSize:12, fontFamily:"'Inter',sans-serif", cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>{g}{s&&<svg width="14" height="14" viewBox="0 0 20 20" fill={T}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</button>);})}
          </div>
          <div style={{ display:"flex", gap:8 }}><button onClick={()=>setStep(1)} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Back</button><button onClick={()=>setStep(3)} disabled={!p.goals.length} style={{ flex:2, height:44, background:p.goals.length?T:"#111114", color:p.goals.length?"#000":"#3f3f46", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:p.goals.length?"pointer":"default", textTransform:"uppercase", letterSpacing:"0.08em" }}>Continue</button></div>
        </div>)}

        {step === 3 && (<div>
          <div style={{ marginBottom:14 }}><label style={LS}>Prior Cycles & Health Notes</label><textarea placeholder="Past cycles, health conditions, sensitivities..." value={p.health} onChange={e=>setP(x=>({...x,health:e.target.value}))} style={{...IS,height:"auto",minHeight:80,padding:"10px 14px",resize:"vertical"}} onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
          <div style={{ display:"flex", gap:8 }}><button onClick={()=>setStep(2)} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Back</button><button onClick={()=>{setStep(4);generate()}} style={{ flex:2, height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em" }}>Generate Protocol</button></div>
        </div>)}

        {step === 4 && (<div>
          {loading ? (<div style={{ textAlign:"center", padding:40 }}><div style={{ width:28, height:28, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 16px", animation:"spin .7s linear infinite" }}/><p style={{ fontSize:12, color:"#3f3f46" }}>Building your protocol...</p></div>
          ) : rec ? (<div style={{ animation:"fadeIn .3s ease" }}>
            <div className="c" style={{ padding:18, marginBottom:20, borderColor:"rgba(45,212,191,0.15)" }}>
              <div style={{ fontSize:9, color:T, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>Recommended Cycle</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{rec.cycleName}</div>
              <p style={{ fontSize:11, color:"#52525b", marginTop:6, lineHeight:1.6 }}>{rec.summary}</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
              {rec.compounds.map((c,i)=>(<div key={i} className="c" style={{ padding:"13px 16px" }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:13, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{c.name}</span><span style={{ fontSize:10, color:"#3f3f46" }}>{c.dose} {c.unit} · {c.freq}</span></div>{c.reason&&<p style={{ fontSize:10, color:"#3f3f46", margin:0 }}>{c.reason}</p>}</div>))}
            </div>
            <button onClick={finish} style={{ width:"100%", height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Start This Protocol</button>
            <button onClick={()=>{setStep(3);setRec(null)}} style={{ width:"100%", height:36, background:"transparent", border:"1px solid #1e1e22", color:"#3f3f46", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", marginTop:8 }}>Adjust & Regenerate</button>
          </div>) : null}
        </div>)}
      </div>
    </div>
  );
}

// ══════════════════════════════
// DEFAULT DATA
// ══════════════════════════════
const DEF = {
  id:"cycle1", name:"Summer Cut", goals:["Body recomposition","Fat loss"], startDate:"2025-06-01", weeks:12,
  compounds:[
    {id:"c1",name:"HGH",dose:6,unit:"IU",freq:"daily",status:"active",category:"growth",titration:[{week:1,dose:2},{week:2,dose:4},{week:3,dose:5},{week:4,dose:6}]},
    {id:"c2",name:"Retatrutide",dose:2,unit:"mg",freq:"weekly",status:"active",category:"metabolic",titration:[{week:1,dose:0.25},{week:2,dose:0.5},{week:3,dose:1},{week:4,dose:2}]},
    {id:"c3",name:"HCG",dose:500,unit:"IU",freq:"EOD",status:"active",category:"ancillary",titration:[{week:1,dose:500}]},
    {id:"c4",name:"Anavar",dose:20,unit:"mg",freq:"daily",status:"active",category:"anabolic",titration:[{week:1,dose:10},{week:3,dose:20}]},
    {id:"c5",name:"Testosterone",dose:200,unit:"mg",freq:"weekly",status:"active",category:"anabolic",titration:[{week:1,dose:100},{week:6,dose:200}]},
    {id:"c6",name:"Aromasin",dose:25,unit:"mg",freq:"EOD",status:"active",category:"ancillary",titration:[{week:1,dose:25}]},
  ],
  logs:[
    {id:"l1",date:"2025-07-01",weight:158,sleep:80,hrv:64,mood:7,stress:2,appetite:5,physique:"Getting leaner. Shoulders more defined.",sideEffects:"Acne",doses:{c1:6,c2:2,c3:500,c4:20,c5:200,c6:25}},
    {id:"l2",date:"2025-06-28",weight:157,sleep:92,hrv:64,mood:8,stress:4,appetite:5,physique:"Shoulders growing, leaner.",sideEffects:"Potential T3 suppression, Acne from DHT",doses:{c1:5,c2:2,c3:450,c4:20,c5:100,c6:25}},
    {id:"l3",date:"2025-06-25",weight:164,sleep:83,hrv:58,mood:7,stress:8,appetite:5,physique:"Leaner, composition better.",sideEffects:"Lethargy",doses:{c1:6,c2:2,c3:500,c4:20,c5:100,c6:25}},
  ],
  training:[
    {id:"t1",date:"2025-07-01",type:"lift",exercise:"Bench Press",sets:[{reps:8,weight:185},{reps:6,weight:195},{reps:5,weight:205}]},
    {id:"t2",date:"2025-06-28",type:"lift",exercise:"Squat",sets:[{reps:5,weight:275},{reps:5,weight:285},{reps:3,weight:295}]},
    {id:"t3",date:"2025-06-25",type:"lift",exercise:"Bench Press",sets:[{reps:8,weight:175},{reps:6,weight:185},{reps:5,weight:195}]},
    {id:"t4",date:"2025-06-30",type:"cardio",exercise:"Running",duration:25,distance:3.1,notes:"Easy pace"},
  ]
};

// ══════════════════════════════
// MAIN APP
// ══════════════════════════════
export default function Flourish() {
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [cycles, setCycles] = useState([DEF]);
  const [activeId, setActiveId] = useState("cycle1");
  const [tab, setTab] = useState("home");
  const [tr, setTr] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSv, setAddSv] = useState("");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [logDoseModal, setLogDoseModal] = useState(null);
  const [todayDoses, setTodayDoses] = useState({});
  const [trainModal, setTrainModal] = useState(false);

  const cy = cycles.find(c => c.id === activeId) || cycles[0];
  const comps = cy?.compounds || [];
  const logs = cy?.logs || [];
  const training = cy?.training || [];
  const active = comps.filter(c => c.status === "active");
  const latest = logs[0];

  const setComps = fn => setCycles(p => p.map(c => c.id === activeId ? { ...c, compounds: typeof fn === "function" ? fn(c.compounds) : fn } : c));
  const setLogs = fn => setCycles(p => p.map(c => c.id === activeId ? { ...c, logs: typeof fn === "function" ? fn(c.logs) : fn } : c));
  const setTraining = fn => setCycles(p => p.map(c => c.id === activeId ? { ...c, training: typeof fn === "function" ? fn(c.training || []) : fn } : c));

  const sw = t => { setDetailId(null); setTr(true); setTimeout(() => { setTab(t); setTimeout(() => setTr(false), 40); }, 150); };
  const addLog = useCallback(entry => { setLogs(p => [entry, ...p]); sw("history"); }, [activeId]);
  const deleteLog = useCallback(id => { setLogs(p => p.filter(l => l.id !== id)); }, [activeId]);

  const quickAdd = (db) => { setComps(p => [...p, { id:gid(), name:db.name, dose:db.dose, unit:db.unit, freq:db.freq, status:"active", category:db.cat, titration:[{week:1,dose:db.dose}] }]); setAddOpen(false); setAddSv(""); };
  const quickDose = (compId, dose) => { setTodayDoses(p => ({ ...p, [compId]: dose })); setLogDoseModal(null); };
  const newCycle = () => { const c = { id:gid(), name:"New Cycle", goals:[], startDate:td(), weeks:12, compounds:[], logs:[], training:[] }; setCycles(p => [...p, c]); setActiveId(c.id); };

  // AI Insights
  const getInsights = async () => {
    setInsightsLoading(true); setInsightsOpen(true);
    const ctx = `Cycle:${cy.name}, Goals:${cy.goals.join(",")}, Active compounds:${active.map(c=>`${c.name} ${c.dose}${c.unit} ${c.freq}`).join("; ")}, Latest metrics: weight=${latest?.weight||"?"}, sleep=${latest?.sleep||"?"}, mood=${latest?.mood||"?"}, Recent sides:${logs.slice(0,3).map(l=>l.sideEffects).filter(Boolean).join("; ")}, Training PRs:${training.filter(t=>t.type==="lift").slice(0,3).map(t=>`${t.exercise} ${Math.max(...(t.sets||[]).map(s=>s.weight))}lbs`).join(", ")}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"Content-Type":"application/json"}, signal:ctrl.signal, body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:600, messages:[{role:"user",content:`Fitness protocol advisor. Analyze and give insights. Be concise, use sections. ${ctx}`}] }) });
      clearTimeout(timer);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setInsightsData((d.content||[]).map(i=>i.text||"").join(""));
    } catch {
      clearTimeout(timer);
      // Pre-built insights
      const weightTrend = logs.length >= 2 ? (logs[0].weight - logs[logs.length-1].weight) : 0;
      const avgMood = logs.length ? (logs.reduce((s,l) => s + (l.mood||0), 0) / logs.length).toFixed(1) : "?";
      const liftPRs = training.filter(t => t.type === "lift");
      const benchPR = liftPRs.filter(t => t.exercise === "Bench Press").map(t => Math.max(...t.sets.map(s => s.weight))).sort((a,b) => b-a)[0];
      let txt = `**Progress Summary**\n\nWeight trend: ${weightTrend > 0 ? "+" : ""}${weightTrend} lbs over ${logs.length} entries. Average mood: ${avgMood}/10.\n\n`;
      txt += `**Stack Analysis**\n\n${active.length} active compounds. `;
      if (active.some(c => c.category === "anabolic")) txt += "Anabolic base is established. ";
      if (active.some(c => c.category === "metabolic")) txt += "Metabolic support in place for fat loss. ";
      const sides = [...new Set(logs.flatMap(l => (l.sideEffects||"").split(",").map(s=>s.trim()).filter(Boolean)))];
      if (sides.length) txt += `\n\n**Side Effects to Watch**\n\n${sides.join(", ")}. Consider reviewing estrogen management if acne persists.`;
      if (benchPR) txt += `\n\n**Strength**\n\nBench PR: ${benchPR}lbs. Track weekly to correlate with compound changes.`;
      txt += `\n\n**Recommendation**\n\nStay consistent with logging. Your ${cy.goals[0]?.toLowerCase() || "optimization"} goals are on track based on current metrics.`;
      setInsightsData(txt);
    }
    setInsightsLoading(false);
  };

  const TABS = [
    { id:"home", label:"Home", d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" },
    { id:"log", label:"Log", d:"M12 4v16m8-8H4" },
    { id:"train", label:"Train", d:"M13 10V3L4 14h7v7l9-11h-7z" },
    { id:"stack", label:"Stack", d:"M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
    { id:"history", label:"History", d:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  if (!onboarded) return (<div><Onboarding onComplete={({profile:pr,cycle:c})=>{setProfile(pr);setCycles(p=>[...p,c]);setActiveId(c.id);setOnboarded(true)}}/><button onClick={()=>setOnboarded(true)} style={{position:"fixed",bottom:20,right:20,fontSize:10,color:"#1e1e22",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>Skip →</button></div>);

  // ── COMPOUND DETAIL PAGE ──
  if (detailId) {
    const comp = comps.find(c => c.id === detailId);
    if (!comp) { setDetailId(null); return null; }
    const db = CDB.find(c => c.name === comp.name);
    const used = logs.filter(l => l.doses?.[comp.id]);
    const total = used.reduce((s, l) => s + (Number(l.doses[comp.id]) || 0), 0);
    const sides = [...new Set(used.flatMap(l => (l.sideEffects||"").split(",").map(s=>s.trim()).filter(Boolean)))];
    // Strength correlation
    const liftsBefore = training.filter(t => t.type === "lift" && t.date < (cy.startDate || "2025-01-01"));
    const liftsAfter = training.filter(t => t.type === "lift" && t.date >= (cy.startDate || "2025-01-01"));
    const getPR = (arr, ex) => { const s = arr.filter(t => t.exercise === ex); if (!s.length) return 0; return Math.max(...s.flatMap(t => t.sets.map(s => s.weight))); };

    return (
      <div style={{ minHeight:"100vh", background:"#000", color:"#e4e4e7", fontFamily:"'JetBrains Mono',monospace" }}>
        
        <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(0,0,0,0.94)", backdropFilter:"blur(16px)", borderBottom:"1px solid #1e1e22", padding:"14px 20px" }}>
          <div style={{ maxWidth:560, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => setDetailId(null)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#52525b", display:"flex", alignItems:"center", gap:6, fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Back
            </button>
          </div>
        </header>
        <div style={{ maxWidth:560, margin:"0 auto", padding:"24px 20px 40px", animation:"fadeIn .2s ease" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10, color:T, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>{comp.category}</div>
            <h1 style={{ fontSize:28, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:"0 0 6px" }}>{comp.name}</h1>
            <div style={{ fontSize:12, color:"#3f3f46" }}>{comp.dose} {comp.unit} · {comp.freq}</div>
          </div>

          {db?.desc && (<div style={{ marginBottom:24 }}><div style={LS}>What It Does</div><p style={{ fontSize:13, color:"#71717a", lineHeight:1.8, margin:0 }}>{db.desc}</p></div>)}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
            {[{v:used.length,l:"Log Entries"},{v:total,l:`Total ${comp.unit}`},{v:comp.titration?.length||0,l:"Titrations"}].map((m,i)=>(
              <div key={i} className="c" style={{ padding:"14px 16px", textAlign:"center" }}><div style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{m.v}</div><div style={{ fontSize:9, color:"#3f3f46", marginTop:4 }}>{m.l}</div></div>
            ))}
          </div>

          {comp.titration?.length > 0 && (<div style={{ marginBottom:24 }}><div style={LS}>Titration Protocol</div><div className="c" style={{ padding:16 }}>
            {comp.titration.map((t,i)=>{const mx=comp.dose||Math.max(...comp.titration.map(x=>x.dose));const pct=mx?Math.min(100,(t.dose/mx)*100):0;return(<div key={i} style={{ display:"grid", gridTemplateColumns:"42px 1fr 52px", gap:8, alignItems:"center", padding:"5px 0" }}><span style={{ fontSize:11, color:"#3f3f46" }}>Wk {t.week}</span><div style={{ height:3, background:"#141416", borderRadius:2, overflow:"hidden" }}><div style={{ height:"100%", width:`${pct}%`, background:T, opacity:0.5, borderRadius:2 }}/></div><span style={{ fontSize:12, fontWeight:600, color:"#52525b", textAlign:"right" }}>{t.dose} {comp.unit}</span></div>);})}
          </div></div>)}

          {sides.length > 0 && (<div style={{ marginBottom:24 }}><div style={LS}>Side Effects Experienced</div><div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{sides.map((s,i)=><span key={i} style={{ fontSize:9, padding:"4px 10px", background:"rgba(239,68,68,0.06)", color:"#f87171", border:"1px solid rgba(239,68,68,0.1)" }}>{s}</span>)}</div></div>)}

          {/* Strength Attribution */}
          {liftsAfter.length > 0 && (<div style={{ marginBottom:24 }}><div style={LS}>Strength While On</div><div className="c" style={{ padding:16 }}>
            {[...new Set(liftsAfter.map(t=>t.exercise))].slice(0,4).map(ex=>{const pr=getPR(liftsAfter,ex);const before=getPR(liftsBefore,ex);const delta=before?pr-before:0;return(
              <div key={ex} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #141416" }}>
                <span style={{ fontSize:12, color:"#a1a1aa" }}>{ex}</span>
                <div style={{ textAlign:"right" }}><span style={{ fontSize:14, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{pr}lbs</span>{delta>0&&<span style={{ fontSize:10, color:T, marginLeft:6 }}>+{delta}</span>}</div>
              </div>
            );})}
          </div></div>)}

          {used.length > 0 && (<div style={{ marginBottom:24 }}><div style={LS}>Dose History</div>{used.slice(0,6).map((l,i)=>(<div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #141416" }}><span style={{ fontSize:11, color:"#3f3f46" }}>{fmtDate(l.date)}</span><span style={{ fontSize:12, color:"#a1a1aa", fontWeight:600 }}>{l.doses[comp.id]} {comp.unit}</span></div>))}</div>)}

          {db?.stacks?.length > 0 && (<div><div style={LS}>Commonly Stacked With</div><div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{db.stacks.map((n,i)=><span key={i} style={{ fontSize:10, padding:"5px 12px", border:"1px solid #1e1e22", color:"#52525b", background:"rgba(255,255,255,0.015)" }}>{n}</span>)}</div></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#000", color:"#e4e4e7", fontFamily:"'JetBrains Mono',monospace", WebkitFontSmoothing:"antialiased" }}>
      
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(0,0,0,0.94)", backdropFilter:"blur(16px)", borderBottom:"1px solid #1e1e22", padding:"14px 20px" }}>
        <div style={{ maxWidth:560, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <svg width="14" height="20" viewBox="0 0 24 34" fill="none"><rect x="6" y="1" width="12" height="5" rx="1" fill={T}/><path d="M7 6V9H17V6" stroke={T} strokeWidth="1.5" fill="none"/><path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke={T} strokeWidth="1.5" fill="none"/><path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill={T}/></svg>
            <div><div style={{ fontSize:15, letterSpacing:"0.1em", color:"#fff", fontFamily:"'Inter',sans-serif" }}><span style={{ fontWeight:700 }}>flour</span><span style={{ fontWeight:300 }}>ish</span></div><div style={{ fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", color:"#3f3f46", marginTop:-1 }}>{cy.name}</div></div>
          </div>
          <button onClick={() => setMenuOpen(true)} style={{ width:36, height:36, background:"transparent", border:"1px solid #1e1e22", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, transition:"border-color .15s" }} onMouseEnter={e=>e.currentTarget.style.borderColor="#3f3f46"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1e1e22"}>
            <div style={{ width:14, height:1.5, background:"#52525b" }}/><div style={{ width:14, height:1.5, background:"#52525b" }}/><div style={{ width:10, height:1.5, background:"#52525b" }}/>
          </button>
        </div>
      </header>

      <div style={{ maxWidth:560, margin:"0 auto", padding:"24px 20px 100px", opacity:tr?0:1, transition:"opacity .15s" }}>

        {/* ═══ HOME ═══ */}
        {tab === "home" && (<div>
          <div style={{ marginBottom:28 }}>
            <h1 style={HS}>{profile?.name ? `Welcome back, ${profile.name}.` : "Welcome back."}</h1>
            <p style={{ fontSize:11, color:"#3f3f46", marginTop:5 }}>{new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}</p>
            {cy.goals?.length > 0 && <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:12 }}>{cy.goals.map((g,i)=><span key={i} style={{ fontSize:9, padding:"3px 9px", border:"1px solid rgba(45,212,191,0.12)", color:T, background:"rgba(45,212,191,0.03)", letterSpacing:"0.05em" }}>{g}</span>)}</div>}
          </div>

          {latest && (<div style={{ marginBottom:28 }}><SL>Latest Metrics</SL><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[{l:"Weight",v:latest.weight,u:"lbs",d:logs.map(x=>x.weight).filter(Boolean).reverse()},{l:"Sleep",v:latest.sleep,u:"score",d:logs.map(x=>x.sleep).filter(Boolean).reverse()},{l:"Mood",v:latest.mood,u:"/10",d:logs.map(x=>x.mood).filter(Boolean).reverse()},{l:"HRV",v:latest.hrv,u:"ms",d:logs.map(x=>x.hrv).filter(Boolean).reverse()}].map((m,i)=>(
              <div key={i} className="c" style={{ padding:"16px 18px" }}><div style={{ fontSize:10, color:"#3f3f46", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{m.l}</div><div style={{ fontSize:26, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", lineHeight:1 }}>{m.v}<span style={{ fontSize:11, fontWeight:400, color:"#27272a", marginLeft:3 }}>{m.u}</span></div>{m.d?.length>=2&&<div style={{ marginTop:10 }}><Sp data={m.d}/></div>}</div>
            ))}
          </div></div>)}

          <div style={{ marginBottom:28 }}><SL>Quick Actions</SL><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[{l:"Add Compound",icon:"M12 4v16m8-8H4",fn:()=>setAddOpen(true)},{l:"Get Insights",icon:"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",fn:getInsights},{l:"Log Training",icon:"M13 10V3L4 14h7v7l9-11h-7z",fn:()=>sw("train")},{l:"View Goals",icon:"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",fn:()=>setMenuOpen(true)}].map((b,i)=>(
              <button key={i} className="ab" onClick={b.fn} style={{ padding:"18px 16px", textAlign:"left", fontFamily:"'JetBrains Mono',monospace", display:"flex", flexDirection:"column", gap:10 }}>
                <div className="gl"/>
                <svg width="18" height="18" fill="none" stroke={T} strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity:.7 }}><path strokeLinecap="round" strokeLinejoin="round" d={b.icon}/></svg>
                <span style={{ fontSize:11, fontWeight:600, color:"#a1a1aa", fontFamily:"'Inter',sans-serif" }}>{b.l}</span>
              </button>
            ))}
          </div></div>

          <SL right={`${active.length} active`}>Today's Stack</SL>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:28 }}>
            {active.map(c => {
              const dosed = todayDoses[c.id];
              return (
                <div key={c.id} className="c" style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <button onClick={() => setDetailId(c.id)} style={{ flex:1, background:"transparent", border:"none", cursor:"pointer", textAlign:"left", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:dosed?T:"#27272a", flexShrink:0 }}/>
                    <div><div style={{ fontSize:14, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif", lineHeight:1.2 }}>{c.name}</div><div style={{ fontSize:10, color:"#3f3f46", marginTop:3 }}>{c.dose} {c.unit} · {c.freq}</div></div>
                  </button>
                  <button className={`ql ${dosed?"done":""}`} onClick={() => { if (!dosed) { quickDose(c.id, c.dose); } }} style={dosed?{color:"#27272a",borderColor:"#141416"}:{}}>
                    {dosed ? "✓ Logged" : "Log"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Strength PRs on home */}
          {training.filter(t=>t.type==="lift").length > 0 && (<div style={{ marginBottom:28 }}><SL>Lift PRs</SL><div className="c" style={{ padding:16 }}>
            {[...new Set(training.filter(t=>t.type==="lift").map(t=>t.exercise))].slice(0,4).map(ex=>{const pr=Math.max(...training.filter(t=>t.exercise===ex).flatMap(t=>t.sets.map(s=>s.weight)));return(
              <div key={ex} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #141416" }}><span style={{ fontSize:12, color:"#71717a" }}>{ex}</span><span style={{ fontSize:14, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{pr} lbs</span></div>
            );})}
          </div></div>)}

          {latest?.physique && (<div><SL>Latest Notes</SL><div className="c" style={{ padding:16 }}><p style={{ fontSize:12, color:T, lineHeight:1.7, margin:0, padding:"8px 12px", background:"rgba(45,212,191,0.03)", border:"1px solid rgba(45,212,191,0.08)" }}>{latest.physique}</p></div></div>)}

          {/* Add Compound Modal */}
          <Mod open={addOpen} onClose={()=>{setAddOpen(false);setAddSv("")}} title="Add Compound"><AC value={addSv} onChange={setAddSv} onSelect={quickAdd}/><p style={{ fontSize:11, color:"#27272a", textAlign:"center" }}>Search and tap to add</p></Mod>

          {/* Insights Modal */}
          <Mod open={insightsOpen} onClose={()=>setInsightsOpen(false)} title="Insights">
            {insightsLoading ? (<div style={{ textAlign:"center", padding:30 }}><div style={{ width:24, height:24, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 12px", animation:"spin .7s linear infinite" }}/><p style={{ fontSize:11, color:"#3f3f46" }}>Analyzing...</p></div>
            ) : insightsData ? (<div style={{ fontSize:12, color:"#a1a1aa", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{insightsData.replace(/\*\*/g,"").replace(/\n\n/g,"\n\n")}</div>
            ) : null}
          </Mod>
        </div>)}

        {/* ═══ LOG ═══ */}
        {tab === "log" && (<LogView compounds={comps} onSave={addLog} />)}

        {/* ═══ TRAINING ═══ */}
        {tab === "train" && (<TrainView training={training} setTraining={setTraining} compounds={comps} />)}

        {/* ═══ STACK ═══ */}
        {tab === "stack" && (<StackView compounds={comps} setCompounds={setComps} />)}

        {/* ═══ HISTORY ═══ */}
        {tab === "history" && (<HistoryView logs={logs} compounds={comps} onDelete={deleteLog} training={training} />)}
      </div>

      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.94)", backdropFilter:"blur(16px)", borderTop:"1px solid #1e1e22", zIndex:50 }}>
        <div style={{ maxWidth:560, margin:"0 auto", display:"flex" }}>
          {TABS.map(t=>(<button key={t.id} onClick={()=>sw(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"10px 0 8px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", color:tab===t.id?T:"#27272a", transition:"color .15s" }}><svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={t.d}/></svg><span style={{ fontSize:9, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>{t.label}</span></button>))}
        </div>
      </nav>

      {/* Hamburger Menu */}
      {menuOpen && (<div style={{ position:"fixed", inset:0, zIndex:200, background:"#000", display:"flex", flexDirection:"column", animation:"fadeIn .15s ease" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e1e22", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:15, fontFamily:"'Inter',sans-serif", color:"#fff" }}><b>flour</b><span style={{ fontWeight:300 }}>ish</span></span>
          <button onClick={()=>setMenuOpen(false)} style={{ width:36, height:36, background:"#111114", border:"1px solid #1e1e22", color:"#52525b", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>&times;</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
          {profile?.name && (<div style={{ marginBottom:32 }}><div style={LS}>Profile</div><div style={{ fontSize:20, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{profile.name}</div>{profile.experience && <div style={{ fontSize:11, color:"#3f3f46", marginTop:3, textTransform:"capitalize" }}>{profile.experience} · {profile.goals?.slice(0,2).join(", ")}</div>}</div>)}
          <div style={LS}>Cycles</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:32 }}>
            {cycles.map(c=>(<button key={c.id} onClick={()=>{setActiveId(c.id);setMenuOpen(false)}} className="c" style={{ padding:"14px 16px", cursor:"pointer", textAlign:"left", fontFamily:"'JetBrains Mono',monospace", borderColor:c.id===activeId?"rgba(45,212,191,0.2)":undefined }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:14, fontWeight:600, color:c.id===activeId?"#fff":"#71717a", fontFamily:"'Inter',sans-serif" }}>{c.name}</span>{c.id===activeId&&<div style={{ width:6, height:6, borderRadius:"50%", background:T }}/>}</div><div style={{ fontSize:10, color:"#3f3f46", marginTop:4 }}>{c.goals?.slice(0,2).join(" · ")||"No goals"} · {c.compounds?.length||0} compounds</div></button>))}
            <button onClick={()=>{newCycle();setMenuOpen(false)}} style={{ padding:"13px 16px", border:"1px dashed #1e1e22", background:"transparent", color:"#3f3f46", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textAlign:"center" }}>+ New Cycle</button>
          </div>
          <div style={{ borderTop:"1px solid #141416", paddingTop:20 }}>
            {["Settings","Account","Export Data"].map(l=>(<button key={l} style={{ width:"100%", display:"flex", alignItems:"center", padding:"14px 0", background:"transparent", border:"none", borderBottom:"1px solid #141416", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", color:"#3f3f46", fontSize:13 }}>{l}</button>))}
          </div>
        </div>
      </div>)}
    </div>
  );
}

// ══════════════════════════════
// TRAINING VIEW
// ══════════════════════════════
function TrainView({ training, setTraining, compounds }) {
  const [mode, setMode] = useState("lift");
  const [exercise, setExercise] = useState(LIFTS[0]);
  const [sets, setSets] = useState([{ reps:"", weight:"" }]);
  const [cardioEx, setCardioEx] = useState(CARDIO[0]);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");

  const saveLift = () => {
    const valid = sets.filter(s => s.reps && s.weight);
    if (!valid.length) return;
    setTraining(p => [{ id:gid(), date:td(), type:"lift", exercise, sets:valid.map(s => ({ reps:Number(s.reps), weight:Number(s.weight) })) }, ...p]);
    setSets([{ reps:"", weight:"" }]);
  };

  const saveCardio = () => {
    if (!duration) return;
    setTraining(p => [{ id:gid(), date:td(), type:"cardio", exercise:cardioEx, duration:Number(duration), distance:Number(distance)||0 }, ...p]);
    setDuration(""); setDistance("");
  };

  const lifts = training.filter(t => t.type === "lift");
  const cardio = training.filter(t => t.type === "cardio");

  // Attribution: which compounds were active when PRs were hit
  const prs = {};
  [...new Set(lifts.map(t => t.exercise))].forEach(ex => {
    const best = lifts.filter(t => t.exercise === ex).sort((a, b) => Math.max(...b.sets.map(s => s.weight)) - Math.max(...a.sets.map(s => s.weight)))[0];
    if (best) prs[ex] = { weight: Math.max(...best.sets.map(s => s.weight)), date: best.date };
  });

  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>Training</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Log lifts and cardio. Track PRs over time.</p>

      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {["lift","cardio"].map(m => (<button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:"10px 0", border:`1px solid ${mode===m?"rgba(45,212,191,0.3)":"#1e1e22"}`, background:mode===m?"rgba(45,212,191,0.04)":"transparent", color:mode===m?T:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textTransform:"capitalize" }}>{m === "lift" ? "Barbell Lifts" : "Cardio"}</button>))}
      </div>

      {mode === "lift" ? (<div>
        <div style={{ marginBottom:14 }}><label style={LS}>Exercise</label><select value={exercise} onChange={e => setExercise(e.target.value)} style={{ ...IS, background:"#0a0a0c", appearance:"none" }}>{LIFTS.map(l => <option key={l}>{l}</option>)}</select></div>
        <div style={LS}>Sets</div>
        {sets.map((s, i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"60px 1fr 28px", gap:8, marginBottom:6, alignItems:"center" }}>
            <input type="number" placeholder="Reps" value={s.reps} onChange={e => { const v = [...sets]; v[i].reps = e.target.value; setSets(v); }} style={{ ...IS, height:36, textAlign:"center", fontSize:12 }} />
            <input type="number" placeholder="Weight (lbs)" value={s.weight} onChange={e => { const v = [...sets]; v[i].weight = e.target.value; setSets(v); }} style={{ ...IS, height:36, fontSize:12 }} />
            {sets.length > 1 && <button onClick={() => setSets(p => p.filter((_, j) => j !== i))} style={{ width:28, height:28, background:"#111114", border:"1px solid #1e1e22", color:"#3f3f46", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>&times;</button>}
          </div>
        ))}
        <button onClick={() => setSets(p => [...p, { reps:"", weight:"" }])} style={{ fontSize:10, color:T, background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontWeight:600, marginBottom:20 }}>+ Add Set</button>
        <button onClick={saveLift} style={{ width:"100%", height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Log Lift</button>
      </div>) : (<div>
        <div style={{ marginBottom:14 }}><label style={LS}>Activity</label><select value={cardioEx} onChange={e => setCardioEx(e.target.value)} style={{ ...IS, background:"#0a0a0c", appearance:"none" }}>{CARDIO.map(c => <option key={c}>{c}</option>)}</select></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          <div style={{ marginBottom:14 }}><label style={LS}>Duration (min)</label><input type="number" placeholder="30" value={duration} onChange={e => setDuration(e.target.value)} style={IS} /></div>
          <div style={{ marginBottom:14 }}><label style={LS}>Distance (mi)</label><input type="number" placeholder="3.1" value={distance} onChange={e => setDistance(e.target.value)} style={IS} /></div>
        </div>
        <button onClick={saveCardio} style={{ width:"100%", height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Log Cardio</button>
      </div>)}

      {/* PR Board */}
      {Object.keys(prs).length > 0 && (<div style={{ marginTop:28 }}><SL>Personal Records</SL><div className="c" style={{ padding:16 }}>
        {Object.entries(prs).map(([ex, pr]) => {
          const activeComps = compounds.filter(c => c.status === "active").map(c => c.name);
          return (
            <div key={ex} style={{ padding:"10px 0", borderBottom:"1px solid #141416" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#a1a1aa" }}>{ex}</span>
                <span style={{ fontSize:16, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{pr.weight} lbs</span>
              </div>
              <div style={{ fontSize:9, color:"#3f3f46", marginTop:4 }}>{fmtDate(pr.date)} · On: {activeComps.slice(0, 3).join(", ")}</div>
            </div>
          );
        })}
      </div></div>)}

      {/* Recent Training */}
      {training.length > 0 && (<div style={{ marginTop:28 }}><SL right={`${training.length} total`}>Recent</SL>
        {training.slice(0, 8).map(t => (
          <div key={t.id} className="c" style={{ padding:"12px 16px", marginBottom:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><span style={{ fontSize:12, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{t.exercise}</span><span style={{ fontSize:10, color:"#3f3f46", marginLeft:8 }}>{fmtDate(t.date)}</span></div>
              <span style={{ fontSize:9, padding:"2px 8px", background:"rgba(45,212,191,0.06)", color:T, border:"1px solid rgba(45,212,191,0.1)", textTransform:"uppercase" }}>{t.type}</span>
            </div>
            {t.type === "lift" && t.sets && (<div style={{ fontSize:10, color:"#52525b", marginTop:6 }}>{t.sets.map((s, i) => `${s.reps}×${s.weight}lbs`).join("  ·  ")}</div>)}
            {t.type === "cardio" && (<div style={{ fontSize:10, color:"#52525b", marginTop:6 }}>{t.duration}min{t.distance ? ` · ${t.distance}mi` : ""}</div>)}
          </div>
        ))}
      </div>)}
    </div>
  );
}

// ══════════════════════════════
// LOG VIEW
// ══════════════════════════════
function LogView({ compounds, onSave }) {
  const active = compounds.filter(c => c.status === "active");
  const [ck, setCk] = useState({}); const [cd, setCd] = useState({});
  const [f, setF] = useState({ weight:"", sleep:"", hrv:"", mood:7, stress:5, appetite:5, sideEffects:"", physique:"" });
  const toggle = id => setCk(p => ({ ...p, [id]: !p[id] }));
  const save = () => { const doses={}; Object.keys(ck).filter(k=>ck[k]).forEach(id=>{const c=compounds.find(x=>x.id===id);doses[id]=cd[id]!==undefined?Number(cd[id]):c.dose}); onSave({id:gid(),date:td(),weight:Number(f.weight)||0,sleep:Number(f.sleep)||0,hrv:Number(f.hrv)||0,mood:f.mood,stress:f.stress,appetite:f.appetite,sideEffects:f.sideEffects,physique:f.physique,doses}); setCk({});setCd({});setF({weight:"",sleep:"",hrv:"",mood:7,stress:5,appetite:5,sideEffects:"",physique:""}); };
  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>Log Entry</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>Select compounds taken today</p>
      <SL right={`${Object.values(ck).filter(Boolean).length} selected`}>Compounds</SL>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:28 }}>
        {active.map(c=>{const on=ck[c.id];return(<button key={c.id} onClick={()=>toggle(c.id)} className="c" style={{ padding:"13px 14px", cursor:"pointer", textAlign:"left", fontFamily:"'JetBrains Mono',monospace", borderColor:on?"rgba(45,212,191,0.25)":undefined, background:on?"rgba(45,212,191,0.02)":"" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:on?6:0 }}><div style={{ width:5, height:5, borderRadius:"50%", background:on?T:"#27272a" }}/><span style={{ fontSize:12, fontWeight:600, color:on?"#fff":"#52525b", fontFamily:"'Inter',sans-serif", flex:1 }}>{c.name}</span>{on&&<svg width="12" height="12" viewBox="0 0 20 20" fill={T}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div>
          {on?<input type="number" value={cd[c.id]!==undefined?cd[c.id]:c.dose} onChange={e=>{e.stopPropagation();setCd(p=>({...p,[c.id]:e.target.value}))}} onClick={e=>e.stopPropagation()} style={{ width:"100%", height:28, marginTop:2, background:"transparent", border:"1px solid rgba(45,212,191,0.15)", padding:"0 8px", color:T, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}/>:<div style={{ fontSize:10, color:"#27272a", marginTop:2 }}>{c.dose} {c.unit} · {c.freq}</div>}
        </button>);})}
      </div>
      <SL>Biometrics</SL>
      <div className="c" style={{ padding:"18px 18px 4px", marginBottom:24 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          {[["Weight (lbs)","weight","160"],["Sleep score","sleep","80"],["HRV (ms)","hrv","64"]].map(([l,k,ph])=>(<div key={k} style={{marginBottom:14}}><label style={LS}>{l}</label><input type="number" placeholder={ph} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))} style={IS} onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>))}
          {[["Mood","mood"],["Stress","stress"],["Appetite","appetite"]].map(([l,k])=>(<div key={k} style={{marginBottom:14}}><label style={LS}>{l} ({f[k]}/10)</label><input type="range" min="1" max="10" value={f[k]} onChange={e=>setF(p=>({...p,[k]:Number(e.target.value)}))} style={{width:"100%",marginTop:8}}/></div>))}
        </div>
      </div>
      <SL>Notes</SL>
      <div className="c" style={{ padding:"18px 18px 4px", marginBottom:24 }}>
        <div style={{ marginBottom:14 }}><label style={LS}>Side Effects</label><input placeholder="Acne, lethargy..." value={f.sideEffects} onChange={e=>setF(p=>({...p,sideEffects:e.target.value}))} style={IS} onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
        <div style={{ marginBottom:14 }}><label style={LS}>Physique Notes</label><textarea placeholder="Body composition..." value={f.physique} onChange={e=>setF(p=>({...p,physique:e.target.value}))} style={{ ...IS, height:"auto", minHeight:60, padding:"10px 14px", resize:"vertical" }} onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
      </div>
      <button onClick={save} style={{ width:"100%", height:46, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Log Entry</button>
    </div>
  );
}

// ══════════════════════════════
// STACK VIEW
// ══════════════════════════════
function StackView({ compounds, setCompounds }) {
  const [modal, setModal] = useState(null);
  const [sv, setSv] = useState("");
  const [f, setF] = useState({ name:"", dose:"", unit:"mg", freq:"daily", category:"growth" });
  const [tf, setTf] = useState([]);
  const openAdd = () => { setF({ name:"",dose:"",unit:"mg",freq:"daily",category:"growth" }); setSv(""); setTf([{week:1,dose:""}]); setModal("add"); };
  const openEdit = c => { setF({ name:c.name,dose:c.dose,unit:c.unit,freq:c.freq,category:c.category,id:c.id }); setSv(c.name); setTf(c.titration?.length?c.titration.map(t=>({...t})):[{week:1,dose:c.dose}]); setModal("edit"); };
  const handleAuto = r => { setSv(r.name); setF(p=>({...p,name:r.name,dose:r.dose,unit:r.unit,freq:r.freq,category:r.cat})); };
  const save = () => { const tit=tf.filter(t=>t.dose!==""&&t.dose!==undefined).map(t=>({week:Number(t.week),dose:Number(t.dose)})); if(modal==="add")setCompounds(p=>[...p,{id:gid(),name:f.name,dose:Number(f.dose),unit:f.unit,freq:f.freq,status:"active",category:f.category,titration:tit}]); else setCompounds(p=>p.map(c=>c.id===f.id?{...c,name:f.name,dose:Number(f.dose),unit:f.unit,freq:f.freq,category:f.category,titration:tit}:c)); setModal(null); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div><h1 style={HS}>Stack</h1><p style={{ fontSize:11, color:"#3f3f46", marginTop:4 }}>{compounds.length} compounds</p></div>
        <button onClick={openAdd} style={{ height:36, padding:"0 16px", background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", transition:"all .15s" }} onMouseEnter={e=>{e.target.style.borderColor=T;e.target.style.color=T}} onMouseLeave={e=>{e.target.style.borderColor="#1e1e22";e.target.style.color="#52525b"}}>+ Add</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {compounds.map(c => (
          <div key={c.id} className="c" style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}><div style={{ width:6, height:6, borderRadius:"50%", background:c.status==="active"?T:"#27272a" }}/><span style={{ flex:1, fontSize:14, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{c.name}</span><span style={{ fontSize:9, padding:"2px 8px", background:c.status==="active"?"rgba(45,212,191,0.06)":"#111114", color:c.status==="active"?T:"#3f3f46", border:`1px solid ${c.status==="active"?"rgba(45,212,191,0.1)":"#1e1e22"}`, textTransform:"uppercase", fontWeight:600, letterSpacing:"0.06em" }}>{c.status}</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>{[{l:"Dose",v:`${c.dose} ${c.unit}`},{l:"Freq",v:c.freq},{l:"Category",v:c.category}].map((d,i)=>(<div key={i}><div style={{ fontSize:9, color:"#27272a", textTransform:"uppercase", letterSpacing:"0.1em" }}>{d.l}</div><div style={{ fontSize:13, fontWeight:600, color:"#52525b", marginTop:3, fontFamily:"'Inter',sans-serif" }}>{d.v}</div></div>))}</div>
            <div style={{ display:"flex", gap:6, marginTop:14, paddingTop:12, borderTop:"1px solid #141416" }}>
              {[{l:"Edit",fn:()=>openEdit(c)},{l:c.status==="active"?"Pause":"Activate",fn:()=>setCompounds(p=>p.map(x=>x.id===c.id?{...x,status:x.status==="active"?"off":"active"}:x))},{l:"Remove",fn:()=>setCompounds(p=>p.filter(x=>x.id!==c.id)),d:true}].map((b,i)=>(<button key={i} onClick={b.fn} style={{ flex:1, height:36, background:"transparent", border:`1px solid ${b.d?"#7f1d1d":"#1e1e22"}`, color:b.d?"#ef4444":"#3f3f46", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>{b.l}</button>))}
            </div>
          </div>
        ))}
      </div>
      <Mod open={!!modal} onClose={()=>setModal(null)} title={modal==="add"?"Add Compound":"Edit Compound"}>
        <AC value={sv} onChange={v=>{setSv(v);setF(p=>({...p,name:v}))}} onSelect={handleAuto}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          <div style={{marginBottom:14}}><label style={LS}>Dose</label><input type="number" value={f.dose} onChange={e=>setF(p=>({...p,dose:e.target.value}))} style={IS}/></div>
          <div style={{marginBottom:14}}><label style={LS}>Unit</label><input value={f.unit} onChange={e=>setF(p=>({...p,unit:e.target.value}))} style={IS}/></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          <div style={{marginBottom:14}}><label style={LS}>Frequency</label><select value={f.freq} onChange={e=>setF(p=>({...p,freq:e.target.value}))} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{FREQS.map(o=><option key={o}>{o}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={LS}>Category</label><select value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value}))} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{CATS.map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}><span style={LS}>Titration</span><button onClick={()=>setTf(p=>[...p,{week:(p.length?Number(p[p.length-1].week)+1:1),dose:""}])} style={{ fontSize:10, color:T, background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>+ Step</button></div>
          {tf.map((t,i)=>(<div key={i} style={{ display:"grid", gridTemplateColumns:"50px 1fr 28px", gap:8, marginBottom:6, alignItems:"center" }}><input type="number" placeholder="Wk" value={t.week} onChange={e=>{const v=[...tf];v[i].week=e.target.value;setTf(v)}} style={{...IS,height:32,textAlign:"center",fontSize:11}}/><input type="number" placeholder={`Dose`} value={t.dose} onChange={e=>{const v=[...tf];v[i].dose=e.target.value;setTf(v)}} style={{...IS,height:32,fontSize:11}}/><button onClick={()=>setTf(p=>p.filter((_,j)=>j!==i))} style={{ width:28, height:28, background:"#111114", border:"1px solid #1e1e22", color:"#3f3f46", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>&times;</button></div>))}
        </div>
        <button onClick={save} disabled={!f.name||!f.dose} style={{ width:"100%", height:44, background:(!f.name||!f.dose)?"#111114":T, color:(!f.name||!f.dose)?"#27272a":"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:(!f.name||!f.dose)?"default":"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>{modal==="add"?"Add to Stack":"Save Changes"}</button>
      </Mod>
    </div>
  );
}

// ══════════════════════════════
// HISTORY VIEW
// ══════════════════════════════
function HistoryView({ logs, compounds, onDelete, training }) {
  return (
    <div>
      <h1 style={{ ...HS, marginBottom:4 }}>History</h1>
      <p style={{ fontSize:11, color:"#3f3f46", marginBottom:24 }}>{logs.length} entries · {(training||[]).length} training sessions</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {logs.map(log => (
          <div key={log.id} className="c" style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><span style={{ fontSize:13, fontWeight:700, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{log.date}</span><button onClick={()=>onDelete(log.id)} style={{ fontSize:10, color:"#27272a", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>delete</button></div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 16px", marginBottom:12, fontSize:11 }}>
              {log.weight>0&&<span style={{color:"#3f3f46"}}>Weight <span style={{color:"#71717a",fontWeight:600}}>{log.weight}lbs</span></span>}
              {log.sleep>0&&<span style={{color:"#3f3f46"}}>Sleep <span style={{color:"#71717a",fontWeight:600}}>{log.sleep}</span></span>}
              <span style={{color:"#3f3f46"}}>Mood <span style={{color:"#71717a",fontWeight:600}}>{log.mood}/10</span></span>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:(log.sideEffects||log.physique)?12:0 }}>
              {Object.entries(log.doses).map(([cid,dose])=>{const c=compounds.find(x=>x.id===cid);if(!c)return null;return(<span key={cid} style={{ fontSize:10, padding:"3px 8px", background:"rgba(45,212,191,0.04)", color:"rgba(45,212,191,0.6)", border:"1px solid rgba(45,212,191,0.08)", fontWeight:500 }}>{c.name}: {dose}{c.unit}</span>);})}
            </div>
            {log.sideEffects&&<div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:log.physique?10:0 }}>{log.sideEffects.split(",").map((s,i)=><span key={i} style={{ fontSize:9, padding:"3px 8px", background:"rgba(239,68,68,0.06)", color:"#f87171", border:"1px solid rgba(239,68,68,0.1)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em" }}>{s.trim()}</span>)}</div>}
            {log.physique&&<p style={{ fontSize:11, padding:"10px 12px", background:"rgba(45,212,191,0.03)", color:T, border:"1px solid rgba(45,212,191,0.08)", lineHeight:1.7, margin:0 }}>{log.physique}</p>}
          </div>
        ))}
        {!logs.length&&<div style={{ textAlign:"center", padding:60, color:"#27272a", fontSize:12 }}>No logs yet.</div>}
      </div>
    </div>
  );
}

