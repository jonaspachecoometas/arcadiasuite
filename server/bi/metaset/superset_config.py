"""
Configuração do MetaSet (Superset) para ArcadiaSuite
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.absolute()
SUPERSET_HOME = BASE_DIR / 'superset_home'

# ==========================================
# BRANDING - ARCADIASUITE
# ==========================================

APP_NAME = "MetaSet"
APP_ICON = "/static/assets/images/branding/metaset-logo-horiz.png"
LOGO_TARGET_PATH = "/"
LOGO_TOOLTIP = "MetaSet - Business Intelligence by ArcadiaSuite"

# Favicons
FAVICONS = [
    {"href": "/static/assets/images/branding/favicon-16x16.png", "sizes": "16x16"},
    {"href": "/static/assets/images/branding/favicon-32x32.png", "sizes": "32x32"},
]

# Cores ArcadiaSuite (alinhadas ao site principal)
ARCADIA_PRIMARY = "#0ea5e9"      # Azul celeste
ARCADIA_SECONDARY = "#10b981"    # Verde
ARCADIA_ACCENT = "#f59e0b"       # Laranja
ARCADIA_BG = "#f8fafc"           # Background claro
ARCADIA_TEXT = "#1e293b"         # Texto escuro

# Desabilitar cache de arquivos estáticos para forçar reload
SEND_FILE_MAX_AGE_DEFAULT = 0

THEME_DEFAULT = {
    "token": {
        "brandAppName": APP_NAME,
        "brandLogoAlt": "MetaSet by ArcadiaSuite",
        "brandLogoUrl": APP_ICON,
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

THEME_DARK = {
    **THEME_DEFAULT,
    "token": {
        **THEME_DEFAULT["token"],
        "colorBgLayout": "#0f172a",
        "colorBgContainer": "#1e293b",
        "colorText": "#f1f5f9",
    },
    "algorithm": "dark",
}

# ==========================================
# SEGURANÇA & MULTI-TENANCY
# ==========================================

from security_manager import ArcadiaSecurityManager
CUSTOM_SECURITY_MANAGER = ArcadiaSecurityManager

AUTH_TYPE = 1
WTF_CSRF_ENABLED = True
WTF_CSRF_TIME_LIMIT = 3600
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = "Lax"

# ==========================================
# BANCO DE DADOS
# ==========================================

SQLALCHEMY_DATABASE_URI = os.getenv(
    'DATABASE_URL',
    'postgresql://arcadia:arcadia@localhost:5432/metaset_db'
)

SQLALCHEMY_EXAMPLES_URI = 'postgresql://arcadia:arcadia@localhost:5432/arcadia_db'

SQLALCHEMY_ENGINE_OPTIONS = {
    "connect_args": {
        "options": "-c row_security=on"
    },
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

# ==========================================
# CACHE
# ==========================================

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_REDIS_HOST": os.getenv("REDIS_HOST", "localhost"),
    "CACHE_REDIS_PORT": int(os.getenv("REDIS_PORT", "6379")),
    "CACHE_REDIS_DB": 1,
    "CACHE_DEFAULT_TIMEOUT": 300,
}

# ==========================================
# LOGGING
# ==========================================

LOG_FORMAT = "%(asctime)s [MetaSet] %(levelname)s: %(message)s"
LOG_LEVEL = "INFO" if os.getenv("FLASK_ENV") == "production" else "DEBUG"

# ==========================================
# UPLOADS & EXPORT
# ==========================================

UPLOAD_FOLDER = str(SUPERSET_HOME / "uploads")
UPLOAD_CHUNK_SIZE = 4096

CSV_EXPORT = {"encoding": "utf-8-sig"}
EXCEL_EXPORT = {}

ROW_LIMIT = 100000
SQL_MAX_ROW = 100000
DISPLAY_MAX_ROW = 10000

SQLLAB_TIMEOUT = 60
SUPERSET_WEBSERVER_TIMEOUT = 60

MAPBOX_API_KEY = os.getenv("MAPBOX_API_KEY", "")

FAVICONS = [
    {"href": "/static/assets/images/branding/favicon-16x16.png", "sizes": "16x16"},
    {"href": "/static/assets/images/branding/favicon-32x32.png", "sizes": "32x32"},
    {"href": "/static/assets/images/branding/apple-touch-icon.png", "sizes": "180x180"},
]
