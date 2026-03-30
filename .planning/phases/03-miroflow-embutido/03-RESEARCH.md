# Phase 3: MiroFlow Embutido - Research

**Researched:** 2026-03-25
**Domain:** Python agent framework (MiroFlow) integrado ao Node.js/Express + Ollama local + Superset bridge
**Confidence:** HIGH (baseado em inspeção direta do código-fonte e serviços ativos)

---

## Summary

O Phase 3 conecta o framework Python MiroFlow (já clonado como submodule em `server/modules/miroflow/`) ao backend Node.js do Arcádia Suite, expondo um endpoint `POST /api/miroflow/analyze` que despacha para um microserviço Python FastAPI. Esse microserviço instancia agentes MiroFlow configurados via YAML, aponta para o Ollama local (já rodando na porta 11434 com `deepseek-r1:14b` instalado), e registra cada execução como nó imutável no KG (tabela `graph_nodes` via `/api/graph/nodes`).

O padrão de integração Node ↔ Python já está estabelecido no projeto: `server/bi/engine-proxy.ts` e `server/python/bi_analysis_service.py` demonstram o fluxo exato — Express proxy faz `fetch()` para FastAPI local; a resposta é repassada ao cliente. O novo microserviço MiroFlow (`miroflow_service.py`) seguirá o mesmo padrão, rodando na porta 8006. O agente `Researcher` exige `llama3.1:8b`, que **ainda não está instalado no Ollama** (apenas `deepseek-r1:14b`, `llama3.2:3b` e `nomic-embed-text` estão disponíveis).

No frontend, o componente `MiroFlowControl.tsx` será um painel overlay/tab injetado na página `BiWorkspace.tsx` que já usa o `SupersetDashboard` component. O toggle "Modo Científico" chama `POST /api/miroflow/analyze` e exibe a resposta estruturada ao lado do dashboard Superset.

**Primary recommendation:** Construir `server/python/miroflow_service.py` como FastAPI standalone (porta 8006), instanciar agentes MiroFlow com YAML inline (sem arquivos externos), usar `UnifiedOpenAIClient` apontando para Ollama via `OLLAMA_BASE_URL/v1`, registrar execuções via `createNode()` do graph service.

---

## User Constraints

*(Seção obrigatória — copiada do STATE.md/ROADMAP.md/PROJECT.md que fazem as vezes de CONTEXT.md)*

### Locked Decisions
- Stack: Node.js + TypeScript backend, React + TypeScript frontend, PostgreSQL, Neo4j KG
- IA: Ollama local MÁXIMO 14B — `deepseek-r1:14b` para Statistician e Fiscal Auditor, `llama3.1:8b` para Researcher
- **NUNCA usar modelos acima de 14B**: proibido citar ou planejar `deepseek-r1:32b`, `deepseek-r1:70b`, `llama3.1:70b` ou qualquer modelo maior
- MiroFlow já clonado em `server/modules/miroflow/` como submodule Python
- Branch de deploy: `Servidor`
- Superset em produção com RLS — não alterar configurações existentes
- Backend-first: API definida antes do frontend
- Auditoria imutável em todas as execuções (KG)

### Claude's Discretion
- Porta do microserviço MiroFlow (recomenda-se 8006 pelo padrão existente)
- Estrutura interna dos agentes MiroFlow (YAML inline vs arquivos externos)
- Forma de integrar o toggle no frontend (overlay, tab, painel lateral)
- Como fazer o `llama3.1:8b` ser baixado (wave 0 task vs setup manual)

