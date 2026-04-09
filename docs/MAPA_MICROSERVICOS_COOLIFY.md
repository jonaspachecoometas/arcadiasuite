# Arcádia Suite — Mapa de Microserviços para Coolify/Docker

> Documento de referência para containerização e deploy em Coolify.
> Atualizado em: Março 2026

---

## 1. Visão Geral da Arquitetura

```
                         ┌──────────────────────────────┐
                         │         COOLIFY / TRAEFIK     │
                         │    Reverse Proxy + TLS + DNS  │
                         └──────────┬───────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                       │
     ┌────────▼────────┐  ┌────────▼────────┐   ┌─────────▼────────┐
     │  arcadia-gateway │  │  arcadia-plus   │   │  arcadia-frontend│
     │  (Node.js:5000)  │  │  (PHP/Nginx)    │   │  (Nginx/Static)  │
     │  API + WebSocket │  │  :8080          │   │  :80 (React SPA) │
     └────────┬────────┘  └────────┬────────┘   └──────────────────┘
              │                     │
    ┌─────────┼──────────────┬──────┘
    │         │              │
┌───▼──┐ ┌───▼───┐ ┌────────▼────────┐
│Postgres│ │MySQL  │ │  Redis (futuro) │
│  :5432 │ │ :3306 │ │     :6379       │
└───┬────┘ └───────┘ └─────────────────┘
    │
    │  (DATABASE_URL compartilhado)
    │
┌───▼──────────────────────────────────────────────────────┐
│                    MOTORES (FastAPI / Node)               │
│                                                           │
│  ┌─────────┐ ┌─────────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │
│  │ Fisco   │ │Contábil │ │  BI  │ │Auto  │ │  Comm    │ │
│  │ :8002   │ │ :8003   │ │:8004 │ │:8005 │ │  :8006   │ │
│  │ Python  │ │ Python  │ │Python│ │Python│ │  Node/TS │ │
│  └─────────┘ └─────────┘ └──────┘ └──────┘ └──────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Inventário de Serviços (9 containers + 3 bancos)

### 2.1 — `arcadia-gateway` (Container Principal)

| Item | Valor |
|------|-------|
| **Tecnologia** | Node.js 20 + Express + Socket.IO |
| **Porta** | 5000 |
| **Entrada** | `server/index.ts` (build: `dist/index.cjs`) |
| **Banco** | PostgreSQL (Drizzle ORM) |
| **Responsabilidades** | API REST principal, autenticação/sessões, WebSocket (chat + WhatsApp), proxy para motores, Dev Center (6 agentes XOS), Manus IA (OpenAI), Knowledge Graph, Learning System, Governance, MCP/A2A protocols |
| **Variáveis obrigatórias** | `DATABASE_URL`, `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `SESSION_SECRET`, `OPENAI_API_KEY`, `GITHUB_TOKEN` |
| **Variáveis opcionais** | `ERPNEXT_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`, `GITHUB_OWNER`, `GITHUB_REPO` |
| **Healthcheck** | `GET /api/health` ou `GET /` |
| **Dockerfile existente** | `./Dockerfile` (node:20-alpine, multi-stage) |

```dockerfile
# Build: npm run build → dist/index.cjs
# Run: node dist/index.cjs
# Portas: 5000
```

### 2.2 — `arcadia-frontend` (SPA React)

| Item | Valor |
|------|-------|
| **Tecnologia** | React 18 + Vite + TypeScript + Tailwind + shadcn/ui |
| **Build** | `npm run build` → `dist/public/` |
| **Servir com** | Nginx (static files) ou incluir no Gateway |
| **Porta** | 80/443 (via Coolify/Traefik) |

> **Nota**: Atualmente o frontend é servido pelo Gateway (Express serve os assets estáticos). Para microsserviços, pode ser separado em um container Nginx leve ou mantido no Gateway.

**Opção A — Junto com Gateway** (recomendado para início):
O Dockerfile atual já faz isso. O Express serve o React build.

**Opção B — Separado** (para escalar independentemente):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 2.3 — `arcadia-plus` (ERP Laravel/PHP)

