Plano de Implementação: MetaSet no ArcadiaSuite (Atualizado - 07/04/2026)
📊 Visão Geral da Arquitetura Atual
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARCADIA KERNEL (5001)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Dashboard  │  │   Process   │  │   Health    │  │   LogAggregator │ │
│  │   (Web UI)  │  │   Manager   │  │   Monitor   │  │                 │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────────┘ │
│         │                │                │                               │
│         └────────────────┴────────────────┘                               │
│                          │                                              │
│              ┌───────────┴───────────┐                                  │
│              │   Service Registry    │                                  │
│              │  (services.json)      │                                  │
│              └───────────┬───────────┘                                  │
│                          │                                              │
│    ┌─────────────────────┼─────────────────────┐                        │
│    │                     │                     │                        │
│ ┌──┴──┐              ┌──┴──┐              ┌──┴──┐                      │
│ │9001 │              │9002 │              │9003 │      + NOVO: 8004    │
│ │Comm │              │Core │              │Worker│      + NOVO: 8100   │
│ │Whats│              │ API │              │Queue │      (MetaSet)      │
│ └─────┘              └─────┘              └─────┘                        │
│                                                                          │
│  🆕 SERVIÇOS BI:                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   8004      │  │   8100      │  │   8200      │                      │
│  │  BI-API     │──│  MetaSet    │  │  FDB-Bridge │                      │
│  │  (Node.js)  │  │  (Python)   │  │  (Python)   │                      │
│  │  Gateway    │  │  Superset   │  │  Firebird   │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │   PostgreSQL 16     │
                         │  ┌───────────────┐  │
                         │  │  arcadia_db   │  │
                         │  │  metaset_db   │  │  ✅ Schema criado e migrado
                         │  └───────────────┘  │
                         └─────────────────────┘

🔧 Configuração dos Serviços (services.json)
{
  "services": [
    {
      "id": "communication",
      "name": "Communication Service",
      "type": "node",
      "command": "node",
      "args": ["server/communication/index.js"],
      "cwd": ".",
      "port": 9001,
      "autoStart": true,
      "healthCheck": {
        "path": "/health",
        "interval": 30000,
        "timeout": 5000,
        "retries": 3
      },
      "maxRestarts": 5
    },
    {
      "id": "core-api",
      "name": "Core API",
      "type": "node",
      "command": "node",
      "args": ["server/core/index.js"],
      "cwd": ".",
      "port": 9002,
      "autoStart": true,
      "healthCheck": {
        "path": "/health",
        "interval": 30000,
        "timeout": 5000,
        "retries": 3
      },
      "maxRestarts": 5
    },
    {
      "id": "bi-api",
      "name": "BI API Gateway",
      "type": "node",
      "command": "node",
      "args": ["server/bi/index.js"],
      "cwd": ".",
      "port": 8004,
      "autoStart": true,
      "env": {
        "METASET_PORT": "8100",
        "METASET_HOST": "127.0.0.1",
        "FDB_BRIDGE_PORT": "8200"
      },
      "healthCheck": {
        "path": "/bi/health",
        "interval": 30000,
        "timeout": 5000,
        "retries": 3
      },
      "maxRestarts": 5,
      "description": "Gateway de BI com proxy para MetaSet e FDB-Bridge"
    },
    {
      "id": "metaset",
      "name": "MetaSet BI",
      "type": "python",
      "command": "python",
      "args": ["server/bi/metaset/run.py", "--port=8100", "--host=127.0.0.1"],
      "cwd": ".",
      "port": 8100,
      "autoStart": false,
      "env": {
        "PYTHONPATH": "server/bi/metaset",
        "FLASK_ENV": "production",
        "SUPERSET_CONFIG_PATH": "server/bi/metaset/superset_config.py",
        "SUPERSET_SECRET_KEY": "${SUPERSET_SECRET_KEY}"
      },
      "healthCheck": {
        "path": "/health",
        "interval": 30000,
        "timeout": 10000,
        "retries": 3
      },
      "maxRestarts": 3,
      "description": "Apache Superset rebrandado como MetaSet (Docker-managed)"
    },
    {
      "id": "fdb-bridge",
      "name": "FDB Bridge",
      "type": "python",
      "command": "python",
      "args": ["server/bi/fdb-bridge/main.py", "--port=8200"],
      "cwd": ".",
      "port": 8200,
      "autoStart": false,
      "env": {
        "PYTHONPATH": "server/bi/fdb-bridge",
        "FDB_HOST": "${FDB_HOST}",
        "FDB_PORT": "${FDB_PORT:-3050}"
      },
      "healthCheck": {
        "path": "/health",
        "interval": 60000,
        "timeout": 5000,
        "retries": 3
      },
      "maxRestarts": 3,
      "description": "Conector Firebird para sincronização de dados (Docker-managed)"
    }
  ]
}

