# MetaSet BI - Dockerfile
# Apache Superset Fork for Arcádia Suite
# Port 8100

FROM python:3.11-slim

LABEL maintainer="Arcádia Suite"
LABEL description="MetaSet BI - Business Intelligence Module"

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p /app/metaset_home /app/pythonpath /app/logs /app/data

# Copy our application code FIRST
COPY config/metaset_config.py /app/pythonpath/
COPY init.sh /app/
COPY run.py /app/
COPY main.py /app/
COPY security_manager.py /app/
COPY superset_config.py /app/

# Copy Superset static assets from local build (with MetaSet branding)
COPY superset-src/superset/static /app/superset/static

# Copy Superset templates from local source
COPY superset-src/superset/templates /app/superset/templates

# Environment variables
ENV PYTHONPATH=/app:/app/pythonpath
ENV METASET_HOME=/app/metaset_home
ENV METASET_PORT=8100
ENV LOG_LEVEL=info

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8100/health || exit 1

EXPOSE 8100

RUN chmod +x /app/init.sh

CMD ["/app/init.sh"]
