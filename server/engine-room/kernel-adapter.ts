/**
 * Kernel Adapter - Ponte entre Engine Room e Arcadia Kernel
 * 
 * MODO NORMAL: Conecta ao Kernel local (porta 5001) para gerenciar serviços
 * MODO DOCKER: Consulta diretamente os serviços externos via HTTP health check
 * 
 * A detecção de modo Docker é automática via variável DOCKER_MODE
 */

const KERNEL_BASE_URL = 'http://localhost:5001/api/kernel';

// Detectar modo Docker - em produção os serviços rodam em containers separados
const IS_DOCKER_MODE = process.env.DOCKER_MODE === 'true';

// URLs dos serviços externos em modo Docker (vindas das env vars)
// Em produção (Coolify), os containers têm nomes prefixados como 'arcadia-prod-{nome}-1'
const getContainerUrl = (baseName: string, defaultPort: number): string => {
  // Tenta descobrir o nome real do container via variável de ambiente
  const envVarName = `${baseName.toUpperCase().replace(/-/g, '_')}_PYTHON_URL`;
  const envUrl = process.env[envVarName];
  
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback: tenta nomes comuns (com e sem prefixo arcadia-prod-)
  const prefixes = ['arcadia-prod-', ''];
  const suffixes = ['-1', ''];
  
  // Retorna o primeiro formato (será testado em runtime)
  return `http://${prefixes[0]}${baseName}${suffixes[0]}:${defaultPort}`;
};

const SERVICE_URLS: Record<string, string> = {
  "contabil": getContainerUrl('contabil', 8003),
  "bi-engine": getContainerUrl('bi', 8004),
  "automation-engine": getContainerUrl('automation', 8005),
  "fisco": getContainerUrl('fisco', 8002),
  "communication": process.env.MIROFLOW_HOST ? `http://${process.env.MIROFLOW_HOST}:${process.env.MIROFLOW_PORT || 8006}` : 'http://arcadia-prod-miroflow-1:8006',
};

// Mapeamento: Nome do Engine Room -> ID do Kernel
// NOTA: metaset NÃO está aqui - é gerenciado externamente (Java)
const ENGINE_TO_KERNEL_ID: Record<string, string> = {
  "contabil": "python-contabil",
  "bi-engine": "python-bi",
  "automation-engine": "python-automation",
  "fisco": "python-fisco",
  "communication": "node-communication",
};

// Mapeamento inverso
const KERNEL_TO_ENGINE_NAME: Record<string, string> = {
  "python-contabil": "contabil",
  "python-bi": "bi-engine",
  "python-automation": "automation-engine",
  "python-fisco": "fisco",
  "node-communication": "communication",
};

// Mapeamento de categorias
const CATEGORY_MAP: Record<string, string> = {
  "python-contabil": "fiscal",
  "python-bi": "data",
  "python-automation": "automation",
  "python-fisco": "fiscal",
  "node-communication": "intelligence",
};

// Mapeamento de display names
const DISPLAY_NAME_MAP: Record<string, string> = {
  "python-contabil": "Motor Contabil",
  "python-bi": "Motor BI",
  "python-automation": "Motor Automacao",
  "python-fisco": "Motor Fiscal",
  "node-communication": "Motor Comunicacao",
};

// Configurações dos engines para health check em modo Docker
const ENGINE_CONFIG: Record<string, { port: number; type: string; healthPath: string }> = {
  "contabil": { port: 8003, type: "python", healthPath: "/health" },
  "bi-engine": { port: 8004, type: "python", healthPath: "/health" },
  "automation-engine": { port: 8005, type: "python", healthPath: "/health" },
  "fisco": { port: 8002, type: "python", healthPath: "/health" },
  "communication": { port: 8006, type: "node", healthPath: "/health" },
};

interface KernelServiceState {
  config: {
    id: string;
    name: string;
    type: string;
    port: number;
    autoStart: boolean;
    maxRestarts: number;
  };
  status: 'running' | 'stopped' | 'error' | 'restarting';
  pid?: number;
  startTime?: string;
  restartCount: number;
  health?: 'healthy' | 'unhealthy' | 'unknown';
}

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

