import os

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "change-in-production")

SQLALCHEMY_DATABASE_URI = os.environ.get(
    "SQLALCHEMY_DATABASE_URI",
    "postgresql://arcadia:arcadia123@db:5432/superset"
)

ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": {r"/*": {"origins": ["https://suite.onboardbi.com.br"]}},
}

# Permitir embedding em iframe a partir do suite
TALISMAN_ENABLED = False
HTTP_HEADERS = {}

# Cookie de sessão acessível por todos os subdomínios de onboardbi.com.br
SESSION_COOKIE_DOMAIN = ".onboardbi.com.br"
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = True

FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
    "ALERT_REPORTS": True,
    "DRILL_TO_DETAIL": True,
}

SUPERSET_WEBSERVER_TIMEOUT = 300

CACHE_CONFIG = {
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
}

APP_NAME = "Arcadia Insights"
