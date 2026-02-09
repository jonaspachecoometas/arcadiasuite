const PLUS_PORT = process.env.PLUS_PORT || 8080;
const PLUS_BASE_URL = `http://localhost:${PLUS_PORT}`;

export interface PlusApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function plusFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<PlusApiResponse<T>> {
  try {
    const response = await fetch(`${PLUS_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro de conexão com Plus",
    };
  }
}

export const plusClient = {
  async getDashboardData(): Promise<PlusApiResponse> {
    return plusFetch("/api/graficos/dados-cards");
  },

  async getVendasMes(): Promise<PlusApiResponse> {
    return plusFetch("/api/graficos/grafico-vendas-mes");
  },

  async getComprasMes(): Promise<PlusApiResponse> {
    return plusFetch("/api/graficos/grafico-compras-mes");
  },

  async getGraficoMes(): Promise<PlusApiResponse> {
    return plusFetch("/api/graficos/grafico-mes");
  },

  async getContasReceber(): Promise<PlusApiResponse> {
    return plusFetch("/api/graficos/grafico-conta-receber");
  },

  async getContasPagar(): Promise<PlusApiResponse> {
    return plusFetch("/api/graficos/grafico-conta-pagar");
  },

  async getContasEmpresa(): Promise<PlusApiResponse> {
    return plusFetch("/api/contas-empresa");
  },

  async healthCheck(): Promise<PlusApiResponse> {
    return plusFetch("/api/health");
  },

  async emitirNFe(dados: any): Promise<PlusApiResponse> {
    return plusFetch("/api/nfe/emitir", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  },

  async emitirNFCe(dados: any): Promise<PlusApiResponse> {
    return plusFetch("/api/nfce/emitir", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  },

  async consultarNFe(chave: string): Promise<PlusApiResponse> {
    return plusFetch("/api/nfe/consultar", {
      method: "POST",
      body: JSON.stringify({ chave }),
    });
  },
};

export default plusClient;
