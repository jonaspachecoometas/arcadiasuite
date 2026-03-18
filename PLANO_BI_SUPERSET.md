# PLANO BI — Substituição Metabase → Apache Superset
## Análise Real + Plano de Migração
### Versão 1.0 — Março 2026

---

## 1. DIAGNÓSTICO — ESTADO ATUAL

### 1.1 O que foi descoberto no código

O documento do Replit referenciava **Metabase** (Java, :8088) como o pilar visual do BI. Ao analisar o código real, a situação é diferente:

| Componente | Nome no doc | Nome real no código | Status |
|---|---|---|---|
| Plataforma BI Visual | "Metabase" | **"MetaSet"** (alias) | Metabase por baixo |
| Proxy | `/metabase/*` | `server/metabase/proxy.ts` | Funcional |
| Auth | Metabase session | `server/metaset/routes.ts` (autologin) | Funcional |
| Client | MetabaseClient | `server/metaset/client.ts` | Funcional |
| UI | Advanced tab iframe | `/api/bi/metaset/autologin` → `/metabase/` | Funcional |
| **Superset** | Não mencionado | **`docker-compose.yml` linha 165** | **JÁ CONFIGURADO** |

**Descoberta crítica:** O Apache Superset **já está no docker-compose.yml**:
```yaml
superset:
  image: apache/superset:4.1.0
  restart: unless-stopped
  environment:
    SUPERSET_SECRET_KEY: ${SUPERSET_SECRET_KEY:-superset-secret-change-in-prod}
    DATABASE_URL: postgresql://arcadia:arcadia123@db:5432/arcadia_superset
  ports:
    - "8088:8088"
  depends_on:
    db:
      condition: service_healthy
  profiles: [bi]
```

O Superset está configurado, mas **não integrado ao gateway Node.js**. O que falta é a ponte.

### 1.2 Arquivos que precisam mudar vs o que fica igual

**Mudam:**
```
server/metabase/proxy.ts      → substituir por server/superset/proxy.ts
server/metaset/routes.ts      → substituir por server/superset/routes.ts
server/metaset/client.ts      → substituir por server/superset/client.ts
client/src/pages/BiWorkspace.tsx (Advanced tab apenas)
docker-compose.yml (Superset config + init)
docker-compose.prod.yml (adicionar Superset)
.env.example (novas variáveis)
```

**NÃO mudam (ficam exatamente iguais):**
```
server/python/bi_engine.py    ← Motor Python :8004 continua intacto
server/bi/routes.ts           ← CRUD de datasets/charts/dashboards
server/bi/upload.ts           ← ETL pipeline
server/bi/staging.ts          ← Staging
server/bi/engine-proxy.ts     ← Proxy para BI Engine Python
client/src/pages/BiWorkspace.tsx (7 de 8 tabs ficam iguais)
Todas as tabelas do banco (bi_datasets, bi_charts, etc.)
```

---

## 2. POR QUE SUPERSET É MELHOR PARA O CASO

### 2.1 Metabase vs Superset

| Critério | Metabase | Apache Superset |
|---|---|---|
| Runtime | Java (JVM, 500MB+ RAM) | Python/Flask (mais leve) |
| Embedding | Iframe com cookie de sessão | **Guest Token JWT** (seguro, sem credenciais) |
| "Qualquer tela" | Iframe estático, limitado | **`@superset-ui/embedded-sdk`** — componente React nativo |
| REST API | Limitada e não documentada | **REST API v1 completa e documentada** |
| Consistência de stack | Java (fora do padrão) | Python (mesmo stack dos motores existentes) |
| Docker image | `metabase/metabase` ~700MB | `apache/superset` ~400MB |
| SQL Lab | Básico | **Poderoso** (autocomplete, histórico, salvar queries) |
| Alertas | Básico | **Avançado** (webhooks, Slack, email) |
| Tipos de chart | ~20 | **50+** (incluindo mapas, sunburst, funnel) |
| Banco de metadados | H2/Postgres separado | **Mesmo PostgreSQL** da Arcádia |

