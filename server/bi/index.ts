/**
 * BI-API Gateway
 * Porta: 8004
 * Integra MetaSet (8100) e FDB-Bridge (8200) ao ArcadiaSuite
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';

const app = express();
const PORT = parseInt(process.env.PORT || '8004', 10);

// Configurações
const METASET_URL = `http://${process.env.METASET_HOST || '127.0.0.1'}:${process.env.METASET_PORT || '8100'}`;
const FDB_BRIDGE_URL = `http://${process.env.FDB_BRIDGE_HOST || '127.0.0.1'}:${process.env.FDB_BRIDGE_PORT || '8200'}`;

// Middlewares globais
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Health check para Kernel
app.get('/health', async (req, res) => {
  const checks: any = {
    bi_api: 'healthy',
    metaset: 'unknown',
    fdb_bridge: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    const metasetHealth = await fetch(`${METASET_URL}/health`);
    checks.metaset = metasetHealth.ok ? 'healthy' : 'unhealthy';
  } catch (e) {
    checks.metaset = 'unreachable';
  }

  try {
    const fdbHealth = await fetch(`${FDB_BRIDGE_URL}/health`);
    checks.fdb_bridge = fdbHealth.ok ? 'healthy' : 'unreachable';
  } catch (e) {
    checks.fdb_bridge = 'unreachable';
  }

  const status = Object.values(checks).every((v: any) => v === 'healthy' || v === 'unknown') ? 200 : 503;
  res.status(status).json(checks);
});

// Middleware de autenticação simplificado
const verifyArcadiaToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const extractTenantContext = (req: any, res: any, next: any) => {
  req.tenantId = req.headers['x-tenant-id'] || '1';
  req.userId = req.headers['x-user-id'] || '1';
  req.userRole = req.headers['x-user-role'] || 'viewer';
  req.arcadiaToken = req.headers.authorization?.replace('Bearer ', '');
  next();
};

// Proxy manual para MetaSet usando http nativo
app.all('/bi/metaset/*', verifyArcadiaToken, extractTenantContext, async (req: any, res: any) => {
  const targetPath = req.path.replace('/bi/metaset', '');
  const targetUrl = new URL(`${METASET_URL}${targetPath || '/'}`);

  console.log(`[BI-API] Proxy: ${req.method} ${req.path} -> ${targetUrl.toString()}`);

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Authorization': req.headers.authorization || '',
      'X-Tenant-ID': req.tenantId,
      'X-User-ID': req.userId,
      'X-User-Role': req.userRole,
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode || 200);
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      if (value && key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[BI-API] MetaSet proxy error:', err.message);
    res.status(503).json({ error: 'MetaSet temporarily unavailable' });
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
});

// Proxy manual para FDB-Bridge
app.all('/bi/fdb/*', verifyArcadiaToken, extractTenantContext, async (req: any, res: any) => {
  const targetPath = req.path.replace('/bi/fdb', '');
  const targetUrl = `${FDB_BRIDGE_URL}${targetPath || '/'}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Authorization': req.headers.authorization || '',
      'X-Tenant-ID': req.tenantId,
    };

    const fetchOptions: any = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const body = await response.text();

    res.status(response.status);
    res.send(body);
  } catch (error: any) {
    console.error('[BI-API] FDB-Bridge proxy error:', error.message);
    res.status(503).json({ error: 'FDB-Bridge temporarily unavailable' });
  }
});

// Rotas nativas do BI Arcadia
app.get('/bi/api/dashboards', verifyArcadiaToken, (req, res) => {
  res.json({ dashboards: [], message: 'BI API - Dashboards endpoint' });
});

// Embed de dashboards
app.get('/bi/embed/dashboard/:id', verifyArcadiaToken, extractTenantContext, async (req: any, res: any) => {
  const dashboardId = req.params.id;
  const tenantId = req.tenantId;

  res.json({
    embed_url: `${METASET_URL}/embedded/${dashboardId}?tenant=${tenantId}`,
    dashboard_id: dashboardId,
    tenant_id: tenantId
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BI-API] Gateway iniciado na porta ${PORT}`);
  console.log(`[BI-API] MetaSet: ${METASET_URL}`);
  console.log(`[BI-API] FDB-Bridge: ${FDB_BRIDGE_URL}`);
});

export default app;
