# State

## Current Phase: 6 — Dev Center Completo

## Completed
- Phase 1: submodules, tabelas, Neo4j, ReferenceParser
- Phase 2: SkillEngine, API REST, Monaco Editor, /skills, autocomplete, Marketplace, versionamento Git-like
- Phase 3: miroflow_service.py, bridge TS + KG logging, MiroFlowControl.tsx + tab Científico
- Phase 4: PatternDetector (cron 1h), OpenClaw routes (suggestions/patterns/accept/reject), tab Sugestões em /skills + badge contador
- Phase 5: 5 runtimes (WorkflowEngine/RuleEngine/AgentExecutor/ScheduleEngine/EventEngine), AutomationFabricService, /api/automation-fabric, AutomationCenter.tsx em /automations-center
- Phase 6: arcadia_agent_defs (schema+migration+API CRUD+assemble/deploy/run/fork), 4 tabs no DevCenter (Design/Montar/Deploy/Galeria)

## In Progress
- (nenhum — Phase 6 concluída, iniciar Phase 7)

## Roadmap Evolution
- Phase 7 added: Skill Fabric Expandido (compiladores, sandbox, 3 editor modes, validation pipeline)

## Notes
- Superset em produção com RLS configurado — não alterar sem confirmação
- Branch de deploy: `Servidor`
- Modelos Ollama precisam ser baixados: deepseek-r1:14b, llama3.1:8b (máximo 14B)