### 2.2 A feature que o usuário pediu: "funcionar em qualquer tela"

O Superset resolve isso com **Guest Token + Embedded SDK**:

```
Fluxo atual (Metabase):
  BiWorkspace → iframe → /metabase/ → autologin com cookie
  ❌ Só funciona na tab Advanced do BiWorkspace
  ❌ Cookie expira, precisa re-autenticar
  ❌ Não embeda em outras páginas facilmente

Fluxo novo (Superset):
  QUALQUER página React → <EmbeddedDashboard dashboardId="xxx" />
  ✅ Funciona no Dashboard principal (/)
  ✅ Funciona no SOE (/soe tab Financeiro)
  ✅ Funciona no /contabil
  ✅ Funciona no /financeiro
  ✅ Funciona em qualquer tela do Arcádia
  ✅ Guest Token renovado automaticamente (sem re-login)
```

---

## 3. ARQUITETURA COM SUPERSET

### 3.1 Diagrama atualizado

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUÁRIO / FRONTEND                            │
│                                                                      │
│   BiWorkspace.tsx (8 tabs — 7 iguais, Advanced → Superset)         │
│   + QUALQUER outra página pode embedar um dashboard Superset        │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  <SupersetDashboard dashboardId="finance-overview" />      │    │
│   │  Componente React reutilizável em QUALQUER rota            │    │
│   └────────────────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
          ┌───────────────┼──────────────────────┐
          │               │                      │
          ▼               ▼                      ▼