| Item | Valor |
|------|-------|
| **Tecnologia** | PHP 8.2 + Laravel + Nginx |
| **Porta** | 8080 (interno) → exposto via proxy `/plus` |
| **Banco** | MySQL 8.0 (separado do PostgreSQL) |
| **Entrada** | `plus/public/index.php` via `php artisan serve` ou PHP-FPM + Nginx |
| **Dockerfile existente** | `plus/Dockerfile` (php:8.2-fpm) |
| **docker-compose existente** | `plus/docker-compose.yml` (app + web + db) |
| **Dependências** | Composer, Node.js 18 (para assets) |
| **Variáveis obrigatórias** | `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `APP_KEY`, `APP_URL` |
| **Módulos** | NF-e/NFC-e/CT-e/MDF-e, PDV, Menu Digital, Ordem de Serviço, Financeiro, Estoque, CRM |

**Containers necessários para o Plus**:
1. `arcadia-plus-app` — PHP-FPM (porta 9000 interna)
2. `arcadia-plus-web` — Nginx (porta 8080, proxy para PHP-FPM)
3. `arcadia-mysql` — MySQL 8.0 (porta 3306)

### 2.4 — `arcadia-fisco` (Motor Fiscal)

| Item | Valor |
|------|-------|
| **Tecnologia** | Python 3.11 + FastAPI + Uvicorn |
| **Porta** | 8002 |
| **Arquivo** | `server/python/fisco_service.py` |
| **Banco** | Nenhum direto (opera sobre XML) |
| **Dependências Python** | `fastapi`, `uvicorn`, `nfelib`, `signxml`, `lxml`, `zeep`, `cryptography`, `pydantic` |
| **Responsabilidades** | Geração XML NF-e/NFC-e, assinatura digital, comunicação SEFAZ, consulta/cancelamento/inutilização |
| **Variáveis** | `FISCO_PORT=8002` |
| **Healthcheck** | `GET /health` |

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY server/python/fisco_service.py .
COPY requirements-fisco.txt .
RUN pip install -r requirements-fisco.txt
EXPOSE 8002
CMD ["uvicorn", "fisco_service:app", "--host", "0.0.0.0", "--port", "8002"]
```

### 2.5 — `arcadia-contabil` (Motor Contábil)

| Item | Valor |
|------|-------|
| **Tecnologia** | Python 3.11 + FastAPI |
| **Porta** | 8003 |
| **Arquivo** | `server/python/contabil_service.py` |
| **Banco** | Nenhum direto (recebe dados via POST) |
| **Dependências Python** | `fastapi`, `uvicorn`, `pydantic` |
| **Responsabilidades** | DRE, Balanço Patrimonial, Balancete, Validação de Lançamentos, SPED ECD/ECF, integração NF-e/folha |
| **Variáveis** | `CONTABIL_PORT=8003` |
| **Healthcheck** | `GET /health` |

### 2.6 — `arcadia-bi` (Motor BI/Analytics)

| Item | Valor |
|------|-------|
| **Tecnologia** | Python 3.11 + FastAPI + Pandas + NumPy |
| **Porta** | 8004 |
| **Arquivo** | `server/python/bi_engine.py` |
| **Banco** | PostgreSQL (via `psycopg2`, leitura direta) |
| **Dependências Python** | `fastapi`, `uvicorn`, `pandas`, `numpy`, `psycopg2-binary`, `pydantic` |
| **Responsabilidades** | Exploração de schema, execução SQL, geração de dados para gráficos, Micro-BI, análise de dados |
| **Variáveis** | `BI_PORT=8004`, `DATABASE_URL` |
| **Healthcheck** | `GET /health` |

### 2.7 — `arcadia-automation` (Motor de Automação)

| Item | Valor |
|------|-------|
| **Tecnologia** | Python 3.11 + FastAPI + APScheduler |
| **Porta** | 8005 |
| **Arquivo** | `server/python/automation_engine.py` |
| **Banco** | PostgreSQL (via `psycopg2`) |
| **Dependências Python** | `fastapi`, `uvicorn`, `psycopg2-binary`, `apscheduler`, `pydantic` |
| **Responsabilidades** | Scheduler (cron jobs), Event Bus, Workflow executor |
| **Variáveis** | `AUTOMATION_PORT=8005`, `DATABASE_URL` |
| **Healthcheck** | `GET /health` |

