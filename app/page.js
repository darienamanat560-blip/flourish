"use client";
import { useUser } from "@clerk/nextjs";
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
  { name:"Creatine Monohydrate", unit:"g", cat:"supplement", dose:5, freq:"daily", desc:"Increases ATP regeneration. Improves strength, power, and recovery.", stacks:["Beta-Alanine","Citrulline Malate"] },
  { name:"Berberine", unit:"mg", cat:"metabolic", dose:500, freq:"daily", desc:"Activates AMPK. Blood sugar regulation, insulin sensitivity, fat loss.", stacks:["Metformin","NAD+"] },
  { name:"Metformin", unit:"mg", cat:"longevity", dose:500, freq:"daily", desc:"AMPK activator for longevity, glucose control, and anti-aging.", stacks:["Berberine","NAD+"] },
  { name:"Magnesium Glycinate", unit:"mg", cat:"supplement", dose:400, freq:"daily", desc:"Improves sleep quality, reduces cortisol, muscle relaxation.", stacks:["Zinc","Ashwagandha"] },
  { name:"Ashwagandha", unit:"mg", cat:"supplement", dose:600, freq:"daily", desc:"Adaptogen. Reduces cortisol, improves strength and recovery.", stacks:["Magnesium Glycinate","Rhodiola Rosea"] },
  { name:"Rhodiola Rosea", unit:"mg", cat:"nootropic", dose:400, freq:"daily", desc:"Adaptogen for mental endurance, stress resilience, and fatigue.", stacks:["Ashwagandha","Selank"] },
  { name:"Vitamin D3/K2", unit:"IU", cat:"supplement", dose:5000, freq:"daily", desc:"Essential for testosterone production, immune function, bone density.", stacks:["Magnesium Glycinate","Zinc"] },
  { name:"Omega-3", unit:"g", cat:"supplement", dose:3, freq:"daily", desc:"Anti-inflammatory. Cardiovascular health, cognitive function.", stacks:["Vitamin D3/K2"] },
  { name:"Zinc", unit:"mg", cat:"supplement", dose:30, freq:"daily", desc:"Essential mineral for testosterone synthesis and immune function.", stacks:["Magnesium Glycinate","Vitamin D3/K2"] },
  { name:"SS-31", unit:"mg", cat:"recovery", dose:1, freq:"daily", desc:"Mitochondria-targeted peptide for cellular energy and recovery.", stacks:["BPC-157","NAD+"] },
  { name:"PT-141", unit:"mg", cat:"nootropic", dose:1, freq:"as needed", desc:"Melanocortin receptor agonist. Libido and sexual function.", stacks:["Testosterone"] },
  { name:"MOTS-c", unit:"mg", cat:"metabolic", dose:5, freq:"weekly", desc:"Mitochondrial peptide for fat metabolism and exercise performance.", stacks:["SS-31","NAD+"] },
  { name:"Thymosin Alpha-1", unit:"mg", cat:"recovery", dose:1.6, freq:"2x/week", desc:"Immune modulator. Reduces inflammation, supports immune function.", stacks:["BPC-157"] },
  { name:"Beta-Alanine", unit:"g", cat:"supplement", dose:3.2, freq:"daily", desc:"Buffers lactic acid. Improves muscular endurance.", stacks:["Creatine Monohydrate","Citrulline Malate"] },
  { name:"Citrulline Malate", unit:"g", cat:"supplement", dose:6, freq:"daily", desc:"Nitric oxide precursor. Pumps, endurance, reduced fatigue.", stacks:["Beta-Alanine","Creatine Monohydrate"] },
  // ── User-added / specialty compounds ──
  { name:"Testosterone Enanthate", unit:"mg", cat:"anabolic", dose:350, freq:"weekly", desc:"Long-ester injectable testosterone (7-day half-life). Gold standard for TRT and cycle base. Dose split EOD or E3.5D minimizes peaks.", stacks:["HCG","Aromasin","Anavar","HGH","BPC-157"] },
  { name:"Pregnenolone", unit:"mg", cat:"longevity", dose:25, freq:"daily", desc:"Neurosteroid precursor to all steroid hormones. Improves cognition, mood, and balances cortisol. Stacked with DHEA for synergy.", stacks:["DHEA","NAD+","Testosterone"] },
  { name:"Andractim (DHT Gel)", unit:"%", cat:"anabolic", dose:0.02, freq:"daily", desc:"Topical dihydrotestosterone gel. Enhances androgenic effects locally — libido, body comp, scalp/beard application.", stacks:["Testosterone","Finasteride"] },
  { name:"Topical Finasteride", unit:"%", cat:"ancillary", dose:0.02, freq:"daily", desc:"5-alpha reductase inhibitor applied topically to scalp. Blocks DHT conversion at hair follicles with minimal systemic absorption. Hair loss prevention.", stacks:["Testosterone Enanthate","Andractim (DHT Gel)"] },
  { name:"L-Carnitine L-Tartrate", unit:"g", cat:"metabolic", dose:4, freq:"daily", desc:"Most bioavailable carnitine form. Enhances fat oxidation, androgen receptor upregulation, reduces exercise-induced muscle damage. Take with carbs.", stacks:["Testosterone Enanthate","Creatine Monohydrate","Omega-3"] },
  { name:"Exemestane (Aromasin)", unit:"mg", cat:"ancillary", dose:12.5, freq:"E3D", desc:"Suicidal (irreversible) aromatase inhibitor. Prevents estrogen rebound. Preferred AI on testosterone cycles.", stacks:["Testosterone","Testosterone Enanthate","HCG"] },
  { name:"Anastrozole (Arimidex)", unit:"mg", cat:"ancillary", dose:0.25, freq:"EOD", desc:"Reversible aromatase inhibitor. Lowers estradiol on cycle. Lower dose preferred to avoid crushing E2.", stacks:["Testosterone","Testosterone Enanthate"] },
  { name:"Telmisartan", unit:"mg", cat:"longevity", dose:20, freq:"daily", desc:"ARB / PPAR-delta agonist. Cardioprotective, reduces blood pressure, improves insulin sensitivity. Common on TRT/cycle.", stacks:["Testosterone Enanthate","Omega-3"] },
  { name:"Dutasteride", unit:"mg", cat:"ancillary", dose:0.5, freq:"daily", desc:"Dual 5-AR inhibitor (types I and II). More complete DHT suppression than finasteride. Used for hair retention on cycle.", stacks:["Testosterone Enanthate","Topical Finasteride"] },
  { name:"HCG (Human Chorionic Gonadotropin)", unit:"IU", cat:"ancillary", dose:500, freq:"2x/week", desc:"Mimics LH to maintain testicular size and function during TRT/cycle. Prevents testicular atrophy.", stacks:["Testosterone Enanthate","Aromasin","Clomid"] },
  { name:"IGF-1 LR3", unit:"mcg", cat:"growth", dose:50, freq:"daily", desc:"Long-acting IGF-1 analog. Muscle hyperplasia (new cells), nutrient partitioning, enhanced recovery. Taken post-workout.", stacks:["HGH","BPC-157","Testosterone Enanthate"] },
  { name:"AOD-9604", unit:"mcg", cat:"metabolic", dose:300, freq:"daily", desc:"HGH fragment (176-191). Stimulates fat oxidation without insulin resistance or IGF-1 side effects of full HGH.", stacks:["CJC-1295/Ipamorelin","BPC-157"] },
  { name:"Sermorelin", unit:"mcg", cat:"growth", dose:300, freq:"daily", desc:"GHRH analog. Stimulates natural pulsatile GH release. Gentler alternative to HGH injections.", stacks:["Ipamorelin","CJC-1295/Ipamorelin"] },
  { name:"Stanozolol (Winstrol)", unit:"mg", cat:"anabolic", dose:25, freq:"daily", desc:"DHT-derived oral/injectable. Increases strength and vascularity without water retention. Drying compound.", stacks:["Testosterone Enanthate","Anavar"] },
  { name:"Tamoxifen (Nolvadex)", unit:"mg", cat:"ancillary", dose:20, freq:"daily", desc:"SERM that blocks estrogen at breast tissue. PCT staple. Also used to treat/prevent gyno on cycle.", stacks:["Clomid","HCG","Testosterone Enanthate"] },
  { name:"Kisspeptin-10", unit:"mcg", cat:"growth", dose:100, freq:"daily", desc:"Neuropeptide that triggers GnRH/LH/FSH release. Used for hormonal recovery and fertility support.", stacks:["HCG","Clomid","Enclomiphene"] },
  { name:"CoQ10 (Ubiquinol)", unit:"mg", cat:"longevity", dose:200, freq:"daily", desc:"Mitochondrial electron chain cofactor. Improves energy production, cardioprotective, antioxidant. Important on statin-adjacent protocols.", stacks:["NAD+","Omega-3","SS-31"] },
  { name:"TUDCA", unit:"mg", cat:"longevity", dose:500, freq:"daily", desc:"Bile acid with potent liver-protective and neuroprotective effects. Essential support compound on oral anabolic cycles.", stacks:["NAD+","Testosterone Enanthate"] },
  { name:"Milk Thistle (Silymarin)", unit:"mg", cat:"supplement", dose:500, freq:"daily", desc:"Liver support. Antioxidant and anti-inflammatory for hepatoprotection on oral compound cycles.", stacks:["TUDCA","NAD+"] },
  { name:"Taurine", unit:"g", cat:"supplement", dose:3, freq:"daily", desc:"Amino acid for cardiovascular health, muscle cramping prevention (esp. on diuretics), bile salt conjugation.", stacks:["Creatine Monohydrate","Magnesium Glycinate"] },
];

const CATS = ["growth","metabolic","recovery","anabolic","ancillary","SARM","nootropic","longevity","supplement","peptide","vitamin","other"];
const FREQS = ["daily","EOD","E3D","2x/week","3x/week","weekly","biweekly","as needed"];
const GOALS = ["Body recomposition","Fat loss","Lean mass gain","Strength","Recovery & healing","Cognitive enhancement","Longevity","Hormone optimization","Sleep quality","Mood & wellbeing"];
const LIFTS = ["Bench Press","Squat","Deadlift","Overhead Press","Barbell Row","Front Squat","Romanian Deadlift","Incline Bench"];
const CARDIO = ["Running","Cycling","Rowing","Swimming","Stairmaster"];

function fmtDate(d) { try { return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}); } catch { return d||""; } }
function td() { return new Date().toISOString().split("T")[0]; }

const LS = {display:"block",fontSize:10,fontWeight:600,color:"#52525b",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:6,fontFamily:"'JetBrains Mono',monospace"};
const IS = {width:"100%",height:42,background:"rgba(255,255,255,0.02)",border:"1px solid #1e1e22",padding:"0 14px",color:"#e4e4e7",fontSize:13,fontFamily:"'JetBrains Mono',monospace",transition:"border-color .2s",outline:"none",boxSizing:"border-box"};
const HS = {fontSize:22,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",margin:0,letterSpacing:"-0.02em"};

async function api(path, opts={}, timeoutMs=28000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(path, {
      headers:{"Content-Type":"application/json"},
      ...opts,
      signal: ctrl.signal,
      body:opts.body?JSON.stringify(opts.body):undefined
    });
    clearTimeout(timer);
    if (!r.ok) {
      const errText = await r.text().catch(()=>"");
      throw new Error("API "+path+" -> "+r.status+": "+errText.slice(0,200));
    }
    return r.json();
  } catch(e) {
    clearTimeout(timer);
    if (e.name === "AbortError") throw new Error("Request timed out. Try again.");
    throw e;
  }
}

// Robustly extract JSON from AI response that may have extra text around it
function extractJSON(text) {
  if (!text) throw new Error("Empty response");
  // Try direct parse first
  const clean = text.replace(/```json|```/g,"").trim();
  try { return JSON.parse(clean); } catch {}
  // Find first { ... } block
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end+1)); } catch {}
  }
  // Find first [ ... ] block  
  const as = clean.indexOf("[");
  const ae = clean.lastIndexOf("]");
  if (as !== -1 && ae > as) {
    try { return JSON.parse(clean.slice(as, ae+1)); } catch {}
  }
  throw new Error("Could not parse AI response as JSON: " + clean.slice(0,100));
}