┌──────────────┐ ┌────────────────┐ ┌──────────────────────┐
│ API BI Node  │ │ BI Engine Py   │ │ Superset (Python)    │
│ /api/bi/*    │ │ /api/bi-engine │ │ /superset/*          │
│ (sem mudança)│ │ :8004 (igual)  │ │ :8088                │
│              │ │                │ │                      │
│ + novo:      │ │                │ │ REST API v1          │
│ /api/superset│ │                │ │ Guest Token JWT      │
│ /guest-token │ │                │ │ SQL Lab              │
│              │ │                │ │ 50+ chart types      │
└──────────────┘ └────────────────┘ └──────────┬───────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │  PostgreSQL           │
                                    │  arcadia (dados SOE)  │
                                    │  arcadia_superset     │
                                    │  (metadados Superset) │
                                    └──────────────────────┘
```

### 3.2 Dois bancos PostgreSQL

```
Banco: arcadia          → Dados do SOE (persons, products, sales_orders, etc.)
                          Superset conecta aqui em READ-ONLY para criar charts
Banco: arcadia_superset → Metadados do Superset (dashboards, queries, users)
                          Superset usa internamente
```

Ambos no mesmo servidor PostgreSQL, bancos separados. O docker-compose.yml já referencia `arcadia_superset`.

---

## 4. O QUE CONSTRUIR — Passo a Passo

### 4.1 Configuração do Superset (docker-compose.yml)

O container já existe. Faltam: init script, volumes, configuração de embedding.

```yaml
# docker-compose.yml — seção superset (expandida)

superset:
  image: apache/superset:4.1.0
  restart: unless-stopped
  environment:
    SUPERSET_SECRET_KEY: ${SUPERSET_SECRET_KEY:-superset-secret-change-in-prod}
    DATABASE_URL: postgresql://${PGUSER:-arcadia}:${PGPASSWORD:-arcadia123}@db:5432/arcadia_superset
    SUPERSET_WEBSERVER_PORT: 8088
    PYTHONPATH: /app/pythonpath
    # Para embedding funcionar:
    FEATURE_FLAGS: '{"EMBEDDED_SUPERSET": true, "ENABLE_TEMPLATE_PROCESSING": true}'
  ports:
    - "8088:8088"
  volumes:
    - ./docker/superset/superset_config.py:/app/pythonpath/superset_config.py
    - ./docker/superset/init.sh:/app/docker/init.sh
    - superset_home:/app/superset_home
  depends_on:
    db:
      condition: service_healthy
  command: ["/bin/bash", "/app/docker/init.sh"]
  profiles: [bi]
  networks:
    - arcadia
```

### 4.2 Arquivo de Configuração Superset

```python
# docker/superset/superset_config.py

import os

# Chave secreta (mesma do .env)
SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "change-in-production")

# Banco de metadados do Superset
SQLALCHEMY_DATABASE_URI = os.environ.get(
    "DATABASE_URL",
    "postgresql://arcadia:arcadia123@db:5432/arcadia_superset"
)

# CORS — permite o gateway Arcádia (:5000) chamar a API
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": {r"/api/*": {"origins": "*"}},
}

# Embedding habilitado
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
    "ALERT_REPORTS": True,         # Alertas automáticos
    "DRILL_TO_DETAIL": True,       # Drill-down em charts
}

# Timeout de queries (30s por default, aumentar para análises pesadas)
SUPERSET_WEBSERVER_TIMEOUT = 300

# Cache (Redis se disponível, senão in-memory)
CACHE_CONFIG = {
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 300,  # 5 min
}

# Tema/branding Arcádia (logo, cores)
APP_NAME = "Arcádia Insights"
APP_ICON = "/static/arcadia-logo.png"
```

### 4.3 Init Script do Superset

```bash
#!/bin/bash
# docker/superset/init.sh — roda ao iniciar o container

set -e

echo "[Superset Init] Iniciando configuração..."

# Aguarda PostgreSQL
until psql "${DATABASE_URL}" -c "SELECT 1" > /dev/null 2>&1; do
  echo "[Superset Init] Aguardando PostgreSQL..."
  sleep 2
done

# Cria banco arcadia_superset se não existir
psql "postgresql://${PGUSER:-arcadia}:${PGPASSWORD:-arcadia123}@db:5432/postgres" \
  -c "CREATE DATABASE arcadia_superset OWNER arcadia;" 2>/dev/null || true

# Inicializa banco do Superset
superset db upgrade

# Cria usuário admin (só se não existir)
superset fab create-admin \
  --username "${SUPERSET_ADMIN_USER:-admin}" \
  --firstname "Arcádia" \
  --lastname "Admin" \
  --email "${SUPERSET_ADMIN_EMAIL:-admin@arcadia.app}" \
  --password "${SUPERSET_ADMIN_PASSWORD:-arcadia2026}" 2>/dev/null || true

# Carrega exemplos (opcional, comentar em prod)
# superset load_examples

# Inicializa roles e permissões
superset init

# Registra conexão com o banco Arcádia (dados do SOE)
python - <<'PYEOF'
from superset import create_app
from superset.extensions import db
from superset.models.core import Database
import os

app = create_app()
with app.app_context():
    existing = db.session.query(Database).filter_by(
        database_name="Arcádia Suite"
    ).first()
    if not existing:
        arcadia_db = Database(
            database_name="Arcádia Suite",
            sqlalchemy_uri=os.environ.get(
                "ARCADIA_DATABASE_URL",
                "postgresql://arcadia:arcadia123@db:5432/arcadia"
            ),
            expose_in_sqllab=True,
            allow_run_async=True,
            allow_csv_upload=False,
        )
        db.session.add(arcadia_db)
        db.session.commit()
        print("[Superset Init] Banco 'Arcádia Suite' registrado!")
    else:
        print("[Superset Init] Banco 'Arcádia Suite' já existe.")
PYEOF

echo "[Superset Init] Iniciando servidor..."
gunicorn \
  --bind "0.0.0.0:${SUPERSET_WEBSERVER_PORT:-8088}" \
  --access-logfile "-" \
  --error-logfile "-" \
  --workers 4 \
  --timeout 120 \
  --limit-request-line 0 \
  --limit-request-field_size 0 \
  "superset.app:create_app()"
```

### 4.4 Proxy Superset (substitui server/metabase/proxy.ts)

```typescript
// server/superset/proxy.ts

import { Express, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const SUPERSET_HOST = process.env.SUPERSET_HOST || "localhost";
const SUPERSET_PORT = parseInt(process.env.SUPERSET_PORT || "8088", 10);
const SUPERSET_TIMEOUT = 60000;

export function setupSupersetProxy(app: Express): void {
  const target = `http://${SUPERSET_HOST}:${SUPERSET_PORT}`;

  const supersetProxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    timeout: SUPERSET_TIMEOUT,
    proxyTimeout: SUPERSET_TIMEOUT,
    pathRewrite: { "^/superset": "" },
    on: {
      error: (err, _req, res) => {
        console.error("[Superset Proxy] Error:", err.message);
        if (res && typeof (res as Response).status === "function") {
          (res as Response).status(502).json({
            error: "Superset indisponível",
            message: "O Superset está iniciando. Tente novamente em alguns segundos.",
            target,
          });
        }
      },
      proxyRes: (proxyRes) => {
        const location = proxyRes.headers["location"];
        if (location && typeof location === "string" && location.startsWith("/")) {
          proxyRes.headers["location"] = `/superset${location}`;
        }
      },
    },
  });

  app.use("/superset", supersetProxy);
  console.log(`[Superset Proxy] Configurado -> /superset/* => ${target}`);
}
```

### 4.5 Rotas Superset — Guest Token para Embedding

Esta é a peça-chave para "funcionar em qualquer tela":

```typescript
// server/superset/routes.ts

import type { Express, Request, Response } from "express";

const SUPERSET_HOST = process.env.SUPERSET_HOST || "localhost";
const SUPERSET_PORT = parseInt(process.env.SUPERSET_PORT || "8088", 10);
const SUPERSET_URL = `http://${SUPERSET_HOST}:${SUPERSET_PORT}`;
const SUPERSET_ADMIN_USER = process.env.SUPERSET_ADMIN_USER || "admin";
const SUPERSET_ADMIN_PASS = process.env.SUPERSET_ADMIN_PASSWORD || "arcadia2026";

// Cache do token de serviço (expira em 50 min)
let serviceToken: string | null = null;
let serviceTokenExpiry = 0;

async function getServiceToken(): Promise<string> {
  if (serviceToken && Date.now() < serviceTokenExpiry) return serviceToken;

  const resp = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: SUPERSET_ADMIN_USER,
      password: SUPERSET_ADMIN_PASS,
      provider: "db",
      refresh: true,
    }),
  });

  if (!resp.ok) throw new Error("Falha ao autenticar no Superset");
  const data = await resp.json();
  serviceToken = data.access_token;
  serviceTokenExpiry = Date.now() + 50 * 60 * 1000; // 50 min
  return serviceToken!;
}

export function registerSupersetRoutes(app: Express): void {

  // Guest Token — para embedding em qualquer tela
  // O frontend chama este endpoint para obter um token temporário
  // e renderiza o dashboard via @superset-ui/embedded-sdk
  app.post("/api/superset/guest-token", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

      const { dashboardId } = req.body;
      if (!dashboardId) return res.status(400).json({ error: "dashboardId obrigatório" });

      const token = await getServiceToken();

      // Solicita guest token ao Superset
      const guestResp = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: {
            username: `arcadia_${req.user?.id}`,
            first_name: req.user?.name?.split(" ")[0] || "User",
            last_name: req.user?.name?.split(" ")[1] || "",
          },
          resources: [{ type: "dashboard", id: dashboardId }],
          rls: [],  // Row Level Security (futuro: por tenantId)
        }),
      });

      if (!guestResp.ok) {
        const err = await guestResp.text();
        return res.status(502).json({ error: "Falha ao gerar guest token", detail: err });
      }

      const { token: guestToken } = await guestResp.json();
      res.json({ token: guestToken, supersetUrl: "/superset" });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Lista dashboards disponíveis (para o seletor na UI)
  app.get("/api/superset/dashboards", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

      const token = await getServiceToken();
      const resp = await fetch(`${SUPERSET_URL}/api/v1/dashboard/?q=(order_column:changed_on_delta_humanized,order_direction:desc)`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!resp.ok) return res.status(502).json({ error: "Superset indisponível" });
      const data = await resp.json();
      res.json(data.result || []);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Health check
  app.get("/api/superset/health", async (_req: Request, res: Response) => {
    try {
      const resp = await fetch(`${SUPERSET_URL}/health`);
      res.json({ online: resp.ok, url: SUPERSET_URL });
    } catch {
      res.json({ online: false, url: SUPERSET_URL });
    }
  });
}
```

### 4.6 Componente React — SupersetDashboard (reutilizável em QUALQUER tela)

```typescript
// client/src/components/SupersetDashboard.tsx

import { useEffect, useRef, useState } from "react";
import { embedDashboard } from "@superset-ui/embedded-sdk";

interface SupersetDashboardProps {
  dashboardId: string;
  height?: string | number;
  className?: string;
}

export function SupersetDashboard({
  dashboardId,
  height = "calc(100vh - 300px)",
  className = "",
}: SupersetDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    embedDashboard({
      id: dashboardId,
      supersetDomain: window.location.origin + "/superset",
      mountPoint: containerRef.current,

      // Busca guest token do gateway Arcádia
      fetchGuestToken: async () => {
        const resp = await fetch("/api/superset/guest-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dashboardId }),
          credentials: "include",
        });
        if (!resp.ok) throw new Error("Falha ao obter token");
        const { token } = await resp.json();
        return token;
      },

      dashboardUiConfig: {
        hideTitle: true,           // Título próprio no Arcádia
        hideChartControls: false,  // Manter controles de chart
        filters: {
          visible: true,           // Mostrar filtros
          expanded: false,
        },
      },
    }).then(() => {
      if (mounted) setLoading(false);
    }).catch((err) => {
      if (mounted) {
        setError(err.message);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [dashboardId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-500 text-sm">
        Superset indisponível: {error}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center text-[#1f334d]">
            <div className="w-8 h-8 border-4 border-[#c89b3c] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando Arcádia Insights...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
```

**Uso em QUALQUER página:**
```tsx
// Exemplo: na página /financeiro
import { SupersetDashboard } from "@/components/SupersetDashboard";

// Dashboard financeiro embeddado diretamente no módulo Financeiro
<SupersetDashboard dashboardId="financial-overview" height={500} />

// Exemplo: na página /contabil
<SupersetDashboard dashboardId="dre-mensal" />

// Exemplo: no Dashboard principal (/)
<SupersetDashboard dashboardId="executive-summary" height={400} />
```

### 4.7 BiWorkspace.tsx — Advanced tab (única mudança na UI)

```tsx
// Substituir a tab Advanced (linhas 2918-2945)

<TabsContent value="advanced" className="mt-0">
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-[#1f334d]">Arcádia Insights — Apache Superset</h2>
        <p className="text-sm text-gray-500">
          SQL Lab avançado, 50+ tipos de gráfico, dashboards interativos
        </p>
      </div>
      <a
        href="/superset"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f334d] text-white rounded-lg hover:bg-[#2a4466] transition-colors text-sm"
      >
        <ArrowRight className="w-4 h-4" /> Abrir em Nova Aba
      </a>
    </div>

    {/* Dashboard selecionável */}
    <SupersetDashboardSelector />
  </div>