### 2.8 — `arcadia-communication` (Motor de Comunicação)

| Item | Valor |
|------|-------|
| **Tecnologia** | Node.js 20 + Express + TypeScript |
| **Porta** | 8006 |
| **Arquivo** | `server/communication/engine.ts` |
| **Banco** | PostgreSQL (via `@neondatabase/serverless`) |
| **Dependências Node** | `express`, `@neondatabase/serverless`, `ws` |
| **Responsabilidades** | Unifica contatos/threads/mensagens de WhatsApp, CRM, XOS. Canais, filas, mensagens rápidas, eventos |
| **Variáveis** | `COMMUNICATION_PORT=8006`, `DATABASE_URL` |
| **Healthcheck** | `GET /health` |

### 2.9 — `arcadia-people` (Motor RH — opcional/futuro)

| Item | Valor |
|------|-------|
| **Tecnologia** | Python 3.11 + FastAPI |
| **Porta** | 8007 (ajustar — conflito atual com BI na 8004) |
| **Arquivo** | `server/python/people_service.py` |
| **Banco** | Nenhum direto (cálculos puros) |
| **Dependências Python** | `fastapi`, `uvicorn`, `pydantic` |
| **Responsabilidades** | Cálculo INSS/IRRF, folha de pagamento, férias, rescisão, eSocial |
| **Variáveis** | `PEOPLE_PORT=8007` |

---

## 3. Bancos de Dados (3 containers)

### 3.1 — `arcadia-postgres`

| Item | Valor |
|------|-------|
| **Imagem** | `postgres:16-alpine` |
| **Porta** | 5432 |
| **Uso** | Gateway, BI Engine, Automation Engine, Communication Engine |
| **ORM** | Drizzle (Node.js) / psycopg2 (Python) |
| **Schema** | ~100+ tabelas (tenants, users, valuation_*, crm_*, comm_*, xos_*, etc.) |
| **Volume** | `/var/lib/postgresql/data` |

### 3.2 — `arcadia-mysql`

| Item | Valor |
|------|-------|
| **Imagem** | `mysql:8.0` |
| **Porta** | 3306 |
| **Uso** | Exclusivo do Plus (Laravel) |
| **Schema** | 260+ migrações Laravel (produtos, vendas, fiscal, estoque, etc.) |
| **Volume** | `/var/lib/mysql` |

### 3.3 — `arcadia-redis` (futuro/recomendado)

| Item | Valor |
|------|-------|
| **Imagem** | `redis:7-alpine` |
| **Porta** | 6379 |
| **Uso** | Cache de sessões, fila de jobs, pub/sub entre serviços |
| **Recomendação** | Substituir session store do Express (atualmente PostgreSQL) e usar como broker de eventos |

---

## 4. Mapa de Comunicação entre Serviços

```
┌─────────────────────────────────────────────────────────────────┐
│                    arcadia-gateway (:5000)                       │
│                                                                  │
│  /api/*          → Rotas internas (Express)                     │
│  /api/fisco/*    → proxy → arcadia-fisco:8002                   │
│  /api/contabil/* → proxy → arcadia-contabil:8003                │
│  /api/bi/*       → proxy → arcadia-bi:8004                      │
│  /api/automation/*→ proxy → arcadia-automation:8005              │
│  /api/comm/*     → proxy → arcadia-communication:8006            │
│  /plus/*         → proxy → arcadia-plus-web:8080                │
│  /metabase/*     → proxy → metabase:8088 (se usar)              │
│                                                                  │
│  WebSocket (Socket.IO) → Chat interno, WhatsApp real-time       │
└─────────────────────────────────────────────────────────────────┘
```

### Dependências entre serviços:

| Serviço | Depende de | Comunicação |
|---------|-----------|-------------|
| Gateway | PostgreSQL, todos os motores | HTTP proxy, DB direto |
| Plus | MySQL, Gateway (SSO) | HTTP (proxy reverso) |
| Fisco | Nenhum banco | HTTP (recebe XMLs) |
| Contábil | Nenhum banco | HTTP (recebe dados via POST) |
| BI | PostgreSQL | HTTP + SQL direto no PG |
| Automation | PostgreSQL | HTTP + SQL direto no PG |
| Communication | PostgreSQL | HTTP + SQL direto no PG |
| People | Nenhum banco | HTTP (cálculos puros) |

