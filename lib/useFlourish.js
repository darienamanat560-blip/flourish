"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// useFlourish — single source of truth for all app state
//
// Fetches /api/bootstrap on mount and exposes:
//   - data (profile, cycle, compounds, logs, training, prs, alerts, memory)
//   - loading / error states
//   - mutation helpers that optimistically update local state
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
};

export function useFlourish() {
  const [data, setData] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaded = useRef(false);

  // Bootstrap on mount
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

  // ── Profile ──
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

  // ── Cycles ──
  const createCycle = useCallback(async (cycle) => {
    const res = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cycle),
    });
    if (!res.ok) throw new Error("Failed to create cycle");
    const json = await res.json();
    // Refresh to get everything in sync
    await refresh();
    return json.cycle;
  }, [refresh]);

  // ── Compounds ──
  const addCompound = useCallback(async (compound) => {
    // Optimistic update
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
      // Rollback on error
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

  // ── Logs ──
  const saveLog = useCallback(async (log) => {
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error("Failed to save log");
    const json = await res.json();
    setData(d => {
      // Remove any existing log for this date, then prepend the new one
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

  // ── Training ──
  const saveTraining = useCallback(async (session) => {
    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error("Failed to save training");
    const json = await res.json();
    setData(d => ({ ...d, training: [json.session, ...d.training] }));
    // Refresh PRs since a new session could have set one
    fetch("/api/bootstrap").then(r => r.json()).then(b => {
      setData(d => ({ ...d, prs: b.prs, training: b.training }));
    }).catch(() => {});
    return json.session;
  }, []);

  // ── Insights ──
  const generateInsights = useCallback(async () => {
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "manual", includeAI: true }),
    });
    if (!res.ok) throw new Error("Failed to generate insights");
    const json = await res.json();
    // Merge new insights into state
    setData(d => ({
      ...d,
      insights: [...json.insights, ...d.insights].slice(0, 20),
      alerts: [...json.alerts, ...d.alerts].slice(0, 20),
    }));
    return json;
  }, []);

  // ── Memory ──
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
  };
}
