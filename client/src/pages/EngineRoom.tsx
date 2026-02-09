import { BrowserFrame } from "@/components/Browser/BrowserFrame";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Activity,
  Cpu,
  Database,
  RefreshCw,
  Play,
  Square,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Bot,
  Gauge,
  BarChart3,
  Zap,
  FileText,
  Calculator,
  ShoppingCart,
  Clock,
  Signal,
  HardDrive,
  Workflow,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EngineStatus {
  name: string;
  displayName: string;
  type: string;
  port: number;
  category: string;
  description: string;
  status: "online" | "offline" | "error";
  responseTime?: number;
  details?: any;
  error?: string;
}

interface AgentStatus {
  name: string;
  running: boolean;
  processedTasks?: number;
  errorCount?: number;
}

interface EngineRoomData {
  engines: EngineStatus[];
  agents: AgentStatus[];
  summary: {
    total_engines: number;
    online_engines: number;
    offline_engines: number;
    health_pct: number;
    total_agents: number;
    running_agents: number;
  };
  timestamp: string;
}

const ENGINE_ICONS: Record<string, any> = {
  "plus": ShoppingCart,
  "contabil": Calculator,
  "fisco": FileText,
  "bi-engine": BarChart3,
  "automation-engine": Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  erp: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  fiscal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  data: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  automation: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  intelligence: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const STATUS_CONFIG = {
  online: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Online" },
  offline: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Offline" },
  error: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Erro" },
};

function EngineCard({ engine }: { engine: EngineStatus }) {
  const statusConf = STATUS_CONFIG[engine.status];
  const StatusIcon = statusConf.icon;
  const EngineIcon = ENGINE_ICONS[engine.name] || Server;

  return (
    <Card data-testid={`engine-card-${engine.name}`} className="bg-[#1a1a2e] border-[#2a2a4a] hover:border-[#3a3a5a] transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${CATEGORY_COLORS[engine.category] || "bg-gray-500/10"}`}>
              <EngineIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{engine.displayName}</h3>
              <p className="text-xs text-gray-400">{engine.description}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusConf.bg}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${statusConf.color}`} />
            <span className={`text-xs font-medium ${statusConf.color}`}>{statusConf.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center p-2 rounded bg-[#0d0d1a]">
            <p className="text-[10px] text-gray-500 uppercase">Tipo</p>
            <p className="text-xs font-medium text-gray-300">{engine.type.toUpperCase()}</p>
          </div>
          <div className="text-center p-2 rounded bg-[#0d0d1a]">
            <p className="text-[10px] text-gray-500 uppercase">Porta</p>
            <p className="text-xs font-medium text-gray-300">{engine.port}</p>
          </div>
          <div className="text-center p-2 rounded bg-[#0d0d1a]">
            <p className="text-[10px] text-gray-500 uppercase">Resposta</p>
            <p className="text-xs font-medium text-gray-300">
              {engine.responseTime ? `${engine.responseTime}ms` : "---"}
            </p>
          </div>
        </div>

        {engine.details && engine.status === "online" && (
          <div className="mt-3 p-2 rounded bg-[#0d0d1a] border border-[#1a1a3a]">
            <p className="text-[10px] text-gray-500 uppercase mb-1">Detalhes</p>
            {engine.details.version && (
              <p className="text-xs text-gray-400">Versao: <span className="text-gray-300">{engine.details.version}</span></p>
            )}
            {engine.details.database && (
              <p className="text-xs text-gray-400">DB: <span className={engine.details.database === "connected" ? "text-green-400" : "text-red-400"}>{engine.details.database}</span></p>
            )}
            {engine.details.cache && (
              <p className="text-xs text-gray-400">Cache: <span className="text-gray-300">{engine.details.cache.entries} entradas, {engine.details.cache.hit_rate}% hit</span></p>
            )}
            {engine.details.scheduler && (
              <p className="text-xs text-gray-400">Scheduler: <span className={engine.details.scheduler.is_running ? "text-green-400" : "text-gray-500"}>{engine.details.scheduler.is_running ? "Ativo" : "Parado"}</span> ({engine.details.scheduler.active_entries} entradas)</p>
            )}
            {engine.details.workflows && engine.details.workflows.total_workflows !== undefined && (
              <p className="text-xs text-gray-400">Workflows: <span className="text-gray-300">{engine.details.workflows.total_workflows} registrados, {engine.details.workflows.total_executions} execucoes</span></p>
            )}
          </div>
        )}

        {engine.error && (
          <div className="mt-3 p-2 rounded bg-red-500/5 border border-red-500/10">
            <p className="text-xs text-red-400">{engine.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  return (
    <div data-testid={`agent-card-${agent.name}`} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a]">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${agent.running ? "bg-green-500/10" : "bg-gray-500/10"}`}>
          <Bot className={`w-4 h-4 ${agent.running ? "text-green-400" : "text-gray-500"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-white capitalize">{agent.name}</p>
          <p className="text-xs text-gray-500">Agente XOS</p>
        </div>
      </div>
      <Badge variant="outline" className={agent.running ? "border-green-500/30 text-green-400 bg-green-500/5" : "border-gray-600 text-gray-400 bg-gray-500/5"}>
        {agent.running ? "Ativo" : "Parado"}
      </Badge>
    </div>
  );
}

function SummaryCards({ summary }: { summary: EngineRoomData["summary"] }) {
  const cards = [
    { label: "Motores Online", value: `${summary.online_engines}/${summary.total_engines}`, icon: Server, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Saude Geral", value: `${summary.health_pct}%`, icon: Activity, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Agentes Ativos", value: `${summary.running_agents}/${summary.total_agents}`, icon: Bot, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Motores Offline", value: `${summary.offline_engines}`, icon: XCircle, color: summary.offline_engines > 0 ? "text-red-400" : "text-gray-500", bg: summary.offline_engines > 0 ? "bg-red-500/10" : "bg-gray-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((card, i) => (
        <Card key={i} data-testid={`summary-card-${i}`} className="bg-[#1a1a2e] border-[#2a2a4a]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-gray-400">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function EngineRoom() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading, isRefetching } = useQuery<EngineRoomData>({
    queryKey: ["/api/engine-room/status"],
    refetchInterval: 15000,
  });

  const { data: biMetrics } = useQuery<any>({
    queryKey: ["/api/bi-engine/metrics"],
    enabled: activeTab === "bi",
    refetchInterval: 10000,
  });

  const { data: autoMetrics } = useQuery<any>({
    queryKey: ["/api/automation-engine/metrics"],
    enabled: activeTab === "automation",
    refetchInterval: 10000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/engine-room/status"] });
  };

  const handleStartAgents = async () => {
    try {
      await fetch("/api/engine-room/agents/start", { method: "POST", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["/api/engine-room/status"] });
    } catch {}
  };

  const handleStopAgents = async () => {
    try {
      await fetch("/api/engine-room/agents/stop", { method: "POST", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["/api/engine-room/status"] });
    } catch {}
  };

  const content = (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
              <Cpu className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-engine-room-title">Casa de Maquinas</h1>
              <p className="text-sm text-gray-400">Painel de controle de todos os motores e agentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <span className="text-xs text-gray-500">
                Atualizado: {new Date(data.timestamp).toLocaleTimeString("pt-BR")}
              </span>
            )}
            <Button
              data-testid="button-refresh"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetching}
              className="border-[#2a2a4a] text-gray-300 hover:bg-[#1a1a2e]"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : data ? (
          <>
            <SummaryCards summary={data.summary} />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-[#1a1a2e] border border-[#2a2a4a] mb-4">
                <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400">
                  <Server className="w-4 h-4 mr-1.5" /> Visao Geral
                </TabsTrigger>
                <TabsTrigger value="bi" data-testid="tab-bi" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">
                  <BarChart3 className="w-4 h-4 mr-1.5" /> Motor BI
                </TabsTrigger>
                <TabsTrigger value="automation" data-testid="tab-automation" className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400">
                  <Zap className="w-4 h-4 mr-1.5" /> Motor Automacao
                </TabsTrigger>
                <TabsTrigger value="agents" data-testid="tab-agents" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400">
                  <Bot className="w-4 h-4 mr-1.5" /> Agentes XOS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.engines.map((engine) => (
                    <EngineCard key={engine.name} engine={engine} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="bi">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.engines.filter(e => e.name === "bi-engine").map(e => (
                    <EngineCard key={e.name} engine={e} />
                  ))}
                  {biMetrics && (
                    <Card className="bg-[#1a1a2e] border-[#2a2a4a]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-emerald-400" /> Metricas do Motor BI
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {biMetrics.cache && (
                          <div className="p-3 rounded bg-[#0d0d1a] border border-[#1a1a3a]">
                            <p className="text-xs text-gray-500 uppercase mb-2">Cache</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center">
                                <p className="text-lg font-bold text-white">{biMetrics.cache.entries}</p>
                                <p className="text-[10px] text-gray-500">Entradas</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-emerald-400">{biMetrics.cache.hit_rate}%</p>
                                <p className="text-[10px] text-gray-500">Hit Rate</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-white">{biMetrics.cache.hits + biMetrics.cache.misses}</p>
                                <p className="text-[10px] text-gray-500">Requisicoes</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {biMetrics.limits && (
                          <div className="p-3 rounded bg-[#0d0d1a] border border-[#1a1a3a]">
                            <p className="text-xs text-gray-500 uppercase mb-2">Limites</p>
                            <p className="text-xs text-gray-400">Max linhas: <span className="text-gray-300">{biMetrics.limits.max_rows?.toLocaleString()}</span></p>
                            <p className="text-xs text-gray-400">Timeout: <span className="text-gray-300">{biMetrics.limits.query_timeout_ms?.toLocaleString()}ms</span></p>
                            <p className="text-xs text-gray-400">Cache TTL: <span className="text-gray-300">{biMetrics.limits.cache_ttl_seconds}s</span></p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div className="mt-4 p-4 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a]">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Signal className="w-4 h-4 text-emerald-400" /> Capacidades do Motor BI
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {["SQL Query (read-only)", "Chart Data Generation", "Micro-BI API", "Data Analysis (Pandas)", "Aggregation Engine", "Query Cache"].map(cap => (
                      <div key={cap} className="flex items-center gap-2 p-2 rounded bg-[#0d0d1a]">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-gray-300">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="automation">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.engines.filter(e => e.name === "automation-engine").map(e => (
                    <EngineCard key={e.name} engine={e} />
                  ))}
                  {autoMetrics && (
                    <Card className="bg-[#1a1a2e] border-[#2a2a4a]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-purple-400" /> Metricas do Motor Automacao
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {autoMetrics.scheduler && (
                          <div className="p-3 rounded bg-[#0d0d1a] border border-[#1a1a3a]">
                            <p className="text-xs text-gray-500 uppercase mb-2">Scheduler</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center">
                                <p className="text-lg font-bold text-white">{autoMetrics.scheduler.total_entries}</p>
                                <p className="text-[10px] text-gray-500">Entradas</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-white">{autoMetrics.scheduler.active_entries}</p>
                                <p className="text-[10px] text-gray-500">Ativas</p>
                              </div>
                              <div className="text-center">
                                <p className={`text-lg font-bold ${autoMetrics.scheduler.is_running ? "text-green-400" : "text-gray-500"}`}>
                                  {autoMetrics.scheduler.is_running ? "ON" : "OFF"}
                                </p>
                                <p className="text-[10px] text-gray-500">Status</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {autoMetrics.event_bus && (
                          <div className="p-3 rounded bg-[#0d0d1a] border border-[#1a1a3a]">
                            <p className="text-xs text-gray-500 uppercase mb-2">Event Bus</p>
                            <p className="text-xs text-gray-400">Tipos de evento: <span className="text-gray-300">{autoMetrics.event_bus.total_event_types}</span></p>
                            <p className="text-xs text-gray-400">Subscribers: <span className="text-gray-300">{autoMetrics.event_bus.total_subscribers}</span></p>
                            <p className="text-xs text-gray-400">Historico: <span className="text-gray-300">{autoMetrics.event_bus.history_size} eventos</span></p>
                          </div>
                        )}
                        {autoMetrics.workflows && (
                          <div className="p-3 rounded bg-[#0d0d1a] border border-[#1a1a3a]">
                            <p className="text-xs text-gray-500 uppercase mb-2">Workflows</p>
                            <p className="text-xs text-gray-400">Registrados: <span className="text-gray-300">{autoMetrics.workflows.total_workflows}</span></p>
                            <p className="text-xs text-gray-400">Execucoes: <span className="text-gray-300">{autoMetrics.workflows.total_executions}</span></p>
                            <p className="text-xs text-gray-400">Taxa sucesso: <span className="text-emerald-400">{autoMetrics.workflows.success_rate}%</span></p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div className="mt-4 p-4 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a]">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-purple-400" /> Capacidades do Motor Automacao
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {["Cron Scheduler", "Event Bus", "Workflow Executor", "HTTP Actions", "SQL Queries (read-only)", "Transform & Filter"].map(cap => (
                      <div key={cap} className="flex items-center gap-2 p-2 rounded bg-[#0d0d1a]">
                        <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs text-gray-300">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="agents">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-cyan-400" /> Agentes Autonomos XOS
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      data-testid="button-start-agents"
                      variant="outline"
                      size="sm"
                      onClick={handleStartAgents}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> Iniciar Todos
                    </Button>
                    <Button
                      data-testid="button-stop-agents"
                      variant="outline"
                      size="sm"
                      onClick={handleStopAgents}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Square className="w-3.5 h-3.5 mr-1" /> Parar Todos
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.agents.length > 0 ? (
                    data.agents.map((agent) => (
                      <AgentCard key={agent.name} agent={agent} />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum agente registrado</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a]">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" /> Arquitetura dos Motores
              </h3>
              <div className="font-mono text-xs text-gray-400 space-y-1 bg-[#0d0d1a] p-4 rounded-lg border border-[#1a1a3a]">
                <p className="text-amber-400">{"┌─────────────────────────────────────────────────────┐"}</p>
                <p className="text-amber-400">{"│            ARCADIA SUITE - CASA DE MAQUINAS          │"}</p>
                <p className="text-amber-400">{"├─────────────────────────────────────────────────────┤"}</p>
                <p>{"│  Express.js (5000)  ─── Orquestracao + API Gateway  │"}</p>
                <p className="text-amber-400">{"├─────────────────────────────────────────────────────┤"}</p>
                <p className="text-blue-400">{"│  Plus ERP (8080)    ─── Laravel/PHP - ERP Completo  │"}</p>
                <p className="text-amber-300">{"│  Contabil  (8003)   ─── FastAPI - DRE/Balancete     │"}</p>
                <p className="text-amber-300">{"│  Fiscal    (8002)   ─── FastAPI - NF-e/SEFAZ        │"}</p>
                <p className="text-emerald-400">{"│  BI Engine (8004)   ─── FastAPI - SQL/Charts/Cache  │"}</p>
                <p className="text-purple-400">{"│  Automacao (8005)   ─── FastAPI - Scheduler/Events  │"}</p>
                <p className="text-amber-400">{"├─────────────────────────────────────────────────────┤"}</p>
                <p className="text-cyan-400">{"│  XOS Agents         ─── 6 Agentes Autonomos         │"}</p>
                <p className="text-amber-400">{"└─────────────────────────────────────────────────────┘"}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nao foi possivel carregar o status dos motores</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <BrowserFrame>
      <ScrollArea className="h-full">
        {content}
      </ScrollArea>
    </BrowserFrame>
  );
}
