"use client";
import { useUser, UserButton } from "@clerk/nextjs";
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

const CATS = ["growth","metabolic","recovery","anabolic","ancillary","SARM","nootropic","longevity","supplement","peptide","vitamin","other"];
const FREQS = ["daily","EOD","E3D","2x/week","3x/week","weekly","biweekly","as needed"];
const GOALS = ["Body recomposition","Fat loss","Lean mass gain","Strength","Recovery & healing","Cognitive enhancement","Longevity","Hormone optimization"];
const LIFTS = ["Bench Press","Squat","Deadlift","Overhead Press","Barbell Row","Front Squat","Romanian Deadlift","Incline Bench"];
const CARDIO = ["Running","Cycling","Rowing","Swimming","Stairmaster"];

function gid() { return "x" + Math.random().toString(36).slice(2, 9); }

// ══════════════════════════════
// CURSOR GLOW
// ══════════════════════════════
function CursorGlow() {
  const glowRef = useRef(null);
  const pos = useRef({ x: -400, y: -400 });
  const current = useRef({ x: -400, y: -400 });
  const raf = useRef(null);

  useEffect(() => {
    const onMove = (e) => { pos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove);

    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      current.current.x = lerp(current.current.x, pos.current.x, 0.06);
      current.current.y = lerp(current.current.y, pos.current.y, 0.06);
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      <div ref={glowRef} style={{
        position:"absolute",
        top: -300, left: -300,
        width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(45,212,191,0.13) 0%, rgba(45,212,191,0.05) 35%, transparent 70%)",
        willChange: "transform",
      }}/>
    </div>
  );
}

