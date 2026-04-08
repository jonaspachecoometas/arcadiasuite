# Especificação Técnica - Navbar do Arcádia Suite

> **Versão:** 1.0  
> **Data:** 2026-04-08  
> **Arquivo Fonte:** `client/src/components/Browser/BrowserFrame.tsx`  
> **Status:** Implementado e em produção

---

## 1. Visão Geral

A navbar do Arcádia Suite é uma barra de navegação compacta, horizontal e fixa no topo da tela. Ela implementa um padrão de "navegação por bookmarks" onde cada item representa um módulo principal do sistema.

### 1.1 Objetivos
- Acesso rápido aos módulos principais
- Navegação intuitiva estilo "browser"
- Rastreamento de uso para analytics
- Suporte a múltiplos perfis de usuário

### 1.2 Princípios de Design
- **Minimalista:** Apenas ícone + texto curto
- **Escalável:** Scroll horizontal permite muitos itens
- **Responsiva:** Adapta-se a diferentes telas
- **Consistente:** Cores e ícones padronizados

---

## 2. Estrutura do Componente

```
BrowserFrame (Container)
└── CompactNavigationBar (Navbar principal)
    ├── Área de Bookmarks (scroll horizontal)
    │   └── BookmarkItem[] (itens de navegação)
    └── Área do Usuário (fixa à direita)
        └── UserDropdown (menu do usuário)
```

### 2.1 Hierarquia de Componentes

```tsx
// BrowserFrame.tsx
interface BrowserFrameProps {
  children: React.ReactNode;
}

function CompactNavigationBar() {
  // Hook de navegação
  const [location, setLocation] = useLocation(); // wouter
  const { user, logoutMutation } = useAuth();
  const { trackPageView } = useNavigationTracking();
  
  // Handler de navegação
  const navigateTo = (path: string, pageName: string) => {
    trackPageView(pageName, path);
    setLocation(path);
  };
  
  return (
    <div className="h-10 bg-background border-b...">
      {/* Bookmarks */}
      {/* User Menu */}
    </div>
  );
}

export function BrowserFrame({ children }: BrowserFrameProps) {
  return (
    <div className="flex flex-col h-screen w-screen...">
      <CompactNavigationBar />
      <div className="flex-1...">{children}</div>
    </div>
  );
}
```

---

## 3. Especificação Visual

### 3.1 Dimensões e Layout

| Propriedade | Valor | Tailwind |
|-------------|-------|----------|
| Altura | 40px | `h-10` |
| Padding horizontal | 12px | `px-3` |
| Gap entre itens | 8px | `gap-2` |
| Tamanho do ícone | 16x16px | `w-4 h-4` |
| Tamanho do ícone interno | 10x10px | `w-2.5 h-2.5` |
| Padding do bookmark | 6px 8px | `px-2 py-1.5` |
| Border radius | 4px | `rounded` |

### 3.2 Cores e Estilos

```
Fundo: bg-background (varia com tema claro/escuro)
Borda inferior: border-border
Texto: text-muted-foreground
Hover: hover:bg-muted
Sombra: shadow-xs
```

### 3.3 Estados dos Bookmarks

| Estado | Estilo |
|--------|--------|
| **Default** | `text-muted-foreground` |
| **Hover** | `hover:bg-muted` + cursor pointer |
| **Ativo** | Não há estado visual de "ativo" (intencional) |

---

## 4. Itens de Navegação (Bookmarks)

### 4.1 Lista Completa de Itens

| Ordem | Nome | Rota | Ícone | Cor do Gradient | Visibilidade |
|-------|------|------|-------|-----------------|--------------|
| 1 | Administração | `/admin` | Settings | slate-700 → slate-900 | Apenas admin |
| 2 | Início | `/` | Arcádia Icon | - (imagem) | Todos |
| 3 | Agent | `/agent` | Bot | primary → blue-600 | Todos |
| 4 | Inbox | `/xos/inbox` | MessageCircle | #00a884 → #25D366 | Todos |
| 5 | Automações | `/automations` | Zap | #c89b3c → #d4a94a | Todos |
| 6 | Insights | `/insights` | LayoutDashboard | #1f334d → #2d4a6f | Todos |
| 7 | Compass | `/compass` | Compass | #c89b3c → #1f334d | Todos |
| 8 | Produção | `/production` | Users | indigo-500 → indigo-700 | Todos |
| 9 | Suporte | `/support` | Ticket | rose-500 → rose-700 | Todos |
| 10 | ERP | `/erp` | Package | blue-600 → blue-800 | Todos |
| 11 | Retail | `/retail` | Store | cyan-500 → blue-600 | Todos |
| 12 | Plus | `/plus` | Layers | purple-500 → purple-700 | Todos |
| 13 | Fisco | `/fisco` | Receipt | emerald-600 → emerald-800 | Todos |
| 14 | Engenharia | `/engineering` | Compass | teal-500 → green-700 | Todos |