🏗️ Estrutura de Diretórios Final
arcadiasuite/
├── server/
│   ├── kernel/                    # ✅ Kernel finalizado
│   │   ├── core/
│   │   │   ├── ProcessManager.ts  # ✅ Suporta 'python' e 'node'
│   │   │   ├── HealthMonitor.ts
│   │   │   └── LogAggregator.ts
│   │   ├── dashboard/             # Dashboard Web UI (porta 5001)
│   │   ├── config/
│   │   │   └── services.json      # ✅ Configuração dos serviços
│   │   └── index.ts
│   │
│   ├── bi/                        # 🆕 MÓDULO BI COMPLETO
│   │   ├── index.ts               # BI-API Gateway (porta 8004)
│   │   ├── routes/
│   │   │   ├── query.ts           # Queries nativas Drizzle
│   │   │   ├── export.ts          # Exportação PDF/Word
│   │   │   └── sync.ts            # Sincronização FDB
│   │   │
│   │   ├── metaset/               # 🆕 METASET (Superset)
│   │   │   ├── run.py             # Entry point Python
│   │   │   ├── superset_config.py # Configuração Arcadia
│   │   │   ├── security_manager.py # ArcadiaSecurityManager
│   │   │   ├── requirements.txt   # Dependências Python
│   │   │   ├── Dockerfile         # Multi-stage build
│   │   │   ├── init.sh            # Container init script
│   │   │   ├── branding/          # 🎨 Assets MetaSet
│   │   │   │   ├── metaset-logo-horiz.png
│   │   │   │   ├── metaset-icon.png
│   │   │   │   ├── favicon-16x16.png
│   │   │   │   └── favicon-32x32.png
│   │   │   │
│   │   │   └── superset-src/      # Fork Apache Superset 4.1.0
│   │   │       ├── superset-frontend/  # ✅ Rebuild com branding MetaSet
│   │   │       │   └── src/
│   │   │       │       ├── features/home/RightMenu.tsx  # ✅ Textos atualizados
│   │   │       │       ├── components/ErrorMessage/OAuth2RedirectMessage.tsx
│   │   │       │       └── pages/...  # ✅ Traduções atualizadas
│   │   │       │
│   │   │       ├── superset/
│   │   │       │   ├── config.py      # ✅ APP_NAME = "MetaSet"
│   │   │       │   ├── constants.py   # ✅ USER_AGENT = "MetaSet"
│   │   │       │   ├── cli/
│   │   │       │   ├── templates/     # ✅ HTML templates atualizados
│   │   │       │   └── translations/  # ✅ Traduções en/pt_BR
│   │   │       └── ...
│   │   │
│   │   └── fdb-bridge/            # 🆕 FIREBIRD CONNECTOR (skeleton)
│   │       ├── main.py            # Serviço Python porta 8200
│   │       ├── sync.py            # Lógica de sincronização
│   │       ├── models.py          # Modelos SQLAlchemy
│   │       └── requirements.txt
│   │
│   └── ... (outros serviços)
│
├── client/
│   └── src/
│       └── pages/
│           └── bi/                # 🆕 FRONTEND BI
│               ├── index.tsx      # Dashboard BI Arcadia
│               ├── metaset/       # Embed MetaSet
│               │   ├── Dashboard.tsx
│               │   ├── SQLLab.tsx
│               │   └── Explore.tsx
│               └── components/
│                   ├── QueryBuilder.tsx
│                   ├── ExportButton.tsx
│                   └── FDBSyncStatus.tsx
│
└── branding/                      # 🆕 ASSETS COMPARTILHADOS
    ├── logos/
    │   ├── arcadia-suite-logo.svg
    │   ├── arcadia-suite-logo-horiz.svg
    │   ├── metaset-logo.svg
    │   └── metaset-icon.svg
    ├── colors/
    │   └── arcadia-palette.json
    └── fonts/
        └── Inter-Variable.ttf

