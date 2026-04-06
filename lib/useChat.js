"use client";
import { useState, useCallback, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// useChat — manages chat thread and messages
//
// Loads the active thread on mount, handles sending messages,
// receiving responses, and updating local state optimistically.
// ══════════════════════════════════════════════════════════════

export function useChat() {
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const loaded = useRef(false);

  // Load active thread on mount
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadThreads();
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/threads");
      if (!res.ok) return;
      const json = await res.json();
      const active = json.threads?.find(t => t.active);
      if (active) {
        setThreadId(active.id);
        await loadMessages(active.id);
      }
    } catch {}
  }, []);

  const loadMessages = useCallback(async (tid) => {
    try {
      // We don't have a dedicated messages endpoint yet, so we'll
      // start fresh each session — the backend still stores history
      // and includes it in context for AI responses.
      // TODO: add GET /api/ai/threads/[id]/messages
    } catch {}
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || sending) return;

    const userMsg = { role: "user", content: text, id: "u-" + Date.now() };
    setMessages(m => [...m, userMsg]);
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send");
      }

      const json = await res.json();

      if (json.threadId && !threadId) setThreadId(json.threadId);

      const assistantMsg = {
        role: "assistant",
        content: json.message,
        id: "a-" + Date.now(),
      };
      setMessages(m => [...m, assistantMsg]);
    } catch (err) {
      setError(err.message);
      // Remove the optimistic user message on error
      setMessages(m => m.filter(msg => msg.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  }, [threadId, sending]);

  const newConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New conversation" }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setThreadId(json.thread.id);
      setMessages([]);
    } catch {}
  }, []);

  return {
    threadId,
    messages,
    sending,
    error,
    sendMessage,
    newConversation,
  };
}
