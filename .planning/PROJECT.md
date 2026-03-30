# Arcádia Agentic Suite

## Vision

Evoluir o Arcádia Suite de ERP tradicional para um **Sistema Agêntico Orientado a Objetos**, onde Skills são objetos reutilizáveis, Agentes instanciam Skills para objetivos específicos, Automações são composições orquestradas, e o Dev Center é a fábrica de agentes.

## Stack

- **Backend:** Node.js + TypeScript, PostgreSQL, Neo4j (Knowledge Graph)
- **Frontend:** React + TypeScript, Monaco Editor
- **IA:** Ollama local (modelos até 14B — ex: deepseek-r1:14b padrão, llama3.1:8b rápido)
- **BI:** Apache Superset (externo, integrado via bridge)
- **Módulos embutidos:** MiroFlow (`server/modules/miroflow/`), OpenClaw (`server/modules/openclaw/`)

## Princípios

- Skills são o primitivo de execução universal
- Soberania tecnológica — eliminar dependências externas para lógica de negócio
- Multi-tenant: System → Tenant → Company → User
- Auditoria imutável em todas as execuções
- Backend-first em cada fase — API definida antes do frontend

## Non-negotiables

- Confirmar com João antes de executar qualquer migração de dados ou alteração de sistemas ativos
- Nunca sobrescrever configurações existentes do Superset (RLS já configurado em produção)
- Branch de deploy: `Servidor`
