/**
 * useAgentEmergence.ts
 *
 * Hook para gerenciar sugestões de skills do OpenClaw.
 * Escuta eventos Socket.IO e coordena confirmações/rejeições.
 *
 * Fase 4: OpenClaw Sprint 2
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";

export interface SkillSuggestionData {
  id: string;
  pattern: {
    id: string;
    action_type: string;
    frequency: number;
    confidence: number;
    description: string;
  };
  suggested_skill_name: string;
  suggested_description: string;
  estimated_automation: string;
  confidence: number;
  created_at: string;
  status: "pending" | "accepted" | "rejected";
}

interface UseAgentEmergenceReturn {
  suggestions: SkillSuggestionData[];
  activeSuggestion: SkillSuggestionData | null;
  isOpen: boolean;
  pendingCount: number;
  confirmSkill: (suggestionId: string) => Promise<void>;
  rejectSkill: (suggestionId: string) => Promise<void>;
  openSuggestion: (suggestion: SkillSuggestionData) => void;
  closeSuggestion: () => void;
  dismissWidget: () => void;
}

export function useAgentEmergence(): UseAgentEmergenceReturn {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SkillSuggestionData[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<SkillSuggestionData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Carrega sugestões pendentes do servidor
  const fetchPendingSuggestions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/openclaw/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // silencioso — não bloqueia o usuário
    }
  }, [user]);

  // Escuta eventos Socket.IO via window (padrão da suite)
  useEffect(() => {
    if (!user) return;

    fetchPendingSuggestions();

    const handleOpenClawEvent = (event: CustomEvent) => {
      const suggestion: SkillSuggestionData = event.detail;
      setSuggestions((prev) => {
        const exists = prev.find((s) => s.id === suggestion.id);
        if (exists) return prev;
        return [suggestion, ...prev];
      });
    };

    window.addEventListener("openclaw:suggestion" as any, handleOpenClawEvent);
    return () => {
      window.removeEventListener("openclaw:suggestion" as any, handleOpenClawEvent);
    };
  }, [user, fetchPendingSuggestions]);

  const confirmSkill = useCallback(async (suggestionId: string) => {
    try {
      const res = await fetch("/api/openclaw/confirm-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion_id: suggestionId, action: "confirm" }),
      });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        setActiveSuggestion(null);
        setIsOpen(false);
      }
    } catch {
      // erro tratado na UI via toast externo
    }
  }, []);

  const rejectSkill = useCallback(async (suggestionId: string) => {
    try {
      const res = await fetch("/api/openclaw/confirm-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion_id: suggestionId, action: "reject" }),
      });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        setActiveSuggestion(null);
        setIsOpen(false);
      }
    } catch {
      // silencioso
    }
  }, []);

  const openSuggestion = useCallback((suggestion: SkillSuggestionData) => {
    setActiveSuggestion(suggestion);
    setIsOpen(true);
  }, []);

  const closeSuggestion = useCallback(() => {
    setActiveSuggestion(null);
    setIsOpen(false);
  }, []);

  const dismissWidget = useCallback(() => {
    setIsOpen(false);
    setActiveSuggestion(null);
  }, []);

  return {
    suggestions,
    activeSuggestion,
    isOpen,
    pendingCount: suggestions.length,
    confirmSkill,
    rejectSkill,
    openSuggestion,
    closeSuggestion,
    dismissWidget,
  };
}
