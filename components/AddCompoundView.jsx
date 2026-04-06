"use client";
import { useState, useEffect, useRef } from "react";

const T = "#2dd4bf";

const LS = { display:"block", fontSize:10, fontWeight:600, color:"#52525b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" };
const IS = { width:"100%", height:42, background:"rgba(255,255,255,0.02)", border:"1px solid #1e1e22", padding:"0 14px", color:"#e4e4e7", fontSize:13, fontFamily:"'JetBrains Mono',monospace" };

// ══════════════════════════════════════════════════════════════
// AddCompoundView — search the database or research a new compound
//
// States:
//   "search"      — typing in search box, showing live results
//   "researching" — Claude is generating a profile (5-15s)
//   "preview"     — showing AI-generated profile, user can edit + confirm
//   "adding"      — saving to database + user's stack
// ══════════════════════════════════════════════════════════════

export function AddCompoundView({ onAdded, onClose }) {
  const [state, setState] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [doseOverride, setDoseOverride] = useState("");
  const [unitOverride, setUnitOverride] = useState("");
  const [freqOverride, setFreqOverride] = useState("");
  const debounceRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (state !== "search") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/compounds/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {} finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query, state]);

  // ── Add an existing compound directly ──
  const addExisting = async (comp) => {
    setState("adding");
    try {
      const res = await fetch("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: comp.name,
          dose: comp.default_dose,
          unit: comp.unit,
          frequency: comp.default_freq,
          category: comp.category,
          compoundDatabaseId: comp.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to add compound");
      onAdded();
    } catch (err) {
      setError(err.message);
      setState("search");
    }
  };

  // ── Research a new compound via AI ──
  const research = async () => {
    if (!query.trim()) return;
    setState("researching");
    setError(null);
    try {
      const res = await fetch("/api/compounds/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query.trim() }),
      });

      const data = await res.json();

      if (res.status === 404 || data.error === "unknown_compound") {
        setError(data.message || `Couldn't find information about "${query}". Try a more common name.`);
        setState("search");
        return;
      }

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Research failed");
      }

      // Already exists
      if (data.alreadyExists) {
        addExisting(data.compound);
        return;
      }

      // Got a new profile to preview
      setProfile(data.profile);
      const intermediateDose = data.profile.typicalDoses?.intermediate || data.profile.typicalDoses?.beginner || 0;
      setDoseOverride(String(intermediateDose));
      setUnitOverride(data.profile.typicalDoses?.unit || "mg");
      setFreqOverride(data.profile.defaultFreq || "daily");
      setState("preview");
    } catch (err) {
      setError(err.message);
      setState("search");
    }
  };

  // ── Save the AI-generated profile + add to user's stack ──
  const saveAndAdd = async () => {
    setState("adding");
    try {
      // First, save the compound to the database
      const saveRes = await fetch("/api/compounds/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, profile }),
      });
      if (!saveRes.ok) throw new Error("Failed to save compound");
      const saved = await saveRes.json();

      // Then add it to the user's stack
      const addRes = await fetch("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saved.compound.name,
          dose: parseFloat(doseOverride) || saved.compound.default_dose,
          unit: unitOverride || saved.compound.unit,
          frequency: freqOverride || saved.compound.default_freq,
          category: saved.compound.category,
          compoundDatabaseId: saved.compound.id,
        }),
      });
      if (!addRes.ok) throw new Error("Failed to add to stack");
      onAdded();
    } catch (err) {
      setError(err.message);
      setState("preview");
    }
  };

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  if (state === "researching") {
    return (
      <div style={{ padding:60, textAlign:"center" }}>
        <div style={{ width:32, height:32, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 18px", animation:"spin .7s linear infinite" }} />
        <div style={{ fontSize:13, color:"#a1a1aa", marginBottom:6, fontFamily:"'Inter',sans-serif", fontWeight:600 }}>Researching {query}...</div>
        <p style={{ fontSize:11, color:"#52525b", lineHeight:1.6, maxWidth:240, margin:"0 auto" }}>Generating profile with mechanism, dosing, marker effects, and risks. Usually takes 5-15 seconds.</p>
      </div>
    );
  }

  if (state === "adding") {
    return (
      <div style={{ padding:60, textAlign:"center" }}>
        <div style={{ width:24, height:24, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto 14px", animation:"spin .7s linear infinite" }} />
        <div style={{ fontSize:12, color:"#71717a" }}>Adding to your stack...</div>
      </div>
    );
  }

  if (state === "preview" && profile) {
    return <PreviewProfile
      profile={profile}
      doseOverride={doseOverride}
      setDoseOverride={setDoseOverride}
      unitOverride={unitOverride}
      setUnitOverride={setUnitOverride}
      freqOverride={freqOverride}
      setFreqOverride={setFreqOverride}
      onConfirm={saveAndAdd}
      onCancel={() => { setProfile(null); setState("search"); }}
      error={error}
    />;
  }

  // ── DEFAULT: SEARCH STATE ──
  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <label style={LS}>Search compounds & supplements</label>
        <input
          type="text"
          autoFocus
          placeholder="Anavar, creatine, modafinil..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={IS}
        />
      </div>

      {error && (
        <div className="c" style={{ padding:12, marginBottom:14, borderColor:"rgba(239,68,68,0.2)" }}>
          <p style={{ fontSize:11, color:"#f87171", margin:0, lineHeight:1.5 }}>{error}</p>
        </div>
      )}

      {searching && results.length === 0 && (
        <div style={{ padding:"20px 0", textAlign:"center" }}>
          <div style={{ width:18, height:18, border:"2px solid #1e1e22", borderTopColor:T, borderRadius:"50%", margin:"0 auto", animation:"spin .7s linear infinite" }} />
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14, maxHeight:320, overflowY:"auto" }}>
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => addExisting(r)}
              className="c"
              style={{ padding:"12px 14px", textAlign:"left", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", display:"flex", alignItems:"center", gap:12 }}
            >
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{r.name}</span>
                  {r.source === "verified" ? (
                    <span title="Verified compound" style={{ fontSize:8, padding:"2px 5px", background:"rgba(45,212,191,0.08)", color:T, border:"1px solid rgba(45,212,191,0.15)", textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:700 }}>✓ Verified</span>
                  ) : (
                    <span title="Community-added (AI-generated)" style={{ fontSize:8, padding:"2px 5px", background:"rgba(251,191,36,0.06)", color:"#fbbf24", border:"1px solid rgba(251,191,36,0.12)", textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:700 }}>AI</span>
                  )}
                </div>
                <div style={{ fontSize:10, color:"#52525b" }}>
                  {r.default_dose} {r.unit} · {r.default_freq} · {r.category}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
            </button>
          ))}
        </div>
      )}

      {/* Suggest research if no exact match */}
      {query.trim().length > 2 && !searching && (
        <div className="c" style={{ padding:14, marginTop:10, background:"rgba(45,212,191,0.02)", borderColor:"rgba(45,212,191,0.1)" }}>
          <div style={{ fontSize:11, color:"#a1a1aa", marginBottom:8, lineHeight:1.5 }}>
            Can't find what you're looking for?
          </div>
          <button
            onClick={research}
            style={{ width:"100%", height:38, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase" }}
          >
            Research "{query}" with AI
          </button>
          <p style={{ fontSize:9, color:"#52525b", margin:"8px 0 0", lineHeight:1.5, textAlign:"center" }}>
            Generates a complete profile and adds it to the shared database
          </p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PREVIEW PROFILE — review AI-generated compound before saving
// ══════════════════════════════════════════════════════════════

function PreviewProfile({ profile, doseOverride, setDoseOverride, unitOverride, setUnitOverride, freqOverride, setFreqOverride, onConfirm, onCancel, error }) {
  const confidenceColor = profile.confidence === "high" ? T : profile.confidence === "low" ? "#f87171" : "#fbbf24";

  return (
    <div>
      <div className="c" style={{ padding:14, marginBottom:16, background:"rgba(251,191,36,0.03)", borderColor:"rgba(251,191,36,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
          <span style={{ fontSize:9, padding:"2px 6px", background:"rgba(251,191,36,0.1)", color:"#fbbf24", textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:700 }}>AI-Generated</span>
          <span style={{ fontSize:10, color:confidenceColor, textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600 }}>· {profile.confidence} confidence</span>
        </div>
        <p style={{ fontSize:10, color:"#71717a", margin:0, lineHeight:1.6 }}>
          Review carefully before saving. This profile will be added to the shared database for all users.
        </p>
      </div>

      <h2 style={{ fontSize:22, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", margin:"0 0 4px" }}>{profile.name}</h2>
      <div style={{ fontSize:10, color:T, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>
        {profile.category}{profile.subcategory ? ` · ${profile.subcategory}` : ""}
      </div>

      {profile.description && (
        <p style={{ fontSize:12, color:"#a1a1aa", lineHeight:1.6, marginBottom:18 }}>{profile.description}</p>
      )}

      {/* Dose / freq overrides */}
      <div style={LS}>Your dosing</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 1fr", gap:8, marginBottom:18 }}>
        <input type="number" step="any" value={doseOverride} onChange={e => setDoseOverride(e.target.value)} placeholder="Dose" style={IS} />
        <input type="text" value={unitOverride} onChange={e => setUnitOverride(e.target.value)} placeholder="unit" style={{ ...IS, textAlign:"center" }} />
        <input type="text" value={freqOverride} onChange={e => setFreqOverride(e.target.value)} placeholder="frequency" style={IS} />
      </div>

      {profile.typicalDoses && (
        <div className="c" style={{ padding:12, marginBottom:18 }}>
          <div style={{ fontSize:9, color:"#3f3f46", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Typical doses</div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#a1a1aa" }}>
            <span>Beginner: <b style={{ color:"#e4e4e7" }}>{profile.typicalDoses.beginner} {profile.typicalDoses.unit}</b></span>
            <span>Intermediate: <b style={{ color:"#e4e4e7" }}>{profile.typicalDoses.intermediate} {profile.typicalDoses.unit}</b></span>
            <span>Advanced: <b style={{ color:"#e4e4e7" }}>{profile.typicalDoses.advanced} {profile.typicalDoses.unit}</b></span>
          </div>
        </div>
      )}

      {profile.mechanism && (
        <div style={{ marginBottom:16 }}>
          <div style={LS}>Mechanism</div>
          <p style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.6, margin:0 }}>{profile.mechanism}</p>
        </div>
      )}

      {profile.halfLife && (
        <div style={{ marginBottom:16 }}>
          <div style={LS}>Half-life</div>
          <p style={{ fontSize:11, color:"#a1a1aa", margin:0 }}>{profile.halfLife}</p>
        </div>
      )}

      {profile.administrationRoutes?.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={LS}>Routes</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {profile.administrationRoutes.map((r, i) => (
              <span key={i} style={{ fontSize:9, padding:"3px 8px", border:"1px solid #1e1e22", color:"#a1a1aa", textTransform:"uppercase", letterSpacing:"0.05em" }}>{r}</span>
            ))}
          </div>
        </div>
      )}

      {profile.commonEffects?.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={LS}>Common effects</div>
          <ul style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.7, margin:0, paddingLeft:18 }}>
            {profile.commonEffects.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {profile.markerEffects && Object.keys(profile.markerEffects).length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={LS}>Bloodwork impact</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {Object.entries(profile.markerEffects).map(([marker, effect]) => {
              const effectColor = effect === "increases" ? "#a78bfa"
                : effect === "decreases" ? "#fbbf24"
                : effect === "suppresses" ? "#f87171"
                : "#71717a";
              return (
                <div key={marker} style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px", border:"1px solid #1e1e22", fontSize:11 }}>
                  <span style={{ color:"#a1a1aa", fontFamily:"'JetBrains Mono',monospace" }}>{marker.replace(/_/g, " ")}</span>
                  <span style={{ color:effectColor, textTransform:"uppercase", fontSize:9, fontWeight:600, letterSpacing:"0.05em" }}>{effect}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {profile.risks?.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ ...LS, color:"#f87171" }}>Risks</div>
          <ul style={{ fontSize:11, color:"#fca5a5", lineHeight:1.7, margin:0, paddingLeft:18 }}>
            {profile.risks.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {profile.stacksWith?.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={LS}>Common stacks</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {profile.stacksWith.map((s, i) => (
              <span key={i} style={{ fontSize:10, padding:"3px 8px", background:"rgba(45,212,191,0.04)", color:T, border:"1px solid rgba(45,212,191,0.1)" }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {profile.notes && (
        <div className="c" style={{ padding:12, marginBottom:16 }}>
          <div style={{ fontSize:9, color:"#71717a", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>Notes</div>
          <p style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.6, margin:0 }}>{profile.notes}</p>
        </div>
      )}

      {error && (
        <div className="c" style={{ padding:12, marginBottom:14, borderColor:"rgba(239,68,68,0.2)" }}>
          <p style={{ fontSize:11, color:"#f87171", margin:0 }}>{error}</p>
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginTop:20 }}>
        <button onClick={onCancel} style={{ flex:1, height:44, background:"transparent", border:"1px solid #1e1e22", color:"#71717a", fontSize:11, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex:2, height:44, background:T, color:"#000", border:"none", fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Save & Add to Stack</button>
      </div>
    </div>
  );
}