</TabsContent>
```

---

## 5. TABELAS E VARIÁVEIS

### 5.1 Nenhuma tabela nova no schema Arcádia

O Superset usa seu próprio banco (`arcadia_superset`) para metadados internos. As tabelas do Arcádia não mudam.

### 5.2 Novas variáveis de ambiente

```bash
# .env — adicionar/substituir:

# Superset (substitui METABASE_*)
SUPERSET_HOST=superset               # nome do container Docker
SUPERSET_PORT=8088
SUPERSET_SECRET_KEY=                 # gerar: openssl rand -hex 32
SUPERSET_ADMIN_USER=admin
SUPERSET_ADMIN_EMAIL=admin@arcadia.app
SUPERSET_ADMIN_PASSWORD=             # senha forte em prod

# URL do banco Arcádia para o Superset acessar (read-only ideal)
ARCADIA_DATABASE_URL=postgresql://arcadia_ro:pass@db:5432/arcadia

# Remover (não são mais necessários):
# METABASE_HOST
# METABASE_PORT
# METASET_ADMIN_EMAIL
# METASET_ADMIN_PASSWORD
```

---

## 6. ROADMAP — Fases de Implementação

### Fase 1 — Infraestrutura (2-3 dias)
```
[ ] Criar docker/superset/superset_config.py
[ ] Criar docker/superset/init.sh
[ ] Atualizar docker-compose.yml (expandir seção superset existente)
[ ] Adicionar volumes: superset_home no docker-compose
[ ] Testar: docker compose --profile bi up superset
[ ] Verificar: banco arcadia_superset criado, admin funciona, :8088 acessível
```

### Fase 2 — Gateway (1-2 dias)
```
[ ] Criar server/superset/proxy.ts (substitui server/metabase/proxy.ts)
[ ] Criar server/superset/routes.ts (guest token, lista dashboards, health)
[ ] Registrar no server/routes.ts: setupSupersetProxy() + registerSupersetRoutes()
[ ] Remover/comentar setupMetabaseProxy() e registerMetaSetRoutes()
[ ] Testar: GET /api/superset/health → { online: true }
[ ] Testar: POST /api/superset/guest-token → token JWT
```

### Fase 3 — Frontend (2-3 dias)
```
[ ] npm install @superset-ui/embedded-sdk
[ ] Criar client/src/components/SupersetDashboard.tsx
[ ] Atualizar BiWorkspace.tsx Advanced tab (substituir iframe MetaSet)
[ ] Testar: dashboard embeddado na Advanced tab
[ ] Criar 3 dashboards base no Superset:
    - executive-summary (KPIs gerais)
    - financial-overview (Financeiro)
    - dre-mensal (DRE)
