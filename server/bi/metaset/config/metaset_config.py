"""
MetaSet BI - Configuration
Apache Superset Override for Arcádia Suite
"""
import os

# =============================================================================
# BRANDING ARCÁDIA
# =============================================================================
APP_NAME = "MetaSet by Arcádia"
APP_ICON = "/static/assets/images/metaset-logo.svg"
APP_ICON_WIDTH = 126
LOGO_TARGET_PATH = "/"
FAVICONS = [{"href": "/static/assets/images/favicon.png"}]

# =============================================================================
# SEGURANÇA
# =============================================================================
SECRET_KEY = os.environ.get("METASET_SECRET_KEY", "change-in-production-use-openssl-rand-hex-32")

# JWT para integração com Arcádia Kernel
JWT_SECRET_KEY = os.environ.get("JWT_SECRET", SECRET_KEY)
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hora

# =============================================================================
# BANCO DE DADOS
# =============================================================================
SQLALCHEMY_DATABASE_URI = os.environ.get(
    "DATABASE_URL",
    "postgresql://arcadia:arcadia123@localhost:5432/metaset_db"
)

# Banco Arcádia para leitura (datasets)
ARCADIA_DATABASE_URL = os.environ.get(
    "ARCADIA_DATABASE_URL",
    "postgresql://arcadia:arcadia123@localhost:5432/arcadia"
)

# =============================================================================
# CORS - Permite Kernel Arcádia
# =============================================================================
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": {
        r"/api/*": {"origins": "*"},
        r"/health": {"origins": "*"},
    },
}

# =============================================================================
# FEATURE FLAGS
# =============================================================================
FEATURE_FLAGS = {
    # Embedding
    "EMBEDDED_SUPERSET": True,
    "GUEST_EMBEDDING_ENABLED": True,
    
    # Query & Data
    "ENABLE_TEMPLATE_PROCESSING": True,
    "ALLOW_ADHOC_SUBQUERY": True,
    
    # UI/UX
    "ALERT_REPORTS": True,
    "DRILL_TO_DETAIL": True,
    "DRILL_BY": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_RBAC": True,
    
    # Security
    "DASHBOARD_CACHE": True,
    "ENABLE_DATASET_HEALTH_CHECK": True,
    
    # Desabilitado por segurança
    "ENABLE_JAVASCRIPT_CONTROLS": False,
}

# =============================================================================
# CACHE
# =============================================================================
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/1")

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "metaset_",
    "CACHE_REDIS_URL": REDIS_URL,
}

DATA_CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 86400,
    "CACHE_KEY_PREFIX": "metaset_data_",
    "CACHE_REDIS_URL": REDIS_URL,
}

# =============================================================================
# TIMEOUTS
# =============================================================================
SUPERSET_WEBSERVER_TIMEOUT = 300
SQLLAB_TIMEOUT = 300
SQLLAB_ASYNC_TIME_LIMIT_SEC = 600

# =============================================================================
# GUEST TOKEN (EMBEDDING)
# =============================================================================
GUEST_TOKEN_JWT_EXP_SECONDS = 300  # 5 minutos
GUEST_ROLE_NAME = "Gamma"
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"

# =============================================================================
# MULTI-TENANCY (RLS)
# =============================================================================
# Configurações para Row Level Security por tenant
ENABLE_ROW_LEVEL_SECURITY = True
RLS_BASE_ROLE = "Gamma"

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# =============================================================================
# ARCÁDIA INTEGRATION
# =============================================================================
ARCADIA_KERNEL_URL = os.environ.get("KERNEL_URL", "http://localhost:5001")
ARCADIA_API_KEY = os.environ.get("ARCADIA_API_KEY", "")

# Auto-create users from Arcádia
AUTH_USER_REGISTRATION = True
AUTH_USER_REGISTRATION_ROLE = "Gamma"