---

## 5. Docker Compose Completo para Coolify

```yaml
# docker-compose.coolify.yml
version: "3.8"

services:
  # ═══════════════════════════════════════════
  # BANCOS DE DADOS
  # ═══════════════════════════════════════════
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${PGUSER:-arcadia}
      POSTGRES_PASSWORD: ${PGPASSWORD}
      POSTGRES_DB: ${PGDATABASE:-arcadia}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PGUSER:-arcadia}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - arcadia

  mysql:
    image: mysql:8.0
    restart: always
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
    environment:
      MYSQL_DATABASE: ${PLUS_DB_DATABASE:-controlplus}
      MYSQL_USER: ${PLUS_DB_USERNAME:-controlplus}
      MYSQL_PASSWORD: ${PLUS_DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${PLUS_MYSQL_ROOT_PASSWORD}
    volumes:
      - mysqldata:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - arcadia

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    networks:
      - arcadia

  # ═══════════════════════════════════════════
  # GATEWAY + FRONTEND (Node.js principal)
  # ═══════════════════════════════════════════
  gateway:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://${PGUSER:-arcadia}:${PGPASSWORD}@postgres:5432/${PGDATABASE:-arcadia}
      PGHOST: postgres
      PGUSER: ${PGUSER:-arcadia}
      PGPASSWORD: ${PGPASSWORD}
      PGDATABASE: ${PGDATABASE:-arcadia}
      SESSION_SECRET: ${SESSION_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      ERPNEXT_URL: ${ERPNEXT_URL:-}
      ERPNEXT_API_KEY: ${ERPNEXT_API_KEY:-}
      ERPNEXT_API_SECRET: ${ERPNEXT_API_SECRET:-}
      # URLs dos motores (comunicação interna Docker)
      FISCO_URL: http://fisco:8002
      CONTABIL_URL: http://contabil:8003
      BI_URL: http://bi:8004
      AUTOMATION_URL: http://automation:8005
      COMMUNICATION_URL: http://communication:8006
      PLUS_URL: http://plus-web:8080
      REDIS_URL: redis://redis:6379
    volumes:
      - uploads:/app/uploads
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/"]
      interval: 30s
      timeout: 10s
      start_period: 40s
    networks:
      - arcadia

  # ═══════════════════════════════════════════
  # MOTORES PYTHON (FastAPI)
  # ═══════════════════════════════════════════
  fisco:
    build:
      context: .
      dockerfile: docker/fisco.Dockerfile
    restart: always
    ports:
      - "8002:8002"
    environment:
      FISCO_PORT: 8002
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
    networks:
      - arcadia

  contabil:
    build:
      context: .
      dockerfile: docker/contabil.Dockerfile
    restart: always
    ports:
      - "8003:8003"
    environment:
      CONTABIL_PORT: 8003
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
      interval: 30s
    networks:
      - arcadia

  bi:
    build:
      context: .
      dockerfile: docker/bi.Dockerfile
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8004:8004"
    environment:
      BI_PORT: 8004
      DATABASE_URL: postgresql://${PGUSER:-arcadia}:${PGPASSWORD}@postgres:5432/${PGDATABASE:-arcadia}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8004/health"]
      interval: 30s
    networks:
      - arcadia

  automation:
    build:
      context: .
      dockerfile: docker/automation.Dockerfile
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8005:8005"
    environment:
      AUTOMATION_PORT: 8005
      DATABASE_URL: postgresql://${PGUSER:-arcadia}:${PGPASSWORD}@postgres:5432/${PGDATABASE:-arcadia}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8005/health"]
      interval: 30s
    networks:
      - arcadia

  communication:
    build:
      context: .
      dockerfile: docker/communication.Dockerfile
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8006:8006"
    environment:
      COMMUNICATION_PORT: 8006
      DATABASE_URL: postgresql://${PGUSER:-arcadia}:${PGPASSWORD}@postgres:5432/${PGDATABASE:-arcadia}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8006/health"]
      interval: 30s
    networks:
      - arcadia

  # ═══════════════════════════════════════════
  # ARCÁDIA PLUS (Laravel/PHP)
  # ═══════════════════════════════════════════
  plus-app:
    build:
      context: ./plus
      dockerfile: Dockerfile
    restart: always
    depends_on:
      mysql:
        condition: service_healthy
    env_file:
      - ./plus/.env
    volumes:
      - ./plus:/var/www/html:cached
      - plus-vendor:/var/www/html/vendor
    networks:
      - arcadia

  plus-web:
    image: nginx:1.25-alpine
    restart: always
    depends_on:
      - plus-app
    ports:
      - "8080:80"
    volumes:
      - ./plus:/var/www/html:cached
      - ./plus/docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - arcadia

volumes:
  pgdata:
  mysqldata:
  redisdata:
  uploads:
  plus-vendor:

networks:
  arcadia:
    driver: bridge
```