### Deferred Ideas (OUT OF SCOPE)
- Versionamento Git-like de skills (Phase 2 pendente, não Phase 3)
- OpenClaw (Phase 4)
- Automation Fabric (Phase 5)
- Dev Center Completo (Phase 6)

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| MiroFlow | 1.7.0 | Framework de agentes Python | Já no submodule, desenvolvido pela MiromindAI |
| FastAPI | >=0.115.0 | Microserviço Python | Padrão já usado em todos os serviços Python do projeto |
| uvicorn | >=0.32.0 | ASGI server | Usado em todos os serviços Python |
| omegaconf | (via miroflow deps) | Configuração YAML com variáveis | Dependência central do MiroFlow |
| hydra-core | >=1.3.2 | Composição de configurações | Dependência central do MiroFlow |
| openai | ==1.78.1 | Cliente HTTP para Ollama (OpenAI-compat.) | MiroFlow usa `UnifiedOpenAIClient` via openai SDK |
| httpx / aiohttp | >=0.28.1 / >=3.12.15 | HTTP async | Dependências do MiroFlow e FastAPI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-dotenv | >=1.1.1 | Leitura de .env | Inicialização do microserviço |
| pydantic | >=2.x | Validação de request/response | Models FastAPI |
| neo4j (driver) | opcional | Neo4j direto | Apenas se precisar grafo real; por ora usa `graph_nodes` PostgreSQL |
| psycopg2-binary | >=2.9.x | PostgreSQL direto | Se microserviço precisar escrever no banco |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Microserviço FastAPI separado | Subprocess Node → Python | subprocess é síncrono e frágil; FastAPI segue padrão estabelecido |
| YAML files externos | YAML inline (dict) em Python | Inline elimina dependência de caminhos de arquivo em container |
| Ollama direto (porta 11434) | Via LiteLLM gateway (porta 4000) | LiteLLM tem fallback e roteamento; Ollama direto é mais simples para agentes isolados |

**Installation (para o microserviço):**
```bash
# Instalar dependências no ambiente Python do servidor
pip install fastapi uvicorn omegaconf hydra-core openai python-dotenv pydantic psycopg2-binary
# Ou instalar o miroflow inteiro com uv:
cd server/modules/miroflow && uv sync
```

**Version verification:** Os pacotes acima são os listados no `pyproject.toml` do MiroFlow v1.7.0, verificado diretamente no arquivo.

---

## Architecture Patterns

### Recommended Project Structure
```
server/python/
├── miroflow_service.py      # novo microserviço FastAPI (porta 8006)
├── bi_analysis_service.py   # existente (referência de padrão)
└── ...

server/miroflow/
├── routes.ts                # Express router: POST /api/miroflow/analyze
└── engine-proxy.ts          # fetch() para http://localhost:8006

client/src/
├── pages/BiWorkspace.tsx    # EXISTENTE — adicionar tab "Científico"
└── components/
    └── MiroFlowControl.tsx  # NOVO — toggle + resultado da análise

docker/python-entrypoint.sh  # adicionar case "miroflow" → porta 8006
docker-compose.prod.yml      # adicionar serviço miroflow (porta 8006)
```

### Pattern 1: Node → Python Microservice Proxy
**What:** Express recebe a request, faz fetch() para FastAPI, retorna o resultado. Sem subprocess, sem child_process.
**When to use:** Sempre que Node.js precisar de lógica Python (pandas, ML, agentes).
**Example:**
```typescript
// Source: server/bi/engine-proxy.ts (padrão existente)
const MIROFLOW_URL = `http://${process.env.MIROFLOW_HOST || "localhost"}:${process.env.MIROFLOW_PORT || "8006"}`;