### 4.2 Estrutura de um Bookmark

```tsx
<div 
  className="flex items-center gap-1 hover:bg-muted px-2 py-1.5 rounded cursor-pointer transition-colors flex-shrink-0"
  onClick={() => navigateTo("/rota", "Nome")}
  data-testid="bookmark-nome"
>
  {/* Container do ícone com gradiente */}
  <div className="w-4 h-4 bg-gradient-to-br from-[COR1] to-[COR2] rounded-sm flex items-center justify-center">
    <Icon className="w-2.5 h-2.5 text-white" />
  </div>
  {/* Texto (oculto em mobile) */}
  <span className="hidden md:inline">Nome</span>
</div>
```

---

## 5. Menu do Usuário (Dropdown)

### 5.1 Estrutura

```
[Avatar + Nome] ▼
        │
        ├── Informações do Usuário
        │   ├── Nome completo
        │   ├── @username
        │   └── Badge "Administrador" (se aplicável)
        │
        ├── Meu Perfil
        │
        ├── Plataforma (apenas admin)
        │   └── Centro de Desenvolvimento
        │
        └── Sair (texto vermelho)
```

### 5.2 Componentes

- **Trigger:** Botão com avatar circular + nome
- **Avatar:** Inicial do nome em círculo colorido (5x5)
- **Dropdown:** `DropdownMenu` do shadcn/ui
- **Largura:** 224px (`w-56`)

---

## 6. Comportamento e Interações

### 6.1 Fluxo de Navegação

```
┌─────────────────┐
│  Usuário clica  │
│   em bookmark   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  trackPageView  │  ← Registra no backend via POST /api/learning/navigation
│  (pageName, path)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   setLocation   │  ← wouter atualiza URL
│     (path)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React.lazy()   │  ← Code splitting carrega chunk
│   import()      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   <Suspense>    │  ← Mostra LoadingFallback
│    fallback     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Página carrega │  ← Componente renderizado
│   e renderiza   │
└─────────────────┘
```

### 6.2 Rastreamento (Analytics)

```typescript
// use-navigation-tracking.ts
const trackPageView = (pageName: string, route?: string) => {
  track({
    module: pageName,           // Ex: "Agent", "Fisco"
    action: "page_view",
    metadata: { 
      route,                    // Ex: "/agent", "/fisco"
      timestamp: "2026-04-08T15:30:00Z"
    },
  });
};
```

**Debounce:** 2000ms para evitar spam de eventos

### 6.3 Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| **Mobile** (< 768px) | Texto dos bookmarks oculto (`hidden md:inline`), apenas ícones |
| **Desktop** (≥ 768px) | Texto visível ao lado do ícone |

### 6.4 Scroll Horizontal

- A área de bookmarks tem `overflow-x-auto`
- Scrollbar oculta (`scrollbar-hide`)
- Itens não quebram linha (`flex-shrink-0`)

---

## 7. Dependências

### 7.1 Bibliotecas

```json
{
  "wouter": "^3.3.5",           // Router
  "lucide-react": "^0.545.0",   // Ícones
  "@radix-ui/react-dropdown-menu": "^2.1.16"  // Dropdown
}
```

### 7.2 Hooks Customizados

| Hook | Arquivo | Propósito |
|------|---------|-----------|
| `useLocation` | `wouter` | Navegação de rotas |
| `useAuth` | `@/hooks/use-auth` | Dados do usuário e logout |
| `useNavigationTracking` | `@/hooks/use-navigation-tracking` | Analytics |

### 7.3 Componentes UI

- `Button` (shadcn/ui)
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, etc. (shadcn/ui)

---

## 8. Test IDs (data-testid)

Usados para testes automatizados:

```
bookmark-admin
bookmark-home
bookmark-agent
bookmark-xos-inbox
bookmark-automations
bookmark-insights
bookmark-compass
bookmark-production
bookmark-support
bookmark-erp
bookmark-retail
bookmark-plus
bookmark-fisco
bookmark-engineering
button-user-menu
button-logout
menu-development
```

---

## 9. Como Modificar

### 9.1 Adicionar Novo Bookmark

```tsx
// Em CompactNavigationBar, adicionar antes do </div> da área de bookmarks:

<div 
  className="flex items-center gap-1 hover:bg-muted px-2 py-1.5 rounded cursor-pointer transition-colors flex-shrink-0"
  onClick={() => navigateTo("/nova-rota", "Nome")}
  data-testid="bookmark-novo"
>
  <div className="w-4 h-4 bg-gradient-to-br from-[COR1] to-[COR2] rounded-sm flex items-center justify-center">
    <NovoIcon className="w-2.5 h-2.5 text-white" />
  </div>
  <span className="hidden md:inline">Novo</span>
</div>
```

