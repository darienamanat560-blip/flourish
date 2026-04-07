"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// useFlourish — single source of truth for all app state
// Updated in batch 5d: panels, symptoms, reminders, state
// ══════════════════════════════════════════════════════════════

const INITIAL = {
  profile: null,
  cycle: null,
  cycles: [],
  compounds: [],
  logs: [],
  training: [],
  prs: [],
  alerts: [],
  insights: [],
  memory: [],
  memoryByCategory: {},
  panels: [],
  symptoms: [],
  reminders: [],
  state: null,
};

export function useFlourish() {
  const [data, setData] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    refresh();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bootstrap");
      if (res.status === 401) {
        setError("unauthorized");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (profile) => {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error("Failed to save profile");
    const json = await res.json();
    setData(d => ({ ...d, profile: json.profile }));
    return json.profile;
  }, []);

  const createCycle = useCallback(async (cycle) => {
    const res = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cycle),
    });
    if (!res.ok) throw new Error("Failed to create cycle");
    const json = await res.json();
    await refresh();
    return json.cycle;
  }, [refresh]);

  const addCompound = useCallback(async (compound) => {
    const tempId = "temp-" + Math.random().toString(36).slice(2, 9);
    const optimistic = { id: tempId, ...compound, status: "active" };
    setData(d => ({ ...d, compounds: [...d.compounds, optimistic] }));

    try {
      const res = await fetch("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compound),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(d => ({
        ...d,
        compounds: d.compounds.map(c => c.id === tempId ? json.compound : c),
      }));
      return json.compound;
    } catch {
      setData(d => ({ ...d, compounds: d.compounds.filter(c => c.id !== tempId) }));
      throw new Error("Failed to add compound");
    }
  }, []);

  const updateCompound = useCallback(async (id, updates) => {
    const prev = data.compounds.find(c => c.id === id);
    setData(d => ({
      ...d,
      compounds: d.compounds.map(c => c.id === id ? { ...c, ...updates } : c),
    }));

    try {
      const res = await fetch(`/api/compounds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(d => ({
        ...d,
        compounds: d.compounds.map(c => c.id === id ? json.compound : c),
      }));
    } catch {
      setData(d => ({
        ...d,
        compounds: d.compounds.map(c => c.id === id ? prev : c),
      }));
      throw new Error("Failed to update");
    }
  }, [data.compounds]);

  const deleteCompound = useCallback(async (id) => {
    const prev = data.compounds;
    setData(d => ({ ...d, compounds: d.compounds.filter(c => c.id !== id) }));
    try {
      const res = await fetch(`/api/compounds/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setData(d => ({ ...d, compounds: prev }));
      throw new Error("Failed to delete");
    }
  }, [data.compounds]);

  const saveLog = useCallback(async (log) => {
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error("Failed to save log");
    const json = await res.json();
    setData(d => {
      const withoutDate = d.logs.filter(l => l.date !== json.log.date);
      return { ...d, logs: [json.log, ...withoutDate] };
    });
    return json.log;
  }, []);

  const deleteLog = useCallback(async (id) => {
    const prev = data.logs;
    setData(d => ({ ...d, logs: d.logs.filter(l => l.id !== id) }));
    try {
      const res = await fetch(`/api/logs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setData(d => ({ ...d, logs: prev }));
    }
  }, [data.logs]);

  const saveTraining = useCallback(async (session) => {
    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error("Failed to save training");
    const json = await res.json();
    setData(d => ({ ...d, training: [json.session, ...d.training] }));
    fetch("/api/bootstrap").then(r => r.json()).then(b => {
      setData(d => ({ ...d, prs: b.prs, training: b.training }));
    }).catch(() => {});
    return json.session;
  }, []);

  const generateInsights = useCallback(async () => {
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "manual", includeAI: true }),
    });
    if (!res.ok) throw new Error("Failed to generate insights");
    const json = await res.json();
    setData(d => ({
      ...d,
      insights: [...json.insights, ...d.insights].slice(0, 20),
      alerts: [...json.alerts, ...d.alerts].slice(0, 20),
    }));
    return json;
  }, []);

  const deleteMemory = useCallback(async (id) => {
    const prev = data.memory;
    setData(d => ({ ...d, memory: d.memory.filter(m => m.id !== id) }));
    try {
      const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setData(d => ({ ...d, memory: prev }));
    }
  }, [data.memory]);

  // ── Bloodwork (new in 5D) ──
  const savePanel = useCallback(async (panel) => {
    const res = await fetch("/api/bloodwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(panel),
    });
    if (!res.ok) throw new Error("Failed to save panel");
    const json = await res.json();
    await refresh();
    return json.panel;
  }, [refresh]);

  const deletePanel = useCallback(async (id) => {
    const prev = data.panels;
    setData(d => ({ ...d, panels: d.panels.filter(p => p.id !== id) }));
    try {
      const res = await fetch(`/api/bloodwork/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setData(d => ({ ...d, panels: prev }));
    }
  }, [data.panels]);

  // ── Symptoms (new in 5D) ──
  const saveSymptoms = useCallback(async (symptoms) => {
    const res = await fetch("/api/symptoms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(symptoms),
    });
    if (!res.ok) throw new Error("Failed to save symptoms");
    const json = await res.json();
    setData(d => {
      const withoutDate = d.symptoms.filter(s => s.date !== json.symptom.date);
      return { ...d, symptoms: [json.symptom, ...withoutDate] };
    });
    return json.symptom;
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    saveProfile,
    createCycle,
    addCompound,
    updateCompound,
    deleteCompound,
    saveLog,
    deleteLog,
    saveTraining,
    generateInsights,
    deleteMemory,
    savePanel,
    deletePanel,
    saveSymptoms,
  };
}