// Health check direto de um serviço (modo Docker)
async function checkServiceHealth(engineName: string): Promise<EngineStatus> {
  const config = ENGINE_CONFIG[engineName];
  const serviceUrl = SERVICE_URLS[engineName];
  const kernelId = ENGINE_TO_KERNEL_ID[engineName];
  
  if (!config || !serviceUrl) {
    return {
      name: engineName,
      displayName: DISPLAY_NAME_MAP[kernelId || engineName] || engineName,
      type: "unknown",
      port: 0,
      category: CATEGORY_MAP[kernelId || engineName] || "data",
      description: `Serviço ${engineName}`,
      status: "offline",
      error: "Configuração não encontrada",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const start = Date.now();
    const response = await fetch(`${serviceUrl}${config.healthPath}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        name: engineName,
        displayName: DISPLAY_NAME_MAP[kernelId] || engineName,
        type: config.type,
        port: config.port,
        category: CATEGORY_MAP[kernelId] || "data",
        description: `Serviço ${engineName}`,
        status: "online",
        responseTime: elapsed,
        details: {
          url: serviceUrl,
          health: "healthy",
          ...data,
        },
      };
    } else {
      return {
        name: engineName,
        displayName: DISPLAY_NAME_MAP[kernelId] || engineName,
        type: config.type,
        port: config.port,
        category: CATEGORY_MAP[kernelId] || "data",
        description: `Serviço ${engineName}`,
        status: "error",
        responseTime: elapsed,
        details: {
          url: serviceUrl,
          httpStatus: response.status,
        },
      };
    }
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      name: engineName,
      displayName: DISPLAY_NAME_MAP[kernelId] || engineName,
      type: config.type,
      port: config.port,
      category: CATEGORY_MAP[kernelId] || "data",
      description: `Serviço ${engineName}`,
      status: "offline",
      error: err.name === "AbortError" ? "timeout" : err.message,
      details: {
        url: serviceUrl,
      },
    };
  }
}

// Helper para fazer requests ao Kernel
async function kernelRequest(endpoint: string, method = 'GET', body?: any): Promise<any> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${KERNEL_BASE_URL}${endpoint}`, options);
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Kernel responded with ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Kernel request timeout');
    }
    throw error;
  }
}

// Converter status do Kernel para formato do Engine Room
function mapStatus(kernelStatus: string, health?: string): "online" | "offline" | "error" {
  if (kernelStatus === 'running') {
    return health === 'unhealthy' ? 'error' : 'online';
  }
  if (kernelStatus === 'error') return 'error';
  return 'offline';
}

// Obter todos os serviços formatados para Engine Room
export async function getKernelEngines(): Promise<EngineStatus[]> {
  // MODO DOCKER: Consulta diretamente os serviços externos
  if (IS_DOCKER_MODE) {
    console.log('[KernelAdapter] Modo Docker detectado - consultando serviços externos diretamente');
    
    const engineNames = Object.keys(ENGINE_CONFIG);
    const results = await Promise.allSettled(
      engineNames.map(name => checkServiceHealth(name))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const name = engineNames[index];
        const kernelId = ENGINE_TO_KERNEL_ID[name];
        return {
          name,
          displayName: DISPLAY_NAME_MAP[kernelId] || name,
          type: ENGINE_CONFIG[name]?.type || "unknown",
          port: ENGINE_CONFIG[name]?.port || 0,
          category: CATEGORY_MAP[kernelId] || "data",
          description: `Serviço ${name}`,
          status: "offline" as const,
          error: result.reason?.message || "Erro desconhecido",
        };
      }
    });
  }
  
  // MODO NORMAL: Conecta ao Kernel local
  try {
    const response = await kernelRequest('/services');
    const services: KernelServiceState[] = response.data || [];
    
    return services.map((service): EngineStatus => {
      const engineName = KERNEL_TO_ENGINE_NAME[service.config.id] || service.config.id;
      
      return {
        name: engineName,
        displayName: DISPLAY_NAME_MAP[service.config.id] || service.config.name,
        type: service.config.type === 'python' ? 'python' : 
              service.config.type === 'java' ? 'java' : 'node',
        port: service.config.port,
        category: CATEGORY_MAP[service.config.id] || 'data',
        description: service.config.name,
        status: mapStatus(service.status, service.health),
        details: {
          pid: service.pid,
          restartCount: service.restartCount,
          startTime: service.startTime,
          health: service.health,
        },
      };
    });
  } catch (error) {
    console.error('[KernelAdapter] Error fetching engines:', error);
    return [];
  }
}

// Obter info de um serviço específico (formato compatível com antigo)
export async function getKernelServiceInfo(engineName: string): Promise<any> {
  // MODO DOCKER: Retorna info baseada no health check
  if (IS_DOCKER_MODE) {
    const health = await checkServiceHealth(engineName);
    return {
      name: engineName,
      port: health.port,
      status: health.status === 'online' ? 'running' : 'stopped',
      startedAt: null,
      restartCount: 0,
      uptime: 0,
      logLines: 0,
      health: health.status === 'online' ? 'healthy' : 'unhealthy',
      mode: 'docker-external',
    };
  }
  
  // MODO NORMAL: Conecta ao Kernel
  const kernelId = ENGINE_TO_KERNEL_ID[engineName];
  if (!kernelId) return null;
  
  try {
    const response = await kernelRequest(`/services/${kernelId}`);
    const service: KernelServiceState = response.data;
    
    if (!service) return null;
    
    return {
      name: engineName,
      port: service.config.port,
      status: service.status,
      startedAt: service.startTime || null,
      restartCount: service.restartCount,
      uptime: service.startTime 
        ? Math.round((Date.now() - new Date(service.startTime).getTime()) / 1000)
        : 0,
      logLines: 0,
      health: service.health,
    };
  } catch (error) {
    console.error(`[KernelAdapter] Error getting info for ${engineName}:`, error);
    return null;
  }
}