```

### Fase 4 — Embedding em outras telas (1 semana)
```
[ ] Embedar SupersetDashboard no /financeiro (tab Análise)
[ ] Embedar SupersetDashboard no /contabil (tab DRE/Balanço)
[ ] Embedar SupersetDashboard no SOE (tab Dashboard)
[ ] Embedar SupersetDashboard no Home / Dashboard principal
[ ] RLS por tenantId (Row Level Security nos dashboards)
```

### Fase 5 — Migração de dashboards (conforme necessário)
```
[ ] Recriar no Superset os dashboards que existiam no MetaSet (se houver)
[ ] Configurar alertas automáticos (Superset Alerts & Reports)
[ ] Criar dashboards para cada domínio do SOE:
    - Vendas, Compras, Fiscal, Pessoas, Estoque
```

---

## 7. DIAGRAMA BI ATUALIZADO (completo)

```
┌────────────────────────────────────────────────────────────────────┐
│                     ARCÁDIA BI STACK v2                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  FRONTEND REACT — Pode usar em QUALQUER rota                 │  │
│  │                                                               │  │
│  │  BiWorkspace.tsx     → 8 tabs (7 iguais + Advanced=Superset) │  │
│  │  <SupersetDashboard> → componente reutilizável               │  │
│  │  Guest Token API     → /api/superset/guest-token             │  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                     │
│         ┌─────────────────────┼──────────────────────┐             │
│         │                     │                      │             │
│  ┌──────▼──────┐     ┌────────▼───────┐   ┌─────────▼──────────┐  │
│  │  API BI     │     │  BI Engine     │   │ Apache Superset     │  │
│  │  (Node.js)  │     │  Python:8004   │   │ Python:8088         │  │
│  │  sem mudança│     │  sem mudança   │   │                     │  │
│  │             │     │                │   │ SQL Lab             │  │
│  │  CRUD       │     │ SQL+Charts     │   │ 50+ chart types     │  │
│  │  Upload/ETL │     │ Micro-BI       │   │ Guest Token (embed) │  │
│  │  Staging    │     │ Análise Pandas │   │ Alerts & Reports    │  │
│  │  Backups    │     │ Cache 5min     │   │ REST API v1         │  │
│  └─────┬───────┘     └────────┬───────┘   └─────────┬───────────┘  │
│        │                      │                     │              │
│        └──────────────────────┼─────────────────────┘              │
│                               │                                     │
│                    ┌──────────▼──────────┐                         │
│                    │    PostgreSQL        │                         │
│                    │                     │                         │
│                    │  arcadia            │ ← Dados SOE (read-only) │
│                    │  arcadia_superset   │ ← Metadados Superset    │
│                    └────────────────────┘                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CIENTISTA (Python) — IA/ML: análise, padrões, insights      │  │
│  │  ASSISTENTE BI (GPT) — chat sobre dados                      │  │
│  │  (ambos sem mudança)                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. RESUMO — O que muda, o que fica

