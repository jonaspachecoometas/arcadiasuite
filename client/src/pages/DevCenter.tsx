import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrowserFrame } from "@/components/Browser/BrowserFrame";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Github, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  GitBranch, 
  GitCommit, 
  FolderSearch,
  FileCode,
  Zap,
  Bot,
  ExternalLink,
  Sparkles,
  Play,
  Eye,
  Paperclip,
  X,
  FileText,
  Upload,
  RotateCcw,
  History,
  Monitor,
  Rocket,
  RefreshCw,
  Smartphone,
  Tablet,
  Globe,
  Code2,
  Layers,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Layout,
  LayoutGrid
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DevHistory from "@/components/DevHistory";


const FILE_TO_ROUTE_MAP: Record<string, string> = {
  "Cockpit": "/",
  "Home": "/",
  "Agent": "/agent",
  "Admin": "/admin",
  "Chat": "/chat",
  "WhatsApp": "/whatsapp",
  "XosInbox": "/comunicacao",
  "Automations": "/automations",
  "BiWorkspace": "/insights",
  "ProcessCompass": "/compass",
  "Crm": "/crm",
  "Production": "/production",
  "Support": "/support",
  "Valuation": "/valuation",
  "Canvas": "/canvas",
  "IDE": "/ide",
  "Scientist": "/scientist",
  "Knowledge": "/knowledge",
  "CentralApis": "/central-apis",
  "ApiTesterPage": "/api-tester",
  "ApiHub": "/api-hub",
  "Fisco": "/fisco",
  "People": "/people",
  "Contabil": "/contabil",
  "ERP": "/erp",
  "Financeiro": "/financeiro",
  "Communities": "/communities",
  "QualityModule": "/quality",
  "CommercialEnv": "/commercial-env",
  "FieldOperations": "/field-ops",
  "TechnicalModule": "/technical",
  "SuppliersPortal": "/suppliers",
  "NPSSurvey": "/nps",
  "EngineeringHub": "/engineering",
  "DevelopmentModule": "/development",
  "ArcadiaRetail": "/retail",
  "Plus": "/plus",
  "SuperAdmin": "/super-admin",
  "Marketplace": "/marketplace",
  "LMS": "/lms",
  "AppCenter": "/apps",
  "XosCentral": "/xos",
  "XosCrm": "/xos/crm",
  "XosTickets": "/xos/tickets",
  "XosCampaigns": "/xos/campaigns",
  "XosAutomations": "/xos/automations",
  "XosSites": "/xos/sites",
  "DocTypeBuilder": "/doctype-builder",
  "PageBuilder": "/page-builder",
  "Migration": "/migration",
  "DevCenter": "/dev-center",
};

function getRouteFromFilePath(filePath: string): string | null {
  const fileName = filePath.split("/").pop()?.replace(/\.(tsx|ts|jsx|js)$/, "") || "";
  if (FILE_TO_ROUTE_MAP[fileName]) return FILE_TO_ROUTE_MAP[fileName];
  
  const pathParts = filePath.toLowerCase();
  if (pathParts.includes("/xos/")) {
    if (pathParts.includes("crm")) return "/xos/crm";
    if (pathParts.includes("inbox")) return "/comunicacao";
    if (pathParts.includes("ticket")) return "/xos/tickets";
    if (pathParts.includes("campaign")) return "/xos/campaigns";
    if (pathParts.includes("automation")) return "/xos/automations";
    if (pathParts.includes("site")) return "/xos/sites";
    return "/xos";
  }
  if (pathParts.includes("pages/")) {
    const match = Object.entries(FILE_TO_ROUTE_MAP).find(([key]) => 
      fileName.toLowerCase().includes(key.toLowerCase())
    );
    if (match) return match[1];
  }
  if (pathParts.includes("components/")) {
    const parentFolder = filePath.split("/").slice(-2, -1)[0];
    if (parentFolder && parentFolder !== "components") {
      const match = Object.entries(FILE_TO_ROUTE_MAP).find(([key]) => 
        parentFolder.toLowerCase().includes(key.toLowerCase())
      );
      if (match) return match[1];
    }
  }
  
  return null;
}

