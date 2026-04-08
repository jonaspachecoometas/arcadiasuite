# BI-API Gateway - Node.js
# Arcádia Suite - Port 8004
# Roda com tsx (TypeScript runtime)

FROM node:20-alpine

LABEL maintainer="Arcádia Suite"
LABEL description="BI-API Gateway - Proxy para MetaSet e FDB-Bridge"

WORKDIR /app

# Instalar tsx globalmente
RUN npm install -g tsx

# Criar package.json mínimo com as dependências necessárias
RUN npm init -y && \
    npm install express@4 cors@2 helmet@7 http-proxy-middleware@2 && \
    npm cache clean --force

# Copiar apenas o arquivo do gateway
COPY server/bi/index.ts ./server/bi/index.ts

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=8004
ENV METASET_HOST=metaset
ENV METASET_PORT=8100
ENV FDB_BRIDGE_HOST=fdb-bridge
ENV FDB_BRIDGE_PORT=8200

EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8004/health || exit 1

CMD ["tsx", "server/bi/index.ts"]