async function proxyToMiroFlow(path: string, body: object): Promise<any> {
  const response = await fetch(`${MIROFLOW_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000), // 5min — modelos LLM são lentos
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `MiroFlow error: ${response.status}`);
  }
  return response.json();
}
```

### Pattern 2: MiroFlow Agent com Ollama via UnifiedOpenAIClient
**What:** MiroFlow usa `UnifiedOpenAIClient` com `base_url` apontando para Ollama (OpenAI-compatible API em `/v1`).
**When to use:** Para todos os agentes do Phase 3.
**Example:**
```python
# Source: server/modules/miroflow/miroflow/llm/openai_client.py + config/llm/base.yaml
from miroflow.agents.factory import build_agent
from miroflow.agents.context import AgentContext

AGENT_CONFIG_STATISTICIAN = {
    "type": "IterativeAgentWithToolAndRollback",
    "max_turns": 10,
    "llm": {
        "provider_class": "UnifiedOpenAIClient",
        "model_name": "deepseek-r1:14b",
        "api_key": "ollama",  # Ollama não valida api_key
        "base_url": "http://localhost:11434/v1",  # Ollama OpenAI-compat
        "max_tokens": 8192,
        "temperature": 0.7,
        "top_p": 1.0, "min_p": 0.0, "top_k": -1,
        "reasoning_effort": None, "repetition_penalty": 1.0,
        "max_context_length": -1, "async_client": True,
        "disable_cache_control": True, "keep_tool_result": -1,
        "use_tool_calls": False, "oai_tool_thinking": False,
    },
}
agent = build_agent(AGENT_CONFIG_STATISTICIAN)
ctx = AgentContext(task_description="Analise os seguintes dados SQL: ...")
result = await agent.run(ctx)
```

### Pattern 3: Registro Imutável no KG via graph_nodes
**What:** Após cada execução MiroFlow, registrar no PostgreSQL via `POST /api/graph/nodes`.
**When to use:** Toda execução de agente (success ou error).
**Example:**
```typescript
// Source: server/graph/service.ts createNode() — chamado pelo routes.ts de miroflow
await fetch("/api/graph/nodes", {
  method: "POST",
  body: JSON.stringify({
    type: "miroflow_execution",
    tenantId: req.user?.tenantId,
    data: {
      agent: "statistician",
      model: "deepseek-r1:14b",
      input: analysisRequest,
      output: analysisResult,
      auditHash: sha256(JSON.stringify({ executionId, input, output })),
      executedAt: new Date().toISOString(),
    }
  })
});
```

### Pattern 4: MiroFlowControl.tsx como tab em BiWorkspace
**What:** BiWorkspace.tsx já tem estrutura de tabs (Tabs/TabsContent de shadcn/ui). Adicionar tab "Científico" que renderiza `MiroFlowControl`.
**When to use:** Ponto de entrada do toggle "Modo Científico" no contexto do BI.
**Example:**
```tsx
// Source: client/src/pages/BiWorkspace.tsx (padrão de tabs existente)
import { MiroFlowControl } from "@/components/MiroFlowControl";

// Dentro do <TabsList>:
<TabsTrigger value="cientifico"><Brain /> Científico</TabsTrigger>

// Dentro das <TabsContent>:
<TabsContent value="cientifico">
  <MiroFlowControl currentDashboardData={currentData} />
</TabsContent>
```

### Anti-Patterns to Avoid
- **subprocess.run() no Node**: Não usar `child_process.spawn()` para chamar Python — use o microserviço FastAPI (padrão estabelecido)
- **Carregar miroflow no container Node**: O Dockerfile principal é Node.js puro — Python deve rodar em container separado (Dockerfile.python)
- **Modelos > 14B**: Nunca usar `deepseek-r1:32b`, `deepseek-r1:70b`, `llama3.1:70b` ou qualquer modelo acima de 14B parâmetros
- **Modificar configurações do Superset**: O proxy `/superset/*` e as rotas `/api/superset/*` existentes não devem ser alterados
- **Hardcoded OLLAMA_BASE_URL**: Sempre ler de env var `OLLAMA_BASE_URL` (default `http://localhost:11434`)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Orquestração de agentes LLM | Loop manual de chamadas LLM | MiroFlow `IterativeAgentWithToolAndRollback` | Rollback automático, retry, tool calling já implementado |
| Proxy Node → Python | Child process / spawn | `fetch()` para FastAPI (padrão `engine-proxy.ts`) | Stateless, async, sem gestão de processos |
| Configuração de LLM | Classe própria de cliente | `UnifiedOpenAIClient` do MiroFlow | Já tem retry, context limit handling, tool protocol |
| Embedding da análise no Superset | iframe manual com JS | `SupersetDashboard.tsx` já existente | Guest token, SDK do Superset, error handling prontos |
| Logs de execução imutáveis | Nova tabela no banco | `graph_nodes` + `createNode()` via `server/graph/service.ts` | Infraestrutura de KG já existente com embeddings |
| Validação de request/response | Manual | Pydantic models + FastAPI auto-validation | Type safety e OpenAPI spec grátis |

**Key insight:** O projeto já tem todos os primitivos necessários. Phase 3 é essencialmente "conectar os pontos" — o agente Python já existe, o gateway LLM (LiteLLM/Ollama) já está configurado, o KG já tem tabelas, o padrão de proxy Node→Python já está implementado.

---

## Runtime State Inventory

> Fase é greenfield (novo microserviço e novas rotas). Não há renomeações ou migrações de dados existentes.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `graph_nodes` no PostgreSQL — usado pelo KG existente | Nenhum — novas inserções com `type: "miroflow_execution"` |
| Live service config | Ollama rodando na porta 11434 com `deepseek-r1:14b` instalado | `llama3.1:8b` NÃO instalado — precisa de `ollama pull llama3.1:8b` |
| OS-registered state | Nenhum Task Scheduler / cron para MiroFlow | Nenhuma ação necessária |
| Secrets/env vars | `OLLAMA_BASE_URL=http://ollama:11434` já no `.env`; `LITELLM_API_KEY` existente | Adicionar `MIROFLOW_PORT=8006` no `.env` e docker-compose |
| Build artifacts | `server/modules/miroflow/` tem `uv.lock` mas sem `.venv` instalado | Wave 0: instalar dependências via `uv sync` ou `pip install` no Dockerfile.python |

**Modelo faltando:** `llama3.1:8b` não está instalado no Ollama (`False` confirmado por `curl http://localhost:11434/api/tags`). Instalado: `deepseek-r1:14b` (8.4GB), `arcadia-agent:latest` (2GB), `llama3.2:3b` (2GB), `nomic-embed-text` (274MB). O plano deve incluir `ollama pull llama3.1:8b` como task de Wave 0 ou pré-requisito.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Ollama API `:11434` | Todos os agentes MiroFlow | ✓ | 0.18.2 | — |
| `deepseek-r1:14b` | Statistician, Fiscal Auditor | ✓ | 8.4GB | — |
| `llama3.1:8b` | Researcher | ✗ | — | `llama3.2:3b` (degraded) ou `deepseek-r1:14b` |
| Python 3.12 | Microserviço FastAPI | ✓ | 3.12.3 | — |
| `uv` | Instalar deps MiroFlow | ✓ | 0.9.30 | `pip3` |
| FastAPI/uvicorn | Microserviço | ✓ | fastapi 0.128.8 | — |
| `omegaconf` (sistema) | MiroFlow direto | ✗ | — | Instalar via `uv sync` no `server/modules/miroflow/` |
| PostgreSQL `:5432` | KG graph_nodes | ✓ | 16 | — |
| Neo4j `:7687` | KG real (opcional) | Requer profile `[kg]` | — | `graph_nodes` PostgreSQL (já usado) |

**Missing dependencies with no fallback:**
- `llama3.1:8b` para o agente Researcher — deve ser baixado em Wave 0 (`ollama pull llama3.1:8b`)

**Missing dependencies with fallback:**
- `omegaconf` no sistema: instalar com `pip3 install omegaconf hydra-core` ou rodar MiroFlow dentro de venv com `uv sync`
- `llama3.1:8b` temporariamente: usar `deepseek-r1:14b` como fallback até o download completar

---

## Common Pitfalls

### Pitfall 1: Ollama não expõe `/v1` sem flag explícita em versões antigas
**What goes wrong:** `UnifiedOpenAIClient` do MiroFlow usa `base_url=http://localhost:11434/v1` (OpenAI-compatible endpoint). Versões antigas do Ollama (<0.1.24) não tinham esse endpoint.
**Why it happens:** Ollama 0.18.2 (confirmado no servidor) já suporta `/v1/chat/completions`. Mas o endpoint retorna erro se o modelo não estiver carregado.
**How to avoid:** Verificar `GET http://localhost:11434/api/tags` antes de iniciar o agente. Pré-carregar o modelo com `ollama run deepseek-r1:14b` ou `ollama pull`.
**Warning signs:** `404 Not Found` na URL `/v1/chat/completions`, ou `model not found` no corpo da resposta.

### Pitfall 2: MiroFlow requer dependências Python não instaladas no container Node
**What goes wrong:** O `Dockerfile` principal é Node.js Alpine — não tem Python. Se tentar importar `miroflow` no contexto Node (via python-bridge ou similar), vai falhar.
**Why it happens:** A tentativa de `from omegaconf import ...` falha com `ModuleNotFoundError` porque o sistema Python não tem as deps do MiroFlow.
**How to avoid:** Manter a separação clara: MiroFlow roda SOMENTE em `Dockerfile.python` como microserviço FastAPI. Node nunca importa Python diretamente.
**Warning signs:** Erro de `ModuleNotFoundError: No module named 'omegaconf'` nos logs do app principal.

### Pitfall 3: Timeout do fetch() insuficiente para modelos grandes
**What goes wrong:** `deepseek-r1:14b` com raciocínio pode levar 60-120 segundos para responder. O fetch padrão tem timeout de 30s nos outros proxies.
**Why it happens:** O `bi/engine-proxy.ts` usa `BI_ENGINE_TIMEOUT = 30000`. Para LLMs de 14B, isso é insuficiente.
**How to avoid:** Usar `AbortSignal.timeout(300_000)` (5 minutos) no proxy MiroFlow. Implementar streaming ou polling se necessário.
**Warning signs:** `AbortError: The operation was aborted` nos logs do Node.

### Pitfall 4: Neo4j não está ativo por padrão — usar graph_nodes do PostgreSQL
**What goes wrong:** O `docker-compose.yml` tem Neo4j no profile `[kg]` — não está ativo em deploy padrão.
**Why it happens:** Neo4j é opcional; o KG do Arcádia usa `graph_nodes` PostgreSQL por padrão.
**How to avoid:** Para imutabilidade, usar `POST /api/graph/nodes` (PostgreSQL), não o driver `neo4j` Python direto. O `server/graph/service.ts` já implementa isso com hashing.
**Warning signs:** `Connection refused: 7687` se tentar conectar ao Neo4j sem o profile ativo.

### Pitfall 5: MiroFlow não tem `llama3.1:8b` instalado
**What goes wrong:** O agente Researcher usa `llama3.1:8b` mas esse modelo não está no Ollama (`False` confirmado por inspeção direta).
**Why it happens:** Apenas `deepseek-r1:14b`, `arcadia-agent:latest`, `llama3.2:3b` e `nomic-embed-text` foram instalados.
**How to avoid:** Incluir `ollama pull llama3.1:8b` como step explícito na Wave 0 do plano.
**Warning signs:** Agente Researcher falha com `model 'llama3.1:8b' not found`.

### Pitfall 6: BiWorkspace.tsx é uma página grande — cuidado ao modificar
**What goes wrong:** `BiWorkspace.tsx` tem muitas funcionalidades (datasets, charts, dashboards, backup, BI engine). Modificação descuidada pode quebrar features existentes.
**Why it happens:** O arquivo tem ~1000+ linhas com múltiplas tabs e estados.
**How to avoid:** Adicionar MiroFlowControl como componente SEPARADO importado, não modificar lógica existente. Adicionar apenas uma nova `TabsTrigger` e `TabsContent`.
**Warning signs:** Erros de TypeScript em outros tabs depois da edição.

---

## Code Examples

Verified patterns from official sources:

### MiroFlow Agent com Ollama (config inline Python)
```python
# Source: server/modules/miroflow/miroflow/agents/base.py + config/llm/base.yaml
import sys
sys.path.insert(0, "/app/server/modules/miroflow")

import asyncio
from miroflow.agents.factory import build_agent
from miroflow.agents.context import AgentContext

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

def make_agent_cfg(model: str) -> dict:
    return {
        "type": "IterativeAgentWithToolAndRollback",
        "name": f"arcadia_{model.replace(':', '_')}",
        "max_turns": 10,
        "llm": {
            "provider_class": "UnifiedOpenAIClient",
            "model_name": model,
            "api_key": "ollama",
            "base_url": f"{OLLAMA_BASE_URL}/v1",
            "max_tokens": 8192,
            "temperature": 0.7,
            "top_p": 1.0, "min_p": 0.0, "top_k": -1,
            "reasoning_effort": None, "repetition_penalty": 1.0,
            "max_context_length": -1, "async_client": True,
            "disable_cache_control": True, "keep_tool_result": -1,
            "use_tool_calls": False, "oai_tool_thinking": False,
        },
    }

async def run_agent(agent_type: str, task: str) -> str:
    model = "deepseek-r1:14b" if agent_type in ("statistician", "fiscal_auditor") else "llama3.1:8b"
    cfg = make_agent_cfg(model)
    agent = build_agent(cfg)
    ctx = AgentContext(task_description=task)
    result = await agent.run(ctx)
    return result.get("summary", str(result))
```

### FastAPI endpoint pattern (seguindo bi_analysis_service.py)
```python
# Source: server/python/bi_analysis_service.py (padrão existente)
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Arcádia MiroFlow Service", version="1.0.0")

class AnalyzeRequest(BaseModel):
    agent: str  # "statistician" | "fiscal_auditor" | "researcher"
    task: str
    context: dict = {}
    tenant_id: int | None = None

class AnalyzeResponse(BaseModel):
    agent: str
    model: str
    result: str
    execution_id: str
    duration_ms: int

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    ...
```

### Express proxy para MiroFlow (seguindo engine-proxy.ts)
```typescript
// Source: server/bi/engine-proxy.ts (padrão existente)
const MIROFLOW_URL = `http://${process.env.MIROFLOW_HOST || "localhost"}:${
  process.env.MIROFLOW_PORT || "8006"
}`;

export function registerMiroFlowRoutes(app: Express): void {
  app.post("/api/miroflow/analyze", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado" });
    try {
      const response = await fetch(`${MIROFLOW_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req.body, tenant_id: (req.user as any)?.tenantId }),
        signal: AbortSignal.timeout(300_000),
      });
      const data = await response.json();
      // Registrar no KG
      await registerExecutionInKG(req, data);
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  app.get("/api/miroflow/health", async (_req, res) => {
    try {
      const r = await fetch(`${MIROFLOW_URL}/health`, { signal: AbortSignal.timeout(5000) });
      res.json({ online: r.ok, url: MIROFLOW_URL });
    } catch {
      res.json({ online: false, url: MIROFLOW_URL });
    }
  });
}
```

### Registro no KG (graph_nodes)
```typescript
// Source: server/graph/service.ts createNode()
import { createNode } from "../graph/service";
import crypto from "crypto";

