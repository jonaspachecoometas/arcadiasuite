---
⚠️ **AVISO: DOCUMENTAÇÃO HISTÓRICA**

Este documento foi criado em **Março/2026** como planejamento estratégico.
Pode conter informações desatualizadas em relação ao sistema atual.

Para documentação técnica atualizada, consulte:
- \_SPEC_NAVBAR.md\_ (componentes UI)
- \_KERNEL_SPEC.md\_ (arquitetura do Kernel)
- Código-fonte em \_server/modules/\_

---

# Agente: Monitor de Skills

## Objetivo
Verificar as skills mais executadas nos últimos 7 dias e gerar um resumo com recomendações.

## Passos

1. **Consultar execuções recentes**
   - Buscar em `/api/skills` todas as skills ativas do tenant
   - Para cada skill, buscar `/api/skills/:id/executions?limit=50`
   - Filtrar execuções dos últimos 7 dias

2. **Analisar padrões**
   - Contar total de execuções por skill
   - Identificar taxa de sucesso (status = "success" / total)
   - Destacar skills com taxa de falha > 20%

3. **Gerar relatório**
   - Listar top 5 skills mais executadas
   - Alertar skills com problemas
   - Sugerir skills candidatas a automação (executadas 3+ vezes por dia)

## Saída esperada

```
## Relatório de Skills — últimos 7 dias

### Top 5 mais usadas
1. [nome] — X execuções (Y% sucesso)
...

### Atenção
- [skill] com taxa de falha de Z%

### Candidatas ao OpenClaw
- [skill] — média de N exec/dia
```

## Parâmetros
- `tenant_id` — filtro de tenant (opcional)
- `dias` — janela de análise (padrão: 7)