function CursorGlow() {
  const ref = useRef(null);
  const pos = useRef({x:-400,y:-400});
  const cur = useRef({x:-400,y:-400});
  const raf = useRef(null);
  useEffect(()=>{
    const mv=e=>{pos.current={x:e.clientX,y:e.clientY};};
    window.addEventListener("mousemove",mv);
    const lerp=(a,b,t)=>a+(b-a)*t;
    const tick=()=>{
      cur.current.x=lerp(cur.current.x,pos.current.x,0.06);
      cur.current.y=lerp(cur.current.y,pos.current.y,0.06);
      if(ref.current)ref.current.style.transform=`translate(${cur.current.x}px,${cur.current.y}px)`;
      raf.current=requestAnimationFrame(tick);
    };
    raf.current=requestAnimationFrame(tick);
    return()=>{window.removeEventListener("mousemove",mv);cancelAnimationFrame(raf.current);};
  },[]);
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div ref={ref} style={{position:"absolute",top:-300,left:-300,width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle, rgba(45,212,191,0.13) 0%, rgba(45,212,191,0.05) 35%, transparent 70%)",willChange:"transform"}}/>
    </div>
  );
}

function SplashScreen() {
  return (
    <div style={{minHeight:"100vh",background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,fontFamily:"'JetBrains Mono',monospace"}}>
      <CursorGlow/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(45,212,191,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.025) 1px, transparent 1px)",backgroundSize:"48px 48px"}}/>
      <div style={{display:"flex",alignItems:"center",gap:10,position:"relative"}}>
        <svg width="14" height="20" viewBox="0 0 24 34" fill="none">
          <rect x="6" y="1" width="12" height="5" rx="1" fill="#2dd4bf"/>
          <path d="M7 6V9H17V6" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/>
          <path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/>
          <path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill="#2dd4bf"/>
        </svg>
        <span style={{fontSize:16,fontFamily:"'Inter',sans-serif",color:"#fff",letterSpacing:"-0.02em"}}><b>flour</b><span style={{fontWeight:300}}>ish</span></span>
      </div>
      <div style={{width:24,height:24,border:"1.5px solid #1e1e22",borderTopColor:"#2dd4bf",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    </div>
  );
}

function Sp({data,h=28}) {
  if(!data||data.length<2)return null;
  const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1,W=200;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{width:"100%",height:h,overflow:"visible"}}>
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.12"/><stop offset="100%" stopColor="#2dd4bf" stopOpacity="0"/></linearGradient></defs>
      <polygon fill="url(#sg)" points={`0,${h} ${data.map((v,i)=>`${(i/(data.length-1))*W},${h-((v-mn)/r)*(h-8)-4}`).join(" ")} ${W},${h}`}/>
      <polyline fill="none" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" points={data.map((v,i)=>`${(i/(data.length-1))*W},${h-((v-mn)/r)*(h-8)-4}`).join(" ")}/>
      <circle cx={W} cy={h-((data[data.length-1]-mn)/r)*(h-8)-4} r="3" fill="#2dd4bf"/>
    </svg>
  );
}

function SL({children,right}) {
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12,padding:"0 2px"}}><span style={LS}>{children}</span>{right&&<span style={{fontSize:10,color:"#3f3f46",fontFamily:"'JetBrains Mono',monospace"}}>{right}</span>}</div>;
}

function Mod({open,onClose,title,children}) {
  useEffect(()=>{
    if(open)document.body.style.overflow="hidden";
    else document.body.style.overflow="";
    return()=>{document.body.style.overflow="";};
  },[open]);
  if(!open)return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)"}}/>
      <div style={{position:"relative",zIndex:10000,width:"100%",maxWidth:540,maxHeight:"88vh",overflowY:"auto",background:"#09090b",borderTop:"1px solid #27272a",borderLeft:"1px solid #1e1e22",borderRight:"1px solid #1e1e22",borderRadius:"16px 16px 0 0",animation:"slideUp .28s cubic-bezier(0.16,1,0.3,1)"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:"#27272a",borderRadius:2,margin:"12px auto 0"}}/>
        <div style={{position:"sticky",top:0,background:"#09090b",borderBottom:"1px solid #141416",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:15,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",letterSpacing:"-0.01em"}}>{title}</span>
          <button onClick={onClose} style={{width:28,height:28,background:"transparent",border:"1px solid #27272a",color:"#52525b",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4}}>&times;</button>
        </div>
        <div style={{padding:"20px 20px 32px"}}>{children}</div>
      </div>
    </div>
  );
}

