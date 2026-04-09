# Integração de IA — Ollama no Servidor

Guia para conectar o Arcádia Suite à IA local em produção.

---

## Visão geral do fluxo

```
Arcádia Suite (Manus, Agents, Embeddings)
        │
        │  http://litellm:4000/v1
        ▼
   LiteLLM (porta 4000) — gateway único
        │
        ├──► Ollama  (modelos open source locais) [TIER 1 — padrão]
        └──► OpenAI/Anthropic/Groq (opt-in)       [TIER 2 — externo]
```

Nenhum serviço do Arcádia chama Ollama diretamente.
Tudo passa pelo LiteLLM — que roteia, loga e faz fallback automaticamente.

---

## Cenário A: Ollama já instalado no servidor (fora do Docker)

### 1. Verificar se o Ollama responde

```bash
curl http://localhost:11434/api/tags
# Deve retornar a lista de modelos instalados
```

### 2. Configurar a variável no Coolify

```
OLLAMA_BASE_URL=http://host-gateway:11434
```

> `host-gateway` é o endereço do host dentro da rede Docker.
> Se não funcionar, use o IP da interface de rede do servidor (ex: `http://192.168.1.X:11434`).

### 3. Desativar o container Ollama (não precisa dos dois)

No Coolify, não suba o profile `ai` se não for usar o container Docker do Ollama:
```bash
# Sobe tudo EXCETO ollama e open-webui
docker compose -f docker-compose.prod.yml up -d
# Sobe só o LiteLLM (necessário sempre)
docker compose -f docker-compose.prod.yml --profile ai up litellm -d
```

### 4. Puxar os modelos necessários

```bash
# Modelos usados pelo Arcádia (mínimo recomendado)
ollama pull llama3.3               # agente principal (Manus)
ollama pull nomic-embed-text       # embeddings semânticos
ollama pull qwen2.5-coder:7b       # geração de código (DevCenter)
ollama pull deepseek-r1:7b         # raciocínio complexo
```

---

## Cenário B: Ollama como container Docker

Use este cenário se o Ollama NÃO está instalado no servidor.

### 1. Configurar variável

```
OLLAMA_BASE_URL=http://ollama:11434
```

### 2. Subir com o profile ai

```bash
docker compose -f docker-compose.prod.yml --profile ai up -d
```

### 3. Puxar modelos após container subir

```bash
docker exec -it $(docker ps -qf "name=ollama") ollama pull llama3.3
docker exec -it $(docker ps -qf "name=ollama") ollama pull nomic-embed-text
docker exec -it $(docker ps -qf "name=ollama") ollama pull qwen2.5-coder:7b
docker exec -it $(docker ps -qf "name=ollama") ollama pull deepseek-r1:7b
```

---

## Variáveis de ambiente — resumo completo

Configure todas no Coolify antes do deploy:

```bash
# ── Banco ─────────────────────────────────────────────────────────────────────
PGPASSWORD=           # senha forte, não use a padrão
DATABASE_URL=postgresql://arcadia:SENHA@db:5432/arcadia

# ── Segurança (gerar com: openssl rand -hex 32) ────────────────────────────────
SESSION_SECRET=
SSO_SECRET=
LITELLM_API_KEY=
WEBUI_SECRET_KEY=
SUPERSET_SECRET_KEY=

# ── Manus → LiteLLM (não alterar — já configurado) ───────────────────────────
AI_INTEGRATIONS_OPENAI_BASE_URL=http://litellm:4000/v1
AI_INTEGRATIONS_OPENAI_API_KEY=${LITELLM_API_KEY}

# ── Ollama ────────────────────────────────────────────────────────────────────
# Ollama no host:      http://host-gateway:11434
# Ollama em container: http://ollama:11434
OLLAMA_BASE_URL=http://host-gateway:11434

# ── Providers externos (deixar vazio para soberania total) ───────────────────
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# ── Domínio ───────────────────────────────────────────────────────────────────
DOMAIN=seudominio.com.br
```

---

## Verificar se a integração está funcionando

### 1. Testar LiteLLM direto

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer SEU_LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"arcadia-default","messages":[{"role":"user","content":"Oi"}]}'
```

### 2. Testar Manus via interface

Acesse `https://seudominio.com.br` → abra o Manus → envie uma mensagem simples.
O Manus deve responder via Ollama.

### 3. Ver logs em tempo real

```bash
# Logs do LiteLLM (todas as chamadas de IA)
docker compose logs -f litellm

# Logs do app (Manus, erros, requests)
docker compose logs -f app
```

---

## Ordem de inicialização recomendada

```bash
# 1. Banco e Redis
docker compose -f docker-compose.prod.yml up -d db redis

# 2. Aguardar banco ficar saudável
docker compose -f docker-compose.prod.yml ps   # esperar db = healthy

# 3. Migrations (primeira vez ou após atualização de schema)
docker compose -f docker-compose.prod.yml run --rm app npm run db:push

# 4. LiteLLM
docker compose -f docker-compose.prod.yml up -d litellm

# 5. App + microserviços Python
docker compose -f docker-compose.prod.yml up -d app contabil bi automation fisco embeddings

# 6. Ollama (se usando container)
docker compose -f docker-compose.prod.yml --profile ai up -d ollama
# Aguardar e puxar modelos:
docker exec $(docker ps -qf "name=ollama") ollama pull llama3.3
docker exec $(docker ps -qf "name=ollama") ollama pull nomic-embed-text
```

---

## Dúvidas frequentes

**O Manus não responde / trava**
→ Verifique se o LiteLLM está de pé: `docker compose logs litellm`
→ Verifique se o Ollama tem o modelo: `ollama list`

**Erro "model not found" no LiteLLM**
→ O modelo referenciado em `litellm-config.yaml` não foi baixado no Ollama.
→ Execute `ollama pull NOME_DO_MODELO`

**Ollama no host não é alcançado de dentro do Docker**
→ Tente `OLLAMA_BASE_URL=http://172.17.0.1:11434` (IP padrão do docker0)
→ Ou use o IP real da interface de rede: `ip addr show` para descobrir