| Componente | Ação | Esforço |
|---|---|---|
| `server/metabase/proxy.ts` | Substituir por `server/superset/proxy.ts` | 30 min |
| `server/metaset/routes.ts` | Substituir por `server/superset/routes.ts` | 2h |
| `server/metaset/client.ts` | Remover (lógica vai para routes.ts) | 5 min |
| `docker-compose.yml` Superset | Expandir configuração existente | 1h |
| `docker/superset/superset_config.py` | Criar (novo arquivo) | 30 min |
| `docker/superset/init.sh` | Criar (novo arquivo) | 1h |
| `BiWorkspace.tsx` Advanced tab | Substituir iframe MetaSet | 1h |
| `SupersetDashboard.tsx` | Criar componente (novo) | 2h |
| `npm install @superset-ui/embedded-sdk` | Instalar dependência | 5 min |
| BI Engine Python (:8004) | **Não muda nada** | — |
| API BI Node /api/bi/* | **Não muda nada** | — |
| Upload/ETL/Staging | **Não muda nada** | — |
| 7 tabs do BiWorkspace | **Não muda nada** | — |
| Tabelas do banco | **Não muda nada** | — |

**Total estimado: 1-2 dias de implementação real** (a infra já está 80% pronta).

---

## 9. VANTAGEM ESTRATÉGICA

> O Apache Superset não é apenas "trocar Metabase".
>
> É a virada de chave que permite que o BI deixe de ser uma página separada
> e vire um **componente vivo** que aparece **dentro de cada módulo do Arcádia**:
>
> - O usuário está no módulo Financeiro → vê o dashboard financeiro ali mesmo
> - O usuário está no módulo Contábil → vê o DRE ali mesmo
> - O usuário está no SOE → vê os KPIs do negócio ali mesmo
>
> Sem abrir nova aba. Sem sair do contexto. Sem re-autenticar.
> O Superset renderiza no lugar exato onde o usuário está.

---

*PLANO_BI_SUPERSET.md — Arcádia Suite v3.0*
*Gerado em: 2026-03-16 — Baseado na análise do MAPA_BI_ARCADIA.md (Replit) + código real*