// ══════════════════════════════
// SPLASH / LOADING SCREEN
// ══════════════════════════════
function SplashScreen() {
  return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, fontFamily:"'JetBrains Mono',monospace" }}>
      <CursorGlow />
      {/* Background grid */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(45,212,191,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.025) 1px, transparent 1px)", backgroundSize:"48px 48px" }}/>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
        <svg width="14" height="20" viewBox="0 0 24 34" fill="none">
          <rect x="6" y="1" width="12" height="5" rx="1" fill="#2dd4bf"/>
          <path d="M7 6V9H17V6" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/>
          <path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/>
          <path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill="#2dd4bf"/>
        </svg>
        <span style={{ fontSize:16, fontFamily:"'Inter',sans-serif", color:"#fff", letterSpacing:"-0.02em" }}>
          <b>flour</b><span style={{ fontWeight:300 }}>ish</span>
        </span>
      </div>
      {/* Spinner */}
      <div style={{ width:24, height:24, border:"1.5px solid #1e1e22", borderTopColor:"#2dd4bf", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
    </div>
  );
}
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
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)" }} />
      <div style={{ position:"relative", zIndex:10000, width:"100%", maxWidth:520, maxHeight:"88vh", overflowY:"auto", background:"#09090b", borderTop:"1px solid #27272a", borderLeft:"1px solid #1e1e22", borderRight:"1px solid #1e1e22", borderRadius:"16px 16px 0 0", animation:"slideUp .28s cubic-bezier(0.16,1,0.3,1)" }} onClick={e => e.stopPropagation()}>
        <div style={{ width:40, height:4, background:"#27272a", borderRadius:2, margin:"12px auto 0" }} />
        <div style={{ position:"sticky", top:0, background:"#09090b", borderBottom:"1px solid #141416", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:1 }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", letterSpacing:"-0.01em" }}>{title}</span>
          <button onClick={onClose} style={{ width:28, height:28, background:"transparent", border:"1px solid #27272a", color:"#52525b", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:4 }}>&times;</button>
        </div>
        <div style={{ padding:"20px 20px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

function AC({ value, onChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const ref = useRef(null);
  const aiTimer = useRef(null);

  useEffect(() => {
    if (value.length === 0) { setOpen(false); setRes([]); setAiSuggestion(null); return; }
    const local = CDB.filter(c => c.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6);
    setRes(local);
    setOpen(true);
    // AI prediction for anything not clearly in CDB
    clearTimeout(aiTimer.current);
    if (value.length >= 3) {
      aiTimer.current = setTimeout(async () => {
        setAiLoading(true);
        try {
          const r = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 300,
              messages: [{ role: "user", content: `User typed "${value}" in a compound search. Predict what supplement, peptide, or compound they want. Respond ONLY with valid JSON, no markdown:
{"name":"full compound name","dose":number,"unit":"mg or mcg or IU","freq":"daily or weekly etc","cat":"recovery or growth or anabolic or metabolic or ancillary or SARM or nootropic or longevity","desc":"1 sentence what it does and key benefit","knownCompound":true}
If you don't recognize it, set knownCompound:false and make your best guess.` }]
            })
          });
          const d = await r.json();
          const txt = (d.content||[]).map(i=>i.text||"").join("").replace(/```json|```/g,"").trim();
          const parsed = JSON.parse(txt);
          // Only show if different from local results
          const alreadyShown = local.some(l => l.name.toLowerCase() === parsed.name.toLowerCase());
          if (!alreadyShown) setAiSuggestion(parsed);
          else setAiSuggestion(null);
        } catch { setAiSuggestion(null); }
        setAiLoading(false);
      }, 600);
    }
    return () => clearTimeout(aiTimer.current);
  }, [value]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const allResults = aiSuggestion ? [...res, { ...aiSuggestion, _ai: true }] : res;

  return (
    <div ref={ref} style={{ position:"relative", marginBottom:14 }}>
      <label style={LS}>Compound Name</label>
      <div style={{ position:"relative" }}>
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => { if (allResults.length) setOpen(true); }}
          placeholder="Search or describe a compound..."
          style={IS}
          onFocus={e => e.target.style.borderColor = T}
          onBlur={e => { setTimeout(() => e.target.style.borderColor = "#1e1e22", 200); }} />
        {aiLoading && <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, border:"1.5px solid #27272a", borderTopColor:T, borderRadius:"50%", animation:"spin .7s linear infinite" }}/>}
      </div>
      {open && allResults.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:500, marginTop:2, background:"#0a0a0c", border:"1px solid #1e1e22", maxHeight:280, overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.9)", borderRadius:4 }}>
          {allResults.map((r, i) => (
            <button key={i} onClick={() => { onSelect(r); setOpen(false); setAiSuggestion(null); }}
              style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"12px 14px", background:"transparent", border:"none", borderBottom:"1px solid #0f0f11", cursor:"pointer", textAlign:"left", fontFamily:"'JetBrains Mono',monospace" }}
              onMouseEnter={e => e.currentTarget.style.background = "#111114"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{r.name}</span>
                  {r._ai && <span style={{ fontSize:8, padding:"1px 5px", background:"rgba(45,212,191,0.08)", color:T, border:"1px solid rgba(45,212,191,0.15)", letterSpacing:"0.08em" }}>AI</span>}
                </div>
                <div style={{ fontSize:10, color:"#3f3f46" }}>{r.dose} {r.unit} · {r.freq}</div>
                {r.desc && <div style={{ fontSize:10, color:"#52525b", marginTop:4, lineHeight:1.5, whiteSpace:"normal" }}>{r.desc}</div>}
              </div>
              <span style={{ flexShrink:0, fontSize:9, padding:"2px 7px", background:"rgba(45,212,191,0.06)", color:T, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, border:"1px solid rgba(45,212,191,0.1)", marginLeft:10, marginTop:2 }}>{r.cat}</span>
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
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          messages: [{
            role: "user",
            content: `You are a precision protocol advisor for compounds, peptides, and supplements. Build a personalized starting protocol.

User profile: ${p.experience} experience, ${p.age || "?"}y old, ${p.weight || "?"}lbs, goals: ${p.goals.join(", ")}.${p.health ? " Health notes: " + p.health : ""}

Return ONLY valid JSON, no markdown fences, no explanation:
{
  "cycleName": "descriptive name",
  "compounds": [
    {"name":"compound name","dose":number,"unit":"mg/mcg/IU","freq":"daily/weekly/EOD/etc","cat":"growth/metabolic/recovery/anabolic/ancillary/SARM/nootropic/longevity","reason":"why this compound for this person","desc":"what it does in 1 sentence"}
  ],
  "summary": "2-3 sentence overview of the protocol and expected outcomes"
}

Include 4-8 compounds. Include ancillaries and support compounds. Tailor doses to experience level. Consider peptides and supplements not just anabolics.`
          }]
        })
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error("API error " + r.status);
      const d = await r.json();
      const txt = (d.content||[]).map(i=>i.text||"").join("").replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(txt);
      setRec(parsed);
    } catch (e) {
      console.error("generate error:", e);
      clearTimeout(timer);
      setRec(fallback());
    }
    setLoading(false);
  };

  const finish = () => {
    onComplete({
      profile: p,
      cycle: {
        name: rec?.cycleName || "My Protocol",
        goals: p.goals,
        weeks: 12,
        compounds: (rec?.compounds || []).map(c => ({
          name: c.name,
          dose: Number(c.dose),
          unit: c.unit,
          freq: c.freq,       // used by onOnboardingComplete
          frequency: c.freq,  // DB field name
          status: "active",
          category: c.cat || "other",
          titration: [{ week: 1, dose: Number(c.dose) }],
          desc: c.desc || "",
          reason: c.reason || "",
        })),
      }
    });
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
              {rec.compounds.map((c,i)=>(<div key={i} className="c" style={{ padding:"13px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{c.name}</span>
                  <span style={{ fontSize:9, padding:"2px 7px", background:"rgba(45,212,191,0.06)", color:T, border:"1px solid rgba(45,212,191,0.1)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{c.cat||c.category}</span>
                </div>
                <div style={{ fontSize:10, color:"#52525b", marginBottom:4 }}>{c.dose} {c.unit} · {c.freq}</div>
                {c.desc&&<p style={{ fontSize:10, color:"#3f3f46", margin:"4px 0 0", lineHeight:1.5 }}>{c.desc}</p>}
                {c.reason&&!c.desc&&<p style={{ fontSize:10, color:"#3f3f46", margin:"4px 0 0", lineHeight:1.5 }}>{c.reason}</p>}
              </div>))}
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
// ══════════════════════════════
// MAIN APP
// ══════════════════════════════
export default function Flourish() {
  const { user, isLoaded } = useUser();

  // ── UI state ──
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

  // ── DB state ──
  const [profile, setProfile] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  // ── Derived ──
  const cy = cycles.find(c => c.id === activeId) || cycles[0] || null;
  const comps = cy?.compounds || [];
  const logs = cy?.logs || [];
  const training = cy?.training_sessions || [];
  const active = comps.filter(c => c.status === "active");
  const latest = logs[0];

  // ── Load data on mount ──
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setLoading(false); return; }
    loadAll();
  }, [isLoaded, user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profRes, cyclesRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/cycles"),
      ]);

      // Guard against non-JSON error responses (401, 500, etc)
      if (!profRes.ok || !cyclesRes.ok) {
        console.error("API error:", profRes.status, cyclesRes.status);
        // If 401, Clerk session not ready yet — retry once after delay
        if (profRes.status === 401 || cyclesRes.status === 401) {
          setTimeout(() => loadAll(), 1200);
          return;
        }
        setLoading(false);
        return;
      }

      const prof = await profRes.json();
      const cycs = await cyclesRes.json();

      setProfile(prof);
      // Normalize: attach empty arrays if missing
      const normalized = (Array.isArray(cycs) ? cycs : []).map(c => ({
        ...c,
        compounds: c.compounds || [],
        logs: c.logs || [],
        training_sessions: c.training_sessions || [],
      }));
      setCycles(normalized);
      if (normalized.length > 0) {
        setActiveId(normalized[0].id);
        setOnboarded(true);
      }
    } catch (e) {
      console.error("loadAll error:", e);
    }
    setLoading(false);
  };

  // ── Helpers that mutate DB then update local state ──
  const sw = t => { setDetailId(null); setTr(true); setTimeout(() => { setTab(t); setTimeout(() => setTr(false), 40); }, 150); };

  const addLog = useCallback(async (entry) => {
    if (!cy) return;
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entry, cycle_id: cy.id }),
    });
    const saved = await res.json();
    setCycles(p => p.map(c => c.id === activeId ? { ...c, logs: [saved, ...(c.logs || [])] } : c));
    sw("history");
  }, [activeId, cy]);

  const deleteLog = useCallback(async (id) => {
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    setCycles(p => p.map(c => c.id === activeId ? { ...c, logs: (c.logs || []).filter(l => l.id !== id) } : c));
  }, [activeId]);

  const quickAdd = async (dbItem) => {
    if (!cy) return;
    const res = await fetch("/api/compounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: cy.id,
        name: dbItem.name,
        dose: dbItem.dose,
        unit: dbItem.unit,
        frequency: dbItem.freq,
        status: "active",
        category: dbItem.cat,
        titration: [{ week: 1, dose: dbItem.dose }],
      }),
    });
    const saved = await res.json();
    setCycles(p => p.map(c => c.id === activeId ? { ...c, compounds: [...(c.compounds || []), saved] } : c));
    setAddOpen(false); setAddSv("");
  };

  const quickDose = (compId, dose) => { setTodayDoses(p => ({ ...p, [compId]: dose })); setLogDoseModal(null); };

  const newCycle = async () => {
    const res = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Cycle", goals: [], weeks: 12 }),
    });
    const saved = await res.json();
    setCycles(p => [saved, ...p]);
    setActiveId(saved.id);
  };

  const onOnboardingComplete = async ({ profile: pr, cycle: c }) => {
    // Save profile
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pr.name,
        age: Number(pr.age) || null,
        weight_lbs: Number(pr.weight) || null,
        experience: pr.experience,
        goals: pr.goals,
        health_notes: pr.health,
      }),
    });
    // Save cycle
    const cycRes = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: c.name, goals: c.goals, weeks: 12 }),
    });
    const savedCycle = await cycRes.json();
    // Save compounds from AI recommendation
    const compPromises = (c.compounds || []).map(comp =>
      fetch("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: savedCycle.id,
          name: comp.name,
          dose: Number(comp.dose),
          unit: comp.unit,
          frequency: comp.frequency || comp.freq || "daily",
          status: "active",
          category: comp.category || "other",
          titration: comp.titration || [{ week: 1, dose: Number(comp.dose) }],
          notes: comp.reason || comp.desc || null,
        }),
      }).then(r => r.json())
    );
    const savedComps = await Promise.all(compPromises);
    savedCycle.compounds = savedComps;
    savedCycle.logs = [];
    savedCycle.training_sessions = [];
    setCycles([savedCycle]);
    setActiveId(savedCycle.id);
    setOnboarded(true);
  };

  // AI Insights
  const getInsights = async () => {
    setInsightsLoading(true); setInsightsOpen(true);
    const ctx = `Cycle:${cy.name}, Goals:${(cy.goals||[]).join(",")}, Active compounds:${active.map(c=>`${c.name} ${c.dose}${c.unit} ${c.frequency||c.freq}`).join("; ")}, Latest metrics: weight=${latest?.weight_lbs||"?"}, sleep=${latest?.sleep_score||"?"}, mood=${latest?.mood||"?"}, Recent sides:${logs.slice(0,3).map(l=>l.side_effects).filter(Boolean).join("; ")}, Training PRs:${training.filter(t=>t.type==="lift").slice(0,3).map(t=>`${t.exercise} ${Math.max(...(t.sets||[]).map(s=>s.weight))}lbs`).join(", ")}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json"}, signal:ctrl.signal, body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:600, messages:[{role:"user",content:`Fitness protocol advisor. Analyze and give insights. Be concise, use sections. ${ctx}`}] }) });
      clearTimeout(timer);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setInsightsData((d.content||[]).map(i=>i.text||"").join(""));
    } catch {
      clearTimeout(timer);
      // Pre-built insights
      const weightTrend = logs.length >= 2 ? (logs[0].weight_lbs - logs[logs.length-1].weight_lbs) : 0;
      const avgMood = logs.length ? (logs.reduce((s,l) => s + (l.mood||0), 0) / logs.length).toFixed(1) : "?";
      const liftPRs = training.filter(t => t.type === "lift");
      const benchPR = liftPRs.filter(t => t.exercise === "Bench Press").map(t => Math.max(...t.sets.map(s => s.weight))).sort((a,b) => b-a)[0];
      let txt = `**Progress Summary**\n\nWeight trend: ${weightTrend > 0 ? "+" : ""}${weightTrend} lbs over ${logs.length} entries. Average mood: ${avgMood}/10.\n\n`;
      txt += `**Stack Analysis**\n\n${active.length} active compounds. `;
      if (active.some(c => c.category === "anabolic")) txt += "Anabolic base is established. ";
      if (active.some(c => c.category === "metabolic")) txt += "Metabolic support in place for fat loss. ";
      const sides = [...new Set(logs.flatMap(l => (l.side_effects||"").split(",").map(s=>s.trim()).filter(Boolean)))];
      if (sides.length) txt += `\n\n**Side Effects to Watch**\n\n${sides.join(", ")}. Consider reviewing estrogen management if acne persists.`;
      if (benchPR) txt += `\n\n**Strength**\n\nBench PR: ${benchPR}lbs. Track weekly to correlate with compound changes.`;
      txt += `\n\n**Recommendation**\n\nStay consistent with logging. Your ${cy.goals[0]?.toLowerCase() || "optimization"} goals are on track based on current metrics.`;
      setInsightsData(txt);
    }
    setInsightsLoading(false);
  };

  // ── Named DB handlers (avoid template literals inside JSX props) ──
  const saveTraining = async (entry) => {
    if (!cy) return;
    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entry, cycle_id: cy.id }),
    });
    const saved = await res.json();
    setCycles(p => p.map(c => c.id === activeId ? { ...c, training_sessions: [saved, ...(c.training_sessions || [])] } : c));
  };

  const addCompound = async (comp) => {
    if (!cy) return;
    const res = await fetch("/api/compounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...comp, cycle_id: cy.id }),
    });
    const saved = await res.json();
    setCycles(p => p.map(c => c.id === activeId ? { ...c, compounds: [...(c.compounds || []), saved] } : c));
  };

  const editCompound = async (id, updates) => {
    const res = await fetch("/api/compounds/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const saved = await res.json();
    setCycles(p => p.map(c => c.id === activeId ? { ...c, compounds: (c.compounds || []).map(x => x.id === id ? saved : x) } : c));
  };

  const removeCompound = async (id) => {
    await fetch("/api/compounds/" + id, { method: "DELETE" });
    setCycles(p => p.map(c => c.id === activeId ? { ...c, compounds: (c.compounds || []).filter(x => x.id !== id) } : c));
  };

  const TABS = [
    { id:"home", label:"Home", d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" },
    { id:"log", label:"Log", d:"M12 4v16m8-8H4" },
    { id:"train", label:"Train", d:"M13 10V3L4 14h7v7l9-11h-7z" },
    { id:"stack", label:"Stack", d:"M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
    { id:"history", label:"History", d:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  // ── Loading / auth guards ──
  if (!isLoaded || loading) return <SplashScreen />;

  if (!onboarded) return (
    <div>
      <Onboarding onComplete={onOnboardingComplete}/>
    </div>
  );

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
        {tab === "train" && (<TrainView training={training} cycleId={cy?.id} onSaveTraining={saveTraining} compounds={comps} />)}

        {/* ═══ STACK ═══ */}
        {tab === "stack" && (<StackView compounds={comps} cycleId={cy?.id} onAdd={addCompound} onEdit={editCompound} onRemove={removeCompound} />)}

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
function TrainView({ training, cycleId, onSaveTraining, compounds }) {
  const [mode, setMode] = useState("lift");
  const [exercise, setExercise] = useState(LIFTS[0]);
  const [sets, setSets] = useState([{ reps:"", weight:"" }]);
  const [cardioEx, setCardioEx] = useState(CARDIO[0]);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");

  const saveLift = async () => {
    const valid = sets.filter(s => s.reps && s.weight);
    if (!valid.length) return;
    await onSaveTraining({ type:"lift", exercise, sets:valid.map(s => ({ reps:Number(s.reps), weight:Number(s.weight) })) });
    setSets([{ reps:"", weight:"" }]);
  };

  const saveCardio = async () => {
    if (!duration) return;
    await onSaveTraining({ type:"cardio", exercise:cardioEx, duration_min:Number(duration), distance_mi:Number(distance)||0 });
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
            {t.type === "cardio" && (<div style={{ fontSize:10, color:"#52525b", marginTop:6 }}>{t.duration_min}min{t.distance_mi ? ` · ${t.distance_mi}mi` : ""}</div>)}
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
  const save = () => { const doses={}; Object.keys(ck).filter(k=>ck[k]).forEach(id=>{const c=compounds.find(x=>x.id===id);doses[id]=cd[id]!==undefined?Number(cd[id]):c.dose}); onSave({date:td(),weight_lbs:Number(f.weight)||null,sleep_score:Number(f.sleep)||null,hrv:Number(f.hrv)||null,mood:f.mood,stress:f.stress,appetite:f.appetite,side_effects:f.sideEffects||null,physique_notes:f.physique||null,doses}); setCk({});setCd({});setF({weight:"",sleep:"",hrv:"",mood:7,stress:5,appetite:5,sideEffects:"",physique:""}); };
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
function StackView({ compounds, cycleId, onAdd, onEdit, onRemove }) {
  const [modal, setModal] = useState(null);
  const [sv, setSv] = useState("");
  const [f, setF] = useState({ name:"", dose:"", unit:"mg", freq:"daily", category:"growth" });
  const [tf, setTf] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiDesc, setAiDesc] = useState("");
  const openAdd = () => { setF({ name:"",dose:"",unit:"mg",freq:"daily",category:"growth" }); setSv(""); setTf([{week:1,dose:""}]); setAiDesc(""); setModal("add"); };
  const openEdit = c => {
    const dbEntry = CDB.find(x => x.name === c.name);
    setF({ name:c.name,dose:c.dose,unit:c.unit,freq:c.frequency||c.freq,category:c.category,id:c.id });
    setSv(c.name); setTf(c.titration?.length?c.titration.map(t=>({...t})):[{week:1,dose:c.dose}]);
    setAiDesc(c.notes || dbEntry?.desc || ""); setModal("edit");
  };
  const handleAuto = r => { setSv(r.name); setF(p=>({...p,name:r.name,dose:r.dose,unit:r.unit,freq:r.freq,category:r.cat})); setAiDesc(r.desc||""); };
  const save = async () => {
    setSaving(true);
    const tit = tf.filter(t=>t.dose!==""&&t.dose!==undefined).map(t=>({week:Number(t.week),dose:Number(t.dose)}));
    if (modal==="add") {
      await onAdd({ name:f.name, dose:Number(f.dose), unit:f.unit, frequency:f.freq, status:"active", category:f.category, titration:tit, notes:aiDesc||null });
    } else {
      await onEdit(f.id, { name:f.name, dose:Number(f.dose), unit:f.unit, frequency:f.freq, category:f.category, titration:tit, notes:aiDesc||null });
    }
    setSaving(false); setModal(null);
  };
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
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>{[{l:"Dose",v:`${c.dose} ${c.unit}`},{l:"Freq",v:c.frequency||c.freq||"—"},{l:"Category",v:c.category}].map((d,i)=>(<div key={i}><div style={{ fontSize:9, color:"#27272a", textTransform:"uppercase", letterSpacing:"0.1em" }}>{d.l}</div><div style={{ fontSize:13, fontWeight:600, color:"#52525b", marginTop:3, fontFamily:"'Inter',sans-serif" }}>{d.v}</div></div>))}</div>
            {/* Compound description from DB notes or CDB lookup */}
            {(() => { const dbEntry = CDB.find(x => x.name === c.name); const desc = c.notes || dbEntry?.desc; return desc ? <p style={{ fontSize:11, color:"#3f3f46", margin:"10px 0 0", lineHeight:1.6, borderTop:"1px solid #0f0f11", paddingTop:10 }}>{desc}</p> : null; })()}
            <div style={{ display:"flex", gap:6, marginTop:14, paddingTop:12, borderTop:"1px solid #141416" }}>
              {[{l:"Edit",fn:()=>openEdit(c)},{l:c.status==="active"?"Pause":"Activate",fn:()=>onEdit(c.id,{status:c.status==="active"?"paused":"active"})},{l:"Remove",fn:()=>onRemove(c.id),d:true}].map((b,i)=>(<button key={i} onClick={b.fn} style={{ flex:1, height:36, background:"transparent", border:`1px solid ${b.d?"#7f1d1d":"#1e1e22"}`, color:b.d?"#ef4444":"#3f3f46", fontSize:10, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>{b.l}</button>))}
            </div>
          </div>
        ))}
      </div>
      <Mod open={!!modal} onClose={()=>setModal(null)} title={modal==="add"?"Add Compound":"Edit Compound"}>
        <AC value={sv} onChange={v=>{setSv(v);setF(p=>({...p,name:v}))}} onSelect={r => { handleAuto(r); setAiDesc(r.desc||""); }}/>
        {aiDesc && <div style={{ fontSize:11, color:"#52525b", lineHeight:1.6, padding:"10px 12px", background:"rgba(45,212,191,0.03)", border:"1px solid rgba(45,212,191,0.08)", marginBottom:14 }}>{aiDesc}</div>}
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
        <button onClick={save} disabled={!f.name||!f.dose||saving} style={{ width:"100%", height:44, background:(!f.name||!f.dose||saving)?"#111114":T, color:(!f.name||!f.dose||saving)?"#27272a":"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:(!f.name||!f.dose||saving)?"default":"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>{saving?"Saving...":(modal==="add"?"Add to Stack":"Save Changes")}</button>
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
              {log.weight_lbs>0&&<span style={{color:"#3f3f46"}}>Weight <span style={{color:"#71717a",fontWeight:600}}>{log.weight_lbs}lbs</span></span>}
              {log.sleep_score>0&&<span style={{color:"#3f3f46"}}>Sleep <span style={{color:"#71717a",fontWeight:600}}>{log.sleep_score}</span></span>}
              <span style={{color:"#3f3f46"}}>Mood <span style={{color:"#71717a",fontWeight:600}}>{log.mood}/10</span></span>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:(log.sideEffects||log.physique)?12:0 }}>
              {Object.entries(log.doses).map(([cid,dose])=>{const c=compounds.find(x=>x.id===cid);if(!c)return null;return(<span key={cid} style={{ fontSize:10, padding:"3px 8px", background:"rgba(45,212,191,0.04)", color:"rgba(45,212,191,0.6)", border:"1px solid rgba(45,212,191,0.08)", fontWeight:500 }}>{c.name}: {dose}{c.unit}</span>);})}
            </div>
            {log.side_effects&&<div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:log.physique_notes?10:0 }}>{log.side_effects.split(",").map((s,i)=><span key={i} style={{ fontSize:9, padding:"3px 8px", background:"rgba(239,68,68,0.06)", color:"#f87171", border:"1px solid rgba(239,68,68,0.1)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em" }}>{s.trim()}</span>)}</div>}
            {log.physique_notes&&<p style={{ fontSize:11, padding:"10px 12px", background:"rgba(45,212,191,0.03)", color:T, border:"1px solid rgba(45,212,191,0.08)", lineHeight:1.7, margin:0 }}>{log.physique_notes}</p>}
          </div>
        ))}
        {!logs.length&&<div style={{ textAlign:"center", padding:60, color:"#27272a", fontSize:12 }}>No logs yet.</div>}
      </div>
    </div>
  );
}

