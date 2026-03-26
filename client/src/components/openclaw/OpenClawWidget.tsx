/**
 * OpenClawWidget.tsx
 *
 * Widget flutuante do OpenClaw — aparece quando há sugestões pendentes.
 * Posicionado no canto inferior direito, fora das rotas.
 * Abre o modal SkillSuggestion para confirmação.
 *
 * Fase 4: OpenClaw Sprint 2
 */

import { useState } from "react";
import { Sparkles, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentEmergence } from "@/hooks/useAgentEmergence";
import { SkillSuggestion } from "./SkillSuggestion";
import { useAuth } from "@/hooks/use-auth";

export function OpenClawWidget() {
  const { user } = useAuth();
  const {
    suggestions,
    activeSuggestion,
    pendingCount,
    confirmSkill,
    rejectSkill,
    openSuggestion,
    closeSuggestion,
  } = useAgentEmergence();

  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Não renderiza se não há usuário, não há sugestões, ou foi dispensado
  if (!user || pendingCount === 0 || dismissed) return null;

  return (
    <>
      {/* Widget flutuante */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
        role="complementary"
        aria-label="OpenClaw - Sugestões de Skills"
      >
        {/* Painel expandido */}
        {!collapsed && (
          <div className="w-72 rounded-xl border bg-background shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b bg-violet-50 dark:bg-violet-900/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                  OpenClaw
                </span>
                <Badge className="bg-violet-600 text-white text-xs px-1.5 py-0">
                  {pendingCount}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/40 text-muted-foreground"
                  aria-label="Minimizar"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/40 text-muted-foreground"
                  aria-label="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Detectei padrões de uso que podem virar skills automáticas:
              </p>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSuggestion(s)}
                  className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-tight line-clamp-1">
                      {s.suggested_skill_name}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {Math.round(s.confidence * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {s.suggested_description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botão minimizado */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 shadow-lg transition-colors"
            aria-label="Expandir sugestões de skills"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Skills sugeridas</span>
            <Badge className="bg-white text-violet-700 text-xs px-1.5 py-0 ml-0.5">
              {pendingCount}
            </Badge>
            <ChevronUp className="h-3.5 w-3.5 ml-0.5" />
          </button>
        )}
      </div>

      {/* Modal de detalhes */}
      {activeSuggestion && (
        <SkillSuggestion
          suggestion={activeSuggestion}
          onConfirm={confirmSkill}
          onReject={rejectSkill}
          onClose={closeSuggestion}
        />
      )}
    </>
  );
}