### 9.2 Alterar Ordem

Reorganizar os elementos `<div>` na ordem desejada dentro da área de bookmarks.

### 9.3 Condicional por Permissão

```tsx
{user?.role === "admin" && (
  <div ...>...</div>
)}

// Ou por módulo permitido:
{(user as any)?.allowedModules?.includes("modulo") && (
  <div ...>...</div>
)}
```

---

## 10. Integração com Sistema

### 10.1 Uso nas Páginas

Todas as páginas que usam a navbar devem ser envolvidas por `BrowserFrame`:

```tsx
// Exemplo: client/src/pages/Agent.tsx
import { BrowserFrame } from "@/components/Browser/BrowserFrame";

export default function Agent() {
  return (
    <BrowserFrame>
      <div className="h-full...">
        {/* Conteúdo da página */}
      </div>
    </BrowserFrame>
  );
}
```

### 10.2 Páginas que NÃO usam BrowserFrame

- `AuthPage` (tela de login)
- `NotFound` (página 404)

---

## 11. Considerações Técnicas

### 11.1 Performance
- Code splitting via `React.lazy()` em todas as páginas
- Suspense com fallback de loading
- Debounce no rastreamento (2s)

### 11.2 Acessibilidade
- `cursor-pointer` em todos os bookmarks
- Estrutura semântica do dropdown
- Contraste adequado nos ícones (branco sobre gradiente)

### 11.3 Limitações Conhecidas
- Não há indicador visual de "página ativa" (design intencional)
- Scroll horizontal pode esconder itens em telas muito pequenas
- Não suporta drag-and-drop para reordenar

### 11.4 Tratamento de Erros (Resolvido)

**Problema:** Se uma página carregada via `React.lazy()` tivesse erro (import quebrado, sintaxe inválida), o `Suspense` ficava preso no estado de loading infinito.

**Solução Implementada:**

1. **ErrorBoundary** (`client/src/components/ErrorBoundary.tsx`):
   - Captura erros em componentes filhos, incluindo falhas no lazy loading
   - Exibe UI de fallback com detalhes do erro
   - Botão "Tentar Novamente" para recarregar

2. **LoadingFallback Aprimorado** (`client/src/App.tsx`):
   - Após 3s: mostra mensagem "Isso está demorando mais que o esperado..."
   - Após 10s: mostra alerta amarelo com botão de recarregar

3. **Integração no Router**:
```tsx
function Router() {
  return (
    <ErrorBoundary>           {/* ← Captura erros */}
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <ProtectedRoute path="/" component={Cockpit} />
          {/* ... outras rotas ... */}
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Fluxo de Erro:**
```
Usuário clica → lazy() falha → Suspense não resolve → ErrorBoundary captura
                                    ↓
                            LoadingFallback mostra
                            aviso após 3s/10s
                                    ↓
                            ErrorBoundary renderiza
                            UI de erro com retry
```

---

## 12. Diagrama de Sequência

```
┌────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ Usuário│     │   Navbar    │     │  wouter  │     │  React  │     │ Backend  │
└───┬────┘     └──────┬──────┘     └────┬─────┘     └────┬────┘     └────┬─────┘
    │                 │                 │                │               │
    │──clica─────────▶│                 │                │               │
    │                 │                 │                │               │
    │                 │──trackPageView────────────────────│──────────────▶│
    │                 │                 │                │               │
    │                 │──setLocation───▶│                │               │
    │                 │                 │                │               │
    │                 │                 │──atualiza URL──│               │
    │                 │                 │                │               │
    │                 │                 │◀─URL changed───│               │
    │                 │                 │                │               │
    │                 │                 │──lazy import──▶│               │
    │                 │                 │                │               │
    │                 │◀────────────────│──chunk loaded──│               │
    │                 │                 │                │               │
    │                 │──renderiza nova página────────────▶│               │
    │                 │                 │                │               │
    │◀────────────────│                 │                │               │
    │                 │                 │                │               │
```

---

## 13. Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2026-04-08 | Especificação inicial criada |
| 1.1 | 2026-04-08 | Adicionado tratamento de erros (ErrorBoundary + LoadingFallback com timeout) |

---

## 14. Referências

- **Arquivo Fonte:** `client/src/components/Browser/BrowserFrame.tsx`
- **Hook de Tracking:** `client/src/hooks/use-navigation-tracking.ts`
- **Rotas:** `client/src/App.tsx`
- **Autenticação:** `client/src/hooks/use-auth.tsx`
- **UI Components:** `client/src/components/ui/`

---

**Nota para Agentes:**
> Ao modificar a navbar, mantenha a consistência visual com os bookmarks existentes. Sempre adicione `data-testid` para testes e atualize esta especificação se houver mudanças significativas na estrutura ou comportamento.