const SYSTEM_MODULES = [
  { category: "Core", modules: [
    { name: "Cockpit", path: "/", icon: "🏠", desc: "Painel principal" },
    { name: "Manus (Agente IA)", path: "/agent", icon: "🤖", desc: "Assistente autônomo" },
    { name: "Admin", path: "/admin", icon: "⚙️", desc: "Administração geral" },
    { name: "Super Admin", path: "/super-admin", icon: "🔐", desc: "Administração avançada" },
  ]},
  { category: "Comunicação", modules: [
    { name: "Chat Interno", path: "/chat", icon: "💬", desc: "Mensagens internas" },
    { name: "WhatsApp", path: "/whatsapp", icon: "📱", desc: "Integração WhatsApp" },
    { name: "XOS Inbox", path: "/comunicacao", icon: "📥", desc: "Caixa de entrada unificada" },
    { name: "XOS CRM", path: "/xos/crm", icon: "👥", desc: "Gestão de relacionamentos" },
    { name: "XOS Tickets", path: "/xos/tickets", icon: "🎫", desc: "Tickets de suporte" },
    { name: "XOS Campanhas", path: "/xos/campaigns", icon: "📣", desc: "Campanhas de marketing" },
  ]},
  { category: "Negócios", modules: [
    { name: "ERP", path: "/erp", icon: "🏢", desc: "Gestão empresarial" },
    { name: "Financeiro", path: "/financeiro", icon: "💰", desc: "Gestão financeira" },
    { name: "Fisco", path: "/fisco", icon: "📋", desc: "Motor fiscal NF-e" },
    { name: "Contábil", path: "/contabil", icon: "📊", desc: "Contabilidade" },
    { name: "Retail", path: "/retail", icon: "🛒", desc: "Varejo e PDV" },
    { name: "Plus (ERP Laravel)", path: "/plus", icon: "🔷", desc: "ERP completo" },
    { name: "Fornecedores", path: "/suppliers", icon: "🏭", desc: "Portal de fornecedores" },
  ]},
  { category: "Pessoas & Operações", modules: [
    { name: "People (RH)", path: "/people", icon: "👤", desc: "Recursos humanos" },
    { name: "Qualidade", path: "/quality", icon: "✅", desc: "Gestão de qualidade" },
    { name: "Produção", path: "/production", icon: "🔧", desc: "Produção industrial" },
    { name: "Operações de Campo", path: "/field-ops", icon: "📍", desc: "Operações externas" },
    { name: "Engenharia", path: "/engineering", icon: "⚡", desc: "Hub de engenharia" },
    { name: "Técnico", path: "/technical", icon: "🔩", desc: "Módulo técnico" },
  ]},
  { category: "Inteligência & BI", modules: [
    { name: "Insights (BI)", path: "/insights", icon: "📈", desc: "Business Intelligence" },
    { name: "Scientist", path: "/scientist", icon: "🔬", desc: "Análise de dados com IA" },
    { name: "Knowledge Graph", path: "/knowledge", icon: "🧠", desc: "Grafo de conhecimento" },
    { name: "Valuation", path: "/valuation", icon: "💎", desc: "Avaliação empresarial" },
    { name: "NPS", path: "/nps", icon: "⭐", desc: "Pesquisa de satisfação" },
  ]},
  { category: "Plataforma", modules: [
    { name: "IDE", path: "/ide", icon: "🖥️", desc: "Ambiente de desenvolvimento" },
    { name: "Dev Center", path: "/dev-center", icon: "🚀", desc: "Centro de desenvolvimento" },
    { name: "Pipeline XOS", path: "/xos/pipeline", icon: "🔄", desc: "Pipeline autônomo" },
    { name: "Governança XOS", path: "/xos/governance", icon: "🛡️", desc: "Políticas e auditoria" },
    { name: "Automações", path: "/automations", icon: "⚡", desc: "Motor de automações" },
    { name: "XOS Automações", path: "/xos/automations", icon: "🤖", desc: "Automações XOS" },
    { name: "Central APIs", path: "/central-apis", icon: "🔌", desc: "Central de APIs" },
    { name: "API Hub", path: "/api-hub", icon: "🌐", desc: "Hub de APIs" },
    { name: "API Tester", path: "/api-tester", icon: "🧪", desc: "Testador de APIs" },
  ]},
  { category: "Apps & Marketplace", modules: [
    { name: "App Center", path: "/apps", icon: "📦", desc: "Central de aplicativos" },
    { name: "Marketplace", path: "/marketplace", icon: "🏪", desc: "Marketplace" },
    { name: "LMS", path: "/lms", icon: "📚", desc: "Plataforma de ensino" },
    { name: "Comunidades", path: "/communities", icon: "🌍", desc: "Comunidades" },
    { name: "Suporte", path: "/support", icon: "🎧", desc: "Central de suporte" },
  ]},
  { category: "Construtores", modules: [
    { name: "Page Builder", path: "/page-builder", icon: "🎨", desc: "Construtor de páginas" },
    { name: "DocType Builder", path: "/doctype-builder", icon: "📝", desc: "Construtor de doctypes" },
    { name: "Canvas", path: "/canvas", icon: "🖼️", desc: "Canvas visual" },
    { name: "Compass", path: "/compass", icon: "🧭", desc: "Bússola de processos" },
    { name: "XOS Sites", path: "/xos/sites", icon: "🌐", desc: "Construtor de sites" },
  ]},
];

