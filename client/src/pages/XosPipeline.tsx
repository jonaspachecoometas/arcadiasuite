import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrowserFrame } from "@/components/Browser/BrowserFrame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileCode,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Bot,
  Cpu,
  Shield,
  Rocket,
  Brain,
  ChevronRight,
  Undo2,
  BookOpen,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  CheckSquare,
  Square,
  Fingerprint,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ExternalLink,
  PanelLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const PHASE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  design: { label: "Arquitetura", icon: Cpu, color: "text-blue-400" },
  codegen: { label: "Geração de Código", icon: FileCode, color: "text-green-400" },
  validation: { label: "Validação", icon: Shield, color: "text-yellow-400" },
  staging: { label: "Staging", icon: Eye, color: "text-purple-400" },
  evolution: { label: "Evolução", icon: Brain, color: "text-pink-400" },
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  queued: { label: "Na Fila", color: "bg-gray-600" },
  running: { label: "Executando", color: "bg-blue-600" },
  staging_review: { label: "Aguardando Aprovação", color: "bg-yellow-600" },
  completed: { label: "Concluído", color: "bg-green-600" },
  failed: { label: "Falhou", color: "bg-red-600" },
};

function BudgetMeter({ budget }: { budget: any }) {
  if (!budget) return null;

  const timePercent = Math.min(100, Math.round((budget.usedTimeMs / budget.maxTimeMs) * 100));
  const callsPercent = Math.min(100, Math.round((budget.usedCalls / budget.maxCalls) * 100));

  return (
    <Card className="bg-zinc-900 border-zinc-800" data-testid="budget-meter">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
          <Gauge className="w-4 h-4" /> Budget
          {budget.exceeded && <Badge className="bg-red-600 text-[10px]">Excedido</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Tempo</span>
            <span>{Math.round(budget.usedTimeMs / 1000)}s / {Math.round(budget.maxTimeMs / 1000)}s</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${timePercent > 80 ? "bg-red-500" : timePercent > 50 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${timePercent}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Chamadas</span>
            <span>{budget.usedCalls} / {budget.maxCalls}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${callsPercent > 80 ? "bg-red-500" : callsPercent > 50 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${callsPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RunbookView({ pipelineId }: { pipelineId: number }) {
  const { data } = useQuery<any>({
    queryKey: [`/api/xos/pipeline/${pipelineId}/runbook`],
    refetchInterval: 10000,
  });

  const runbook = data?.runbook;
  if (!runbook) return <p className="text-sm text-zinc-500 text-center py-4">Nenhum runbook disponível ainda</p>;

  return (
    <div className="space-y-4" data-testid="runbook-view">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Contexto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-300">{runbook.context}</p>
        </CardContent>
      </Card>

      {runbook.decisions?.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Decisões ({runbook.decisions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {runbook.decisions.map((d: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded text-xs">
                    <Badge variant="outline" className="text-[10px] shrink-0">{d.phase}</Badge>
                    <span className="text-zinc-500">{d.agent}:</span>
                    <span className="text-zinc-300 flex-1">{d.decision}</span>
                    <span className="text-zinc-600 text-[10px] shrink-0">
                      {new Date(d.timestamp).toLocaleTimeString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {runbook.validations && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Validação
              <Badge className={runbook.validations.valid ? "bg-green-600" : "bg-red-600"}>
                Score: {runbook.validations.score}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runbook.validations.gates && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(runbook.validations.gates).map(([gate, passed]: [string, any]) => (
                  <Badge key={gate} className={passed ? "bg-green-600/20 text-green-400 border border-green-600/50" : "bg-red-600/20 text-red-400 border border-red-600/50"}>
                    {passed ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {gate}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {runbook.approval && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Aprovação</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-300 space-y-1">
            <p>Revisado por: {runbook.approval.reviewedBy}</p>
            <p>Arquivos aplicados: {runbook.approval.applied?.length || 0}</p>
            {runbook.approval.errors?.length > 0 && (
              <p className="text-red-400">Erros: {runbook.approval.errors.join(", ")}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PipelineTimeline({ phases }: { phases: Record<string, any> | null }) {
  if (!phases) return null;
  const phaseOrder = ["design", "codegen", "validation", "staging", "evolution"];

  return (
    <div className="flex items-center gap-1 w-full" data-testid="pipeline-timeline">
      {phaseOrder.map((phase, idx) => {
        const data = phases[phase] || { status: "pending" };
        const config = PHASE_LABELS[phase];
        const Icon = config.icon;
        const isActive = data.status === "running";
        const isComplete = data.status === "completed";
        const isFailed = data.status === "failed";

        return (
          <div key={phase} className="flex items-center flex-1">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 transition-all
                ${isActive ? "bg-blue-500/20 border border-blue-500/50 shadow-lg shadow-blue-500/10" : ""}
                ${isComplete ? "bg-green-500/10 border border-green-500/30" : ""}
                ${isFailed ? "bg-red-500/10 border border-red-500/30" : ""}
                ${data.status === "pending" ? "bg-zinc-800/50 border border-zinc-700/30" : ""}
              `}
              data-testid={`phase-${phase}`}
            >
              {isActive ? (
                <Loader2 className={`w-4 h-4 ${config.color} animate-spin`} />
              ) : isComplete ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : isFailed ? (
                <XCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Icon className="w-4 h-4 text-zinc-500" />
              )}
              <span className={`text-xs font-medium ${isActive ? config.color : isComplete ? "text-green-400" : "text-zinc-500"}`}>
                {config.label}
              </span>
            </div>
            {idx < phaseOrder.length - 1 && (
              <ChevronRight className={`w-4 h-4 mx-1 shrink-0 ${isComplete ? "text-green-400" : "text-zinc-600"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PipelinePreviewPanel() {
  const [previewUrl, setPreviewUrl] = useState("/");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Preview ao Vivo do Sistema
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-1">
              <Button variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("desktop")} data-testid="btn-preview-desktop">
                <Monitor className="w-3 h-3" />
              </Button>
              <Button variant={previewDevice === "tablet" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("tablet")} data-testid="btn-preview-tablet">
                <Tablet className="w-3 h-3" />
              </Button>
              <Button variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("mobile")} data-testid="btn-preview-mobile">
                <Smartphone className="w-3 h-3" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
              const iframe = document.getElementById("pipeline-preview-iframe") as HTMLIFrameElement;
              if (iframe) iframe.src = iframe.src;
            }} data-testid="btn-preview-refresh">
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(previewUrl, "_blank")} data-testid="btn-preview-external">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
          <Globe className="w-4 h-4 text-zinc-500" />
          <Input
            value={previewUrl}
            onChange={(e: any) => setPreviewUrl(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === "Enter") {
                const iframe = document.getElementById("pipeline-preview-iframe") as HTMLIFrameElement;
                if (iframe) iframe.src = previewUrl;
              }
            }}
            className="border-0 bg-transparent p-0 h-auto text-sm text-zinc-300 focus-visible:ring-0 font-mono"
            placeholder="/"
            data-testid="input-preview-url"
          />
        </div>
        <div className={`bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700 mx-auto transition-all ${
          previewDevice === "desktop" ? "w-full h-[500px]" :
          previewDevice === "tablet" ? "max-w-[768px] h-[500px]" :
          "max-w-[375px] h-[667px]"
        }`}>
          <iframe
            id="pipeline-preview-iframe"
            src={previewUrl}
            className="w-full h-full bg-white"
            title="Pipeline Preview"
            data-testid="iframe-pipeline-preview"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineReviewPanel({ pipelineId, changes, onAction }: { pipelineId: number; changes: any[]; onAction: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("/");
  const [showPreview, setShowPreview] = useState(true);

  const allPending = changes.filter(c => c.status === "pending");
  const pendingMap = new Map<string, any>();
  for (const c of allPending) {
    pendingMap.set(c.filePath, c);
  }
  const pendingChanges = Array.from(pendingMap.values());

  useEffect(() => {
    setSelectedFiles(new Set(pendingChanges.map(c => c.filePath)));
  }, [changes.length]);

  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      const files = Array.from(selectedFiles);
      const body: any = {};
      if (files.length < pendingChanges.length) {
        body.selectedFiles = files;
      }
      const res = await apiRequest("POST", `/api/xos/pipeline/${pipelineId}/approve`, body);
      return res.json();
    },
    onSuccess: (data: any) => {
      const applied = data.applied?.length || 0;
      const errs = data.errors?.length || 0;
      toast({
        title: `${applied} arquivo(s) aplicado(s)${errs > 0 ? `, ${errs} erro(s)` : ""}`,
        variant: errs > 0 ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/xos/pipeline"] });
      queryClient.invalidateQueries({ queryKey: [`/api/xos/pipeline/${pipelineId}`] });
      onAction();
      const iframe = document.getElementById("review-preview-iframe") as HTMLIFrameElement;
      if (iframe) setTimeout(() => { iframe.src = iframe.src; }, 1500);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao aprovar", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/xos/pipeline/${pipelineId}/reject`),
    onSuccess: () => {
      toast({ title: "Alterações rejeitadas" });
      queryClient.invalidateQueries({ queryKey: ["/api/xos/pipeline"] });
      queryClient.invalidateQueries({ queryKey: [`/api/xos/pipeline/${pipelineId}`] });
      onAction();
    },
    onError: (err: any) => {
      toast({ title: "Erro ao rejeitar", description: err.message, variant: "destructive" });
    },
  });

  const detectRoute = (filePath: string) => {
    const pageMatch = filePath.match(/pages\/(\w+)\.tsx/);
    if (pageMatch) {
      const name = pageMatch[1];
      const routeMap: Record<string, string> = {
        BiWorkspace: "/insights", Cockpit: "/", Agent: "/agent", Fisco: "/fisco",
        ERP: "/erp", Financeiro: "/financeiro", People: "/people", XosPipeline: "/xos/pipeline",
        DevCenter: "/dev-center", Admin: "/admin", Chat: "/chat", Tickets: "/tickets",
        CommCenter: "/comm", ApiHub: "/api-hub", AppCenter: "/apps",
        MetabaseProxyPage: "/insights", ProxyPage: "/insights",
        CommercialEnv: "/commercial",
      };
      return routeMap[name] || "/";
    }
    if (filePath.includes("metabase/proxy") || filePath.includes("metaset")) return "/insights";
    if (filePath.includes("server/routes")) return "/";
    if (filePath.includes("modules/")) {
      const modMatch = filePath.match(/modules\/(\w+)/);
      if (modMatch) return "/apps";
    }
    return null;
  };

  useEffect(() => {
    if (pendingChanges.length > 0) {
      const firstRoute = pendingChanges.map(c => detectRoute(c.filePath)).find(r => r !== null);
      if (firstRoute && previewUrl === "/") {
        setPreviewUrl(firstRoute);
      }
    }
  }, [pendingChanges.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-yellow-300 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Revisão de Código — {pendingChanges.length} arquivo(s) pendente(s)
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-zinc-700 text-zinc-400"
            onClick={() => setShowPreview(!showPreview)}
            data-testid="btn-toggle-preview"
          >
            <PanelLeft className="w-3 h-3 mr-1" /> {showPreview ? "Esconder" : "Mostrar"} Preview
          </Button>
        </div>
      </div>

      <div className={`flex gap-4 ${showPreview ? "" : "flex-col"}`}>
        <div className={`space-y-3 ${showPreview ? "w-1/2" : "w-full"}`}>
          {pendingChanges.map((change: any) => {
            const isSelected = selectedFiles.has(change.filePath);
            const isExpanded = expandedFile === change.filePath;
            const route = detectRoute(change.filePath);
            return (
              <div key={change.id} className={`border rounded-lg overflow-hidden transition-all ${isSelected ? "border-yellow-500/50" : "border-zinc-700/50 opacity-60"}`}>
                <div className="bg-zinc-800 px-3 py-2 flex items-center gap-2">
                  <button onClick={() => toggleFile(change.filePath)} className="shrink-0" data-testid={`toggle-review-${change.id}`}>
                    {isSelected ? <CheckSquare className="w-4 h-4 text-yellow-400" /> : <Square className="w-4 h-4 text-zinc-600" />}
                  </button>
                  <FileCode className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="text-xs font-mono text-zinc-300 truncate flex-1">{change.filePath}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {change.action || (change.originalContent ? "modify" : "create")}
                  </Badge>
                  {route && showPreview && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-blue-400" onClick={() => setPreviewUrl(route)} data-testid={`nav-preview-${change.id}`}>
                      <Monitor className="w-3 h-3 mr-1" /> Preview
                    </Button>
                  )}
                  <button onClick={() => setExpandedFile(isExpanded ? null : change.filePath)} className="shrink-0" data-testid={`expand-review-${change.id}`}>
                    <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                </div>
                {isExpanded && (
                  <ScrollArea className="h-60">
                    <pre className="p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap bg-zinc-950">
                      {change.content?.slice(0, 5000) || ""}
                      {(change.content?.length || 0) > 5000 && "\n\n... (truncado)"}
                    </pre>
                  </ScrollArea>
                )}
              </div>
            );
          })}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || selectedFiles.size === 0}
              className="bg-green-600 hover:bg-green-700 flex-1"
              data-testid="btn-approve-review"
            >
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
              Aprovar {selectedFiles.size < pendingChanges.length ? `${selectedFiles.size} Selecionado(s)` : `Todos (${pendingChanges.length})`}
            </Button>
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              variant="destructive"
              data-testid="btn-reject-review"
            >
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
              Rejeitar
            </Button>
          </div>
        </div>

        {showPreview && (
          <div className="w-1/2">
            <Card className="bg-zinc-900 border-zinc-800 h-full">
              <CardHeader className="py-2 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
                    <Monitor className="w-3 h-3" /> Preview — <span className="font-mono text-blue-400">{previewUrl}</span>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                      const iframe = document.getElementById("review-preview-iframe") as HTMLIFrameElement;
                      if (iframe) iframe.src = iframe.src;
                    }} data-testid="btn-review-preview-refresh">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => window.open(previewUrl, "_blank")} data-testid="btn-review-preview-external">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700 h-[400px]">
                  <iframe
                    id="review-preview-iframe"
                    src={previewUrl}
                    className="w-full h-full bg-white"
                    title="Review Preview"
                    data-testid="iframe-review-preview"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineDetail({ pipelineId }: { pipelineId: number }) {
  const [streamData, setStreamData] = useState<any>(null);
  const [detailTab, setDetailTab] = useState("timeline");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: details, refetch } = useQuery<any>({
    queryKey: [`/api/xos/pipeline/${pipelineId}`],
    refetchInterval: 5000,
  });

  useEffect(() => {
    const es = new EventSource(`/api/xos/pipeline/${pipelineId}/stream`);

    es.addEventListener("status", (e) => {
      try { setStreamData(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener("phase_started", () => refetch());
    es.addEventListener("phase_completed", () => refetch());
    es.addEventListener("staging_ready", () => refetch());
    es.addEventListener("completed", () => refetch());
    es.addEventListener("failed", () => refetch());
    es.addEventListener("rolled_back", () => refetch());

    return () => es.close();
  }, [pipelineId, refetch]);

  const rollbackMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/xos/pipeline/${pipelineId}/rollback`),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: `Rollback: ${data.restored?.length || 0} arquivo(s) restaurado(s)` });
      queryClient.invalidateQueries({ queryKey: ["/api/xos/pipeline"] });
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "Erro no rollback", description: err.message, variant: "destructive" });
    },
  });

  const pipeline = details?.pipeline;
  const phases = streamData?.phases || pipeline?.phases;
  const statusInfo = STATUS_BADGES[pipeline?.status || "queued"];
  const hasAppliedChanges = details?.staging?.some((s: any) => s.status === "applied");
  const pendingStagingCount = details?.staging?.filter((s: any) => s.status === "pending").length || 0;
  const hasPendingChanges = pendingStagingCount > 0;

  useEffect(() => {
    if (hasPendingChanges && detailTab === "timeline") {
      setDetailTab("review");
    }
    if (!hasPendingChanges && detailTab === "review") {
      setDetailTab("timeline");
    }
  }, [hasPendingChanges]);

  return (
    <div className="space-y-4" data-testid={`pipeline-detail-${pipelineId}`}>
      {pipeline && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Pipeline #{pipeline.id}
                {pipeline.correlationId && (
                  <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                    <Fingerprint className="w-3 h-3" /> {pipeline.correlationId.slice(0, 8)}
                  </span>
                )}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">{pipeline.prompt}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasAppliedChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rollbackMutation.mutate()}
                  disabled={rollbackMutation.isPending}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  data-testid="btn-rollback"
                >
                  {rollbackMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Undo2 className="w-3 h-3 mr-1" />}
                  Rollback
                </Button>
              )}
              <Badge className={statusInfo?.color || "bg-gray-600"}>{statusInfo?.label || pipeline.status}</Badge>
            </div>
          </div>

          <PipelineTimeline phases={phases} />

          <BudgetMeter budget={streamData?.budget || pipeline?.budget} />

          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="timeline" className="data-[state=active]:bg-zinc-700" data-testid="subtab-timeline">
                <Clock className="w-3 h-3 mr-1" /> Timeline
              </TabsTrigger>
              {hasPendingChanges && (
                <TabsTrigger value="review" className="data-[state=active]:bg-yellow-600" data-testid="subtab-review">
                  <Eye className="w-3 h-3 mr-1" /> Revisar & Aprovar
                  <Badge className="bg-yellow-500 text-[9px] ml-1 h-4 px-1">{pendingStagingCount}</Badge>
                </TabsTrigger>
              )}
              <TabsTrigger value="preview" className="data-[state=active]:bg-zinc-700" data-testid="subtab-preview">
                <Monitor className="w-3 h-3 mr-1" /> Preview
              </TabsTrigger>
              <TabsTrigger value="runbook" className="data-[state=active]:bg-zinc-700" data-testid="subtab-runbook">
                <BookOpen className="w-3 h-3 mr-1" /> Runbook
              </TabsTrigger>
              <TabsTrigger value="artifacts" className="data-[state=active]:bg-zinc-700" data-testid="subtab-artifacts">
                <FileCode className="w-3 h-3 mr-1" /> Artefatos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-3 space-y-4">
              {hasPendingChanges && (
                <Card className="bg-yellow-500/10 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/15 transition-colors" onClick={() => setDetailTab("review")} data-testid="card-goto-review">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Eye className="w-5 h-5 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-300">
                        {pendingStagingCount} arquivo(s) aguardando sua aprovação
                      </p>
                      <p className="text-xs text-zinc-400">Clique para revisar o código e ver o preview ao vivo</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-yellow-400" />
                  </CardContent>
                </Card>
              )}

              {pipeline.error && (
                <Card className="bg-red-500/5 border-red-500/30">
                  <CardContent className="py-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-400">{pipeline.error}</p>
                  </CardContent>
                </Card>
              )}

              {details?.logs?.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-zinc-400">Log dos Agentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-1">
                        {details.logs.map((log: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className="text-[10px] shrink-0">{log.agentName}</Badge>
                            <span className="text-zinc-400">{log.action}:</span>
                            <span className="text-zinc-300">{log.thought}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {hasPendingChanges && (
              <TabsContent value="review" className="mt-3">
                <PipelineReviewPanel
                  pipelineId={pipelineId}
                  changes={details?.staging || []}
                  onAction={() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ["/api/xos/pipeline"] });
                  }}
                />
              </TabsContent>
            )}

            <TabsContent value="preview" className="mt-3">
              <PipelinePreviewPanel />
            </TabsContent>

            <TabsContent value="runbook" className="mt-3">
              <RunbookView pipelineId={pipelineId} />
            </TabsContent>

            <TabsContent value="artifacts" className="mt-3">
              {details?.artifacts?.length > 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="pt-4">
                    <div className="space-y-1">
                      {details.artifacts.map((a: any) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs p-2 bg-zinc-800/50 rounded">
                          <FileCode className="w-3 h-3 text-zinc-500" />
                          <span className="text-zinc-300 font-mono">{a.name}</span>
                          <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                          <span className="text-zinc-500 ml-auto">{a.createdBy}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">Nenhum artefato gerado ainda</p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function PolicyTestsPanel() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runTests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/governance/policy-tests");
      const data = await res.json();
      setResults(data);
      toast({
        title: data.failed === 0 ? "Todos os testes passaram!" : `${data.failed} teste(s) falharam`,
        variant: data.failed === 0 ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Erro ao executar testes", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800" data-testid="policy-tests-panel">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Policy Tests
        </CardTitle>
        <Button variant="outline" size="sm" onClick={runTests} disabled={loading} data-testid="btn-run-policy-tests">
          {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
          Executar Testes
        </Button>
      </CardHeader>
      {results && (
        <CardContent>
          <div className="flex items-center gap-4 mb-3 text-sm">
            <Badge className="bg-green-600">{results.passed} passaram</Badge>
            {results.failed > 0 && <Badge className="bg-red-600">{results.failed} falharam</Badge>}
            <span className="text-xs text-zinc-500">Total: {results.total}</span>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {results.results?.map((r: any, idx: number) => (
                <div key={idx} className={`flex items-start gap-2 p-2 rounded text-xs ${r.passed ? "bg-green-500/5" : "bg-red-500/10"}`}>
                  {r.passed ? <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />}
                  <div>
                    <span className="text-zinc-300">{r.description}</span>
                    {!r.passed && <p className="text-red-400 mt-0.5">Esperado: {r.expected ? "permitido" : "bloqueado"}, Recebido: {r.actual ? "permitido" : "bloqueado"}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}

export default function XosPipeline() {
  const [prompt, setPrompt] = useState("");
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("new");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pipelinesData, refetch: refetchPipelines } = useQuery<any>({
    queryKey: ["/api/xos/pipeline"],
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: async (promptText: string) => {
      const res = await apiRequest("POST", "/api/xos/pipeline", { prompt: promptText });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Pipeline iniciado!" });
      setPrompt("");
      setSelectedPipeline(data.pipeline.id);
      setActiveTab("detail");
      queryClient.invalidateQueries({ queryKey: ["/api/xos/pipeline"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao criar pipeline", description: err.message, variant: "destructive" });
    },
  });

  const pipelines = pipelinesData?.pipelines || [];
  const runningCount = pipelines.filter((p: any) => p.status === "running").length;
  const stagingCount = pipelines.filter((p: any) => p.status === "staging_review" || p.hasPendingChanges).length;

  return (
    <BrowserFrame>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="text-page-title">
                <Sparkles className="w-6 h-6 text-purple-400" />
                Pipeline Autonomo
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Descreva o que deseja em portugues e os agentes constroem para voce
              </p>
            </div>
            <div className="flex items-center gap-3">
              {runningCount > 0 && (
                <Badge className="bg-blue-600 animate-pulse" data-testid="badge-running-count">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  {runningCount} executando
                </Badge>
              )}
              {stagingCount > 0 && (
                <Badge className="bg-yellow-600" data-testid="badge-staging-count">
                  <Eye className="w-3 h-3 mr-1" />
                  {stagingCount} aguardando
                </Badge>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="new" className="data-[state=active]:bg-purple-600" data-testid="tab-new">
                <Play className="w-4 h-4 mr-1" /> Novo Pipeline
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-purple-600" data-testid="tab-list">
                <Clock className="w-4 h-4 mr-1" /> Historico ({pipelines.length})
              </TabsTrigger>
              {selectedPipeline && (
                <TabsTrigger value="detail" className="data-[state=active]:bg-purple-600" data-testid="tab-detail">
                  <Bot className="w-4 h-4 mr-1" /> Pipeline #{selectedPipeline}
                </TabsTrigger>
              )}
              <TabsTrigger value="tests" className="data-[state=active]:bg-purple-600" data-testid="tab-tests">
                <ShieldCheck className="w-4 h-4 mr-1" /> Policy Tests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4 mt-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-2 block">
                      O que voce quer construir?
                    </label>
                    <Textarea
                      placeholder="Ex: Crie um modulo de cadastro de clientes com nome, email e telefone, com listagem em tabela e formulario de edicao..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[120px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                      data-testid="input-prompt"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Descreva em portugues o que deseja. Os 6 agentes irao: projetar, gerar codigo, validar (3 quality gates), staging com selecao de arquivos, evoluir
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Bot className="w-4 h-4" />
                      <span>6 agentes | Budget controlado | Rollback 1-click | Quality gates</span>
                    </div>
                    <Button
                      onClick={() => createMutation.mutate(prompt)}
                      disabled={!prompt.trim() || prompt.length < 5 || createMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="btn-start-pipeline"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Rocket className="w-4 h-4 mr-2" />
                      )}
                      Iniciar Pipeline
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-5 gap-3">
                {Object.entries(PHASE_LABELS).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Card key={key} className="bg-zinc-900 border-zinc-800">
                      <CardContent className="py-4 flex flex-col items-center gap-2">
                        <Icon className={`w-6 h-6 ${config.color}`} />
                        <span className="text-xs font-medium text-zinc-400">{config.label}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm text-zinc-400">Pipelines Recentes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => refetchPipelines()} data-testid="btn-refresh-list">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {pipelines.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8">Nenhum pipeline criado ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {pipelines.map((p: any) => {
                        const si = STATUS_BADGES[p.status] || STATUS_BADGES.queued;
                        const isStaging = p.status === "staging_review" || p.hasPendingChanges;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              isStaging ? "bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15" : "bg-zinc-800/50 hover:bg-zinc-800"
                            }`}
                            onClick={() => { setSelectedPipeline(p.id); setActiveTab("detail"); }}
                            data-testid={`pipeline-item-${p.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-200 truncate">
                                #{p.id} — {p.prompt}
                                {p.correlationId && (
                                  <span className="text-[10px] text-zinc-600 font-mono ml-2">{p.correlationId.slice(0, 8)}</span>
                                )}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {new Date(p.createdAt).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <Badge className={si.color}>{si.label}</Badge>
                            {p.status === "running" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                            {isStaging && (
                              <Button variant="outline" size="sm" className="h-7 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 text-xs" data-testid={`btn-review-${p.id}`}>
                                <Eye className="w-3 h-3 mr-1" /> Revisar
                              </Button>
                            )}
                            <ArrowRight className="w-4 h-4 text-zinc-600" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detail" className="mt-4">
              {selectedPipeline ? (
                <PipelineDetail pipelineId={selectedPipeline} />
              ) : (
                <p className="text-sm text-zinc-500 text-center py-8">Selecione um pipeline para ver os detalhes</p>
              )}
            </TabsContent>

            <TabsContent value="tests" className="mt-4">
              <PolicyTestsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </BrowserFrame>
  );
}
