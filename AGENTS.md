# 🤖 Referência Rápida para Agentes - Arcádia Suite

> Guia de referência para desenvolvimento autônomo no projeto Arcádia Suite

---

## 📁 Documentação Técnica por Componente

### Navegação (Navbar)
- **Especificação Completa:** [`docs/SPEC_NAVBAR.md`](docs/SPEC_NAVBAR.md)
- **Arquivo Fonte:** `client/src/components/Browser/BrowserFrame.tsx`
- **Hook de Tracking:** `client/src/hooks/use-navigation-tracking.ts`
- **Error Boundary:** `client/src/components/ErrorBoundary.tsx` (tratamento de erros lazy loading)

### Banco de Dados (Schema)
- **Arquivo Principal:** `shared/schema.ts` (7.000+ linhas)
- **Tabelas Principais:**
  - `users`, `profiles`, `roles` - Autenticação e RBAC
  - `tenants`, `tenantUsers` - Multi-tenancy
  - `workspacePages`, `pageBlocks` - Produtividade (estilo Notion)
  - `conversations`, `messages` - Chat/Agente
  - `whatsappSessions`, `whatsappMessages` - WhatsApp
  - `crmPartners`, `crmContracts` - CRM
  - `fiscalNcms`, `fiscalGruposTributacao` - Fiscal
  - `retailStores`, `posSales`, `mobileDevices` - Retail
  - `manusRuns`, `manusSteps` - Agente Manus
  - `biDatasets`, `biCharts`, `biDashboards` - BI

### Backend (API Routes)
- **Registro de Rotas:** `server/routes.ts`
- **Autenticação:** `server/auth.ts`
- **Agente Manus:** `server/manus/service.ts` + `server/manus/tools.ts`
- **WhatsApp:** `server/whatsapp/routes.ts` + `server/whatsapp/service.ts`
- **CRM:** `server/crm/routes.ts`
- **Fiscal:** `server/fisco/routes.ts`
- **Retail:** `server/retail/routes.ts`
- **Blackboard (Agentes):** `server/blackboard/routes.ts`

### Frontend (Páginas)
- **Router:** `client/src/App.tsx` (inclui ErrorBoundary + Suspense)
- **Cockpit (Home):** `client/src/pages/Cockpit.tsx`
- **Agent:** `client/src/pages/Agent.tsx`
- **DevCenter:** `client/src/pages/DevCenter.tsx`
- **Crm:** `client/src/pages/Crm.tsx`
- **Fisco:** `client/src/pages/Fisco.tsx`
- **Retail:** `client/src/pages/ArcadiaRetail.tsx`
- **WhatsApp:** `client/src/pages/WhatsApp.tsx`
- **ErrorBoundary:** `client/src/components/ErrorBoundary.tsx`

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                        │
│   React 18 + TypeScript + Tailwind CSS + shadcn/ui              │
│   66 páginas / Interface tipo browser com abas                  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA DE ORQUESTRAÇÃO                         │
│   Express.js + Socket.IO + Manus Agent                          │
│   API REST + WebSocket em tempo real                            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA DE INTELIGÊNCIA                         │
│   FastAPI (Contábil 8003, BI 8004, Automação 8005)              │
│   OpenAI GPT-4o + LiteLLM Gateway + Ollama                      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA DE DADOS                             │
│   PostgreSQL 16 + Drizzle ORM + pgvector                        │
│   Session Store + Multi-tenant                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Express.js, Socket.IO, Passport.js |
| **Banco** | PostgreSQL 16, Drizzle ORM, pgvector |
| **Python** | FastAPI (microserviços nas portas 8001-8005) |
| **IA** | OpenAI GPT-4o, LiteLLM, Ollama |
| **Deploy** | Docker Compose, Coolify, PM2 |

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                    # Inicia servidor de desenvolvimento
npm run dev:client            # Apenas frontend (porta 5000)

# Banco de dados
npm run db:push               # Aplica migrations Drizzle
npm run db:apply-rls          # Aplica políticas RLS

# Build
npm run build                 # Build para produção
npm run start                 # Inicia em produção

# Docker
docker compose up -d          # Sobe todos os serviços
docker compose --profile ai up  # Sobe com IA (Ollama + LiteLLM)
```

---

## 📋 Convenções de Código

### Nomenclatura
- **Componentes:** PascalCase (ex: `BrowserFrame.tsx`)
- **Hooks:** camelCase com prefixo `use` (ex: `useAuth.tsx`)
- **Utilitários:** camelCase (ex: `navigation-tracking.ts`)
- **Rotas API:** kebab-case (ex: `/api/whatsapp/connect`)

### Estrutura de Pastas
```
client/src/
  components/     # Componentes reutilizáveis
  pages/          # Páginas da aplicação
  hooks/          # Custom hooks
  lib/            # Utilitários e configurações
  
server/
  [modulo]/       # Um diretório por módulo
    routes.ts     # Rotas da API
    service.ts    # Lógica de negócio
    storage.ts    # Acesso a dados
```

---

## 🧪 Test IDs

Sempre adicione `data-testid` em elementos interativos:

```tsx
<button 
  data-testid="button-submit"
  onClick={handleSubmit}
>
  Enviar
</button>
```

---

## 📚 Documentação Adicional

- **Documentação Técnica Completa:** [`DOCUMENTATION.md`](DOCUMENTATION.md)
- **Mapa do Sistema:** [`MAPA_SISTEMA_ARCADIA.md`](MAPA_SISTEMA_ARCADIA.md)
- **Contexto para Claude:** [`CLAUDE.md`](CLAUDE.md)
- **README:** [`README.md`](README.md)

---

## 🆘 Precisa de Ajuda?

1. Consulte a especificação técnica específica em `docs/`
2. Verifique exemplos similares no código existente
3. Siga os padrões já estabelecidos no projeto

---

*Última atualização: 2026-04-08*

---

## 🐛 Tratamento de Erros - Lazy Loading

### Problema Resolvido: Loading Infinito na Navegação

**Sintoma:** Ao clicar em itens da navbar, se a página tivesse erro (import quebrado, sintaxe inválida), o loading ficava infinito.

**Causa:** `React.lazy()` falha silenciosamente e `Suspense` não tem como capturar o erro.

**Solução:**

1. **ErrorBoundary** (`client/src/components/ErrorBoundary.tsx`):
   - Captura erros de renderização, incluindo lazy load
   - Mostra UI de fallback com botão de retry

2. **LoadingFallback com Timeout** (`client/src/App.tsx`):
   - 3s: mensagem "Isso está demorando..."
   - 10s: alerta amarelo com botão recarregar

3. **Integração:**
```tsx
<ErrorBoundary>
  <Suspense fallback={<LoadingFallback />}>
    <Switch>{/* rotas */}</Switch>
  </Suspense>
</ErrorBoundary>
```
