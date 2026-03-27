/**
 * AutomationCenter — Phase 5: Automation Fabric
 *
 * Visão unificada de todas as automações: Central + XOS.
 * Rota: /automations-center
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrowserFrame } from "@/components/Browser/BrowserFrame";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap, Search, Play, Loader2, CheckCircle, XCircle,
  Clock, Webhook, Bot, Calendar, Activity, Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnifiedAutomation {
  id: string;
  sourceId: number;
  source: "central" | "xos";
  name: string;
  description: string | null;
  triggerType: string;
  isActive: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  schedule: <Clock className="w-3.5 h-3.5" />,
  webhook: <Webhook className="w-3.5 h-3.5" />,
  agent: <Bot className="w-3.5 h-3.5" />,
  event: <Activity className="w-3.5 h-3.5" />,
  contact_created: <Zap className="w-3.5 h-3.5" />,
  deal_stage_changed: <Zap className="w-3.5 h-3.5" />,
  form_submitted: <Zap className="w-3.5 h-3.5" />,
};

const TRIGGER_LABEL: Record<string, string> = {
  schedule: "Agendada",
  webhook: "Webhook",
  manual: "Manual",
  event: "Evento",
  agent: "Agente",
  contact_created: "Novo Contato",
  deal_stage_changed: "Mudança de Etapa",
  form_submitted: "Formulário",
};

export default function AutomationCenter() {
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "central" | "xos">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ automations: UnifiedAutomation[]; total: number }>({
    queryKey: ["/api/automation-fabric/list"],
    refetchInterval: 30_000,
  });

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation-fabric/${encodeURIComponent(id)}/run`, { method: "POST" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (_, id) => {
      toast({ title: "Automação executada" });
      qc.invalidateQueries({ queryKey: ["/api/automation-fabric/list"] });
    },
    onError: () => toast({ title: "Erro ao executar", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/automation-fabric/${encodeURIComponent(id)}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/automation-fabric/list"] }),
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const automations = data?.automations ?? [];

  const filtered = automations.filter((a) => {
    if (filterSource !== "all" && a.source !== filterSource) return false;
    if (filterStatus === "active" && !a.isActive) return false;
    if (filterStatus === "inactive" && a.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.triggerType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = automations.filter((a) => a.isActive).length;
  const centralCount = automations.filter((a) => a.source === "central").length;
  const xosCount = automations.filter((a) => a.source === "xos").length;

  return (
    <BrowserFrame>
      <div className="flex flex-col h-full bg-[#0a0f1a] text-white">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#c89b3c]" />
              Automation Center
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {automations.length} automações · {activeCount} ativas · Central ({centralCount}) + XOS ({xosCount})
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-3 border-b border-white/10 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar automações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-white/5 border-white/10"
            />
          </div>

          {/* Source filter */}
          <div className="flex rounded-md border border-white/10 overflow-hidden">
            {(["all", "central", "xos"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSource(s)}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  filterSource === s ? "bg-[#c89b3c] text-black font-medium" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {s === "all" ? "Todas" : s === "central" ? "Central" : "XOS"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex rounded-md border border-white/10 overflow-hidden">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  filterStatus === s ? "bg-[#c89b3c] text-black font-medium" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {s === "all" ? "Todas" : s === "active" ? "Ativas" : "Inativas"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-white/30" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-3">
              <Filter className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhuma automação encontrada</p>
              {search && <p className="text-xs">Tente outro filtro ou busca</p>}
            </div>
          )}

          <div className="divide-y divide-white/5">
            {filtered.map((a) => {
              const isRunning = runMutation.isPending && runMutation.variables === a.id;
              const isToggling = toggleMutation.isPending && toggleMutation.variables?.id === a.id;
              const triggerIcon = TRIGGER_ICONS[a.triggerType] ?? <Zap className="w-3.5 h-3.5" />;
              const triggerLabel = TRIGGER_LABEL[a.triggerType] ?? a.triggerType;
              const lastRun = a.lastExecutedAt
                ? new Date(a.lastExecutedAt).toLocaleDateString("pt-BR")
                : null;

              return (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors">

                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.isActive ? "bg-[#c89b3c]/15 text-[#c89b3c]" : "bg-white/5 text-white/30"}`}>
                    {triggerIcon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{a.name}</span>
                      <Badge
                        className={`text-[9px] px-1.5 py-0 shrink-0 ${
                          a.source === "central"
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                            : "bg-purple-500/15 text-purple-400 border-purple-500/20"
                        }`}
                      >
                        {a.source === "central" ? "Central" : "XOS"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-white/40 flex items-center gap-1">
                        {triggerIcon} {triggerLabel}
                      </span>
                      {a.executionCount > 0 && (
                        <span className="text-[11px] text-white/30">{a.executionCount}x</span>
                      )}
                      {lastRun && (
                        <span className="text-[11px] text-white/30 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {lastRun}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                      onClick={() => runMutation.mutate(a.id)}
                      disabled={isRunning || !a.isActive}
                      title="Executar agora"
                    >
                      {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>

                    <Switch
                      checked={a.isActive}
                      disabled={isToggling}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: a.id, isActive: v })}
                      className="scale-75"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </BrowserFrame>
  );
}
