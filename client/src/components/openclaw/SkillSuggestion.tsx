/**
 * SkillSuggestion.tsx
 *
 * Modal com preview da skill sugerida pelo OpenClaw.
 * Apresenta padrão detectado, nome, descrição e preview de automação.
 * Usuário pode confirmar ou rejeitar.
 *
 * Fase 4: OpenClaw Sprint 2
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Check, Zap, BarChart2 } from "lucide-react";
import type { SkillSuggestionData } from "@/hooks/useAgentEmergence";

interface SkillSuggestionProps {
  suggestion: SkillSuggestionData;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}

export function SkillSuggestion({ suggestion, onConfirm, onReject, onClose }: SkillSuggestionProps) {
  const confidencePct = Math.round(suggestion.confidence * 100);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/30">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <DialogTitle className="text-base">Nova skill detectada</DialogTitle>
          </div>
        </DialogHeader>

        {/* Padrão detectado */}
        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Padrão detectado</p>
          <p className="font-medium">{suggestion.pattern.description || suggestion.pattern.action_type}</p>
          <div className="flex items-center gap-3 text-muted-foreground text-xs mt-1">
            <span className="flex items-center gap-1">
              <BarChart2 className="h-3 w-3" />
              {suggestion.pattern.frequency}x detectado
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Confiança: {confidencePct}%
            </span>
          </div>
        </div>

        {/* Skill sugerida */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Nome da skill</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {suggestion.suggested_skill_name}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
            <p className="text-sm">{suggestion.suggested_description}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">O que será automatizado</p>
            <div className="rounded-md border bg-muted/20 p-2.5 text-sm text-muted-foreground">
              {suggestion.estimated_automation}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(suggestion.id)}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Rejeitar
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(suggestion.id)}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
          >
            <Check className="h-3.5 w-3.5" />
            Criar skill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
