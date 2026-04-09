# Arcadia Suite - Guia Completo de Hospedagem e Deploy

## Indice

1. [Requisitos do Servidor](#1-requisitos-do-servidor)
2. [Variaveis de Ambiente](#2-variaveis-de-ambiente)
3. [Instalacao](#3-instalacao)
4. [Banco de Dados](#4-banco-de-dados)
5. [Servicos Python](#5-servicos-python)
6. [Metabase (Arcadia Insights)](#6-metabase-arcadia-insights)
7. [Build e Producao](#7-build-e-producao)
8. [Configuracao do Servidor Web (Nginx)](#8-configuracao-do-servidor-web-nginx)
9. [Process Manager (PM2)](#9-process-manager-pm2)
10. [SSL/HTTPS](#10-sslhttps)
11. [Estrutura de Portas](#11-estrutura-de-portas)
12. [Arcadia Plus (Laravel)](#12-arcadia-plus-laravel)
13. [Manutencao e Backups](#13-manutencao-e-backups)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Requisitos do Servidor

### Minimo Recomendado
- **SO:** Ubuntu 22.04 LTS ou Debian 12
- **CPU:** 4 vCPUs
- **RAM:** 8 GB (16 GB recomendado)
- **Disco:** 50 GB SSD
- **Node.js:** v20.x ou superior
- **Python:** 3.11 ou superior
- **PostgreSQL:** 15 ou superior
- **Java:** OpenJDK 11+ (para Metabase)
- **PHP:** 8.1+ (para Arcadia Plus, opcional)
- **Composer:** 2.x (para Arcadia Plus, opcional)

### Instalacao de Dependencias (Ubuntu/Debian)

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Java (para Metabase)
sudo apt install -y openjdk-11-jre-headless

# Ferramentas auxiliares
sudo apt install -y git nginx certbot python3-certbot-nginx build-essential
```

---

## 2. Variaveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# === BANCO DE DADOS ===
DATABASE_URL=postgresql://arcadia_user:SUA_SENHA_AQUI@localhost:5432/arcadia_suite
PGHOST=localhost
PGPORT=5432
PGUSER=arcadia_user
PGPASSWORD=SUA_SENHA_AQUI
PGDATABASE=arcadia_suite

# === OPENAI (IA) ===
OPENAI_API_KEY=sk-sua-chave-openai-aqui

# === ERPNext (opcional) ===
ERPNEXT_URL=https://seu-erpnext.com
ERPNEXT_API_KEY=sua-api-key
ERPNEXT_API_SECRET=seu-api-secret

# === GITHUB (opcional - para XOS Pipeline) ===
GITHUB_TOKEN=ghp_seu-token-github

# === PRODUCAO ===
NODE_ENV=production
PORT=5000
SESSION_SECRET=gere-uma-string-secreta-longa-e-aleatoria

# === METABASE ===
MB_DB_TYPE=postgres
MB_DB_DBNAME=arcadia_metabase
MB_DB_PORT=5432
MB_DB_USER=arcadia_user
MB_DB_PASS=SUA_SENHA_AQUI
MB_DB_HOST=localhost
MB_JETTY_PORT=8088
METABASE_PORT=8088
METASET_ADMIN_EMAIL=admin@arcadia.app
METASET_ADMIN_PASSWORD=SuaSenhaMetaSet
```

---

## 3. Instalacao

```bash
# Clonar o repositorio
git clone https://github.com/SEU_USUARIO/arcadia-suite.git
cd arcadia-suite

# Instalar dependencias Node.js
npm install

# Instalar dependencias Python
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r python-service/requirements.txt
pip install fastapi uvicorn pandas numpy httpx pydantic nfelib lxml signxml \
  cryptography zeep beautifulsoup4 psycopg2-binary matplotlib pymongo \
  python-multipart python-docx pyopenssl

# Copiar arquivo de ambiente
cp .env.example .env
# Edite o .env com suas credenciais
nano .env
```

---

## 4. Banco de Dados

### Criar banco e usuario

```bash
sudo -u postgres psql
```

```sql
-- Criar usuario
CREATE USER arcadia_user WITH PASSWORD 'SUA_SENHA_SEGURA';

-- Criar banco principal
CREATE DATABASE arcadia_suite OWNER arcadia_user;

-- Criar banco do Metabase (separado)
CREATE DATABASE arcadia_metabase OWNER arcadia_user;

-- Permissoes
GRANT ALL PRIVILEGES ON DATABASE arcadia_suite TO arcadia_user;
GRANT ALL PRIVILEGES ON DATABASE arcadia_metabase TO arcadia_user;

\q
```

### Executar migracoes (Drizzle ORM)

```bash
# Sincronizar schema com o banco
npx drizzle-kit push
```

---

## 5. Servicos Python

O projeto utiliza servicos Python para funcionalidades especificas. Eles sao iniciados automaticamente pelo servidor Node.js, mas podem ser executados manualmente para testes:

| Servico | Porta | Funcao | Inicio Automatico |
|---------|-------|--------|--------------------|
| Contabil | 8003 | Motor contabil | Sim |
| BI Engine | 8004 | Business Intelligence | Sim |
| Automations | 8005 | Motor de automacoes | Sim |
| Scientist | 8001 | IA, embeddings, analise de dados | Opcional* |
| Fisco | 8002 | Motor fiscal NF-e/NFC-e | Opcional* |
| Communication | 8006 | Motor de comunicacao | Opcional* |

*Servicos opcionais podem ser ativados adicionando suas chamadas em `server/index.ts`.

Os servicos Contabil, BI e Automations sao iniciados automaticamente pelo `server/index.ts`.

---

## 6. Metabase (Arcadia Insights)

O Metabase e usado como motor de BI invisivel. Para instala-lo:

```bash
# Criar diretorio
mkdir -p metabase/plugins

# Baixar Metabase (versao 0.50.x recomendada)
wget https://downloads.metabase.com/v0.50.31/metabase.jar -O metabase/metabase.jar

# Testar execucao
java -jar metabase/metabase.jar &
```

O Metabase sera executado na porta 8088 e proxied pelo Node.js em `/api/bi/metaset/*` e `/metabase/`.

O script de inicio esta em `metabase/start-metabase.sh` e e gerenciado automaticamente pelo servidor Node.js.

---

## 7. Build e Producao

```bash
# Build do frontend (Vite) + backend
npm run build

# Iniciar em producao
npm run start
```

O comando `npm run start` executa `NODE_ENV=production node dist/index.cjs` na porta 5000.

---

## 8. Configuracao do Servidor Web (Nginx)

Crie o arquivo de configuracao:

```bash
sudo nano /etc/nginx/sites-available/arcadia-suite
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com.br;

    # SSL (sera configurado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;

    # Limites
    client_max_body_size 50M;

    # Proxy principal (Node.js na porta 5000)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Arcadia Plus (Laravel, opcional)
    location /plus/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar o site
sudo ln -s /etc/nginx/sites-available/arcadia-suite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9. Process Manager (PM2)

Use PM2 para manter o servidor rodando:

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar a aplicacao
pm2 start dist/index.cjs --name arcadia-suite --env production

# Salvar a lista de processos
pm2 save

# Configurar para iniciar no boot
pm2 startup
```

### Arquivo ecosystem (opcional)

Crie `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "arcadia-suite",
      script: "dist/index.cjs",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      instances: 1,
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/output.log",
    },
    {
      name: "arcadia-metabase",
      script: "java",
      args: "-jar metabase/metabase.jar",
      interpreter: "none",
      env: {
        MB_DB_TYPE: "postgres",
        MB_DB_DBNAME: "arcadia_metabase",
        MB_DB_PORT: "5432",
        MB_DB_USER: "arcadia_user",
        MB_DB_PASS: "SUA_SENHA_AQUI",
        MB_DB_HOST: "localhost",
        MB_JETTY_PORT: "8088",
      },
      max_memory_restart: "2G",
    },
  ],
};
```

```bash
# Iniciar com ecosystem
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 10. SSL/HTTPS

```bash
# Certificado gratuito com Let's Encrypt
sudo certbot --nginx -d seu-dominio.com.br

# Renovacao automatica (ja configurada pelo Certbot)
sudo certbot renew --dry-run
```

---

## 11. Estrutura de Portas

| Porta | Servico | Acesso |
|-------|---------|--------|
| 5000 | Node.js (Express + Vite) | Principal - proxied pelo Nginx |
| 8088 | Metabase (Arcadia Insights) | Interno - proxied via /api/bi/metaset e /metabase |
| 8003 | Python Contabil | Interno - inicio automatico |
| 8004 | Python BI Engine | Interno - inicio automatico |
| 8005 | Python Automations | Interno - inicio automatico |
| 8001 | Python Scientist | Interno - opcional |
| 8002 | Python Fisco | Interno - opcional |
| 8006 | Node Communication | Interno - opcional |
| 8080 | Arcadia Plus (Laravel) | Interno - proxied via /plus |

Apenas a porta 80 (HTTP) e 443 (HTTPS) devem estar expostas publicamente via Nginx.

---

## 12. Arcadia Plus (Laravel)

Se voce utiliza o modulo Plus (ERP Laravel):

```bash
cd plus

# Instalar dependencias PHP
composer install --no-dev --optimize-autoloader

# Configurar ambiente
cp .env.example .env
php artisan key:generate

# Configurar banco (usar schema separado no mesmo PostgreSQL)
# Edite plus/.env com as credenciais do banco

# Migracoes
php artisan migrate

# Otimizar para producao
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Servir (porta 8080)
php artisan serve --host=0.0.0.0 --port=8080
```

---

## 13. Manutencao e Backups

### Backup do Banco de Dados

```bash
# Criar backup
pg_dump -U arcadia_user -h localhost arcadia_suite > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql -U arcadia_user -h localhost arcadia_suite < backup_20260209.sql
```

### Atualizar a Aplicacao

```bash
cd /caminho/para/arcadia-suite

# Parar a aplicacao
pm2 stop arcadia-suite

# Atualizar codigo
git pull origin main

# Reinstalar dependencias
npm install

# Rebuild
npm run build

# Migrar banco (se necessario)
npx drizzle-kit push

# Reiniciar
pm2 restart arcadia-suite
```

### Logs

```bash
# Ver logs em tempo real
pm2 logs arcadia-suite

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 14. Troubleshooting

### Erro: "Cannot find module"
```bash
npm install
npm run build
```

### Erro: "ECONNREFUSED" no banco
```bash
# Verificar se PostgreSQL esta rodando
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Erro: "Port already in use"
```bash
# Encontrar processo na porta
lsof -i :5000
kill -9 PID_DO_PROCESSO
```

### Servicos Python nao iniciam
```bash
# Verificar Python
python3.11 --version

# Verificar ambiente virtual
source .venv/bin/activate
pip list | grep fastapi
```

### Metabase nao inicia
```bash
# Verificar Java
java -version

# Verificar se metabase.jar existe
ls -la metabase/metabase.jar

# Executar manualmente para ver erros
java -jar metabase/metabase.jar
```

---

## Hospedagem em Cloud (Alternativas)

### VPS Recomendados
- **Hetzner:** A partir de EUR 4/mes (melhor custo-beneficio)
- **DigitalOcean:** A partir de USD 12/mes (4GB RAM)
- **Vultr:** A partir de USD 12/mes
- **AWS EC2:** t3.medium (sob demanda)
- **Contabo:** A partir de EUR 5/mes (alto recurso por preco)

### Deploy com Docker (Alternativa)

Se preferir usar Docker, crie um `Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

# Instalar Python e Java
RUN apt-get update && apt-get install -y \
    python3.11 python3.11-venv python3-pip \
    openjdk-11-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias
COPY package.json ./
RUN npm install --production

# Instalar dependencias Python
COPY python-service/requirements.txt ./python-requirements.txt
RUN python3.11 -m venv /app/.venv && \
    /app/.venv/bin/pip install -r python-requirements.txt

# Copiar codigo
COPY . .

# Build
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://arcadia_user:senha@db:5432/arcadia_suite
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: arcadia_user
      POSTGRES_PASSWORD: senha
      POSTGRES_DB: arcadia_suite
    volumes:
      - pgdata:/var/lib/postgresql/data

  metabase:
    image: metabase/metabase:v0.50.31
    ports:
      - "8088:8088"
    environment:
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: arcadia_metabase
      MB_DB_PORT: 5432
      MB_DB_USER: arcadia_user
      MB_DB_PASS: senha
      MB_DB_HOST: db
      MB_JETTY_PORT: 8088

volumes:
  pgdata:
```

---

## Checklist de Deploy

- [ ] Servidor provisionado com requisitos minimos
- [ ] PostgreSQL instalado e configurado
- [ ] Node.js 20 instalado
- [ ] Python 3.11 instalado
- [ ] Repositorio clonado
- [ ] Dependencias instaladas (npm install)
- [ ] Dependencias Python instaladas
- [ ] Arquivo .env configurado com todas as variaveis
- [ ] Banco de dados criado e migracoes executadas
- [ ] Build de producao executado (npm run build)
- [ ] Metabase baixado e configurado
- [ ] PM2 configurado e aplicacao rodando
- [ ] Nginx configurado como reverse proxy
- [ ] SSL/HTTPS configurado com Certbot
- [ ] Firewall configurado (portas 80 e 443 abertas)
- [ ] Backup automatico do banco configurado
- [ ] Dominio apontando para o servidor

---

*Documento gerado em 09/02/2026 - Arcadia Suite v1.0*
