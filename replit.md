# Arcádia Suite - Office Estratégico Empresarial

## Overview

Arcádia Suite is the **Strategic Office for the Modern Enterprise**, a platform designed to centralize productivity, intelligence, decision-making, and governance by orchestrating ERPs, people, and data. Its core principle is the absolute separation between decision and execution. The project envisions a future where Arcádia thinks, governs, and guides, while ERPs execute, record, and obey, aiming to revolutionize business automation through AI and intelligent agents.

## User Preferences

- Preferred communication style: Simple, everyday language (Portuguese/Brazilian)
- UI Style: Modern, WhatsApp Web-like interfaces
- Focus: Business automation and AI-powered features

## System Architecture

The Arcádia Suite employs a 4-layer hybrid architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│   React 18 + TypeScript + Tailwind + shadcn/ui                  │
│   Browser-like interface with tabs and omnibox                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ORCHESTRATION LAYER                            │
│   Express.js + Socket.IO + Manus Agent                          │
│   Port 5000 (API + WebSocket)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE LAYER                             │
│   FastAPI (Port 8001) + OpenAI API                              │
│   Scientist, Embeddings, RPA, Workflows                         │
│   FastAPI Fisco (Port 8002) - NF-e/NFC-e via nfelib             │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│   PostgreSQL + Knowledge Graph + ChromaDB                       │
│   Drizzle ORM + Session Store                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Architectural Components & Features:**

*   **Arcádia Suite's 6-Layer Architecture:** Apps (Core, Business, Segment), Structural Modules (Financial, Accounting, Fiscal, HR), Operational Execution (Retail, Services, ERPs), Intelligence (Manus, Knowledge Graph, Automations), Platform (Central API, Hub API, MCP/A2A, IDE, Data Science), and Consulting (Process Compass, Production, Support).
*   **Unified Communication Center:** Integrates a WhatsApp Attendance System (multi-session, real-time sync, ticket management, AI auto-replies) and an Internal Chat System, feeding all communications into the Knowledge Graph.
*   **Learning System & Knowledge Graph:** The system learns from all interactions, storing Q&A and patterns. A semantic Knowledge Graph connects all business information via nodes and edges for insights.
*   **Manus Autonomous Agent:** Executes multi-step tasks using a thought-action-observation loop with various tools (web search, knowledge/ERP query, calculations, messaging, reporting, scheduling).
*   **Scientist Module:** An AI auto-programming component for data analysis, code generation (Python/SQL) in a sandbox, and solution storage.
*   **Arcádia Fisco (Fiscal Engine):** Centralized compliance motor for Brazilian tax regulations (NCMs, CFOPs, CESTs, tax groups, digital certificates), integrating with SEFAZ webservices for NF-e/NFC-e issuance.
*   **Arcádia ERP (Gestão Empresarial):** A complete ERP module integrating ERPNext with Arcádia's intelligence, accessible via `/erp`. Includes dashboards, unified people module, inventory, sales, purchases, financial management, AI-driven reports, and integration with Arcádia Fisco and Manus AI.
*   **Arcádia Plus (ERP Laravel):** A standalone Laravel/PHP ERP, accessible via `/plus`, with extensive features including NF-e/NFC-e/CT-e/MDF-e, POS, digital menu, service orders, financial management, stock traceability, CRM, and integrations with e-commerce platforms. Uses an isolated PostgreSQL schema.
*   **Business Intelligence (Arcádia Insights):** Provides data visualization and analysis, powered by the BI Engine (FastAPI, port 8004) with SQL query execution, chart-data generation, micro-BI API, caching layer, and Pandas analysis.
*   **Automation Engine:** FastAPI service (port 8005) providing cron scheduler, event bus, and workflow executor for the Automations module.
*   **Communication Engine (Motor de Comunicação):** Node/TypeScript service (port 8006) unifying XOS CRM, Arcádia CRM, WhatsApp, and Email into a single managed engine. Provides unified API for contacts, threads, messages, channels, queues, quick messages, stats, and agent context (360° view). Emits events to `comm_events` table consumed by Knowledge Graph and AI agents. Proxy at `/api/comm/*`. Canonical tables: `comm_contacts`, `comm_threads`, `comm_messages`, `comm_channels`, `comm_queues`, `comm_quick_messages`, `comm_events`. Backward-compatible via reference fields (`xos_contact_id`, `crm_client_id`, etc.).
*   **Casa de Máquinas (Engine Room):** Unified control panel at `/engine-room` showing real-time status of all engines (Plus 8080, Contábil 8003, Fiscal 8002, BI 8004, Automation 8005, Communication 8006) and XOS agents. API at `/api/engine-room/*`.
*   **IDE:** Integrated development environment with Monaco Editor and Xterm.js.
*   **Multi-Tenant Architecture:** Supports a hierarchical structure for Master, Partners, and Clients.
*   **Agentic Interoperability Protocols:** Implements MCP (Model Context Protocol) for tool exposure (`/api/mcp/v1/`), A2A (Agent to Agent Protocol) for bidirectional communication (`/api/a2a/v1/`), and planned AP2 (Agent Payment Protocol) and UCP (Unified Commerce Protocol). Authentication uses `X-API-Key`.
*   **Autonomous Development:** Integrated with GitHub for automatic commits, branch creation, pull requests, and repository analysis using a `ToolManager` system.
*   **XOS Governance Layer:** Policy evaluation engine with fail-closed security, immutable audit trail, tool registry (auto-synced from ToolManager), skill registry with usage tracking, and contract registry. Integrated into BaseBlackboardAgent and ToolManager for automatic policy checks. API at `/api/governance/*`. 5 security policies: critical file protection, read permissions, destructive command blocking, human approval for production deploys, automatic staging with validation score threshold. Phase 3 adds PostgreSQL Job Queue (xos_job_queue table with priority, retry, dead-letter), Agent Metrics (xos_agent_metrics), 6th Researcher agent, and a visual Governance Dashboard at `/xos/governance` with real-time stats, audit trail, policies, tools, skills, jobs, and agent monitoring. Phase 4 adds Autonomous Pipeline Orchestrator (PipelineOrchestrator.ts) that chains all 6 agents: Portuguese prompt → Architect (design) → Generator (codegen) → Validator (typecheck) → Executor (staging) → Evolution (learn). Staging review system (xos_staging_changes + xos_dev_pipelines tables) with explicit user approval before applying code. SSE streaming for real-time progress. Pipeline UI at `/xos/pipeline` with prompt submission, live timeline, and staged code review/approve/reject. API at `/api/xos/pipeline`.

## External Dependencies

*   **OpenAI API:** For AI capabilities, including auto-replies (`gpt-4o-mini`) and the Scientist Module.
*   **Baileys Library:** For WhatsApp integration and multi-session management.
*   **nfelib (Python):** For Brazilian fiscal document (NF-e/NFC-e) issuance, validation, and SEFAZ communication.
*   **PostgreSQL:** Primary database, managed with Drizzle ORM.
*   **ChromaDB:** For vector embeddings, supporting the Knowledge Graph and AI components.
*   **Socket.IO:** For real-time communication (WhatsApp sync, internal chat).
*   **Monaco Editor:** For code editing within the IDE.
*   **Xterm.js:** For terminal emulation within the IDE.
*   **ERPNext API:** For integration with ERPNext operations (customers, products, sales orders, financial data).