async function registerExecutionInKG(req: any, execData: any) {
  const auditHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(execData))
    .digest("hex");
  await createNode({
    type: "miroflow_execution",
    tenantId: req.user?.tenantId,
    data: { ...execData, auditHash, immutable: true },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Llamaindex/LangChain para agentes | MiroFlow (framework próprio MiromindAI) | 2025-08 | Performance-first, benchmarks públicos, já no submodule |
| OpenAI API direta | Ollama local via LiteLLM gateway | 2025 (Arcádia) | Soberania total dos dados |
| Neo4j obrigatório para KG | graph_nodes PostgreSQL + Neo4j opcional | Phase 1 | Sem dependência de serviço extra em produção básica |
| Hydra config files externos | Config dict inline (Python) | MiroFlow 1.x | Sem dependência de paths, mais fácil em containers |

**Deprecated/outdated:**
- MiroFlow via CLI (`python run_single_task.py`): adequado para benchmark, mas não para microserviço de produção. Usar `web_app/main.py` como referência OU criar FastAPI própria.
- Modelos > 14B: explicitamente proibidos na arquitetura do projeto.

---

## Open Questions

1. **`llama3.1:8b` vs `llama3.2:3b` para Researcher**
   - What we know: `llama3.1:8b` não está instalado; `llama3.2:3b` está (2GB, já disponível)
   - What's unclear: Se João quer baixar `llama3.1:8b` (4.7GB a mais) ou aceitar `llama3.2:3b` como substituto para o Researcher
   - Recommendation: Plano deve incluir `ollama pull llama3.1:8b` como Wave 0, com fallback para `llama3.2:3b` se bandwidth for problema

2. **MiroFlow via web_app existente vs FastAPI própria**
   - What we know: `server/modules/miroflow/web_app/main.py` é uma FastAPI completa com session manager e task executor; `server/python/bi_analysis_service.py` é um FastAPI simples sem estado
   - What's unclear: Usar o `web_app` completo do MiroFlow (mais funcionalidades) ou escrever `miroflow_service.py` minimal seguindo o padrão de outros serviços
   - Recommendation: Escrever `miroflow_service.py` minimal — mais simples, sem session management, sem frontend próprio do MiroFlow

3. **Registro de execuções: graph_nodes vs skill_executions**
   - What we know: `skill_executions` é específico para Skills Arcádia; `graph_nodes` é KG genérico
   - What's unclear: O requirement diz "KG" — se é necessário usar o Neo4j real ou PostgreSQL `graph_nodes` é suficiente
   - Recommendation: Usar `graph_nodes` PostgreSQL com `type: "miroflow_execution"` — atende o requisito de imutabilidade sem depender do Neo4j (profile opcional)

4. **Posicionamento do MiroFlowControl na UI**
   - What we know: `BiWorkspace.tsx` já tem sistema de tabs (LayoutDashboard, Database, BarChart3...); `Scientist.tsx` já existe como página standalone de análise científica
   - What's unclear: Se o toggle deve ficar dentro do BiWorkspace (access contextual) ou se deve ser um botão flutuante ou se Scientist.tsx deve ser integrado ao BI
   - Recommendation: Tab "Científico" dentro de `BiWorkspace.tsx` — mais coerente com o objetivo "integrado ao Superset"

---

## Validation Architecture

> `workflow.nyquist_validation` não encontrado em `.planning/config.json` (arquivo não existe). Tratado como habilitado.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python) + vitest/jest implícito (TS) |
| Config file | Nenhum — Wave 0 deve criar `pytest.ini` para o microserviço |
| Quick run command | `pytest server/python/test_miroflow_service.py -x` |
| Full suite command | `pytest server/python/ -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-3.1 | MiroFlow configurado para Ollama local ≤14B | integration | `pytest tests/test_miroflow_ollama.py -x` | ❌ Wave 0 |
| REQ-3.2 | Agente Statistician analisa SQL com deepseek-r1:14b | integration | `pytest tests/test_miroflow_service.py::test_statistician -x` | ❌ Wave 0 |
| REQ-3.3 | Agente Fiscal Auditor valida NFe/SPED com deepseek-r1:14b | integration | `pytest tests/test_miroflow_service.py::test_fiscal_auditor -x` | ❌ Wave 0 |
| REQ-3.4 | Agente Researcher consulta KG com llama3.1:8b | integration | `pytest tests/test_miroflow_service.py::test_researcher -x` | ❌ Wave 0 |
| REQ-3.5 | `POST /api/miroflow/analyze` retorna análise estruturada | integration | `curl -X POST localhost:5000/api/miroflow/analyze ...` | ❌ Wave 0 |
| REQ-3.6 | MiroFlowControl.tsx toggle aparece no Superset/BiWorkspace | manual | Inspeção visual no browser | N/A |
| REQ-3.7 | Execuções registradas com imutabilidade no KG | unit | `pytest tests/test_miroflow_kg.py -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest server/python/test_miroflow_service.py -x`
- **Per wave merge:** `pytest server/python/ -v`
- **Phase gate:** Health check `/api/miroflow/health` retorna `{"online": true}` + todos os 3 agentes respondem com modelo correto

### Wave 0 Gaps
- [ ] `server/python/test_miroflow_service.py` — cobre REQ-3.1, 3.2, 3.3, 3.4, 3.5, 3.7
- [ ] `server/python/miroflow_service.py` — o microserviço principal
- [ ] `server/miroflow/routes.ts` + `engine-proxy.ts` — rotas Express
- [ ] `client/src/components/MiroFlowControl.tsx` — componente React
- [ ] `ollama pull llama3.1:8b` — modelo necessário para Researcher (Wave 0 setup)
- [ ] Instalar dependências MiroFlow: `pip install omegaconf hydra-core openai` (ou `uv sync` no diretório do submodule)

---

## Sources

### Primary (HIGH confidence)
- Inspeção direta: `/opt/arcadia_merged/server/modules/miroflow/pyproject.toml` — versão 1.7.0, dependências confirmadas
- Inspeção direta: `/opt/arcadia_merged/server/modules/miroflow/miroflow/llm/openai_client.py` — `UnifiedOpenAIClient`, `base_url` configurável
- Inspeção direta: `/opt/arcadia_merged/server/modules/miroflow/miroflow/agents/base.py` — `BaseAgent`, `AgentContext`, `build_agent()`
- Inspeção direta: `/opt/arcadia_merged/server/modules/miroflow/config/llm/base.yaml` — campos obrigatórios do LLM config
- Inspeção direta: `/opt/arcadia_merged/server/bi/engine-proxy.ts` — padrão estabelecido de proxy Node → Python
- Inspeção direta: `/opt/arcadia_merged/server/python/bi_analysis_service.py` — padrão do microserviço FastAPI
- Inspeção direta: `/opt/arcadia_merged/docker/litellm-config.yaml` — `deepseek-r1:14b` já configurado como `arcadia-default`
- Inspeção direta: `/opt/arcadia_merged/docker-compose.prod.yml` — `OLLAMA_BASE_URL` configurado, serviço `ollama` com profile `[ai]`
- Runtime check: `curl http://localhost:11434/api/tags` — modelos instalados confirmados
- Runtime check: `curl http://localhost:11434/api/version` — Ollama 0.18.2 com `/v1` support

### Secondary (MEDIUM confidence)
- Inspeção direta: `/opt/arcadia_merged/server/modules/miroflow/miroflow/agents/iterative_agent_with_rollback.py` — tipo `IterativeAgentWithToolAndRollback` confirmado
- Inspeção direta: `/opt/arcadia_merged/server/modules/miroflow/web_app/main.py` — FastAPI web_app existente no submodule (alternativa não usada)
- Inspeção direta: `/opt/arcadia_merged/server/graph/service.ts` — `createNode()`, `graph_nodes` tabela

### Tertiary (LOW confidence)
- Inferência sobre tempo de resposta do `deepseek-r1:14b` (60-120s) baseada em conhecimento geral de modelos 14B — não medido diretamente no servidor

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verificado diretamente nos arquivos do submodule e nas dependências instaladas
- Architecture: HIGH — padrões copiados de código existente funcionando em produção
- Pitfalls: HIGH (3-5) e MEDIUM (1-2) — baseados em inspeção direta do runtime e código
- Ambiente: HIGH — testado com curl direto ao Ollama e listagem de modelos

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 dias; stack estável, Ollama versão fixada)

---

## RESEARCH COMPLETE