🔐 Arquitetura de Segurança & Multi-tenancy
Fluxo de Autenticação
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│  Arcadia    │────▶│   BI-API    │────▶│   MetaSet   │
│   (React)   │     │   Login     │     │   (8004)    │     │   (8100)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │                    │
                                               │ Headers:           │ SET LOCAL
                                               │ X-Tenant-ID: 123   │ app.current_tenant
                                               │ X-User-Role: admin │ = 123;
                                               │ Authorization: JWT │
                                               ▼                    ▼
                                        ┌─────────────┐     ┌─────────────┐
                                        │  RLS Check  │     │  PostgreSQL │
                                        │ Middleware  │     │   (RLS)     │
                                        └─────────────┘     └─────────────┘

ArcadiaSecurityManager (server/bi/metaset/security_manager.py) ✅ CORRIGIDO
"""
Security Manager integrado ao Arcadia Kernel
- Extrai tenant e usuário do token JWT
- Aplica RLS automaticamente
- Sincroniza roles com ArcadiaSuite
- Preserva comportamento padrão do Superset (chama super().before_request())
"""
from superset.security import SupersetSecurityManager
from flask import g, request, current_app
from sqlalchemy import text
import jwt
import logging

logger = logging.getLogger(__name__)

class ArcadiaSecurityManager(SupersetSecurityManager):
    ROLE_MAPPING = {
        'superadmin': 'Admin',
        'admin': 'Alpha',
        'analyst': 'Gamma',
        'viewer': 'Public',
    }
    
    def before_request(self):
        """Executado antes de cada requisição - preserva comportamento padrão"""
        super().before_request()  # ← CRÍTICO: preserva autenticação padrão
        
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return
            
        token = auth_header.replace('Bearer ', '')
        
        try:
            payload = jwt.decode(
                token, 
                current_app.config.get('SECRET_KEY', 'default-key'), 
                algorithms=['HS256']
            )
            
            g.tenant_id = payload.get('tenant_id')
            g.user_id = payload.get('sub')
            g.user_role = payload.get('role', 'viewer')
            g.user_email = payload.get('email')
            
            if g.tenant_id:
                try:
                    from superset import db
                    db.session.execute(
                        text(f"SET LOCAL app.current_tenant = {g.tenant_id}")
                    )
                except Exception as e:
                    logger.warning(f"Erro ao aplicar RLS: {e}")
                    
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expirado")
        except jwt.InvalidTokenError:
            logger.warning("JWT token inválido")
        except Exception as e:
            logger.warning(f"Erro ao processar JWT: {e}")

🐍 Código dos Serviços Python
1. MetaSet Entry Point (server/bi/metaset/run.py)
"""
MetaSet - Serviço Apache Superset integrado ao Arcadia Kernel
Porta: 8100 (Docker container)
Gunicorn: 2 workers, gthread, 120s timeout
"""

import os
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='[MetaSet] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def create_app():
    """Criar aplicação Flask do Superset com endpoints customizados"""
    from superset import create_app as create_superset_app
    from datetime import datetime
    
    app = create_superset_app()
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'metaset'}, 200
    
    @app.route('/info')
    def service_info():
        return {
            'name': 'MetaSet',
            'description': 'Business Intelligence by ArcadiaSuite',
            'version': app.config.get('VERSION_STRING', '4.1.0'),
            'features': ['sql_lab', 'dashboards', 'charts', 'rls', 'embedding']
        }
    
    return app