function AC({value,onChange,onSelect,placeholder="Search compounds, peptides, supplements..."}) {
  const [open,setOpen]=useState(false);
  const [res,setRes]=useState([]);
  const [aiRes,setAiRes]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [userLib,setUserLib]=useState([]);
  const ref=useRef(null);
  const timer=useRef(null);

  // Load user's personal compound library on mount
  useEffect(()=>{
    fetch("/api/compounds/research").then(r=>r.ok?r.json():[]).then(d=>{
      if(Array.isArray(d)) setUserLib(d.map(c=>({
        name:c.name, dose:null, unit:null, freq:c.timing||"daily",
        cat:c.category||"other", desc:c.summary||c.mechanism||"",
        stacks:c.synergies||[], _learned:true
      })));
    }).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!value){setOpen(false);setRes([]);setAiRes(null);return;}
    // Merge CDB + user learned library, deduplicate by name
    const allKnown = [...CDB, ...userLib.filter(u=>!CDB.some(c=>c.name.toLowerCase()===u.name.toLowerCase()))];
    const local=allKnown.filter(c=>c.name.toLowerCase().includes(value.toLowerCase())).slice(0,7);
    setRes(local);setOpen(true);
    clearTimeout(timer.current);
    if(value.length>=2){
      timer.current=setTimeout(async()=>{
        setAiLoading(true);
        try{
          const d=await api("/api/ai",{method:"POST",body:{model:"claude-sonnet-4-6",max_tokens:250,messages:[{role:"user",content:`User typed "${value}" in a compound/supplement/peptide search. Respond with ONLY a JSON object (no markdown, no explanation, start with {): {"name":"full compound name","dose":number,"unit":"mg or mcg or IU or g","freq":"daily or weekly etc","cat":"recovery or growth or anabolic or metabolic or ancillary or SARM or nootropic or longevity or supplement","desc":"one sentence what it does"}`}]}},8000);
          const txt=(d.content||[]).map(i=>i.text||"").join("");
          const parsed=extractJSON(txt);
          const already=local.some(l=>l.name.toLowerCase()===parsed.name.toLowerCase());
          setAiRes(already?null:{...parsed,_ai:true});
        }catch{setAiRes(null);}
        setAiLoading(false);
      },500);
    }
    return()=>clearTimeout(timer.current);
  },[value]);

  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const all=aiRes?[...res,aiRes]:res;
  return (
    <div ref={ref} style={{position:"relative",marginBottom:14}}>
      <label style={LS}>Compound Name</label>
      <div style={{position:"relative"}}>
        <input type="text" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>{if(all.length)setOpen(true);}} placeholder={placeholder} style={IS}
          onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>{setTimeout(()=>e.target.style.borderColor="#1e1e22",200);}}/>
        {aiLoading&&<div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,border:"1.5px solid #27272a",borderTopColor:"#2dd4bf",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
      </div>
      {open&&all.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:500,marginTop:2,background:"#0a0a0c",border:"1px solid #1e1e22",maxHeight:300,overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.9)",borderRadius:4}}>
          {all.map((r,i)=>(
            <button key={i} onClick={()=>{onSelect(r);setOpen(false);setAiRes(null);}} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"12px 14px",background:"transparent",border:"none",borderBottom:"1px solid #0f0f11",cursor:"pointer",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="#111114"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#e4e4e7",fontFamily:"'Inter',sans-serif"}}>{r.name}</span>
                  {r._ai&&<span style={{fontSize:8,padding:"1px 5px",background:"rgba(45,212,191,0.08)",color:"#2dd4bf",border:"1px solid rgba(45,212,191,0.15)",letterSpacing:"0.08em"}}>AI</span>}
                  {r._learned&&<span style={{fontSize:8,padding:"1px 5px",background:"rgba(139,92,246,0.08)",color:"#a78bfa",border:"1px solid rgba(139,92,246,0.15)",letterSpacing:"0.08em"}}>saved</span>}
                </div>
                <div style={{fontSize:10,color:"#3f3f46",fontFamily:"'JetBrains Mono',monospace"}}>{r.dose} {r.unit} · {r.freq}</div>
                {r.desc&&<div style={{fontSize:10,color:"#52525b",marginTop:4,lineHeight:1.5}}>{r.desc}</div>}
              </div>
              <span style={{flexShrink:0,fontSize:9,padding:"2px 7px",background:"rgba(45,212,191,0.06)",color:"#2dd4bf",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,border:"1px solid rgba(45,212,191,0.1)",marginLeft:10,marginTop:2}}>{r.cat}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProtocolBuilder({onComplete,userName}) {
  const [path,setPath]=useState(null);
  const [step,setStep]=useState(0);
  const [name,setName]=useState(userName||"");
  const [experience,setExperience]=useState("");
  const [age,setAge]=useState("");
  const [weight,setWeight]=useState("");
  const [goals,setGoals]=useState([]);
  const [healthNotes,setHealthNotes]=useState("");
  const [knownCompounds,setKnownCompounds]=useState([]);
  const [compSearch,setCompSearch]=useState("");
  const [constraints,setConstraints]=useState([]);
  const [currentStack,setCurrentStack]=useState("");
  const [generating,setGenerating]=useState(false);
  const [protocol,setProtocol]=useState(null);
  const [protocolName,setProtocolName]=useState("");
  const [error,setError]=useState("");

  const CONSTRAINTS=["No injectables","Oral only","Beginner-friendly","Avoid stimulants","Keep it simple (<=4 compounds)","Low cost","No suppression","Minimal side effects"];
  const toggleG=g=>setGoals(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const toggleC=c=>setConstraints(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);
  const addKnown=c=>{if(!knownCompounds.find(x=>x.name===c.name))setKnownCompounds(p=>[...p,c]);setCompSearch("");};

  const buildPrompt=()=>{
    const base=`You are a precision protocol advisor for compounds, peptides, and supplements.\n\nUser: ${experience} experience, ${age||"?"}y, ${weight||"?"}lbs\nGoals: ${goals.join(", ")}${healthNotes?"\nHealth/notes: "+healthNotes:""}${constraints.length?"\nConstraints: "+constraints.join(", "):""}`;
    if(path==="guided"&&knownCompounds.length>0){
      return base+`\n\nUser wants to include: ${knownCompounds.map(c=>`${c.name} (${c.dose}${c.unit} ${c.freq})`).join(", ")}.\n${currentStack?"Currently using: "+currentStack:""}\n\nBuild a complete protocol AROUND these specific compounds. Add complementary support compounds, ancillaries, and peptides. Keep the user's chosen compounds. Optimize doses for their experience.`;
    }
    return base+`\n${currentStack?"Currently using: "+currentStack+"\n":""}\nGenerate a complete, personalized protocol. Include peptides, supplements, and support compounds.`;
  };

  const generate=async()=>{
    setGenerating(true);setError("");
    try{
      const d=await api("/api/ai",{method:"POST",body:{model:"claude-sonnet-4-6",max_tokens:1800,messages:[{role:"user",content:buildPrompt()+`

Respond with ONLY a JSON object. No explanation, no markdown, no code fences. Start your response with { and end with }.

Required format:
{"cycleName":"descriptive name","summary":"2-3 sentences on protocol and expected outcomes","compounds":[{"name":"compound name","dose":0,"unit":"mg/mcg/IU/g","freq":"daily/weekly/EOD/2x/week/etc","cat":"anabolic/metabolic/recovery/ancillary/growth/nootropic/longevity/supplement","desc":"what this compound does","reason":"why included for this specific user","timing":"when to take, e.g. morning, pre-workout, before bed"}]}`}]}},28000);
      const txt=(d.content||[]).map(i=>i.text||"").join("");
      const parsed=extractJSON(txt);
      if(!parsed.compounds||!Array.isArray(parsed.compounds))throw new Error("No compounds array in response");
      setProtocol(parsed);setProtocolName(parsed.cycleName||"My Protocol");setStep(99);
    }catch(e){
      console.error("generate error:",e);
      setError(e.message||"Generation failed. Check your connection and try again.");
    }
    setGenerating(false);
  };

  const finish=async()=>{
    await onComplete({
      profile:{name,experience,age,weight,goals,health:healthNotes},
      cycle:{name:protocolName,goals,compounds:(protocol?.compounds||[]).map(c=>({name:c.name,dose:Number(c.dose)||0,unit:c.unit||"mg",frequency:c.freq||"daily",status:"active",category:c.cat||"other",titration:[{week:1,dose:Number(c.dose)||0}],notes:[c.reason,c.timing,c.desc].filter(Boolean).join(" | ")||null}))}
    });
  };

  const bg={minHeight:"100vh",background:"#000",color:"#e4e4e7",fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px"};
  const card={width:"100%",maxWidth:480,animation:"fadeIn .35s ease"};
  const h1s={fontSize:22,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",margin:"0 0 6px",letterSpacing:"-0.02em"};
  const subs={fontSize:12,color:"#3f3f46",margin:"0 0 28px",lineHeight:1.6};
  const tabBtn=(on)=>({flex:1,padding:"12px 0",border:`1px solid ${on?"rgba(45,212,191,0.3)":"#1e1e22"}`,background:on?"rgba(45,212,191,0.04)":"transparent",color:on?"#2dd4bf":"#52525b",fontSize:11,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",transition:"all .15s"});
  const priBtn=(dis)=>({width:"100%",height:46,background:dis?"#111114":"#2dd4bf",color:dis?"#27272a":"#000",border:"none",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:dis?"default":"pointer",letterSpacing:"0.08em",textTransform:"uppercase"});
  const backBtn={width:"100%",height:36,background:"transparent",border:"1px solid #1e1e22",color:"#3f3f46",fontSize:10,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",marginTop:8};

  const Logo=()=>(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:36}}>
      <svg width="12" height="18" viewBox="0 0 24 34" fill="none">
        <rect x="6" y="1" width="12" height="5" rx="1" fill="#2dd4bf"/>
        <path d="M7 6V9H17V6" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/>
        <path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/>
        <path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill="#2dd4bf"/>
      </svg>
      <span style={{fontSize:14,fontFamily:"'Inter',sans-serif",color:"#fff"}}><b>flour</b><span style={{fontWeight:300}}>ish</span></span>
    </div>
  );

  if(step===99&&protocol)return(
    <div style={bg}><CursorGlow/>
    <div style={{...card,maxWidth:520}}>
      <Logo/>
      <h1 style={h1s}>Your Protocol</h1>
      <p style={subs}>{protocol.summary}</p>
      <div style={{marginBottom:16}}><label style={LS}>Protocol Name</label><input value={protocolName} onChange={e=>setProtocolName(e.target.value)} style={IS} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {(protocol.compounds||[]).map((c,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1e1e22",padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div><div style={{fontSize:13,fontWeight:600,color:"#e4e4e7",fontFamily:"'Inter',sans-serif"}}>{c.name}</div><div style={{fontSize:10,color:"#52525b",marginTop:2}}>{c.dose} {c.unit} · {c.freq}{c.timing?" · "+c.timing:""}</div></div>
              <span style={{fontSize:9,padding:"2px 7px",background:"rgba(45,212,191,0.06)",color:"#2dd4bf",border:"1px solid rgba(45,212,191,0.1)",textTransform:"uppercase",letterSpacing:"0.06em",flexShrink:0,marginLeft:8}}>{c.cat}</span>
            </div>
            {c.desc&&<p style={{fontSize:10,color:"#3f3f46",margin:0,lineHeight:1.5}}>{c.desc}</p>}
            {c.reason&&<p style={{fontSize:10,color:"rgba(45,212,191,0.5)",margin:"4px 0 0",lineHeight:1.4}}>why: {c.reason}</p>}
          </div>
        ))}
      </div>
      <button onClick={finish} style={priBtn(false)}>Start This Protocol</button>
      <button onClick={()=>{setStep(path==="guided"?3:2);setProtocol(null);}} style={backBtn}>Regenerate</button>
    </div></div>
  );

  if(generating)return(
    <div style={{...bg,flexDirection:"column",gap:20}}><CursorGlow/>
    <div style={{width:28,height:28,border:"1.5px solid #1e1e22",borderTopColor:"#2dd4bf",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    <div style={{textAlign:"center"}}>
      <p style={{fontSize:13,color:"#fff",fontFamily:"'Inter',sans-serif",margin:"0 0 4px"}}>Building your protocol...</p>
      <p style={{fontSize:11,color:"#3f3f46",margin:0}}>Usually 10–20 seconds</p>
    </div>
    </div>
  );

  if(error&&!generating&&!protocol)return(
    <div style={{...bg,flexDirection:"column",gap:16}}><CursorGlow/>
    <div style={{textAlign:"center",maxWidth:360}}>
      <div style={{fontSize:32,marginBottom:16}}>⚠</div>
      <p style={{fontSize:14,color:"#fff",fontFamily:"'Inter',sans-serif",margin:"0 0 8px",fontWeight:600}}>Generation failed</p>
      <p style={{fontSize:12,color:"#52525b",margin:"0 0 24px",lineHeight:1.6,wordBreak:"break-word"}}>{error}</p>
      <button onClick={()=>{setError("");generate();}} style={{width:"100%",height:44,background:"#2dd4bf",color:"#000",border:"none",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Try Again</button>
      <button onClick={()=>{setError("");setStep(path==="guided"?3:2);}} style={{width:"100%",height:36,background:"transparent",border:"1px solid #1e1e22",color:"#3f3f46",fontSize:10,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer"}}>Back</button>
    </div>
    </div>
  );

  if(!path)return(
    <div style={bg}><CursorGlow/>
    <div style={card}><Logo/>
      <h1 style={h1s}>Build your protocol.</h1>
      <p style={subs}>Choose how you want to start.</p>
      {[{key:"guided",label:"I know what I want",sub:"Add specific compounds. AI fills in the gaps and builds around them."},{key:"ai",label:"Generate for me",sub:"Answer a few questions. AI builds a complete protocol from scratch."}].map(o=>(
        <button key={o.key} onClick={()=>{setPath(o.key);setStep(0);}} style={{width:"100%",textAlign:"left",padding:"18px 20px",background:"rgba(255,255,255,0.02)",border:"1px solid #1e1e22",color:"#e4e4e7",cursor:"pointer",marginBottom:10,transition:"all .15s",display:"block"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#2dd4bf";e.currentTarget.style.background="rgba(45,212,191,0.03)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e1e22";e.currentTarget.style.background="rgba(255,255,255,0.02)";}}>
          <div style={{fontSize:14,fontWeight:600,fontFamily:"'Inter',sans-serif",marginBottom:4}}>{o.label}</div>
          <div style={{fontSize:11,color:"#3f3f46"}}>{o.sub}</div>
        </button>
      ))}
      <div style={{marginTop:24}}><label style={LS}>Your name (optional)</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" style={IS} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
    </div></div>
  );

  if(step===0)return(
    <div style={bg}><CursorGlow/>
    <div style={card}><Logo/>
      <h1 style={h1s}>About you</h1>
      <p style={subs}>Used to tailor doses and compound selection.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
        {[["Age","age",age,setAge,"28"],["Weight (lbs)","weight",weight,setWeight,"175"]].map(([l,k,v,sv,ph])=>(
          <div key={k} style={{marginBottom:14}}><label style={LS}>{l}</label><input type="number" placeholder={ph} value={v} onChange={e=>sv(e.target.value)} style={IS} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
        ))}
      </div>
      <label style={LS}>Experience Level</label>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {["beginner","intermediate","advanced"].map(lv=><button key={lv} onClick={()=>setExperience(lv)} style={tabBtn(experience===lv)}>{lv}</button>)}
      </div>
      <div style={{marginBottom:20}}><label style={LS}>Health notes / sensitivities (optional)</label><textarea value={healthNotes} onChange={e=>setHealthNotes(e.target.value)} placeholder="Prior cycles, conditions, medications..." rows={2} style={{...IS,height:"auto",minHeight:60,padding:"10px 14px",resize:"vertical"}} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
      <button onClick={()=>setStep(1)} disabled={!experience} style={priBtn(!experience)}>Continue</button>
      <button onClick={()=>setPath(null)} style={backBtn}>Back</button>
    </div></div>
  );

  if(step===1)return(
    <div style={bg}><CursorGlow/>
    <div style={card}><Logo/>
      <h1 style={h1s}>Your goals</h1>
      <p style={subs}>Select all that apply.</p>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:24}}>
        {GOALS.map(g=>{const on=goals.includes(g);return(
          <button key={g} onClick={()=>toggleG(g)} style={{padding:"13px 16px",border:`1px solid ${on?"rgba(45,212,191,0.25)":"#1e1e22"}`,background:on?"rgba(45,212,191,0.04)":"transparent",color:on?"#fff":"#52525b",fontSize:13,fontFamily:"'Inter',sans-serif",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all .1s"}}>
            {g}
            {on&&<svg width="14" height="14" viewBox="0 0 20 20" fill="#2dd4bf"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
          </button>
        );})}
      </div>
      <button onClick={()=>setStep(2)} disabled={!goals.length} style={priBtn(!goals.length)}>Continue</button>
      <button onClick={()=>setStep(0)} style={backBtn}>Back</button>
    </div></div>
  );

  if(step===2)return(
    <div style={bg}><CursorGlow/>
    <div style={card}><Logo/>
      <h1 style={h1s}>Any constraints?</h1>
      <p style={subs}>Optional filters to shape your protocol.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
        {CONSTRAINTS.map(c=>{const on=constraints.includes(c);return(
          <button key={c} onClick={()=>toggleC(c)} style={{padding:"8px 14px",border:`1px solid ${on?"rgba(45,212,191,0.25)":"#1e1e22"}`,background:on?"rgba(45,212,191,0.04)":"transparent",color:on?"#2dd4bf":"#52525b",fontSize:11,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",transition:"all .1s"}}>{c}</button>
        );})}
      </div>
      <div style={{marginBottom:20}}><label style={LS}>Currently using (optional)</label><textarea value={currentStack} onChange={e=>setCurrentStack(e.target.value)} placeholder="e.g. Creatine 5g daily, Vitamin D3 5000IU..." rows={2} style={{...IS,height:"auto",minHeight:56,padding:"10px 14px",resize:"vertical"}} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
      {error&&<div style={{fontSize:11,color:"#f87171",padding:"10px 12px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",marginBottom:14}}>{error}</div>}
      {path==="guided"?(<><button onClick={()=>setStep(3)} style={priBtn(false)}>Continue</button><button onClick={()=>setStep(1)} style={backBtn}>Back</button></>):(<><button onClick={generate} style={priBtn(false)}>Generate My Protocol</button><button onClick={()=>setStep(1)} style={backBtn}>Back</button></>)}
    </div></div>
  );

  if(step===3&&path==="guided")return(
    <div style={bg}><CursorGlow/>
    <div style={{...card,maxWidth:520}}><Logo/>
      <h1 style={h1s}>What do you want to include?</h1>
      <p style={subs}>Search any compound, peptide, or supplement. AI builds around your choices.</p>
      <AC value={compSearch} onChange={setCompSearch} onSelect={addKnown}/>
      {knownCompounds.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={LS}>Selected ({knownCompounds.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {knownCompounds.map(c=>(
              <div key={c.name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(45,212,191,0.03)",border:"1px solid rgba(45,212,191,0.12)"}}>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#e4e4e7",fontFamily:"'Inter',sans-serif"}}>{c.name}</div><div style={{fontSize:10,color:"#52525b",marginTop:1}}>{c.dose} {c.unit} · {c.freq}</div></div>
                <button onClick={()=>setKnownCompounds(p=>p.filter(x=>x.name!==c.name))} style={{background:"transparent",border:"none",color:"#3f3f46",cursor:"pointer",fontSize:16,padding:"0 4px"}}>&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {error&&<div style={{fontSize:11,color:"#f87171",padding:"10px 12px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",marginBottom:14}}>{error}</div>}
      <button onClick={generate} style={priBtn(false)}>{knownCompounds.length>0?"Build Protocol Around These":"Generate Full Protocol"}</button>
      <button onClick={()=>setStep(2)} style={backBtn}>Back</button>
    </div></div>
  );

  return null;
}

function StackView({compounds,cycleId,onAdd,onEdit,onRemove}) {
  const [modal,setModal]=useState(null);
  const [editTarget,setEditTarget]=useState(null);
  const [saving,setSaving]=useState(false);
  const [aiDesc,setAiDesc]=useState("");
  const [sv,setSv]=useState("");
  const [fname,setFname]=useState("");
  const [fdose,setFdose]=useState("");
  const [funit,setFunit]=useState("mg");
  const [ffreq,setFfreq]=useState("daily");
  const [fcat,setFcat]=useState("growth");
  const [ftit,setFtit]=useState([{week:1,dose:""}]);

  const openAdd=()=>{setSv("");setFname("");setFdose("");setFunit("mg");setFfreq("daily");setFcat("growth");setFtit([{week:1,dose:""}]);setAiDesc("");setEditTarget(null);setModal("add");};
  const openEdit=c=>{
    if(!c)return;
    const db=CDB.find(x=>x.name===c.name);
    setSv(c.name||"");setFname(c.name||"");setFdose(String(c.dose||""));setFunit(c.unit||"mg");setFfreq(c.frequency||c.freq||"daily");setFcat(c.category||"other");
    setFtit(c.titration?.length?c.titration.map(t=>({...t})):[{week:1,dose:c.dose||""}]);
    setAiDesc(c.notes||db?.desc||"");setEditTarget(c);setModal("edit");
  };
  const handleSelect=r=>{setSv(r.name);setFname(r.name);setFdose(String(r.dose||""));setFunit(r.unit||"mg");setFfreq(r.freq||"daily");setFcat(r.cat||"other");setAiDesc(r.desc||"");};
  const save=async()=>{
    if(!fname||!fdose)return;
    setSaving(true);
    const tit=ftit.filter(t=>t.dose!==""&&t.dose!==undefined).map(t=>({week:Number(t.week),dose:Number(t.dose)}));
    // Look up desc from CDB or use aiDesc
    const cdbEntry = CDB.find(x=>x.name.toLowerCase()===fname.toLowerCase());
    const notes = aiDesc || cdbEntry?.desc || null;
    const payload={name:fname,dose:Number(fdose),unit:funit,frequency:ffreq,status:"active",category:fcat,titration:tit,notes};
    try{
      if(modal==="add"){
        await onAdd(payload);
        // Fire-and-forget AI research on new compound
        // Check if it's already in CDB first
        const inCDB = CDB.some(x=>x.name.toLowerCase()===fname.toLowerCase());
        if(!inCDB){
          fetch("/api/compounds/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:fname,dose:Number(fdose),unit:funit,freq:ffreq,cat:fcat})}).catch(()=>{});
        }
      } else if(editTarget){
        await onEdit(editTarget.id,payload);
      }
    }catch(e){console.error("save:",e);}
    setSaving(false);setModal(null);
  };

  const safe=Array.isArray(compounds)?compounds:[];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><h1 style={HS}>Stack</h1><p style={{fontSize:11,color:"#3f3f46",marginTop:4}}>{safe.length} compounds</p></div>
        <button onClick={openAdd} style={{height:36,padding:"0 16px",background:"transparent",border:"1px solid #1e1e22",color:"#52525b",fontSize:11,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{e.target.style.borderColor="#2dd4bf";e.target.style.color="#2dd4bf";}} onMouseLeave={e=>{e.target.style.borderColor="#1e1e22";e.target.style.color="#52525b";}}>+ Add</button>
      </div>
      {safe.length===0&&(
        <div style={{textAlign:"center",padding:"48px 20px",border:"1px dashed #1e1e22"}}>
          <p style={{fontSize:13,color:"#27272a",margin:"0 0 16px"}}>No compounds yet</p>
          <button onClick={openAdd} style={{fontSize:11,color:"#2dd4bf",background:"transparent",border:"1px solid rgba(45,212,191,0.2)",padding:"8px 20px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>+ Add your first compound</button>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {safe.map(c=>{
          if(!c||!c.id)return null;
          const db=CDB.find(x=>x.name===c.name);
          const desc=c.notes||db?.desc;
          const freq=c.frequency||c.freq||"—";
          return(
            <div key={c.id} className="c" style={{padding:"16px 18px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:c.status==="active"?"#2dd4bf":"#27272a",flexShrink:0}}/>
                <span style={{flex:1,fontSize:14,fontWeight:600,color:"#e4e4e7",fontFamily:"'Inter',sans-serif"}}>{c.name||"Unnamed"}</span>
                <span style={{fontSize:9,padding:"2px 8px",background:c.status==="active"?"rgba(45,212,191,0.06)":"#111114",color:c.status==="active"?"#2dd4bf":"#3f3f46",border:`1px solid ${c.status==="active"?"rgba(45,212,191,0.1)":"#1e1e22"}`,textTransform:"uppercase",fontWeight:600,letterSpacing:"0.06em"}}>{c.status||"active"}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:desc?10:0}}>
                {[{l:"Dose",v:`${c.dose||"?"} ${c.unit||""}`},{l:"Freq",v:freq},{l:"Category",v:c.category||"—"}].map((d,i)=>(
                  <div key={i}><div style={{fontSize:9,color:"#27272a",textTransform:"uppercase",letterSpacing:"0.1em"}}>{d.l}</div><div style={{fontSize:12,fontWeight:600,color:"#52525b",marginTop:3,fontFamily:"'Inter',sans-serif"}}>{d.v}</div></div>
                ))}
              </div>
              {desc&&<p style={{fontSize:11,color:"#3f3f46",margin:"0 0 12px",lineHeight:1.6,borderTop:"1px solid #0f0f11",paddingTop:10}}>{desc}</p>}
              <div style={{display:"flex",gap:6,paddingTop:12,borderTop:"1px solid #141416"}}>
                {[{l:"Edit",fn:()=>openEdit(c)},{l:c.status==="active"?"Pause":"Activate",fn:()=>onEdit(c.id,{status:c.status==="active"?"paused":"active"})},{l:"Remove",fn:()=>onRemove(c.id),d:true}].map((b,i)=>(
                  <button key={i} onClick={b.fn} style={{flex:1,height:36,background:"transparent",border:`1px solid ${b.d?"#7f1d1d":"#1e1e22"}`,color:b.d?"#ef4444":"#3f3f46",fontSize:10,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",transition:"all .1s"}}>{b.l}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Mod open={!!modal} onClose={()=>setModal(null)} title={modal==="add"?"Add Compound":"Edit Compound"}>
        <AC value={sv} onChange={v=>{setSv(v);setFname(v);}} onSelect={handleSelect}/>
        {aiDesc&&<div style={{fontSize:11,color:"#52525b",lineHeight:1.6,padding:"10px 12px",background:"rgba(45,212,191,0.03)",border:"1px solid rgba(45,212,191,0.08)",marginBottom:14}}>{aiDesc}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <div style={{marginBottom:14}}><label style={LS}>Dose</label><input type="number" value={fdose} onChange={e=>setFdose(e.target.value)} style={IS} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
          <div style={{marginBottom:14}}><label style={LS}>Unit</label><input value={funit} onChange={e=>setFunit(e.target.value)} style={IS} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <div style={{marginBottom:14}}><label style={LS}>Frequency</label><select value={ffreq} onChange={e=>setFfreq(e.target.value)} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{FREQS.map(o=><option key={o}>{o}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={LS}>Category</label><select value={fcat} onChange={e=>setFcat(e.target.value)} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{CATS.map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={LS}>Titration</span>
            <button onClick={()=>setFtit(p=>[...p,{week:p.length?Number(p[p.length-1].week)+1:1,dose:""}])} style={{fontSize:10,color:"#2dd4bf",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>+ Week</button>
          </div>
          {ftit.map((t,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"50px 1fr 28px",gap:8,marginBottom:6,alignItems:"center"}}>
              <input type="number" placeholder="Wk" value={t.week} onChange={e=>{const v=[...ftit];v[i].week=e.target.value;setFtit(v);}} style={{...IS,height:32,textAlign:"center",fontSize:11}}/>
              <input type="number" placeholder="Dose" value={t.dose} onChange={e=>{const v=[...ftit];v[i].dose=e.target.value;setFtit(v);}} style={{...IS,height:32,fontSize:11}}/>
              <button onClick={()=>setFtit(p=>p.filter((_,j)=>j!==i))} style={{width:28,height:28,background:"#111114",border:"1px solid #1e1e22",color:"#3f3f46",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>&times;</button>
            </div>
          ))}
        </div>
        <button onClick={save} disabled={!fname||!fdose||saving} style={{width:"100%",height:44,background:(!fname||!fdose||saving)?"#111114":"#2dd4bf",color:(!fname||!fdose||saving)?"#27272a":"#000",border:"none",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:(!fname||!fdose||saving)?"default":"pointer",letterSpacing:"0.08em",textTransform:"uppercase"}}>
          {saving?"Saving...":(modal==="add"?"Add to Stack":"Save Changes")}
        </button>
      </Mod>
    </div>
  );
}

function LogView({compounds,onSave}) {
  const active=(compounds||[]).filter(c=>c.status==="active");
  const [ck,setCk]=useState({});const [cd,setCd]=useState({});
  const [f,setF]=useState({weight:"",sleep:"",hrv:"",mood:7,stress:5,appetite:5,energy:7,sideEffects:"",physique:""});
  const save=()=>{
    const doses={};
    Object.keys(ck).filter(k=>ck[k]).forEach(id=>{const c=(compounds||[]).find(x=>x.id===id);doses[id]=cd[id]!==undefined?Number(cd[id]):c?.dose;});
    onSave({date:td(),weight_lbs:Number(f.weight)||null,sleep_score:Number(f.sleep)||null,hrv:Number(f.hrv)||null,mood:f.mood,stress:f.stress,appetite:f.appetite,energy:f.energy,side_effects:f.sideEffects||null,physique_notes:f.physique||null,doses});
    setCk({});setCd({});setF({weight:"",sleep:"",hrv:"",mood:7,stress:5,appetite:5,energy:7,sideEffects:"",physique:""});
  };
  return(
    <div>
      <h1 style={{...HS,marginBottom:4}}>Log Entry</h1>
      <p style={{fontSize:11,color:"#3f3f46",marginBottom:24}}>What did you take today and how do you feel?</p>
      {active.length===0&&<p style={{fontSize:12,color:"#27272a",padding:"20px 0"}}>No active compounds. Add compounds to your stack first.</p>}
      {active.length>0&&(<>
        <SL right={`${Object.values(ck).filter(Boolean).length} selected`}>Compounds Taken</SL>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:28}}>
          {active.map(c=>{const on=ck[c.id];return(
            <button key={c.id} onClick={()=>setCk(p=>({...p,[c.id]:!p[c.id]}))} className="c" style={{padding:"13px 14px",cursor:"pointer",textAlign:"left",borderColor:on?"rgba(45,212,191,0.25)":undefined,background:on?"rgba(45,212,191,0.02)":""}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:on?6:0}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:on?"#2dd4bf":"#27272a",flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:on?"#fff":"#52525b",fontFamily:"'Inter',sans-serif",flex:1}}>{c.name}</span>
                {on&&<svg width="12" height="12" viewBox="0 0 20 20" fill="#2dd4bf"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
              </div>
              {on?<input type="number" value={cd[c.id]!==undefined?cd[c.id]:c.dose} onChange={e=>{e.stopPropagation();setCd(p=>({...p,[c.id]:e.target.value}));}} onClick={e=>e.stopPropagation()} style={{width:"100%",height:28,marginTop:2,background:"transparent",border:"1px solid rgba(45,212,191,0.15)",padding:"0 8px",color:"#2dd4bf",fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>:<div style={{fontSize:10,color:"#27272a",marginTop:2}}>{c.dose} {c.unit} · {c.frequency||c.freq}</div>}
            </button>
          );})}
        </div>
      </>)}
      <SL>Biometrics</SL>
      <div className="c" style={{padding:"18px 18px 4px",marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          {[["Weight (lbs)","weight","175"],["Sleep score","sleep","80"],["HRV (ms)","hrv","64"]].map(([l,k,ph])=>(
            <div key={k} style={{marginBottom:14}}><label style={LS}>{l}</label><input type="number" placeholder={ph} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))} style={IS} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
          ))}
          {[["Mood","mood"],["Energy","energy"],["Stress","stress"],["Appetite","appetite"]].map(([l,k])=>(
            <div key={k} style={{marginBottom:14}}><label style={LS}>{l} ({f[k]}/10)</label><input type="range" min="1" max="10" value={f[k]} onChange={e=>setF(p=>({...p,[k]:Number(e.target.value)}))} style={{width:"100%",marginTop:8,accentColor:"#2dd4bf"}}/></div>
          ))}
        </div>
      </div>
      <SL>Notes</SL>
      <div className="c" style={{padding:"18px 18px 4px",marginBottom:24}}>
        <div style={{marginBottom:14}}><label style={LS}>Side Effects</label><input placeholder="Acne, lethargy, insomnia..." value={f.sideEffects} onChange={e=>setF(p=>({...p,sideEffects:e.target.value}))} style={IS} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
        <div style={{marginBottom:14}}><label style={LS}>Physique / Feel</label><textarea placeholder="How do you look and feel today..." value={f.physique} onChange={e=>setF(p=>({...p,physique:e.target.value}))} style={{...IS,height:"auto",minHeight:60,padding:"10px 14px",resize:"vertical"}} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/></div>
      </div>
      <button onClick={save} style={{width:"100%",height:46,background:"#2dd4bf",color:"#000",border:"none",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",letterSpacing:"0.08em",textTransform:"uppercase"}}>Save Log Entry</button>
    </div>
  );
}

function TrainView({training,onSaveTraining,compounds}) {
  const [mode,setMode]=useState("lift");
  const [exercise,setExercise]=useState(LIFTS[0]);
  const [sets,setSets]=useState([{reps:"",weight:""}]);
  const [cardioEx,setCardioEx]=useState(CARDIO[0]);
  const [duration,setDuration]=useState("");
  const [distance,setDistance]=useState("");
  const saveLift=async()=>{const v=sets.filter(s=>s.reps&&s.weight);if(!v.length)return;await onSaveTraining({type:"lift",exercise,sets:v.map(s=>({reps:Number(s.reps),weight:Number(s.weight)}))});setSets([{reps:"",weight:""}]);};
  const saveCardio=async()=>{if(!duration)return;await onSaveTraining({type:"cardio",exercise:cardioEx,duration_min:Number(duration),distance_mi:Number(distance)||0});setDuration("");setDistance("");};
  const lifts=(training||[]).filter(t=>t.type==="lift");
  const prs={};
  [...new Set(lifts.map(t=>t.exercise))].forEach(ex=>{const best=lifts.filter(t=>t.exercise===ex).sort((a,b)=>Math.max(...(b.sets||[]).map(s=>s.weight))-Math.max(...(a.sets||[]).map(s=>s.weight)))[0];if(best&&best.sets?.length)prs[ex]={weight:Math.max(...best.sets.map(s=>s.weight)),date:best.date};});
  return(
    <div>
      <h1 style={{...HS,marginBottom:4}}>Training</h1>
      <p style={{fontSize:11,color:"#3f3f46",marginBottom:24}}>Log lifts and cardio. PRs tracked automatically.</p>
      <div style={{display:"flex",gap:8,marginBottom:24}}>{["lift","cardio"].map(m=><button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"10px 0",border:`1px solid ${mode===m?"rgba(45,212,191,0.3)":"#1e1e22"}`,background:mode===m?"rgba(45,212,191,0.04)":"transparent",color:mode===m?"#2dd4bf":"#52525b",fontSize:11,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer"}}>{m==="lift"?"Barbell Lifts":"Cardio"}</button>)}</div>
      {mode==="lift"?(
        <div>
          <div style={{marginBottom:14}}><label style={LS}>Exercise</label><select value={exercise} onChange={e=>setExercise(e.target.value)} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{LIFTS.map(l=><option key={l}>{l}</option>)}</select></div>
          <div style={LS}>Sets</div>
          {sets.map((s,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"60px 1fr 28px",gap:8,marginBottom:6,alignItems:"center"}}>
              <input type="number" placeholder="Reps" value={s.reps} onChange={e=>{const v=[...sets];v[i].reps=e.target.value;setSets(v);}} style={{...IS,height:36,textAlign:"center",fontSize:12}}/>
              <input type="number" placeholder="Weight (lbs)" value={s.weight} onChange={e=>{const v=[...sets];v[i].weight=e.target.value;setSets(v);}} style={{...IS,height:36,fontSize:12}}/>
              {sets.length>1&&<button onClick={()=>setSets(p=>p.filter((_,j)=>j!==i))} style={{width:28,height:28,background:"#111114",border:"1px solid #1e1e22",color:"#3f3f46",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>&times;</button>}
            </div>
          ))}
          <button onClick={()=>setSets(p=>[...p,{reps:"",weight:""}])} style={{fontSize:10,color:"#2dd4bf",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,marginBottom:20}}>+ Add Set</button>
          <button onClick={saveLift} style={{width:"100%",height:44,background:"#2dd4bf",color:"#000",border:"none",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",letterSpacing:"0.08em",textTransform:"uppercase"}}>Log Lift</button>
        </div>
      ):(
        <div>
          <div style={{marginBottom:14}}><label style={LS}>Activity</label><select value={cardioEx} onChange={e=>setCardioEx(e.target.value)} style={{...IS,background:"#0a0a0c",appearance:"none"}}>{CARDIO.map(c=><option key={c}>{c}</option>)}</select></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            <div style={{marginBottom:14}}><label style={LS}>Duration (min)</label><input type="number" placeholder="30" value={duration} onChange={e=>setDuration(e.target.value)} style={IS}/></div>
            <div style={{marginBottom:14}}><label style={LS}>Distance (mi)</label><input type="number" placeholder="3.1" value={distance} onChange={e=>setDistance(e.target.value)} style={IS}/></div>
          </div>
          <button onClick={saveCardio} style={{width:"100%",height:44,background:"#2dd4bf",color:"#000",border:"none",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",letterSpacing:"0.08em",textTransform:"uppercase"}}>Log Cardio</button>
        </div>
      )}
      {Object.keys(prs).length>0&&(<div style={{marginTop:28}}><SL>Personal Records</SL><div className="c" style={{padding:16}}>{Object.entries(prs).map(([ex,pr])=>(
        <div key={ex} style={{padding:"10px 0",borderBottom:"1px solid #141416"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#a1a1aa"}}>{ex}</span><span style={{fontSize:16,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif"}}>{pr.weight} lbs</span></div><div style={{fontSize:9,color:"#3f3f46",marginTop:4}}>{fmtDate(pr.date)}</div></div>
      ))}</div></div>)}
      {(training||[]).length>0&&(<div style={{marginTop:28}}><SL right={`${(training||[]).length} total`}>Recent</SL>{(training||[]).slice(0,8).map(t=>(
        <div key={t.id} className="c" style={{padding:"12px 16px",marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:12,fontWeight:600,color:"#e4e4e7",fontFamily:"'Inter',sans-serif"}}>{t.exercise}</span><span style={{fontSize:10,color:"#3f3f46",marginLeft:8}}>{fmtDate(t.date)}</span></div><span style={{fontSize:9,padding:"2px 8px",background:"rgba(45,212,191,0.06)",color:"#2dd4bf",border:"1px solid rgba(45,212,191,0.1)",textTransform:"uppercase"}}>{t.type}</span></div>
          {t.type==="lift"&&t.sets&&<div style={{fontSize:10,color:"#52525b",marginTop:6}}>{t.sets.map((s,i)=>`${s.reps}x${s.weight}lbs`).join("  ·  ")}</div>}
          {t.type==="cardio"&&<div style={{fontSize:10,color:"#52525b",marginTop:6}}>{t.duration_min}min{t.distance_mi?` · ${t.distance_mi}mi`:""}</div>}
        </div>
      ))}</div>)}
    </div>
  );
}

function HistoryView({logs,compounds,onDelete,training}) {
  const safe=compounds||[];
  return(
    <div>
      <h1 style={{...HS,marginBottom:4}}>History</h1>
      <p style={{fontSize:11,color:"#3f3f46",marginBottom:24}}>{(logs||[]).length} entries · {(training||[]).length} sessions</p>
      {(logs||[]).length===0&&<div style={{textAlign:"center",padding:60,color:"#27272a",fontSize:12}}>No logs yet. Start logging from the Log tab.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {(logs||[]).map(log=>(
          <div key={log.id} className="c" style={{padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontSize:13,fontWeight:700,color:"#e4e4e7",fontFamily:"'Inter',sans-serif"}}>{log.date}</span><button onClick={()=>onDelete(log.id)} style={{fontSize:10,color:"#27272a",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>delete</button></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px",marginBottom:12,fontSize:11}}>
              {log.weight_lbs>0&&<span style={{color:"#3f3f46"}}>Weight <span style={{color:"#71717a",fontWeight:600}}>{log.weight_lbs}lbs</span></span>}
              {log.sleep_score>0&&<span style={{color:"#3f3f46"}}>Sleep <span style={{color:"#71717a",fontWeight:600}}>{log.sleep_score}</span></span>}
              {log.mood&&<span style={{color:"#3f3f46"}}>Mood <span style={{color:"#71717a",fontWeight:600}}>{log.mood}/10</span></span>}
              {log.energy&&<span style={{color:"#3f3f46"}}>Energy <span style={{color:"#71717a",fontWeight:600}}>{log.energy}/10</span></span>}
            </div>
            {log.doses&&Object.keys(log.doses).length>0&&(<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{Object.entries(log.doses).map(([cid,dose])=>{const c=safe.find(x=>x.id===cid);if(!c)return null;return<span key={cid} style={{fontSize:10,padding:"3px 8px",background:"rgba(45,212,191,0.04)",color:"rgba(45,212,191,0.6)",border:"1px solid rgba(45,212,191,0.08)",fontWeight:500}}>{c.name}: {dose}{c.unit}</span>;})}</div>)}
            {log.side_effects&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{log.side_effects.split(",").map((s,i)=><span key={i} style={{fontSize:9,padding:"3px 8px",background:"rgba(239,68,68,0.06)",color:"#f87171",border:"1px solid rgba(239,68,68,0.1)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.trim()}</span>)}</div>}
            {log.physique_notes&&<p style={{fontSize:11,padding:"10px 12px",background:"rgba(45,212,191,0.03)",color:"#2dd4bf",border:"1px solid rgba(45,212,191,0.08)",lineHeight:1.7,margin:0}}>{log.physique_notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}


// ══════════════════════════════
// BLOODWORK / LABS VIEW
// ══════════════════════════════
function BloodworkView({ userId }) {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date:"", lab:"" });
  const [markers, setMarkers] = useState([
    { name:"Total Testosterone", value:"", unit:"ng/dL", ref:"264-916" },
    { name:"Free Testosterone", value:"", unit:"pg/mL", ref:"9.3-26.5" },
    { name:"Estradiol (E2)", value:"", unit:"pg/mL", ref:"<42" },
    { name:"SHBG", value:"", unit:"nmol/L", ref:"16.5-55.9" },
    { name:"LH", value:"", unit:"mIU/mL", ref:"1.7-8.6" },
    { name:"FSH", value:"", unit:"mIU/mL", ref:"1.5-12.4" },
    { name:"IGF-1", value:"", unit:"ng/mL", ref:"88-246" },
    { name:"Hematocrit", value:"", unit:"%", ref:"38.3-48.6" },
    { name:"Hemoglobin", value:"", unit:"g/dL", ref:"13.2-17.1" },
    { name:"PSA", value:"", unit:"ng/mL", ref:"<4.0" },
    { name:"ALT", value:"", unit:"U/L", ref:"7-56" },
    { name:"AST", value:"", unit:"U/L", ref:"10-40" },
    { name:"Total Cholesterol", value:"", unit:"mg/dL", ref:"<200" },
    { name:"HDL", value:"", unit:"mg/dL", ref:">40" },
    { name:"LDL", value:"", unit:"mg/dL", ref:"<100" },
    { name:"Triglycerides", value:"", unit:"mg/dL", ref:"<150" },
    { name:"Glucose (fasting)", value:"", unit:"mg/dL", ref:"70-99" },
    { name:"HbA1c", value:"", unit:"%", ref:"<5.7" },
    { name:"Cortisol (AM)", value:"", unit:"mcg/dL", ref:"6.2-19.4" },
    { name:"DHEA-S", value:"", unit:"mcg/dL", ref:"80-560" },
    { name:"Vitamin D (25-OH)", value:"", unit:"ng/mL", ref:"30-100" },
    { name:"TSH", value:"", unit:"mIU/L", ref:"0.4-4.5" },
  ]);
  const [customMarker, setCustomMarker] = useState({ name:"", value:"", unit:"", ref:"" });
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadPanels(); }, []);

  const loadPanels = async () => {
    setLoading(true);
    try {
      const data = await api("/api/bloodwork");
      setPanels(Array.isArray(data) ? data : []);
    } catch { setPanels([]); }
    setLoading(false);
  };

  const savePanel = async () => {
    setSaving(true);
    const filled = markers.filter(m => m.value !== "" && m.value !== null);
    const custom = customMarker.name && customMarker.value ? [customMarker] : [];
    const allMarkers = [...filled, ...custom];
    const markerObj = {};
    allMarkers.forEach(m => { markerObj[m.name] = { value: m.value, unit: m.unit, ref: m.ref }; });
    try {
      const saved = await api("/api/bloodwork", { method:"POST", body:{ date:form.date||new Date().toISOString().split("T")[0], lab_name:form.lab||null, markers:markerObj, ai_summary:aiSummary||null } });
      setPanels(p => [saved, ...p]);
      setModal(false);
      setForm({ date:"", lab:"" });
      setAiSummary("");
    } catch(e) { console.error("save panel:", e); }
    setSaving(false);
  };

  const analyzeWithAI = async () => {
    setAiLoading(true);
    const filled = markers.filter(m => m.value !== "");
    if (!filled.length) { setAiLoading(false); return; }
    const markerText = filled.map(m => `${m.name}: ${m.value} ${m.unit} (ref: ${m.ref})`).join(", ");
    try {
      const d = await api("/api/ai", { method:"POST", body:{ model:"claude-sonnet-4-6", max_tokens:600, messages:[{ role:"user", content:`Analyze these blood panel results for someone tracking hormonal optimization and performance compounds. Be concise and clinical. Flag anything outside reference range. Format: **Summary**, **Key Findings**, **Flags** sections.

Markers: ${markerText}` }] }});
      setAiSummary((d.content||[]).map(i=>i.text||"").join(""));
    } catch(e) { setAiSummary("Analysis unavailable."); }
    setAiLoading(false);
  };

  const isOutOfRange = (m) => {
    if (!m.value || !m.ref) return false;
    const val = parseFloat(m.value);
    if (isNaN(val)) return false;
    if (m.ref.startsWith("<")) return val >= parseFloat(m.ref.slice(1));
    if (m.ref.startsWith(">")) return val <= parseFloat(m.ref.slice(1));
    const parts = m.ref.split("-");
    if (parts.length === 2) return val < parseFloat(parts[0]) || val > parseFloat(parts[1]);
    return false;
  };

  const flagged = markers.filter(m => m.value && isOutOfRange(m));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={HS}>Labs</h1>
          <p style={{ fontSize:11, color:"#3f3f46", marginTop:4 }}>Blood panels, hormone markers, biomarkers</p>
        </div>
        <button onClick={()=>setModal(true)} style={{ height:36, padding:"0 16px", background:"transparent", border:"1px solid #1e1e22", color:"#52525b", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", transition:"all .15s" }}
          onMouseEnter={e=>{e.target.style.borderColor="#2dd4bf";e.target.style.color="#2dd4bf";}}
          onMouseLeave={e=>{e.target.style.borderColor="#1e1e22";e.target.style.color="#52525b";}}>
          + Log Panel
        </button>
      </div>

      {loading && <div style={{ textAlign:"center", padding:40 }}><div style={{ width:20,height:20,border:"1.5px solid #1e1e22",borderTopColor:"#2dd4bf",borderRadius:"50%",margin:"0 auto",animation:"spin .8s linear infinite" }}/></div>}

      {!loading && panels.length === 0 && (
        <div style={{ border:"1px dashed #1e1e22", padding:"40px 24px", textAlign:"center" }}>
          <p style={{ fontSize:13, color:"#27272a", margin:"0 0 8px" }}>No panels logged yet</p>
          <p style={{ fontSize:11, color:"#1e1e22", margin:"0 0 20px" }}>Add blood work to track hormones, biomarkers, and health over time</p>
          <button onClick={()=>setModal(true)} style={{ fontSize:11, color:"#2dd4bf", background:"transparent", border:"1px solid rgba(45,212,191,0.2)", padding:"8px 20px", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>+ Log your first panel</button>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {panels.map(p => {
          const mKeys = Object.keys(p.markers||{});
          return (
            <div key={p.id} className="c" style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{p.date}</div>
                  {p.lab_name && <div style={{ fontSize:10, color:"#3f3f46", marginTop:1 }}>{p.lab_name}</div>}
                </div>
                <span style={{ fontSize:9, padding:"2px 8px", background:"rgba(45,212,191,0.06)", color:"#2dd4bf", border:"1px solid rgba(45,212,191,0.1)" }}>{mKeys.length} markers</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:6, marginBottom:p.ai_summary?12:0 }}>
                {mKeys.slice(0,8).map(name => {
                  const m = p.markers[name];
                  const val = parseFloat(m.value);
                  let flag = false;
                  if (m.ref && !isNaN(val)) {
                    if (m.ref.startsWith("<")) flag = val >= parseFloat(m.ref.slice(1));
                    else if (m.ref.startsWith(">")) flag = val <= parseFloat(m.ref.slice(1));
                    else { const pts = m.ref.split("-"); if(pts.length===2) flag = val<parseFloat(pts[0])||val>parseFloat(pts[1]); }
                  }
                  return (
                    <div key={name} style={{ padding:"8px 10px", background:flag?"rgba(239,68,68,0.04)":"rgba(255,255,255,0.02)", border:`1px solid ${flag?"rgba(239,68,68,0.2)":"#1e1e22"}` }}>
                      <div style={{ fontSize:9, color:"#3f3f46", marginBottom:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>{name}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:flag?"#f87171":"#e4e4e7", fontFamily:"'Inter',sans-serif" }}>{m.value} <span style={{ fontSize:9, color:"#27272a", fontWeight:400 }}>{m.unit}</span></div>
                      <div style={{ fontSize:9, color:"#27272a", marginTop:1 }}>ref {m.ref}</div>
                    </div>
                  );
                })}
                {mKeys.length > 8 && <div style={{ padding:"8px 10px", background:"rgba(255,255,255,0.01)", border:"1px dashed #1e1e22", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:10, color:"#27272a" }}>+{mKeys.length-8} more</span></div>}
              </div>
              {p.ai_summary && (
                <div style={{ fontSize:11, color:"#52525b", lineHeight:1.7, padding:"12px 14px", background:"rgba(45,212,191,0.02)", border:"1px solid rgba(45,212,191,0.08)", marginTop:4 }}>
                  {p.ai_summary.replace(/\*\*/g,"").split("\n").map((line,i)=><div key={i}>{line}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Mod open={modal} onClose={()=>setModal(false)} title="Log Blood Panel">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px", marginBottom:4 }}>
          <div style={{ marginBottom:14 }}>
            <label style={LS}>Date</label>
            <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={IS}
              onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={LS}>Lab Name (optional)</label>
            <input placeholder="LabCorp, Quest..." value={form.lab} onChange={e=>setForm(p=>({...p,lab:e.target.value}))} style={IS}
              onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/>
          </div>
        </div>

        {flagged.length > 0 && (
          <div style={{ marginBottom:14, padding:"10px 12px", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)" }}>
            <div style={{ fontSize:10, color:"#f87171", fontWeight:600, marginBottom:4 }}>OUT OF RANGE</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {flagged.map(m => <span key={m.name} style={{ fontSize:10, padding:"2px 8px", background:"rgba(239,68,68,0.1)", color:"#f87171", border:"1px solid rgba(239,68,68,0.2)" }}>{m.name}: {m.value}</span>)}
            </div>
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <div style={LS}>Markers</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:"4px 8px" }}>
            {markers.map((m,i) => (
              <div key={m.name} style={{ display:"contents" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid #0f0f11" }}>
                  <span style={{ fontSize:11, color:m.value?isOutOfRange(m)?"#f87171":"#a1a1aa":"#3f3f46", flex:1, minWidth:0 }}>{m.name}</span>
                  <span style={{ fontSize:9, color:"#27272a", flexShrink:0 }}>{m.unit}</span>
                </div>
                <input type="number" placeholder="—" value={m.value} onChange={e=>{ const v=[...markers]; v[i].value=e.target.value; setMarkers(v); }}
                  style={{ ...IS, height:30, fontSize:12, textAlign:"right", borderColor:m.value&&isOutOfRange(m)?"rgba(239,68,68,0.4)":undefined, padding:"0 8px" }}
                  onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor=markers[i].value&&isOutOfRange(markers[i])?"rgba(239,68,68,0.4)":"#1e1e22"}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={LS}>Add Custom Marker</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 70px 70px", gap:6 }}>
            <input placeholder="Marker name" value={customMarker.name} onChange={e=>setCustomMarker(p=>({...p,name:e.target.value}))} style={{ ...IS, height:34, fontSize:12 }} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/>
            <input placeholder="Value" value={customMarker.value} onChange={e=>setCustomMarker(p=>({...p,value:e.target.value}))} style={{ ...IS, height:34, fontSize:12 }} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/>
            <input placeholder="Unit" value={customMarker.unit} onChange={e=>setCustomMarker(p=>({...p,unit:e.target.value}))} style={{ ...IS, height:34, fontSize:12 }} onFocus={e=>e.target.style.borderColor="#2dd4bf"} onBlur={e=>e.target.style.borderColor="#1e1e22"}/>
          </div>
        </div>

        <button onClick={analyzeWithAI} disabled={aiLoading||!markers.some(m=>m.value)} style={{ width:"100%", height:38, background:"transparent", border:"1px solid rgba(45,212,191,0.2)", color:markers.some(m=>m.value)?"#2dd4bf":"#27272a", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {aiLoading ? <><div style={{ width:12,height:12,border:"1.5px solid rgba(45,212,191,0.3)",borderTopColor:"#2dd4bf",borderRadius:"50%",animation:"spin .7s linear infinite" }}/> Analyzing...</> : "✦ Analyze with AI"}
        </button>

        {aiSummary && (
          <div style={{ fontSize:11, color:"#52525b", lineHeight:1.7, padding:"12px 14px", background:"rgba(45,212,191,0.02)", border:"1px solid rgba(45,212,191,0.1)", marginBottom:14 }}>
            {aiSummary.split("\n").map((line,i)=>{
              const bold = /\*\*(.*?)\*\*/.test(line);
              if(line.startsWith("**")&&line.endsWith("**"))return<div key={i} style={{color:"#fff",fontWeight:600,marginTop:i>0?8:0,marginBottom:2}}>{line.replace(/\*\*/g,"")}</div>;
              if(bold)return<div key={i}>{line.split(/\*\*(.*?)\*\*/).map((p,j)=>j%2===1?<strong key={j} style={{color:"#e4e4e7"}}>{p}</strong>:<span key={j}>{p}</span>)}</div>;
              return<div key={i}>{line||" "}</div>;
            })}
          </div>
        )}

        <button onClick={savePanel} disabled={saving} style={{ width:"100%", height:46, background:saving?"#111114":"#2dd4bf", color:saving?"#27272a":"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:saving?"default":"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>
          {saving ? "Saving..." : "Save Panel"}
        </button>
      </Mod>
    </div>
  );
}

export default function Flourish() {
  const {user,isLoaded}=useUser();
  const [tab,setTab]=useState("home");
  const [tr,setTr]=useState(false);
  const [detailId,setDetailId]=useState(null);
  const [insightsOpen,setInsightsOpen]=useState(false);
  const [insightsData,setInsightsData]=useState(null);
  const [insightsLoading,setInsightsLoading]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [profile,setProfile]=useState(null);
  const [cycles,setCycles]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [onboarded,setOnboarded]=useState(false);
  const [learnedData,setLearnedData]=useState(null);

  // Fetch learned research when viewing a compound detail
  useEffect(()=>{
    if(!detailId)return;
    const comp=cycles.flatMap(c=>c.compounds||[]).find(c=>c.id===detailId);
    if(!comp)return;
    const inCDB=CDB.some(c=>c.name.toLowerCase()===comp.name.toLowerCase());
    if(!inCDB){
      setLearnedData(null);
      fetch("/api/compounds/research?name="+encodeURIComponent(comp.name))
        .then(r=>r.ok?r.json():[]).then(d=>{ if(Array.isArray(d)&&d.length) setLearnedData(d[0]); }).catch(()=>{});
    } else {
      setLearnedData(null);
    }
  },[detailId]);

  const cy=cycles.find(c=>c.id===activeId)||cycles[0]||null;
  const comps=cy?.compounds||[];
  const logs=cy?.logs||[];
  const training=cy?.training_sessions||[];
  const active=comps.filter(c=>c.status==="active");
  const latest=logs[0]||null;

  useEffect(()=>{if(!isLoaded)return;if(!user){setLoading(false);return;}loadAll();},[isLoaded,user]);

  const loadAll=async()=>{
    setLoading(true);
    try{
      const [pR,cR]=await Promise.all([fetch("/api/profile"),fetch("/api/cycles")]);
      if(!pR.ok||!cR.ok){if(pR.status===401||cR.status===401){setTimeout(loadAll,1200);return;}setLoading(false);return;}
      const prof=await pR.json();const cycs=await cR.json();
      setProfile(prof);
      const norm=(Array.isArray(cycs)?cycs:[]).map(c=>({...c,compounds:c.compounds||[],logs:c.logs||[],training_sessions:c.training_sessions||[]}));
      setCycles(norm);
      if(norm.length>0){setActiveId(norm[0].id);setOnboarded(true);}
    }catch(e){console.error("loadAll:",e);}
    setLoading(false);
  };

  const sw=t=>{setDetailId(null);setTr(true);setTimeout(()=>{setTab(t);setTimeout(()=>setTr(false),40);},150);};

  const addLog=useCallback(async(entry)=>{
    if(!cy)return;
    try{const saved=await api("/api/logs",{method:"POST",body:{...entry,cycle_id:cy.id}});setCycles(p=>p.map(c=>c.id===activeId?{...c,logs:[saved,...(c.logs||[])]}:c));sw("history");}catch(e){console.error("addLog:",e);}
  },[activeId,cy]);

  const deleteLog=useCallback(async(id)=>{
    try{await fetch("/api/logs/"+id,{method:"DELETE"});setCycles(p=>p.map(c=>c.id===activeId?{...c,logs:(c.logs||[]).filter(l=>l.id!==id)}:c));}catch(e){console.error("deleteLog:",e);}
  },[activeId]);

  const addCompound=async(comp)=>{if(!cy)return;try{const saved=await api("/api/compounds",{method:"POST",body:{...comp,cycle_id:cy.id}});setCycles(p=>p.map(c=>c.id===activeId?{...c,compounds:[...(c.compounds||[]),saved]}:c));}catch(e){console.error("addCompound:",e);}};
  const editCompound=async(id,updates)=>{try{const saved=await api("/api/compounds/"+id,{method:"PATCH",body:updates});setCycles(p=>p.map(c=>c.id===activeId?{...c,compounds:(c.compounds||[]).map(x=>x.id===id?saved:x)}:c));}catch(e){console.error("editCompound:",e);}};
  const removeCompound=async(id)=>{try{await fetch("/api/compounds/"+id,{method:"DELETE"});setCycles(p=>p.map(c=>c.id===activeId?{...c,compounds:(c.compounds||[]).filter(x=>x.id!==id)}:c));}catch(e){console.error("removeCompound:",e);}};
  const saveTraining=async(entry)=>{if(!cy)return;try{const saved=await api("/api/training",{method:"POST",body:{...entry,cycle_id:cy.id}});setCycles(p=>p.map(c=>c.id===activeId?{...c,training_sessions:[saved,...(c.training_sessions||[])]}:c));}catch(e){console.error("saveTraining:",e);}};

  const getInsights=async()=>{
    if(!cy)return;setInsightsLoading(true);setInsightsOpen(true);
    const ctx=`Protocol: ${cy.name||"unnamed"}\nGoals: ${(cy.goals||[]).join(", ")||"none"}\nActive: ${active.map(c=>`${c.name} ${c.dose}${c.unit} ${c.frequency||c.freq}`).join("; ")||"none"}\nLatest: weight=${latest?.weight_lbs||"?"}, sleep=${latest?.sleep_score||"?"}, mood=${latest?.mood||"?"}, energy=${latest?.energy||"?"}\nSide effects: ${logs.slice(0,5).map(l=>l.side_effects).filter(Boolean).join("; ")||"none"}\nEntries: ${logs.length}`;
    try{
      const d=await api("/api/ai",{method:"POST",body:{model:"claude-sonnet-4-6",max_tokens:700,messages:[{role:"user",content:`Protocol advisor. Analyze this data and give precise, actionable insights. Use bold headers. Be specific, not generic.\n\n${ctx}`}]}});
      setInsightsData((d.content||[]).map(i=>i.text||"").join(""));
    }catch{
      setInsightsData(logs.length<3?"**Not enough data yet**\n\nLog at least 3-5 daily entries with doses, mood, and biometrics. Insights become meaningful after consistent logging.":(`**Stack Summary**\n\n${active.length} active compounds. ${logs.length} log entries.\n\n**Next**\n\nKeep logging daily to unlock trend insights.`));
    }
    setInsightsLoading(false);
  };

  const onOnboardingComplete=async({profile:pr,cycle:c})=>{
    try{
      await api("/api/profile",{method:"PATCH",body:{name:pr.name,age:Number(pr.age)||null,weight_lbs:Number(pr.weight)||null,experience:pr.experience,goals:pr.goals,health_notes:pr.health}});
      const savedCycle=await api("/api/cycles",{method:"POST",body:{name:c.name||"My Protocol",goals:c.goals||[],weeks:12}});
      const savedComps=await Promise.all((c.compounds||[]).map(comp=>api("/api/compounds",{method:"POST",body:{cycle_id:savedCycle.id,name:comp.name,dose:Number(comp.dose)||0,unit:comp.unit||"mg",frequency:comp.frequency||comp.freq||"daily",status:"active",category:comp.category||"other",titration:comp.titration||[{week:1,dose:Number(comp.dose)||0}],notes:comp.notes||null}})));
      savedCycle.compounds=savedComps;savedCycle.logs=[];savedCycle.training_sessions=[];
      setProfile(pr);setCycles([savedCycle]);setActiveId(savedCycle.id);setOnboarded(true);
    }catch(e){console.error("onboarding:",e);alert("Error saving protocol. Please try again.");}
  };

  const TABS=[
    {id:"home",label:"Home",d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1"},
    {id:"log",label:"Log",d:"M12 4v16m8-8H4"},
    {id:"stack",label:"Stack",d:"M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"},
    {id:"train",label:"Train",d:"M13 10V3L4 14h7v7l9-11h-7z"},
    {id:"bloodwork",label:"Labs",d:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"},
  ];

  if(!isLoaded||loading)return <SplashScreen/>;
  if(!onboarded)return <ProtocolBuilder onComplete={onOnboardingComplete} userName={user?.firstName||""}/>;

  if(detailId){
    const comp=comps.find(c=>c.id===detailId);
    if(!comp){setDetailId(null);return null;}
    const db=CDB.find(c=>c.name===comp.name);
    const used=logs.filter(l=>l.doses?.[comp.id]);
    const total=used.reduce((s,l)=>s+(Number(l.doses[comp.id])||0),0);
    const sides=[...new Set(used.flatMap(l=>(l.side_effects||"").split(",").map(s=>s.trim()).filter(Boolean)))];
    // learnedData fetched above in component scope
    return(
      <div style={{minHeight:"100vh",background:"#000",color:"#e4e4e7",fontFamily:"'JetBrains Mono',monospace"}}>
        <header style={{position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.94)",backdropFilter:"blur(16px)",borderBottom:"1px solid #1e1e22",padding:"14px 20px"}}>
          <div style={{maxWidth:560,margin:"0 auto"}}><button onClick={()=>setDetailId(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#52525b",display:"flex",alignItems:"center",gap:6,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Back</button></div>
        </header>
        <div style={{maxWidth:560,margin:"0 auto",padding:"24px 20px 40px",animation:"fadeIn .2s ease"}}>
          <div style={{marginBottom:28}}><div style={{fontSize:10,color:"#2dd4bf",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:6}}>{comp.category}</div><h1 style={{fontSize:28,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",margin:"0 0 6px"}}>{comp.name}</h1><div style={{fontSize:12,color:"#3f3f46"}}>{comp.dose} {comp.unit} · {comp.frequency||comp.freq||"—"}</div></div>
          {(comp.notes||db?.desc||learnedData?.summary)&&(
            <div style={{marginBottom:24}}>
              <div style={LS}>What It Does</div>
              <p style={{fontSize:13,color:"#71717a",lineHeight:1.8,margin:0}}>{comp.notes||db?.desc||learnedData?.summary}</p>
              {learnedData?.mechanism&&!db&&<p style={{fontSize:12,color:"#52525b",lineHeight:1.8,margin:"8px 0 0"}}>{learnedData.mechanism}</p>}
            </div>
          )}
          {learnedData?.primary_effects?.length>0&&!db&&(
            <div style={{marginBottom:24}}>
              <div style={LS}>Primary Effects</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {learnedData.primary_effects.map((e,i)=><span key={i} style={{fontSize:10,padding:"4px 10px",background:"rgba(45,212,191,0.04)",color:"rgba(45,212,191,0.7)",border:"1px solid rgba(45,212,191,0.1)"}}>{e}</span>)}
              </div>
            </div>
          )}
          {learnedData?.side_effects?.length>0&&!db&&(
            <div style={{marginBottom:24}}>
              <div style={LS}>Potential Side Effects</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {learnedData.side_effects.map((s,i)=><span key={i} style={{fontSize:10,padding:"4px 10px",background:"rgba(239,68,68,0.04)",color:"#f87171",border:"1px solid rgba(239,68,68,0.1)"}}>{s}</span>)}
              </div>
            </div>
          )}
          {learnedData?.timing&&!db&&(
            <div style={{marginBottom:24}}>
              <div style={LS}>Optimal Timing</div>
              <p style={{fontSize:12,color:"#71717a",margin:0}}>{learnedData.timing}</p>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>{[{v:used.length,l:"Log Entries"},{v:Math.round(total),l:`Total ${comp.unit}`},{v:comp.titration?.length||0,l:"Titration Steps"}].map((m,i)=>(
            <div key={i} className="c" style={{padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif"}}>{m.v}</div><div style={{fontSize:9,color:"#3f3f46",marginTop:4}}>{m.l}</div></div>
          ))}</div>
          {comp.titration?.length>0&&(<div style={{marginBottom:24}}><div style={LS}>Titration</div><div className="c" style={{padding:16}}>{comp.titration.map((t,i)=>{const mx=Math.max(...comp.titration.map(x=>x.dose))||1;return(<div key={i} style={{display:"grid",gridTemplateColumns:"42px 1fr 52px",gap:8,alignItems:"center",padding:"5px 0"}}><span style={{fontSize:11,color:"#3f3f46"}}>Wk {t.week}</span><div style={{height:3,background:"#141416",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(t.dose/mx)*100}%`,background:"#2dd4bf",opacity:0.5,borderRadius:2}}/></div><span style={{fontSize:12,fontWeight:600,color:"#52525b",textAlign:"right"}}>{t.dose} {comp.unit}</span></div>);})}</div></div>)}
          {sides.length>0&&<div style={{marginBottom:24}}><div style={LS}>Side Effects</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{sides.map((s,i)=><span key={i} style={{fontSize:9,padding:"4px 10px",background:"rgba(239,68,68,0.06)",color:"#f87171",border:"1px solid rgba(239,68,68,0.1)"}}>{s}</span>)}</div></div>}
          {(db?.stacks?.length>0||learnedData?.synergies?.length>0)&&(
            <div>
              <div style={LS}>Stacks Well With</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {(db?.stacks||learnedData?.synergies||[]).map((n,i)=><span key={i} style={{fontSize:10,padding:"5px 12px",border:"1px solid #1e1e22",color:"#52525b",background:"rgba(255,255,255,0.015)"}}>{n}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"#000",color:"#e4e4e7",fontFamily:"'JetBrains Mono',monospace",WebkitFontSmoothing:"antialiased"}}>
      <header style={{position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.94)",backdropFilter:"blur(16px)",borderBottom:"1px solid #1e1e22",padding:"14px 20px"}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <svg width="12" height="18" viewBox="0 0 24 34" fill="none"><rect x="6" y="1" width="12" height="5" rx="1" fill="#2dd4bf"/><path d="M7 6V9H17V6" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/><path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke="#2dd4bf" strokeWidth="1.5" fill="none"/><path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill="#2dd4bf"/></svg>
            <div><div style={{fontSize:14,letterSpacing:"0.05em",color:"#fff",fontFamily:"'Inter',sans-serif"}}><span style={{fontWeight:700}}>flour</span><span style={{fontWeight:300}}>ish</span></div><div style={{fontSize:8,letterSpacing:"0.12em",textTransform:"uppercase",color:"#3f3f46",marginTop:-1}}>{cy?.name||"no protocol"}</div></div>
          </div>
          <button onClick={()=>setMenuOpen(true)} style={{width:34,height:34,background:"transparent",border:"1px solid #1e1e22",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}} onMouseEnter={e=>e.currentTarget.style.borderColor="#3f3f46"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1e1e22"}>
            <div style={{width:14,height:1.5,background:"#52525b"}}/><div style={{width:14,height:1.5,background:"#52525b"}}/><div style={{width:10,height:1.5,background:"#52525b"}}/>
          </button>
        </div>
      </header>

      <div style={{maxWidth:560,margin:"0 auto",padding:"24px 20px 100px",opacity:tr?0:1,transition:"opacity .15s"}}>
        {tab==="home"&&(
          <div>
            <div style={{marginBottom:28}}>
              <h1 style={HS}>{profile?.name?`Hey, ${profile.name}.`:"Welcome back."}</h1>
              <p style={{fontSize:11,color:"#3f3f46",marginTop:5}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
              {cy?.goals?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:12}}>{cy.goals.map((g,i)=><span key={i} style={{fontSize:9,padding:"3px 9px",border:"1px solid rgba(45,212,191,0.12)",color:"#2dd4bf",background:"rgba(45,212,191,0.03)",letterSpacing:"0.05em"}}>{g}</span>)}</div>}
            </div>
            {latest&&(<div style={{marginBottom:28}}><SL>Latest Metrics</SL><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[{l:"Weight",v:latest.weight_lbs,u:"lbs",d:logs.map(x=>x.weight_lbs).filter(Boolean).reverse()},{l:"Sleep",v:latest.sleep_score,u:"score",d:logs.map(x=>x.sleep_score).filter(Boolean).reverse()},{l:"Mood",v:latest.mood,u:"/10",d:logs.map(x=>x.mood).filter(Boolean).reverse()},{l:"Energy",v:latest.energy,u:"/10",d:logs.map(x=>x.energy).filter(Boolean).reverse()}].map((m,i)=>(
                <div key={i} className="c" style={{padding:"16px 18px"}}>
                  <div style={{fontSize:10,color:"#3f3f46",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{m.l}</div>
                  <div style={{fontSize:26,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",lineHeight:1}}>{m.v!=null?m.v:"—"}<span style={{fontSize:11,fontWeight:400,color:"#27272a",marginLeft:3}}>{m.u}</span></div>
                  {m.d?.length>=2&&<div style={{marginTop:10}}><Sp data={m.d}/></div>}
                </div>
              ))}
            </div></div>)}
            <div style={{marginBottom:28}}><SL>Quick Actions</SL><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[{l:"Log Entry",icon:"M12 4v16m8-8H4",fn:()=>sw("log")},{l:"Get Insights",icon:"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",fn:getInsights},{l:"Add Compound",icon:"M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",fn:()=>sw("stack")},{l:"Log Labs",icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",fn:()=>sw("bloodwork")}].map((b,i)=>(
                <button key={i} onClick={b.fn} style={{padding:"18px 16px",textAlign:"left",background:"rgba(255,255,255,0.015)",border:"1px solid #1e1e22",cursor:"pointer",display:"flex",flexDirection:"column",gap:12,transition:"all .15s",fontFamily:"'JetBrains Mono',monospace"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#27272a";e.currentTarget.style.background="rgba(255,255,255,0.03)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e1e22";e.currentTarget.style.background="rgba(255,255,255,0.015)";}}>
                  <svg width="16" height="16" fill="none" stroke="#2dd4bf" strokeWidth="1.5" viewBox="0 0 24 24" style={{opacity:.7}}><path strokeLinecap="round" strokeLinejoin="round" d={b.icon}/></svg>
                  <span style={{fontSize:11,fontWeight:600,color:"#a1a1aa",fontFamily:"'Inter',sans-serif"}}>{b.l}</span>
                </button>
              ))}
            </div></div>
            {active.length>0&&(<div><SL right={`${active.length} active`}>Today's Stack</SL><div style={{display:"flex",flexDirection:"column",gap:6}}>
              {active.map(c=>(
                <button key={c.id} onClick={()=>setDetailId(c.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"rgba(255,255,255,0.015)",border:"1px solid #1e1e22",cursor:"pointer",textAlign:"left",transition:"border-color .15s",width:"100%"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#27272a"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1e1e22"}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",flexShrink:0}}/>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#e4e4e7",fontFamily:"'Inter',sans-serif"}}>{c.name}</div><div style={{fontSize:10,color:"#3f3f46",marginTop:1}}>{c.dose} {c.unit} · {c.frequency||c.freq||"—"}</div></div>
                  <svg width="14" height="14" fill="none" stroke="#27272a" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div></div>)}
            {active.length===0&&!latest&&(<div style={{border:"1px dashed #1e1e22",padding:"32px 20px",textAlign:"center"}}><p style={{fontSize:13,color:"#27272a",margin:"0 0 16px"}}>No active compounds</p><button onClick={()=>sw("stack")} style={{fontSize:11,color:"#2dd4bf",background:"transparent",border:"1px solid rgba(45,212,191,0.2)",padding:"8px 20px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>Set up your stack</button></div>)}
          </div>
        )}
        {tab==="log"&&<LogView compounds={comps} onSave={addLog}/>}
        {tab==="train"&&<TrainView training={training} onSaveTraining={saveTraining} compounds={comps}/>}
        {tab==="stack"&&<StackView compounds={comps} cycleId={cy?.id} onAdd={addCompound} onEdit={editCompound} onRemove={removeCompound}/>}
        {tab==="bloodwork"&&<BloodworkView userId={user?.id}/>}
        {tab==="history"&&<HistoryView logs={logs} compounds={comps} onDelete={deleteLog} training={training}/>}
      </div>

      <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:"rgba(0,0,0,0.96)",backdropFilter:"blur(20px)",borderTop:"1px solid #1e1e22"}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",paddingBottom:"env(safe-area-inset-bottom)"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>sw(t.id)} style={{flex:1,padding:"12px 0 10px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <svg width="20" height="20" fill="none" stroke={tab===t.id?"#2dd4bf":"#27272a"} strokeWidth={tab===t.id?"1.8":"1.5"} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={t.d}/></svg>
              <span style={{fontSize:9,color:tab===t.id?"#2dd4bf":"#27272a",letterSpacing:"0.06em",textTransform:"uppercase"}}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Mod open={insightsOpen} onClose={()=>setInsightsOpen(false)} title="Protocol Insights">
        {insightsLoading?(<div style={{textAlign:"center",padding:40}}><div style={{width:24,height:24,border:"1.5px solid #1e1e22",borderTopColor:"#2dd4bf",borderRadius:"50%",margin:"0 auto 16px",animation:"spin .8s linear infinite"}}/><p style={{fontSize:12,color:"#3f3f46"}}>Analyzing your data...</p></div>):insightsData?(
          <div style={{fontSize:13,color:"#a1a1aa",lineHeight:1.8}}>
            {insightsData.split("\n").map((line,i)=>{
              const isBold=line.startsWith("**")&&line.endsWith("**");
              const hasBold=/\*\*(.*?)\*\*/.test(line);
              if(isBold)return<div key={i} style={{color:"#fff",fontWeight:600,fontFamily:"'Inter',sans-serif",marginTop:i>0?16:0,marginBottom:4}}>{line.replace(/\*\*/g,"")}</div>;
              if(hasBold)return<div key={i}>{line.split(/\*\*(.*?)\*\*/).map((p,j)=>j%2===1?<strong key={j} style={{color:"#fff"}}>{p}</strong>:<span key={j}>{p}</span>)}</div>;
              return<div key={i}>{line||" "}</div>;
            })}
          </div>
        ):null}
      </Mod>

      <Mod open={menuOpen} onClose={()=>setMenuOpen(false)} title="Protocol">
        <div style={{marginBottom:20}}><div style={LS}>Active Protocol</div><div style={{fontSize:15,fontWeight:600,color:"#fff",fontFamily:"'Inter',sans-serif"}}>{cy?.name||"None"}</div><div style={{fontSize:11,color:"#3f3f46",marginTop:4}}>{active.length} active compounds · started {cy?.start_date?fmtDate(cy.start_date):"—"}</div></div>
        {cy?.goals?.length>0&&(<div style={{marginBottom:20}}><div style={LS}>Goals</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{cy.goals.map((g,i)=><span key={i} style={{fontSize:10,padding:"4px 10px",border:"1px solid rgba(45,212,191,0.15)",color:"#2dd4bf",background:"rgba(45,212,191,0.03)"}}>{g}</span>)}</div></div>)}
        <button onClick={()=>{setMenuOpen(false);setOnboarded(false);}} style={{width:"100%",height:42,background:"transparent",border:"1px solid #1e1e22",color:"#52525b",fontSize:11,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",marginBottom:8}}>New Protocol</button>
        {cycles.length>1&&cycles.map(c=>c.id!==activeId&&<button key={c.id} onClick={()=>{setActiveId(c.id);setMenuOpen(false);}} style={{width:"100%",height:42,background:"transparent",border:"1px solid #1e1e22",color:"#52525b",fontSize:11,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",marginBottom:8,textAlign:"left",padding:"0 16px"}}>Switch: {c.name}</button>)}
      </Mod>
    </div>
  );
}
