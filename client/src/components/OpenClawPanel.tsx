/**
 * OpenClawPanel — Phase 4
 *
 * Painel de visualização de Skills Emergentes detectadas pelo PatternDetector.
 * Exibido como aba na sidebar do /development.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, CheckCircle, XCircle, ChevronDown, ChevronRight,
  Loader2, Activity, Clock, BarChart2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: string;
  suggestedSkillName: string;
  suggestedDescription: string | null;
  estimatedAutomation: string | null;
  confidence: string;
  draftBody: string | null;
  createdAt: string;
}

interface Pattern {
  id: string;
  actionType: string;
  description: string | null;
  frequency: number;
  confidence: string;
  firstSeenAt: string;
  lastSeenAt: string;
  status: string;
}

export default function OpenClawPanel() {
  const [tab, setTab] = useState<"suggestions" | "patterns">("suggestions");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sugData, isLoading: sugLoading } = useQuery<{ suggestions: Suggestion[]; total: number }>({
    queryKey: ["/api/openclaw/suggestions"],
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: patData, isLoading: patLoading } = useQuery<{ patterns: Pattern[]; total: number }>({
    queryKey: ["/api/openclaw/patterns"],
    enabled: tab === "patterns",
  });

  const accept = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/openclaw/suggestions/${id}/accept`, { method: "POST" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/openclaw/suggestions"] });
      qc.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({ title: "Skill publicada!" });
    },
    onError: () => toast({ title: "Erro ao aceitar", variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/openclaw/suggestions/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/openclaw/suggestions"] });
      toast({ title: "Sugestão rejeitada" });
    },
    onError: () => toast({ title: "Erro ao rejeitar", variant: "destructive" }),
  });

  const suggestions = sugData?.suggestions ?? [];
  const patterns = patData?.patterns ?? [];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <div>
          <h2 className="text-sm font-semibold">Skills Emergentes</h2>
          <p className="text-[11px] text-white/40">OpenClaw — detecção automática de padrões</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 text-xs">
        <button
          onClick={() => setTab("suggestions")}
          className={`px-4 py-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${tab === "suggestions" ? "border-yellow-400 text-yellow-400" : "border-transparent text-white/50 hover:text-white"}`}
        >
          <Sparkles className="w-3 h-3" />
          Sugestões
          {suggestions.length > 0 && (
            <span className="ml-1 rounded-full bg-yellow-400 text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center">
              {suggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("patterns")}
          className={`px-4 py-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${tab === "patterns" ? "border-yellow-400 text-yellow-400" : "border-transparent text-white/50 hover:text-white"}`}
        >
          <Activity className="w-3 h-3" />
          Padrões
        </button>
      </div>

      <ScrollArea className="flex-1">
        {/* Sugestões */}
        {tab === "suggestions" && (
          <div>
            {sugLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            )}
            {!sugLoading && suggestions.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Sparkles className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">Nenhuma sugestão pendente</p>
                <p className="text-xs text-white/20 mt-1">O detector roda a cada hora</p>
              </div>
            )}
            <div className="divide-y divide-white/5">
              {suggestions.map((s) => {
                const conf = Math.round(Number(s.confidence) * 100);
                const isExp = expanded === s.id;
                const isAccepting = accept.isPending && accept.variables === s.id;
                const isRejecting = reject.isPending && reject.variables === s.id;

                return (
                  <div key={s.id} className="px-4 py-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.suggestedSkillName}</p>
                        {s.suggestedDescription && (
                          <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{s.suggestedDescription}</p>
                        )}
                      </div>
                      <Badge className="shrink-0 bg-yellow-400/10 text-yellow-400 border-yellow-400/20 text-[10px]">
                        {conf}%
                      </Badge>
                    </div>

                    {s.draftBody && (
                      <div>
                        <button
                          onClick={() => setExpanded(isExp ? null : s.id)}
                          className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 transition-colors"
                        >
                          {isExp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {isExp ? "Ocultar body" : "Ver body gerado"}
                        </button>
                        {isExp && (
                          <pre className="mt-2 rounded bg-black/40 p-3 text-[11px] text-white/60 overflow-x-auto whitespace-pre-wrap font-mono max-h-40 border border-white/5">
                            {s.draftBody}
                          </pre>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 hover:bg-emerald-900/60"
                        onClick={() => accept.mutate(s.id)}
                        disabled={isAccepting || isRejecting}
                      >
                        {isAccepting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        <span className="ml-1">Aceitar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => reject.mutate(s.id)}
                        disabled={isAccepting || isRejecting}
                      >
                        {isRejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        <span className="ml-1">Rejeitar</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Padrões */}
        {tab === "patterns" && (
          <div>
            {patLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            )}
            {!patLoading && patterns.length === 0 && (
              <div className="px-5 py-12 text-center">
                <BarChart2 className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">Nenhum padrão detectado</p>
                <p className="text-xs text-white/20 mt-1">Execute skills manualmente para gerar dados</p>
              </div>
            )}
            <div className="divide-y divide-white/5">
              {patterns.map((p) => {
                const conf = Math.round(Number(p.confidence) * 100);
                const last = new Date(p.lastSeenAt).toLocaleDateString("pt-BR");
                return (
                  <div key={p.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono text-white/70 truncate">{p.actionType}</p>
                      <Badge className="shrink-0 bg-white/5 text-white/50 border-white/10 text-[10px]">
                        {conf}%
                      </Badge>
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-white/40">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-white/30">
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{p.frequency}x</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{last}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