---

## 6. Variáveis de Ambiente (.env para Coolify)

```env
# ══════════════════════════════════════
# POSTGRESQL (Principal)
# ══════════════════════════════════════
PGUSER=arcadia
PGPASSWORD=SuaSenhaSegura123!
PGDATABASE=arcadia
DATABASE_URL=postgresql://arcadia:SuaSenhaSegura123!@postgres:5432/arcadia

# ══════════════════════════════════════
# GATEWAY (Node.js)
# ══════════════════════════════════════
NODE_ENV=production
PORT=5000
SESSION_SECRET=sua-session-secret-aqui

# ══════════════════════════════════════
# INTELIGÊNCIA ARTIFICIAL
# ══════════════════════════════════════
OPENAI_API_KEY=sk-...

# ══════════════════════════════════════
# GITHUB
# ══════════════════════════════════════
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=jonaspachecoometas
GITHUB_REPO=arcadiasuite

# ══════════════════════════════════════
# ERPNEXT (opcional)
# ══════════════════════════════════════
ERPNEXT_URL=https://seu-erpnext.com
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=

# ══════════════════════════════════════
# MYSQL (Plus/Laravel)
# ══════════════════════════════════════
PLUS_DB_DATABASE=controlplus
PLUS_DB_USERNAME=controlplus
PLUS_DB_PASSWORD=SenhaMySQLSegura!
PLUS_MYSQL_ROOT_PASSWORD=RootSenha123!

# ══════════════════════════════════════
# REDIS
# ══════════════════════════════════════
REDIS_URL=redis://redis:6379
```

---

## 7. Dockerfiles dos Motores (a criar em `docker/`)

### `docker/fisco.Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install fastapi uvicorn pydantic cryptography lxml zeep signxml
# nfelib se disponível: RUN pip install nfelib
COPY server/python/fisco_service.py ./main.py
EXPOSE 8002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
```

### `docker/contabil.Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install fastapi uvicorn pydantic
COPY server/python/contabil_service.py ./main.py
EXPOSE 8003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
```

### `docker/bi.Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install fastapi uvicorn pydantic pandas numpy psycopg2-binary
COPY server/python/bi_engine.py ./main.py
EXPOSE 8004
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
```

### `docker/automation.Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install fastapi uvicorn pydantic psycopg2-binary apscheduler
COPY server/python/automation_engine.py ./main.py
EXPOSE 8005
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]
```

### `docker/communication.Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --production
COPY server/communication/ ./server/communication/
COPY shared/ ./shared/
COPY tsconfig.json ./
EXPOSE 8006
CMD ["npx", "tsx", "server/communication/engine.ts"]
```

---

## 8. Ordem de Deploy no Coolify

### Fase 1 — Infraestrutura (subir primeiro)
1. `arcadia-postgres` — Banco principal
2. `arcadia-mysql` — Banco do Plus
3. `arcadia-redis` — Cache e filas

### Fase 2 — Motores Independentes (podem subir em paralelo)
4. `arcadia-fisco` — Sem dependência de banco
5. `arcadia-contabil` — Sem dependência de banco
6. `arcadia-bi` — Depende do PostgreSQL
7. `arcadia-automation` — Depende do PostgreSQL
8. `arcadia-communication` — Depende do PostgreSQL

### Fase 3 — Aplicações Principais
9. `arcadia-gateway` — Depende de PostgreSQL + todos os motores
10. `arcadia-plus-app` + `arcadia-plus-web` — Depende do MySQL

### Fase 4 — Migrações (após tudo no ar)
```bash
# PostgreSQL (Drizzle)
docker exec arcadia-gateway npx drizzle-kit push

