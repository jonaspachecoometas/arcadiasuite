# MiroFlow /analyze Endpoint

## Como funciona

O botão "Analisar" no BiWorkspace (tab Científico) chama `POST /api/miroflow/analyze`.

O handler vive em `engine-proxy.ts` e chama diretamente o Ollama com o model `deepseek-r1:14b` (fallback: `llama3.2:3b`).

## Fluxo

```
BiWorkspace → POST /api/miroflow/analyze
  → engine-proxy.ts (Node, host)
    → ollama-ia1upsekrad96at5hq97e4qa:11434/api/chat
      → deepseek-r1:14b
    ← { result, model, execution_id, duration_ms }
  ← resposta ao frontend
```

## Agentes disponíveis

| Agent | System prompt |
|-------|--------------|
| `statistician` | Análise estatística e descritiva |
| `fiscal_auditor` | Compliance tributário brasileiro |
| `researcher` | Correlações e inteligência de negócios |

## Infraestrutura

- O container `ollama-ia1upsekrad96at5hq97e4qa` precisa estar na rede `arcadia-prod_arcadia-internal`.
- Comando para reconectar se necessário:
  ```bash
  docker network connect arcadia-prod_arcadia-internal ollama-ia1upsekrad96at5hq97e4qa
  ```
- Tempo médio de resposta: ~2-3 min (deepseek-r1:14b).

## Variável de ambiente

`OLLAMA_BASE_URL` sobrescreve o hostname padrão do Ollama.