# MetaSetApplication: custom Gunicorn app
# Config: 2 workers, gthread, 120s timeout, stdout/stderr logging

2. BI-API Gateway (server/bi/index.ts)
"""
 * BI-API Gateway
 * Porta: 8004
 * Integra MetaSet (8100) e FDB-Bridge (8200) ao ArcadiaSuite
 * Proxy manual usando módulo http nativo (bypass http-proxy-middleware ECONNRESET)
"""

import express from 'express';
import http from 'http';

const METASET_URL = `http://${process.env.METASET_HOST || 'metaset'}:${process.env.METASET_PORT || '8100'}`;

// Manual proxy: http.request() com pathRewrite
// Solução para ECONNRESET com Gunicorn keepalive
// Health check agrega MetaSet + FDB-Bridge status

🎨 Configuração de Branding (superset_config.py)
"""
Configuração do MetaSet (Superset) para ArcadiaSuite
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.absolute()
SUPERSET_HOME = BASE_DIR / 'superset_home'

# ==========================================
# BRANDING - ARCADIASUITE ✅ IMPLEMENTADO
# ==========================================

APP_NAME = "MetaSet by Arcádia"
APP_ICON = "/static/assets/images/branding/metaset-logo-horiz.png"
LOGO_TARGET_PATH = "/"
LOGO_TOOLTIP = "MetaSet - Business Intelligence by ArcadiaSuite"

# Favicons
FAVICONS = [
    {"href": "/static/assets/images/branding/favicon-16x16.png", "sizes": "16x16"},
    {"href": "/static/assets/images/branding/favicon-32x32.png", "sizes": "32x32"},
    {"href": "/static/assets/images/branding/apple-touch-icon.png", "sizes": "180x180"},
]

# Cores ArcadiaSuite
ARCADIA_PRIMARY = "#0ea5e9"      # Azul celeste
ARCADIA_SECONDARY = "#10b981"    # Verde
ARCADIA_ACCENT = "#f59e0b"       # Laranja
ARCADIA_BG = "#f8fafc"           # Background claro
ARCADIA_TEXT = "#1e293b"         # Texto escuro

# Desabilitar cache de arquivos estáticos
SEND_FILE_MAX_AGE_DEFAULT = 0

THEME_DEFAULT = {
    "token": {
        "brandAppName": "MetaSet",
        "brandLogoAlt": "MetaSet by ArcadiaSuite",
        "brandLogoUrl": "/static/assets/images/branding/metaset-logo-horiz.png",
        "brandLogoMargin": "16px 0",
        "brandLogoHeight": "28px",
        "colorPrimary": ARCADIA_PRIMARY,
        "colorLink": ARCADIA_PRIMARY,
        "colorSuccess": ARCADIA_SECONDARY,
        "colorWarning": ARCADIA_ACCENT,
        "colorError": "#ef4444",
        "colorInfo": "#3b82f6",
        "colorBgLayout": ARCADIA_BG,
        "colorBgContainer": "#ffffff",
        "colorText": ARCADIA_TEXT,
        "colorTextSecondary": "#64748b",
        "fontFamily": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        "fontSize": 14,
        "borderRadius": 8,
        "borderRadiusLG": 12,
        "boxShadow": "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        "boxShadowSecondary": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    "algorithm": "default",
}

THEME_DARK = { ... }  # Tema escuro

# ==========================================
# SEGURANÇA & MULTI-TENANCY
# ==========================================

from security_manager import ArcadiaSecurityManager
CUSTOM_SECURITY_MANAGER = ArcadiaSecurityManager  # ✅ Funcionando

AUTH_TYPE = 1
WTF_CSRF_ENABLED = True
WTF_CSRF_TIME_LIMIT = 3600
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # True em produção com HTTPS
SESSION_COOKIE_SAMESITE = "Lax"

# ==========================================
# BANCO DE DADOS
# ==========================================

SQLALCHEMY_DATABASE_URI = os.getenv(
    'DATABASE_URL',
    'postgresql://arcadia:arcadia123@db:5432/metaset_db'
)

SQLALCHEMY_ENGINE_OPTIONS = {
    "connect_args": {"options": "-c row_security=on"},
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

# ==========================================
# FEATURE FLAGS
# ==========================================

FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "EMBEDDABLE_CHARTS": True,
    "DASHBOARD_RBAC": True,
    "SQLLAB_BACKEND_PERSISTENCE": True,
    "DASHBOARD_VIRTUALIZATION": True,
    "DRILL_BY": True,
    "CSS_TEMPLATES": True,
    "ENABLE_JAVASCRIPT_CONTROLS": False,
    "ALERT_REPORTS": False,
}

📋 Roadmap de Implementação (8 Semanas)
Semana	Foco	Entregáveis
1	Setup MetaSet	Fork Superset, branding básico (logo, cores), superset_config.py
2	Integração Kernel	services.json atualizado, BI-API gateway, proxy funcionando
3	Segurança	ArcadiaSecurityManager, JWT validation, injeção de headers
4	Multi-tenancy	RLS PostgreSQL, isolamento de datasources, testes de segurança
5	FDB Bridge	Serviço Python porta 8200, conexão Firebird, testes de sync
6	Sync Engine	Sincronização incremental, agendamento, resolução de conflitos
7	Frontend	Páginas BI no React, embed de dashboards, SQL Lab integrado
8	Go-Live	Testes E2E, documentação, otimização de performance

✅ Checklist de Implementação - STATUS ATUAL
Semana 1-2: Setup e Integração ✅ CONCLUÍDO
✅ Clonar superset (4.1.0rc4) para server/bi/metaset/superset-src
✅ Criar superset_config.py com branding ArcadiaSuite (APP_NAME, cores, tema)
✅ Rebuild do frontend React com logos MetaSet (COMPLETO - 07/04/2026)
   - Substituição de textos: "Superset" → "MetaSet" em todo codebase
   - Traduções atualizadas: en/LC_MESSAGES/messages.po, pt_BR/LC_MESSAGES/messages.po
   - Arquivos fonte atualizados: RightMenu.tsx, OAuth2RedirectMessage.tsx, 
     SliceHeaderControls, HeaderActionsDropdown, AnchorLink, EmbeddedModal,
     useExploreAdditionalActionsMenu
   - Templates HTML: basic.html, public_welcome.html, 404.html, 500.html
   - Config Python: config.py (APP_NAME), constants.py (USER_AGENT), cli/*.py
   - Build webpack concluído com sucesso (429 warnings, 0 errors)
   - Assets compilados com branding MetaSet incorporado
✅ Criar server/bi/metaset/run.py entry point (Gunicorn)
✅ Criar server/bi/metaset/init.sh container initialization
✅ Criar server/bi/index.ts BI-API gateway (proxy manual Node.js)
✅ Atualizar server/kernel/config/services.json (autoStart: false, Docker Discovery)
✅ Docker Compose: metaset + bi-api + redes configuradas
✅ Dockerfile multi-stage build com assets locais (não mais copiando de apache/superset:latest)
✅ Deploy: https://bi.onboardbi.com.br (MetaSet rodando com branding completo)
✅ Container antigo arcadia-prod-superset-1 removido
✅ Container metaset conectado à rede coolify para Traefik
✅ Banco de dados metaset_db migrado e inicializado
✅ Usuário admin criado (login: admin / senha: admin)
✅ BI-API Gateway proxy /bi/metaset funcionando (porta 8004)
✅ Health checks integrados (metaset + bi-api)
✅ requirements.txt corrigido (compatível apache-superset 4.1.0)
✅ extra_hosts configurado para resolver db → 10.0.10.2 (IPv4)

Semana 3-4: Segurança 🔄 EM ANDAMENTO
✅ Implementar ArcadiaSecurityManager (CORRIGIDO - chama super().before_request())
✅ Configurar JWT validation
🔄 Criar schema metaset no PostgreSQL (banco criado, migrações aplicadas)
☐ Configurar RLS em tabelas do arcadia_db
☐ Testar isolamento entre tenants

Semana 5-6: FDB Bridge ⏳ PENDENTE
☐ Criar server/bi/fdb-bridge/main.py
☐ Implementar conexão Firebird (fdb library)
☐ Criar lógica de sincronização incremental
☐ Configurar agendador APScheduler
☐ Testar sync Matriz + 5 Filiais

Semana 7-8: Frontend e Go-Live ⏳ PENDENTE
☐ Criar páginas BI no frontend React
☐ Implementar embed de dashboards MetaSet
☐ Criar componente de status de sincronização
☐ Testes E2E completos
☐ Documentação do módulo BI

📝 Lições Aprendidas (07/04/2026)
1. Frontend rebuild obrigatório: Substituir arquivos estáticos PNG no Docker
   não funciona porque os assets são compilados em bundles JS pelo webpack.
   É necessário rebuildar o superset-frontend com npm run build.

2. Dependências faltantes: O build pode falhar por pacotes não instalados:
   @react-spring/web, global-box, currencyformatter.js. Instalar com
   npm install --legacy-peer-deps.

3. Security Manager: O ArcadiaSecurityManager DEVE chamar super().before_request()
   no início do método para preservar o comportamento de autenticação padrão
   do Flask-AppBuilder. Sem isso, o login falha com AttributeError: user.

4. IPv6 vs IPv4: O hostname "db" resolve para IPv6 (fd20:a15a:c2d4::c) mas
   o psycopg2 falha na autenticação via IPv6. Solução: mapear db → IP IPv4
   via extra_hosts no docker-compose.yml.

5. Container antigo: Sempre verificar se há containers antigos com labels
   do Traefik apontando para o mesmo domínio. Eles podem conflitar com
   o novo container.

6. Traefik discovery: O container DEVE estar na mesma rede Docker que o
   Traefik (coolify) para ser descoberto automaticamente.

💰 Custos Adicionais
Componente	Especificação	Custo Estimado
Memória extra	+2GB para Python (MetaSet + FDB-Bridge)	~$20/mês
Storage PostgreSQL	+10GB para metadata MetaSet	~$5/mês
CPU	Processamento de sync FDB	~$15/mês
Total		~$40/mês

🚀 Comandos de Deploy
# 1. Build da imagem Docker
cd /opt/arcadia_merged
docker compose build --no-cache metaset

# 2. Recriar container com nova imagem
docker compose up -d --force-recreate metaset

# 3. Verificar status
curl http://localhost:8100/health
curl https://bi.onboardbi.com.br/login/ | grep "<title>"

# 4. Logs
docker logs -f arcadia-dev-metaset-1

# 5. Migrar banco (se necessário)
docker exec -e FLASK_APP=superset \
  -e DATABASE_URL="postgresql://arcadia:arcadia123@10.0.10.2:5432/metaset_db" \
  arcadia-dev-metaset-1 superset db upgrade

# 6. Inicializar
docker exec -e FLASK_APP=superset \
  -e DATABASE_URL="postgresql://arcadia:arcadia123@10.0.10.2:5432/metaset_db" \
  arcadia-dev-metaset-1 superset init

📌 URLs de Acesso
Serviço	URL	Status
MetaSet UI	https://bi.onboardbi.com.br	✅ Online com branding MetaSet
MetaSet Health	http://localhost:8100/health	✅ OK
BI-API Gateway	http://localhost:8004	⚠️ Unhealthy (esperado - requer JWT)
Traefik Dashboard	http://localhost:8080	✅ Online

🔧 Próximos Passos Prioritários
1. Configurar RLS (Row Level Security) no PostgreSQL para isolamento de tenants
2. Testar fluxo completo de autenticação com token JWT do Arcadia
3. Criar datasource de exemplo conectado ao arcadia_db
4. Implementar FDB Bridge (conector Firebird)
5. Criar páginas BI no frontend React
6. Configurar cache Redis para MetaSet