# MySQL (Laravel)
docker exec arcadia-plus-app php artisan migrate --force
docker exec arcadia-plus-app php artisan db:seed --force
```

---

## 9. Ajustes Necessários no Código

### 9.1 — Gateway: URLs dos motores precisam ser configuráveis

Atualmente o código usa `localhost:800X`. Para Docker, precisa usar nomes de serviço:

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `server/contabil/routes.ts` | proxy | `localhost:8003` | `process.env.CONTABIL_URL` |
| `server/fisco/routes.ts` | proxy | `localhost:8002` | `process.env.FISCO_URL` |
| `server/bi/proxy.ts` | proxy | `localhost:8004` | `process.env.BI_URL` |
| `server/python/launcher.ts` | spawn | hardcoded | Remover spawns no modo Docker |
| `server/plus/proxy.ts` | proxy | `localhost:8080` | `process.env.PLUS_URL` |
| `server/communication/proxy.ts` | proxy | `localhost:8006` | `process.env.COMMUNICATION_URL` |

### 9.2 — Desabilitar spawns de subprocessos em produção

O Gateway atualmente inicia os motores Python como subprocessos. No Docker cada motor roda em seu próprio container. Adicionar flag:

```typescript
// server/index.ts
if (process.env.DOCKER_MODE !== 'true') {
  // spawn python services
  startManagedServices();
}
```

### 9.3 — Conflito de portas

| Serviço | Porta atual | Conflito | Solução |
|---------|------------|----------|---------|
| People | 8004 | BI Engine | Mudar para 8007 |
| BI Analysis | 8003 | Contábil | Mesclar no BI Engine (8004) |

---

## 10. Checklist de Migração para Coolify

- [ ] Criar pasta `docker/` com Dockerfiles dos motores
- [ ] Criar `docker-compose.coolify.yml` (baseado na seção 5)
- [ ] Criar `.env.production` com todas as variáveis
- [ ] Ajustar proxies do Gateway para usar variáveis de ambiente
- [ ] Adicionar flag `DOCKER_MODE=true` para desabilitar spawns
- [ ] Resolver conflitos de porta (People → 8007)
- [ ] Testar build de cada Dockerfile isoladamente
- [ ] Configurar Coolify com Docker Compose
- [ ] Rodar migrações PostgreSQL (`drizzle-kit push`)
- [ ] Rodar migrações MySQL (`php artisan migrate`)
- [ ] Configurar domínio e TLS no Coolify/Traefik
- [ ] Configurar volumes persistentes (pgdata, mysqldata, uploads)
- [ ] Testar SSO do Plus via proxy
- [ ] Verificar WebSocket (Socket.IO) funciona via Traefik
- [ ] Configurar healthchecks em todos os serviços

---

## 11. Resumo Visual Rápido

| # | Container | Porta | Tech | Banco | Prioridade |
|---|-----------|-------|------|-------|-----------|
| 1 | postgres | 5432 | PostgreSQL 16 | - | Essencial |
| 2 | mysql | 3306 | MySQL 8.0 | - | Para Plus |
| 3 | redis | 6379 | Redis 7 | - | Recomendado |
| 4 | gateway | 5000 | Node.js 20 | PG | Essencial |
| 5 | fisco | 8002 | Python 3.11 | - | Módulo |
| 6 | contabil | 8003 | Python 3.11 | - | Módulo |
| 7 | bi | 8004 | Python 3.11 | PG | Módulo |
| 8 | automation | 8005 | Python 3.11 | PG | Módulo |
| 9 | communication | 8006 | Node.js 20 | PG | Módulo |
| 10 | plus-app | 9000 | PHP 8.2 FPM | MySQL | Módulo |
| 11 | plus-web | 8080 | Nginx 1.25 | - | Módulo |
| 12 | people | 8007 | Python 3.11 | - | Futuro |

**Total: 12 containers (3 bancos + 1 gateway + 8 motores)**
