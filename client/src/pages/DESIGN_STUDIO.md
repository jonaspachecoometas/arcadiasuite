# Design Studio — Contexto para próximo agente

## O que é

Design Studio é a entrada na sidebar de `/development` (DevelopmentModule.tsx) que abre o `DevCenter.tsx` como painel interno.

## Estado atual (27/03/2026)

O ícone e a navegação estão implementados. O conteúdo renderizado é o `DevCenter.tsx` existente, que já possui 4 abas funcionais:

| Aba | O que faz |
|-----|-----------|
| **Design** | Editor de definições de agente (modos: Markdown, TypeScript, Visual-JSON) |
| **Assemble** | Agentes draft → Blackboard gera o código → polling de status |
| **Deploy** | Agentes prontos → deploy, re-montar |
| **Galeria** | Grid de agentes implantados, busca, executar, fork |

## O que FALTA (João tem ideias — perguntar antes de implementar)

- **Visual canvas drag-and-drop** para o modo "Visual" do editor (hoje é um Textarea com JSON manual)
- **Suporte a UML** no editor de definições
- O usuário João mencionou ter ideias específicas para o Design Studio — **confirmar com ele antes de implementar qualquer coisa nova aqui**

## Arquivos relacionados

- `client/src/pages/DevCenter.tsx` — componente principal renderizado pelo Design Studio
- `client/src/pages/DevelopmentModule.tsx` — sidebar onde o item foi adicionado (id: "designstudio", ícone: PenTool)
- `server/routes/agent-defs.ts` (ou similar) — API de definições de agentes usada pelo DevCenter
- `migrations/phase6_agent_defs.sql` — schema das tabelas de agent definitions