// Obter logs de um serviço (formato compatível)
export async function getKernelServiceLogs(engineName: string, lines = 50): Promise<string[]> {
  // MODO DOCKER: Logs não disponíveis via HTTP
  if (IS_DOCKER_MODE) {
    return [`[Docker Mode] Logs não disponíveis para ${engineName}. Use 'docker logs' no container.`];
  }
  
  // MODO NORMAL: Conecta ao Kernel
  const kernelId = ENGINE_TO_KERNEL_ID[engineName];
  if (!kernelId) return [];
  
  try {
    const response = await kernelRequest(`/services/${kernelId}/logs?lines=${lines}`);
    const logs = response.data || [];
    
    // Converter formato do Kernel (objetos) para formato antigo (strings)
    return logs.map((log: any) => {
      const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 8);
      return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
    });
  } catch (error) {
    console.error(`[KernelAdapter] Error getting logs for ${engineName}:`, error);
    return [];
  }
}

// Iniciar serviço
export async function startKernelService(engineName: string): Promise<boolean> {
  // MODO DOCKER: Não pode iniciar container externo
  if (IS_DOCKER_MODE) {
    console.log(`[KernelAdapter] Modo Docker: não é possível iniciar ${engineName} (container externo)`);
    return false;
  }
  
  // MODO NORMAL: Conecta ao Kernel
  const kernelId = ENGINE_TO_KERNEL_ID[engineName];
  if (!kernelId) return false;
  
  try {
    await kernelRequest(`/services/${kernelId}/start`, 'POST');
    return true;
  } catch (error) {
    console.error(`[KernelAdapter] Error starting ${engineName}:`, error);
    return false;
  }
}

// Parar serviço
export async function stopKernelService(engineName: string): Promise<boolean> {
  // MODO DOCKER: Não pode parar container externo
  if (IS_DOCKER_MODE) {
    console.log(`[KernelAdapter] Modo Docker: não é possível parar ${engineName} (container externo)`);
    return false;
  }
  
  // MODO NORMAL: Conecta ao Kernel
  const kernelId = ENGINE_TO_KERNEL_ID[engineName];
  if (!kernelId) return false;
  
  try {
    await kernelRequest(`/services/${kernelId}/stop`, 'POST');
    return true;
  } catch (error) {
    console.error(`[KernelAdapter] Error stopping ${engineName}:`, error);
    return false;
  }
}

// Reiniciar serviço
export async function restartKernelService(engineName: string): Promise<boolean> {
  // MODO DOCKER: Não pode reiniciar container externo
  if (IS_DOCKER_MODE) {
    console.log(`[KernelAdapter] Modo Docker: não é possível reiniciar ${engineName} (container externo)`);
    return false;
  }
  
  // MODO NORMAL: Conecta ao Kernel
  const kernelId = ENGINE_TO_KERNEL_ID[engineName];
  if (!kernelId) return false;
  
  try {
    await kernelRequest(`/services/${kernelId}/restart`, 'POST');
    return true;
  } catch (error) {
    console.error(`[KernelAdapter] Error restarting ${engineName}:`, error);
    return false;
  }
}

// Verificar health geral do Kernel
export async function getKernelHealth(): Promise<any> {
  if (IS_DOCKER_MODE) {
    return {
      mode: 'docker',
      message: 'Modo Docker - serviços gerenciados externamente',
      services: Object.keys(ENGINE_CONFIG),
    };
  }
  
  try {
    const response = await kernelRequest('/health');
    return response.data;
  } catch (error) {
    console.error('[KernelAdapter] Error getting health:', error);
    return null;
  }
}

// Verificar se Kernel está disponível (ou modo Docker está ativo)
export async function isKernelAvailable(): Promise<boolean> {
  // MODO DOCKER: Sempre "disponível" (serviços externos)
  if (IS_DOCKER_MODE) {
    return true;
  }
  
  // MODO NORMAL: Verifica se Kernel responde
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://localhost:5001/health', {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

console.log(`[KernelAdapter] Adapter loaded - Modo: ${IS_DOCKER_MODE ? 'DOCKER (serviços externos)' : 'Kernel local (porta 5001)'}`);
// FORCE REBUILD: sex 03 abr 2026 16:13:36 -03