function SystemOverviewTab() {
  const [selectedModule, setSelectedModule] = useState<string>("/");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(SYSTEM_MODULES.map(c => c.category)));

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const currentModule = SYSTEM_MODULES.flatMap(c => c.modules).find(m => m.path === selectedModule);

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      <Card className="w-80 flex-shrink-0 flex flex-col">
        <CardHeader className="py-3 border-b bg-gradient-to-r from-slate-800 to-slate-700">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> Mapa do Sistema
          </CardTitle>
          <CardDescription className="text-white/60 text-xs">
            {SYSTEM_MODULES.reduce((acc, c) => acc + c.modules.length, 0)} módulos disponíveis
          </CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {SYSTEM_MODULES.map((cat) => (
              <div key={cat.category}>
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded"
                  data-testid={`category-${cat.category}`}
                >
                  {expandedCategories.has(cat.category) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {cat.category}
                  <Badge variant="outline" className="ml-auto text-[9px] h-4">{cat.modules.length}</Badge>
                </button>
                {expandedCategories.has(cat.category) && (
                  <div className="ml-2 space-y-0.5">
                    {cat.modules.map((mod) => (
                      <button
                        key={mod.path}
                        onClick={() => setSelectedModule(mod.path)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${
                          selectedModule === mod.path
                            ? "bg-blue-100 text-blue-800 font-medium"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                        data-testid={`module-${mod.path.replace(/\//g, '-')}`}
                      >
                        <span className="text-sm">{mod.icon}</span>
                        <div className="flex-1 text-left min-w-0">
                          <div className="truncate">{mod.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{mod.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                {currentModule ? `${currentModule.icon} ${currentModule.name}` : "Preview do Sistema"}
              </CardTitle>
              <CardDescription className="text-xs">
                {currentModule?.desc || "Selecione um módulo para visualizar"} — <span className="font-mono text-blue-600">{selectedModule}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                <Button variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("desktop")} data-testid="btn-sys-desktop">
                  <Monitor className="w-3 h-3" />
                </Button>
                <Button variant={previewDevice === "tablet" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("tablet")} data-testid="btn-sys-tablet">
                  <Tablet className="w-3 h-3" />
                </Button>
                <Button variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDevice("mobile")} data-testid="btn-sys-mobile">
                  <Smartphone className="w-3 h-3" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-7" onClick={() => {
                const iframe = document.getElementById("system-preview-iframe") as HTMLIFrameElement;
                if (iframe) iframe.src = iframe.src;
              }} data-testid="btn-sys-refresh">
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7" onClick={() => window.open(selectedModule, "_blank")} data-testid="btn-sys-external">
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-2">
          <div className={`h-full bg-gray-100 rounded-lg overflow-hidden border mx-auto transition-all ${
            previewDevice === "desktop" ? "w-full" :
            previewDevice === "tablet" ? "max-w-[768px]" :
            "max-w-[375px]"
          }`}>
            <iframe
              id="system-preview-iframe"
              src={selectedModule}
              className="w-full h-full bg-white"
              title="System Preview"
              data-testid="iframe-system-preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StagingPreviewTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("/");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeFileForPreview, setActiveFileForPreview] = useState<string | null>(null);

  const { data: stagedData, isLoading: loadingStaged, refetch: refetchStaged } = useQuery({
    queryKey: ["/api/blackboard/staged"],
    queryFn: async () => {
      const res = await fetch("/api/blackboard/staged", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar staging");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const publishMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("POST", `/api/blackboard/publish/${taskId}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Publicado com sucesso!",
        description: `${data.applied?.length || 0} arquivo(s) aplicados ao projeto`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blackboard/staged"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao publicar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const discardMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("POST", `/api/blackboard/discard/${taskId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Descartado",
        description: "As alterações foram descartadas",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blackboard/staged"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao descartar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stagedItems = stagedData?.staged || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-purple-900">1. Desenvolver</p>
                <p className="text-xs text-purple-700">Os agentes criam e validam o código</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">2. Revisar & Testar</p>
                <p className="text-xs text-blue-700">Veja os arquivos e teste no preview</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Rocket className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">3. Publicar</p>
                <p className="text-xs text-green-700">Aprove para aplicar ao projeto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                Alterações Pendentes
              </CardTitle>
              <CardDescription>
                {stagedItems.length === 0 
                  ? "Nenhuma alteração aguardando aprovação" 
                  : `${stagedItems.length} alteração(ões) aguardando sua aprovação`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchStaged()} data-testid="btn-refresh-staged">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loadingStaged ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : stagedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
              <h3 className="font-semibold text-lg mb-1">Tudo limpo!</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Não há alterações pendentes. Use a aba "Desenvolver" para criar novas funcionalidades — elas aparecerão aqui para sua aprovação.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stagedItems.map((item: any) => (
                <Card key={item.taskId} className="border-l-4 border-l-amber-400" data-testid={`staged-item-${item.taskId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            <FileCode className="w-3 h-3 mr-1" />
                            {item.files?.length || 0} arquivo(s)
                          </Badge>
                          {item.validationScore && (
                            <Badge variant="outline" className={`text-[10px] ${
                              item.validationScore >= 80 ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"
                            }`}>
                              Score: {item.validationScore}
                            </Badge>
                          )}
                          {item.blockedFiles?.length > 0 && (
                            <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
                              {item.blockedFiles.length} protegido(s)
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {item.stagedAt ? new Date(item.stagedAt).toLocaleString("pt-BR") : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-3 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50"
                          disabled={discardMutation.isPending}
                          onClick={() => discardMutation.mutate(item.taskId)}
                          data-testid={`btn-discard-${item.taskId}`}
                        >
                          {discardMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          Descartar
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-green-600 hover:bg-green-700"
                          disabled={publishMutation.isPending}
                          onClick={() => publishMutation.mutate(item.taskId)}
                          data-testid={`btn-publish-${item.taskId}`}
                        >
                          {publishMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Rocket className="w-3 h-3 mr-1" />
                          )}
                          Publicar
                        </Button>
                      </div>
                    </div>

                    {item.files?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {item.files.map((file: any) => {
                          const detectedRoute = getRouteFromFilePath(file.path);
                          const fileKey = `${item.taskId}-${file.artifactId}`;
                          const isExpanded = expandedCode === fileKey;
                          return (
                          <div key={file.artifactId} className={`border rounded-lg overflow-hidden transition-all ${activeFileForPreview === fileKey ? "ring-2 ring-blue-400 border-blue-300" : ""}`}>
                            <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors">
                              <button
                                className="flex-1 flex items-center justify-between px-3 py-2 text-left"
                                onClick={() => {
                                  const newKey = isExpanded ? null : fileKey;
                                  setExpandedCode(newKey);
                                  if (newKey) {
                                    setActiveFileForPreview(newKey);
                                    if (detectedRoute) {
                                      setPreviewUrl(detectedRoute);
                                      const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
                                      if (iframe) iframe.src = detectedRoute;
                                    }
                                    const previewSection = document.getElementById("preview-section");
                                    if (previewSection) {
                                      previewSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    }
                                  } else {
                                    setActiveFileForPreview(null);
                                  }
                                }}
                                data-testid={`btn-toggle-file-${file.artifactId}`}
                              >
                                <div className="flex items-center gap-2">
                                  <FileCode className="w-3.5 h-3.5 text-blue-500" />
                                  <span className="text-xs font-mono font-medium">{file.path}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">{file.lines} linhas</Badge>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              </button>
                              {detectedRoute && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="px-2 py-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors mr-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewUrl(detectedRoute);
                                          setActiveFileForPreview(fileKey);
                                          const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
                                          if (iframe) iframe.src = detectedRoute;
                                          const previewSection = document.getElementById("preview-section");
                                          if (previewSection) {
                                            previewSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                          }
                                        }}
                                        data-testid={`btn-preview-file-${file.artifactId}`}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p className="text-xs">Ver no preview: {detectedRoute}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            {isExpanded && (
                              <div>
                                {detectedRoute ? (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-t border-blue-100">
                                    <Eye className="w-3 h-3 text-blue-500" />
                                    <span className="text-[10px] text-blue-700">Preview navegou para <span className="font-mono font-bold">{detectedRoute}</span></span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-t border-slate-200">
                                    <Code2 className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-500">Arquivo de suporte - preview mantido na rota atual</span>
                                  </div>
                                )}
                                <ScrollArea className="max-h-[300px]">
                                  <pre className="p-3 text-[11px] bg-slate-900 text-slate-100 overflow-x-auto">
                                    <code>{file.content}</code>
                                  </pre>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {item.blockedFiles?.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-[10px] font-medium text-red-700 mb-1">Arquivos protegidos (não serão alterados):</p>
                        <div className="flex flex-wrap gap-1">
                          {item.blockedFiles.map((f: string) => (
                            <Badge key={f} variant="outline" className="text-[9px] border-red-300 text-red-600 font-mono">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="preview-section">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" /> Preview ao Vivo
              </CardTitle>
              <CardDescription>
                {activeFileForPreview 
                  ? <>Navegando para <span className="font-mono font-bold text-blue-600">{previewUrl}</span></>
                  : "Visualize e teste a aplicação atual"
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                <Button
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewDevice("desktop")}
                  data-testid="button-device-desktop"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewDevice("tablet")}
                  data-testid="button-device-tablet"
                >
                  <Tablet className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewDevice("mobile")}
                  data-testid="button-device-mobile"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
                  if (iframe) iframe.src = iframe.src;
                }}
                data-testid="button-refresh-preview"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Input
                value={previewUrl}
                onChange={(e: any) => setPreviewUrl(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="/"
                data-testid="input-preview-url"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(previewUrl, "_blank")}
              data-testid="button-open-external"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <div 
            className={`relative bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 mx-auto transition-all ${
              previewDevice === "desktop" ? "w-full h-[500px]" :
              previewDevice === "tablet" ? "w-[768px] h-[500px]" :
              "w-[375px] h-[667px]"
            }`}
          >
            <iframe
              id="preview-iframe"
              src={previewUrl}
              className="w-full h-full bg-white"
              title="Preview"
              data-testid="iframe-preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DevCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [testRepoUrl, setTestRepoUrl] = useState("https://github.com/n8n-io/n8n");
  const [testFilePath, setTestFilePath] = useState("package.json");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  
  const [devPrompt, setDevPrompt] = useState("");
  const [autoCommit, setAutoCommit] = useState(false);
  const [targetBranch, setTargetBranch] = useState("main");
  const [devResult, setDevResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedContent, setAttachedContent] = useState<string>("");
  const [attachedImages, setAttachedImages] = useState<{ name: string; base64: string; preview: string }[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    type?: "text" | "spec" | "code" | "error" | "success";
    data?: any;
    images?: { name: string; base64: string; preview: string }[];
  }
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o agente de desenvolvimento autônomo da Arcádia. Descreva o que você quer criar e eu vou projetar, codificar e validar automaticamente. Por exemplo:\n\n• \"Criar um módulo de gestão de clientes\"\n• \"Fazer uma página de cadastro de produtos\"\n• \"Adicionar um dashboard de vendas\"",
      timestamp: new Date(),
      type: "text"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const { data: repoInfo, isLoading: loadingInfo, error: infoError } = useQuery({
    queryKey: ["/api/github/info"],
    queryFn: async () => {
      const res = await fetch("/api/github/info", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao conectar");
      return res.json();
    },
    retry: false
  });

  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ["/api/github/branches"],
    queryFn: async () => {
      const res = await fetch("/api/github/branches", { credentials: "include" });
      if (!res.ok) return { branches: [] };
      return res.json();
    },
    enabled: !!repoInfo?.success,
    retry: false
  });

  const analyzeMutation = useMutation({
    mutationFn: async (repoUrl: string) => {
      const res = await apiRequest("POST", "/api/github/analyze", { repoUrl });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Análise concluída",
        description: `Repositório ${data.data?.repository || "analisado"} com sucesso`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const readFileMutation = useMutation({
    mutationFn: async ({ repoUrl, filePath }: { repoUrl: string; filePath: string }) => {
      const res = await apiRequest("POST", "/api/github/read-external", { repoUrl, filePath });
      return res.json();
    },
    onSuccess: (data) => {
      setFileContent(data.content || null);
      toast({
        title: data.success ? "Arquivo lido" : "Erro",
        description: data.result,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ler arquivo",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const previewMutation = useMutation({
    mutationFn: async (description: string) => {
      const res = await apiRequest("POST", "/api/autonomous/preview", { description });
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewResult(data);
      toast({
        title: data.success ? "Preview gerado" : "Erro",
        description: data.success ? "Especificação criada com sucesso" : data.error,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no preview",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const developMutation = useMutation({
    mutationFn: async (params: { description: string; autoCommit: boolean; targetBranch: string }) => {
      const res = await apiRequest("POST", "/api/autonomous/develop", params);
      return res.json();
    },
    onSuccess: (data) => {
      setDevResult(data);
      const responseMsg: ChatMessage = {
        id: `response-${Date.now()}`,
        role: "assistant",
        content: data.success 
          ? `Pronto! ${data.phase === "completed" ? "Desenvolvimento concluído com sucesso!" : `Fase atual: ${data.phase}`}`
          : `Ocorreu um erro: ${data.error}`,
        timestamp: new Date(),
        type: data.success ? "success" : "error",
        data: data
      };
      setChatMessages(prev => [...prev, responseMsg]);
      
      if (data.spec) {
        const specMsg: ChatMessage = {
          id: `spec-${Date.now()}`,
          role: "assistant",
          content: `📋 **${data.spec.name || "Especificação"}**\n\n${data.spec.description || ""}\n\n**Componentes:** ${data.spec.components?.join(", ") || "N/A"}\n\n**Tecnologias:** ${data.spec.technologies?.join(", ") || "N/A"}`,
          timestamp: new Date(),
          type: "spec",
          data: data.spec
        };
        setChatMessages(prev => [...prev, specMsg]);
      }
      
      if (data.files?.length > 0) {
        const filesMsg: ChatMessage = {
          id: `files-${Date.now()}`,
          role: "assistant",
          content: `📁 **Arquivos gerados:**\n\n${data.files.map((f: any) => `• ${f.path}`).join("\n")}`,
          timestamp: new Date(),
          type: "code",
          data: data.files
        };
        setChatMessages(prev => [...prev, filesMsg]);
      }
    },
    onError: (error: any) => {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Erro no desenvolvimento: ${error.message}`,
        timestamp: new Date(),
        type: "error"
      };
      setChatMessages(prev => [...prev, errorMsg]);
    }
  });
  
  const processImageFile = (file: File): Promise<{ name: string; base64: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Arquivo não é uma imagem"));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error("Imagem muito grande. Máximo 10MB."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve({ name: file.name, base64, preview: base64 });
      };
      reader.onerror = () => reject(new Error("Erro ao ler imagem"));
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const newImages = await Promise.all(
        Array.from(files).map(f => processImageFile(f))
      );
      setAttachedImages(prev => [...prev, ...newImages]);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(item => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    try {
      const newImages = await Promise.all(
        imageItems.map(item => {
          const file = item.getAsFile();
          if (!file) throw new Error("Erro ao processar imagem colada");
          return processImageFile(file);
        })
      );
      setAttachedImages(prev => [...prev, ...newImages]);
      toast({ title: "Imagem colada", description: `${newImages.length} imagem(ns) anexada(s)` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendChat = () => {
    if (!chatInput.trim() && attachedImages.length === 0) return;
    
    const msgContent = attachedImages.length > 0 
      ? `${attachedImages.map(img => `[🖼️ ${img.name}]`).join(" ")}\n\n${chatInput}`.trim()
      : chatInput;
    
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msgContent,
      timestamp: new Date(),
      type: "text",
      images: attachedImages.length > 0 ? [...attachedImages] : undefined
    };
    setChatMessages(prev => [...prev, userMsg]);
    
    const thinkingMsg: ChatMessage = {
      id: `thinking-${Date.now()}`,
      role: "assistant",
      content: "Analisando sua solicitação e preparando o desenvolvimento...",
      timestamp: new Date(),
      type: "text"
    };
    setChatMessages(prev => [...prev, thinkingMsg]);
    
    const descriptionWithImages = attachedImages.length > 0
      ? `${chatInput}\n\n[Imagens anexadas: ${attachedImages.map(img => img.name).join(", ")}]`
      : chatInput;
    
    const currentImages = [...attachedImages];
    setChatInput("");
    setAttachedImages([]);
    
    fetch("/api/blackboard/develop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        description: descriptionWithImages, 
        autoCommit, 
        targetBranch,
        images: currentImages.map(img => ({ name: img.name, base64: img.base64 }))
      })
    })
      .then(res => res.json())
      .then(data => {
        const responseMsg: ChatMessage = {
          id: `response-${Date.now()}`,
          role: "assistant",
          content: data.success 
            ? `Pronto! ${data.phase === "completed" ? "Desenvolvimento concluído com sucesso!" : `Fase atual: ${data.phase}`}`
            : `Ocorreu um erro: ${data.error}`,
          timestamp: new Date(),
          type: data.success ? "success" : "error",
          data: data
        };
        setChatMessages(prev => [...prev.filter(m => !m.id.startsWith("thinking")), responseMsg]);
        
        if (data.spec) {
          try {
            const spec = typeof data.spec === "string" ? JSON.parse(data.spec) : data.spec;
            const specMsg: ChatMessage = {
              id: `spec-${Date.now()}`,
              role: "assistant",
              content: `📋 **${spec.moduleName || "Especificação"}**\n\n${spec.description || ""}\n\n**Componentes:** ${spec.ui?.components?.map((c: any) => c.name).join(", ") || "N/A"}\n\n**APIs:** ${spec.api?.routes?.map((r: any) => `${r.method} ${r.path}`).join(", ") || "N/A"}`,
              timestamp: new Date(),
              type: "spec",
              data: spec
            };
            setChatMessages(prev => [...prev, specMsg]);
          } catch {}
        }
        
        if (data.files?.length > 0) {
          const filesMsg: ChatMessage = {
            id: `files-${Date.now()}`,
            role: "assistant",
            content: `📁 **Arquivos gerados:**\n\n${data.files.map((f: any) => `• ${f.path}`).join("\n")}`,
            timestamp: new Date(),
            type: "code",
            data: data.files
          };
          setChatMessages(prev => [...prev, filesMsg]);
        }
        
        if (data.log?.length > 0) {
          const logMsg: ChatMessage = {
            id: `log-${Date.now()}`,
            role: "assistant",
            content: `📝 **Log dos Agentes:**\n\n${data.log.slice(-5).join("\n")}`,
            timestamp: new Date(),
            type: "text"
          };
          setChatMessages(prev => [...prev, logMsg]);
        }
      })
      .catch(err => {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Erro: ${err.message}`,
          timestamp: new Date(),
          type: "error"
        };
        setChatMessages(prev => [...prev.filter(m => !m.id.startsWith("thinking")), errorMsg]);
      });
  };

  const [commitMessage, setCommitMessage] = useState("");
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const commitMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/github/commit", { 
        message, 
        files: [],
        branch: targetBranch 
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Commit realizado!" : "Erro",
        description: data.success ? "Alterações salvas no GitHub" : data.error,
        variant: data.success ? "default" : "destructive"
      });
      setShowCommitDialog(false);
      setCommitMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no commit",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const isConnected = repoInfo?.success === true;

  return (
    <BrowserFrame>
      <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
            <Code2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Centro de Desenvolvimento</h1>
            <p className="text-muted-foreground">
              Crie, teste e publique funcionalidades com agentes de IA autônomos
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={!isConnected}
                    data-testid="button-history"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Histórico de commits</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={!isConnected}
                    data-testid="button-sync"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sincronizar</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-blue-500 hover:bg-blue-600"
                    disabled={!isConnected || commitMutation.isPending}
                    onClick={() => setShowCommitDialog(true)}
                    data-testid="button-commit"
                  >
                    {commitMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fazer commit</TooltipContent>
              </Tooltip>
            </div>

            {loadingInfo ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
              </Badge>
            ) : isConnected ? (
              <Badge className="bg-green-500 flex items-center gap-1" data-testid="status-connected">
                <CheckCircle className="w-3 h-3" /> Conectado
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1" data-testid="status-disconnected">
                <XCircle className="w-3 h-3" /> Não configurado
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="develop" className="space-y-4">
          <TabsList>
            <TabsTrigger value="develop" data-testid="tab-develop">
              <Sparkles className="w-4 h-4 mr-2" /> Desenvolver
            </TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">
              <Settings className="w-4 h-4 mr-2" /> Status
            </TabsTrigger>
            <TabsTrigger value="analyze" data-testid="tab-analyze">
              <FolderSearch className="w-4 h-4 mr-2" /> Analisar Repos
            </TabsTrigger>
            <TabsTrigger value="tools" data-testid="tab-tools">
              <Bot className="w-4 h-4 mr-2" /> Ferramentas
            </TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system">
              <LayoutGrid className="w-4 h-4 mr-2" /> Sistema
            </TabsTrigger>
            <TabsTrigger value="preview" data-testid="tab-preview">
              <Monitor className="w-4 h-4 mr-2" /> Preview & Aprovar
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" /> Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="develop" className="space-y-0">
            <Card className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
              <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Agente de Desenvolvimento</CardTitle>
                    <CardDescription className="text-white/80 text-sm">
                      Converse comigo para criar qualquer funcionalidade
                    </CardDescription>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {developMutation.isPending && (
                      <Badge className="bg-yellow-500 animate-pulse">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Desenvolvendo...
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                      data-testid={`chat-message-${msg.id}`}
                    >
                      <Avatar className={`h-8 w-8 ${msg.role === "user" ? "bg-blue-500" : "bg-purple-600"}`}>
                        <AvatarFallback className="text-white text-xs">
                          {msg.role === "user" ? "EU" : "IA"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white rounded-tr-sm"
                            : msg.type === "error"
                            ? "bg-red-50 border border-red-200 text-red-800 rounded-tl-sm"
                            : msg.type === "success"
                            ? "bg-green-50 border border-green-200 text-green-800 rounded-tl-sm"
                            : msg.type === "spec"
                            ? "bg-purple-50 border border-purple-200 rounded-tl-sm"
                            : msg.type === "code"
                            ? "bg-gray-900 text-gray-100 font-mono text-sm rounded-tl-sm"
                            : "bg-gray-100 rounded-tl-sm"
                        }`}
                      >
                        {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.images.map((img, idx) => (
                              <img 
                                key={idx}
                                src={img.preview}
                                alt={img.name}
                                className="max-w-[200px] max-h-[150px] rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(img.preview, "_blank")}
                                data-testid={`chat-image-${msg.id}-${idx}`}
                              />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === "user" ? "text-blue-100" : "text-gray-400"}`}>
                          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              
              <div className="border-t p-4 bg-gray-50 rounded-b-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Switch
                    checked={autoCommit}
                    onCheckedChange={setAutoCommit}
                    id="auto-commit-chat"
                  />
                  <Label htmlFor="auto-commit-chat" className="text-xs text-muted-foreground">
                    Commit automático
                  </Label>
                  <span className="text-xs text-muted-foreground">|</span>
                  <Label className="text-xs text-muted-foreground">Branch:</Label>
                  <Input
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="h-6 w-24 text-xs"
                  />
                </div>
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-2 bg-white rounded-lg border">
                    {attachedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img.preview} 
                          alt={img.name}
                          className="w-16 h-16 object-cover rounded-lg border"
                          data-testid={`attached-image-${idx}`}
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`remove-image-${idx}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-gray-500 truncate block w-16 text-center mt-1">{img.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                    data-testid="input-image-file"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={developMutation.isPending}
                    title="Anexar imagem"
                    className="shrink-0"
                    data-testid="button-attach-image"
                  >
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Input
                    placeholder="Digite o que você quer criar ou cole uma imagem (Ctrl+V)..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    onPaste={handlePaste}
                    disabled={developMutation.isPending}
                    className="flex-1"
                    data-testid="input-chat"
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={(!chatInput.trim() && attachedImages.length === 0) || developMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-send-chat"
                  >
                    {developMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="develop-old" className="space-y-6 hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Desenvolvimento Autônomo (Antigo)
                </CardTitle>
                <CardDescription>
                  Descreva o que você quer criar e os agentes de IA vão projetar, codificar e validar automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dev-prompt">O que você quer criar?</Label>
                  <Textarea
                    id="dev-prompt"
                    placeholder="Ex: Criar um módulo de gestão de clientes com cadastro, listagem e busca. Integrar com o ERP existente..."
                    value={devPrompt}
                    onChange={(e) => setDevPrompt(e.target.value)}
                    className="min-h-32"
                    data-testid="textarea-dev-prompt"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Anexar documento de referência (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".txt,.md,.docx,.pdf,.json,.xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachedFile(file);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            setAttachedContent(content || "");
                          };
                          reader.readAsText(file);
                        }
                      }}
                      data-testid="input-file-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      data-testid="button-attach-file"
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Anexar arquivo
                    </Button>
                    {attachedFile && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{attachedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setAttachedFile(null);
                            setAttachedContent("");
                          }}
                          data-testid="button-remove-file"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {attachedContent && (
                    <div className="mt-2 p-3 bg-muted rounded-lg max-h-32 overflow-auto">
                      <p className="text-xs text-muted-foreground mb-1">Preview do conteúdo:</p>
                      <pre className="text-xs whitespace-pre-wrap" data-testid="text-file-preview">
                        {attachedContent.slice(0, 500)}{attachedContent.length > 500 ? "..." : ""}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>Commit automático</Label>
                      <p className="text-xs text-muted-foreground">Salvar no GitHub após validação</p>
                    </div>
                    <Switch
                      checked={autoCommit}
                      onCheckedChange={setAutoCommit}
                      data-testid="switch-auto-commit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch de destino</Label>
                    <Input
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      placeholder="main"
                      data-testid="input-target-branch"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => previewMutation.mutate(attachedContent ? `${devPrompt}\n\n--- DOCUMENTO DE REFERÊNCIA ---\n${attachedContent}` : devPrompt)}
                    disabled={!devPrompt.trim() || previewMutation.isPending}
                    data-testid="button-preview"
                  >
                    {previewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Ver Preview
                  </Button>
                  <Button
                    onClick={() => developMutation.mutate({ description: attachedContent ? `${devPrompt}\n\n--- DOCUMENTO DE REFERÊNCIA ---\n${attachedContent}` : devPrompt, autoCommit, targetBranch })}
                    disabled={!devPrompt.trim() || developMutation.isPending}
                    data-testid="button-develop"
                  >
                    {developMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Desenvolver
                  </Button>
                </div>
              </CardContent>
            </Card>

            {previewResult?.success && previewResult.spec && (
              <Card data-testid="card-preview-result" className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Eye className="w-5 h-5" /> 📋 Plano de Desenvolvimento
                    </CardTitle>
                    <Badge className="bg-blue-500">Preview</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {previewResult.spec.name && (
                    <div className="p-4 bg-white rounded-lg border">
                      <h3 className="font-bold text-lg mb-1" data-testid="text-spec-name">{previewResult.spec.name}</h3>
                      <p className="text-muted-foreground text-sm">{previewResult.spec.description}</p>
                    </div>
                  )}
                  
                  {previewResult.spec.components && previewResult.spec.components.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">🧩 Componentes a Criar</h4>
                      <div className="grid gap-2">
                        {previewResult.spec.components.map((comp: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border" data-testid={`card-component-${idx}`}>
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{comp.name || comp}</p>
                              {comp.type && <p className="text-xs text-muted-foreground">{comp.type}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewResult.spec.features && previewResult.spec.features.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">✨ Funcionalidades</h4>
                      <div className="grid gap-1">
                        {previewResult.spec.features.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm" data-testid={`text-feature-${idx}`}>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewResult.spec.technologies && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">🛠️ Tecnologias</h4>
                      <div className="flex flex-wrap gap-2">
                        {previewResult.spec.technologies.map((tech: string, idx: number) => (
                          <Badge key={idx} variant="secondary" data-testid={`badge-tech-${idx}`}>{tech}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewResult.log && previewResult.log.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">📝 Raciocínio do Agente</h4>
                      <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-1">
                        {previewResult.log.map((line: string, idx: number) => (
                          <p key={idx} className="text-muted-foreground">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {devResult && (
              <Card data-testid="card-dev-result" className={devResult.success ? "border-green-200 bg-gradient-to-br from-green-50 to-white" : "border-red-200 bg-gradient-to-br from-red-50 to-white"}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {devResult.success ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-700">✅ Desenvolvimento Concluído</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-700">❌ Erro no Desenvolvimento</span>
                        </>
                      )}
                    </CardTitle>
                    <Badge variant={devResult.success ? "default" : "destructive"}>
                      Fase: {devResult.phase}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {devResult.spec && (
                    <div className="p-4 bg-white rounded-lg border">
                      <h3 className="font-bold text-lg mb-1">{devResult.spec.name}</h3>
                      <p className="text-muted-foreground text-sm">{devResult.spec.description}</p>
                    </div>
                  )}

                  {devResult.files && devResult.files.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">📁 Arquivos Gerados ({devResult.files.length})</h4>
                      <div className="grid gap-2">
                        {devResult.files.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border" data-testid={`text-file-${idx}`}>
                            <FileCode className="w-5 h-5 text-blue-500" />
                            <div className="flex-1">
                              <p className="font-mono text-sm">{file.path}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">{file.type}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {devResult.validation && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">🔍 Validação</h4>
                      <div className="p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          {devResult.validation.passed ? (
                            <Badge className="bg-green-500">Aprovado</Badge>
                          ) : (
                            <Badge variant="destructive">Reprovado</Badge>
                          )}
                          <span className="text-sm">Score: {devResult.validation.score || "N/A"}</span>
                        </div>
                        {devResult.validation.issues && devResult.validation.issues.length > 0 && (
                          <div className="space-y-1">
                            {devResult.validation.issues.map((issue: string, idx: number) => (
                              <p key={idx} className="text-sm text-orange-600">⚠️ {issue}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {devResult.commitUrl && (
                    <div className="p-4 bg-white rounded-lg border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GitCommit className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Commit realizado com sucesso!</p>
                          <p className="text-xs text-muted-foreground">Código salvo no GitHub</p>
                        </div>
                      </div>
                      <Button variant="outline" asChild data-testid="link-commit">
                        <a href={devResult.commitUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" /> Ver no GitHub
                        </a>
                      </Button>
                    </div>
                  )}

                  {devResult.log && devResult.log.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">📝 Log de Execução</h4>
                      <ScrollArea className="h-40">
                        <div className="p-3 bg-gray-900 rounded-lg text-xs font-mono space-y-1">
                          {devResult.log.map((line: string, idx: number) => (
                            <p key={idx} className="text-gray-300" data-testid={`log-line-${idx}`}>
                              <span className="text-gray-500">[{idx + 1}]</span> {line}
                            </p>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {devResult.error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <h4 className="font-medium text-red-700">Erro Encontrado</h4>
                      </div>
                      <p className="text-sm text-red-600" data-testid="text-dev-error">{devResult.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="w-5 h-5" /> Repositório
                  </CardTitle>
                  <CardDescription>
                    Repositório configurado para commits automáticos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Nome:</span>
                        <span className="font-medium">{repoInfo.repository?.fullName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Branch padrão:</span>
                        <Badge variant="outline">{repoInfo.repository?.defaultBranch}</Badge>
                      </div>
                      <Button variant="outline" className="w-full mt-2" asChild data-testid="link-github-repo">
                        <a href={repoInfo.repository?.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" /> Abrir no GitHub
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Configure o GITHUB_TOKEN nas variáveis de ambiente para habilitar
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" /> Branches
                  </CardTitle>
                  <CardDescription>
                    Branches disponíveis no repositório
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isConnected && branches?.branches ? (
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {branches.branches.map((branch: string, idx: number) => (
                          <div key={branch} className="flex items-center gap-2 text-sm" data-testid={`text-branch-${idx}`}>
                            <GitBranch className="w-3 h-3 text-muted-foreground" />
                            <span>{branch}</span>
                            {branch === repoInfo.repository?.defaultBranch && (
                              <Badge variant="secondary" className="text-xs">default</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {loadingBranches ? "Carregando..." : "Não disponível"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
                <CardDescription>
                  Variáveis de ambiente necessárias para a integração
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>GITHUB_TOKEN</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="password" 
                          value={isConnected ? "••••••••••••••••" : ""} 
                          disabled 
                          data-testid="input-token"
                        />
                        {isConnected ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>GITHUB_OWNER</Label>
                      <Input 
                        value={isConnected ? repoInfo.repository?.fullName?.split("/")[0] || "" : "JonasRodriguesPachceo"} 
                        disabled 
                        data-testid="input-owner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GITHUB_REPO</Label>
                      <Input 
                        value={isConnected ? repoInfo.repository?.name || "" : "ArcadiaSuite-"} 
                        disabled 
                        data-testid="input-repo"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Para configurar, adicione estas variáveis na aba "Secrets" do Replit ou no arquivo .env
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderSearch className="w-5 h-5" /> Analisar Repositório Externo
                </CardTitle>
                <CardDescription>
                  Analise repositórios open-source (n8n, OpenManus, etc.) para inspiração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://github.com/n8n-io/n8n"
                    value={testRepoUrl}
                    onChange={(e) => setTestRepoUrl(e.target.value)}
                    data-testid="input-repo-url"
                  />
                  <Button 
                    onClick={() => analyzeMutation.mutate(testRepoUrl)}
                    disabled={analyzeMutation.isPending}
                    data-testid="button-analyze"
                  >
                    {analyzeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderSearch className="w-4 h-4" />
                    )}
                    Analisar
                  </Button>
                </div>

                {analysisResult?.success && (
                  <div className="bg-muted rounded-lg p-4" data-testid="result-analysis">
                    <h4 className="font-medium mb-2">Resultado da Análise</h4>
                    <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-64" data-testid="text-analysis-summary">
                      {analysisResult.data?.summary || analysisResult.result}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" /> Ler Arquivo Externo
                </CardTitle>
                <CardDescription>
                  Leia arquivos específicos de repositórios externos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    placeholder="https://github.com/owner/repo"
                    value={testRepoUrl}
                    onChange={(e) => setTestRepoUrl(e.target.value)}
                    data-testid="input-file-repo"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="caminho/do/arquivo.ts"
                      value={testFilePath}
                      onChange={(e) => setTestFilePath(e.target.value)}
                      data-testid="input-file-path"
                    />
                    <Button 
                      onClick={() => readFileMutation.mutate({ repoUrl: testRepoUrl, filePath: testFilePath })}
                      disabled={readFileMutation.isPending}
                      data-testid="button-read-file"
                    >
                      {readFileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileCode className="w-4 h-4" />
                      )}
                      Ler
                    </Button>
                  </div>
                </div>

                {fileContent && (
                  <ScrollArea className="h-64 bg-muted rounded-lg p-4">
                    <pre className="text-xs whitespace-pre-wrap">
                      {fileContent}
                    </pre>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitCommit className="w-5 h-5 text-green-500" /> github_commit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Faz commit automático de arquivos para o repositório
                  </p>
                  <div className="text-xs bg-muted rounded p-2">
                    <code>{"github_commit(message, files[], branch?)"}</code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderSearch className="w-5 h-5 text-blue-500" /> analyze_external_repo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analisa estrutura de repositórios externos para inspiração
                  </p>
                  <div className="text-xs bg-muted rounded p-2">
                    <code>{"analyze_external_repo(repoUrl, focusPaths?)"}</code>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileCode className="w-5 h-5 text-purple-500" /> read_external_file
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Lê conteúdo de arquivos de projetos open-source
                  </p>
                  <div className="text-xs bg-muted rounded p-2">
                    <code>{"read_external_file(repoUrl, filePath)"}</code>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Fluxo de Desenvolvimento Autônomo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex flex-col items-center gap-1 text-center p-2">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>Requisição</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex flex-col items-center gap-1 text-center p-2">
                    <div className="p-2 rounded-full bg-purple-100">
                      <FolderSearch className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Análise</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex flex-col items-center gap-1 text-center p-2">
                    <div className="p-2 rounded-full bg-orange-100">
                      <FileCode className="w-4 h-4 text-orange-600" />
                    </div>
                    <span>Leitura</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex flex-col items-center gap-1 text-center p-2">
                    <div className="p-2 rounded-full bg-green-100">
                      <GitCommit className="w-4 h-4 text-green-600" />
                    </div>
                    <span>Commit</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-0">
            <SystemOverviewTab />
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <StagingPreviewTab />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Histórico de Desenvolvimento</CardTitle>
                    <CardDescription className="text-white/70">
                      Todas as solicitações e tarefas executadas pelos agentes autônomos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <DevHistory embedded onContinueTask={(taskTitle: string) => {
                  setChatInput(`Continuar tarefa: ${taskTitle}`);
                  const tabEl = document.querySelector('[data-testid="tab-develop"]') as HTMLElement;
                  if (tabEl) tabEl.click();
                }} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showCommitDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommit className="w-5 h-5" /> Fazer Commit
                </CardTitle>
                <CardDescription>
                  Descreva as alterações para salvar no GitHub
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Ex: Adiciona módulo de valuation SOTP..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="min-h-24"
                  data-testid="textarea-commit-message"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowCommitDialog(false)}
                    data-testid="button-cancel-commit"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => commitMutation.mutate(commitMessage)}
                    disabled={!commitMessage.trim() || commitMutation.isPending}
                    data-testid="button-confirm-commit"
                  >
                    {commitMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Commit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </TooltipProvider>
    </BrowserFrame>
  );
}
