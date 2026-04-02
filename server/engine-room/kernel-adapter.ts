/**
 * Kernel Adapter - Ponte entre Engine Room e Arcadia Kernel
 * Traduz chamadas do formato antigo para o novo Kernel (porta 5001)
 */

const KERNEL_BASE_URL = 'http://localhost:5001/api/kernel';

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

// Obter todos os serviços do Kernel formatados para Engine Room
export async function getKernelEngines(): Promise<EngineStatus[]> {
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
      logLines: 0, // Kernel não expõe isso diretamente
      health: service.health,
    };
  } catch (error) {
    console.error(`[KernelAdapter] Error getting info for ${engineName}:`, error);
    return null;
  }
}

// Obter logs de um serviço (formato compatível)
export async function getKernelServiceLogs(engineName: string, lines = 50): Promise<string[]> {
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
  try {
    const response = await kernelRequest('/health');
    return response.data;
  } catch (error) {
    console.error('[KernelAdapter] Error getting health:', error);
    return null;
  }
}

// Verificar se Kernel está disponível
export async function isKernelAvailable(): Promise<boolean> {
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

console.log('[KernelAdapter] Adapter loaded - proxying to localhost:5001');
