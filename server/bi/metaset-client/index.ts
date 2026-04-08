/**
 * MetaSet Client - Apache Superset API Client
 * Arcádia Suite BI Integration
 * 
 * Substitui o cliente legado Metabase em /server/metaset/client.ts
 */

// Configuração
const METASET_HOST = process.env.METASET_HOST || "metaset";
const METASET_PORT = parseInt(process.env.METASET_PORT || "8100", 10);
const METASET_URL = `http://${METASET_HOST}:${METASET_PORT}`;
const METASET_TIMEOUT = 30000;

// Admin credentials para operações de sistema
const ADMIN_USERNAME = process.env.METASET_ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.METASET_ADMIN_PASSWORD || "metaset2026";

// Cache de tokens
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// =============================================================================
// AUTH & HTTP UTILS
// =============================================================================

async function metasetFetch(path: string, options: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), METASET_TIMEOUT);

  try {
    const token = await getAccessToken();
    const url = `${METASET_URL}${path}`;
    
    console.log(`[MetaSet Client] ${options.method || 'GET'} ${path}`);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    
    clearTimeout(timeout);

    if (response.status === 401) {
      accessToken = null;
      const newToken = await getAccessToken();
      
      const retry = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${newToken}`,
          ...(options.headers || {}),
        },
      });
      
      if (!retry.ok) {
        const err = await retry.text().catch(() => "Unknown error");
        throw new Error(`MetaSet API error ${retry.status}: ${err}`);
      }
      return await retry.json().catch(() => ({}));
    }

    if (!response.ok) {
      const err = await response.text().catch(() => "Unknown error");
      throw new Error(`MetaSet API error ${response.status}: ${err}`);
    }

    if (response.status === 204) {
      return { success: true };
    }

    return await response.json().catch(() => ({}));
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("MetaSet timeout - motor BI indisponível");
    }
    throw err;
  }
}

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch(`${METASET_URL}/api/v1/security/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        provider: "db",
        refresh: true,
      }),
    });

    if (!response.ok) {
      throw new Error("Falha ao autenticar no MetaSet");
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (14 * 60 * 1000);
    
    return accessToken!;
  } catch (err) {
    console.error("[MetaSet Client] Auth error:", err);
    throw new Error("Falha na autenticação com MetaSet BI");
  }
}

// =============================================================================
// HEALTH & STATUS
// =============================================================================

export async function isHealthy(): Promise<{ online: boolean; version?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${METASET_URL}/health`, { 
      signal: controller.signal 
    });
    
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { 
        online: true, 
        version: data.version || "4.1.0-arcadia" 
      };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

// =============================================================================
// DATABASES
// =============================================================================

export interface Database {
  id: number;
  name: string;
  engine: string;
  created_at: string;
}

export async function listDatabases(): Promise<Database[]> {
  const data = await metasetFetch("/api/v1/database/");
  return (data.result || []).map((d: any) => ({
    id: d.id,
    name: d.database_name,
    engine: d.backend,
    created_at: d.created_on,
  }));
}

export async function getDatabase(databaseId: number): Promise<Database> {
  const data = await metasetFetch(`/api/v1/database/${databaseId}`);
  return {
    id: data.result.id,
    name: data.result.database_name,
    engine: data.result.backend,
    created_at: data.result.created_on,
  };
}

export async function createDatabase(params: {
  name: string;
  engine: string;
  configuration: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
}): Promise<Database> {
  const sqlUri = `${params.engine}://${params.configuration.username}:${params.configuration.password}@${params.configuration.host}:${params.configuration.port}/${params.configuration.database}`;
  
  const data = await metasetFetch("/api/v1/database/", {
    method: "POST",
    body: JSON.stringify({
      database_name: params.name,
      engine: params.engine,
      configuration: {
        sqlalchemy_uri: sqlUri,
      },
    }),
  });
  
  return {
    id: data.result.id,
    name: data.result.database_name,
    engine: data.result.backend,
    created_at: data.result.created_on,
  };
}

export async function syncDatabaseSchema(databaseId: number): Promise<void> {
  await metasetFetch(`/api/v1/database/${databaseId}/sync/`, {
    method: "PUT",
  });
}

// =============================================================================
// TABLES
// =============================================================================

export interface Table {
  id: number;
  name: string;
  schema: string;
  databaseId: number;
}

export async function getDatabaseTables(databaseId: number): Promise<Table[]> {
  const data = await metasetFetch(`/api/v1/database/${databaseId}/tables/`);
  return (data.result || []).map((t: any) => ({
    id: t.id,
    name: t.table_name,
    schema: t.schema,
    databaseId: t.database_id,
  }));
}

export async function getTableMetadata(tableId: number): Promise<any> {
  return await metasetFetch(`/api/v1/dataset/${tableId}`);
}

// =============================================================================
// SQL QUERIES
// =============================================================================

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
}

export async function executeSql(
  databaseId: number, 
  query: string,
  options: { limit?: number; async?: boolean } = {}
): Promise<QueryResult> {
  const safeQueries = ["SELECT", "WITH", "EXPLAIN", "SHOW", "DESCRIBE"];
  const upper = query.trim().toUpperCase();
  
  if (!safeQueries.some(sq => upper.startsWith(sq))) {
    throw new Error("Apenas consultas SELECT são permitidas");
  }

  const dangerous = [/;\s*(?:DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE)/i, /--/, /\/\*/];
  if (dangerous.some(p => p.test(query))) {
    throw new Error("Consulta contém padrões proibidos");
  }

  const finalQuery = options.limit 
    ? `${query.replace(/;\s*$/, "")} LIMIT ${options.limit}` 
    : query;

  const data = await metasetFetch("/api/v1/sqllab/execute/", {
    method: "POST",
    body: JSON.stringify({
      database_id: databaseId,
      sql: finalQuery,
      async: options.async || false,
    }),
  });

  return {
    columns: (data.result?.columns || []).map((c: any) => c.name),
    rows: data.result?.data || [],
    rowCount: data.result?.data?.length || 0,
  };
}

// =============================================================================
// CHARTS
// =============================================================================

export interface Chart {
  id: number;
  name: string;
  description?: string;
  vizType: string;
  createdAt: string;
}

export async function listCharts(): Promise<Chart[]> {
  const data = await metasetFetch("/api/v1/chart/");
  return (data.result || []).map((c: any) => ({
    id: c.id,
    name: c.slice_name,
    description: c.description,
    vizType: c.viz_type,
    createdAt: c.created_on,
  }));
}

export async function getChart(chartId: number): Promise<any> {
  return await metasetFetch(`/api/v1/chart/${chartId}`);
}

export async function createChart(params: {
  name: string;
  datasetId: number;
  vizType: string;
  params: Record<string, any>;
}): Promise<Chart> {
  const data = await metasetFetch("/api/v1/chart/", {
    method: "POST",
    body: JSON.stringify({
      slice_name: params.name,
      datasource_id: params.datasetId,
      datasource_type: "table",
      viz_type: params.vizType,
      params: JSON.stringify(params.params),
    }),
  });

  return {
    id: data.result.id,
    name: data.result.slice_name,
    description: data.result.description,
    vizType: data.result.viz_type,
    createdAt: data.result.created_on,
  };
}

export async function deleteChart(chartId: number): Promise<void> {
  await metasetFetch(`/api/v1/chart/${chartId}`, {
    method: "DELETE",
  });
}

// =============================================================================
// DASHBOARDS
// =============================================================================

export interface Dashboard {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  changedOn?: string;
  published?: boolean;
}

export async function listDashboards(): Promise<Dashboard[]> {
  const data = await metasetFetch("/api/v1/dashboard/");
  return (data.result || []).map((d: any) => ({
    id: d.id,
    name: d.dashboard_title,
    description: d.description,
    createdAt: d.created_on,
    changedOn: d.changed_on,
    published: d.published,
  }));
}

export async function getDashboard(dashboardId: number): Promise<any> {
  return await metasetFetch(`/api/v1/dashboard/${dashboardId}`);
}

export async function createDashboard(params: {
  name: string;
  description?: string;
  published?: boolean;
}): Promise<Dashboard> {
  const data = await metasetFetch("/api/v1/dashboard/", {
    method: "POST",
    body: JSON.stringify({
      dashboard_title: params.name,
      description: params.description,
      published: params.published || false,
    }),
  });

  return {
    id: data.result.id,
    name: data.result.dashboard_title,
    description: data.result.description,
    createdAt: data.result.created_on,
    published: data.result.published,
  };
}

export async function updateDashboard(
  dashboardId: number, 
  params: Partial<Dashboard>
): Promise<Dashboard> {
  const data = await metasetFetch(`/api/v1/dashboard/${dashboardId}`, {
    method: "PUT",
    body: JSON.stringify({
      dashboard_title: params.name,
      description: params.description,
      published: params.published,
    }),
  });

  return {
    id: data.result.id,
    name: data.result.dashboard_title,
    description: data.result.description,
    createdAt: data.result.created_on,
    published: data.result.published,
  };
}

export async function deleteDashboard(dashboardId: number): Promise<void> {
  await metasetFetch(`/api/v1/dashboard/${dashboardId}`, {
    method: "DELETE",
  });
}

// =============================================================================
// EMBEDDING
// =============================================================================

export interface GuestTokenRequest {
  resources: Array<{
    type: "dashboard" | "chart";
    id: string | number;
  }>;
  rls?: Array<{
    dataset: number;
    clause: string;
  }>;
  user?: {
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

export async function createGuestToken(request: GuestTokenRequest): Promise<string> {
  const data = await metasetFetch("/api/v1/security/guest_token/", {
    method: "POST",
    body: JSON.stringify(request),
  });
  
  return data.result?.token;
}

// =============================================================================
// AUTO-SUGGESTIONS
// =============================================================================

export async function getAutoSuggestions(tableName: string): Promise<{
  suggestedCharts: string[];
  suggestedQueries: string[];
}> {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const columns = result.rows as Array<{ column_name: string; data_type: string }>;

    const numericCols = columns.filter(c =>
      ["integer", "bigint", "numeric", "real", "double precision", "decimal"].includes(c.data_type)
    );
    const dateCols = columns.filter(c =>
      ["timestamp", "timestamp without time zone", "timestamp with time zone", "date"].includes(c.data_type)
    );
    const textCols = columns.filter(c =>
      ["text", "character varying", "varchar", "char"].includes(c.data_type)
    );

    const suggestedCharts: string[] = [];
    const suggestedQueries: string[] = [];

    if (numericCols.length > 0 && dateCols.length > 0) {
      suggestedCharts.push("line", "area", "time-series");
      suggestedQueries.push(
        `SELECT ${dateCols[0].column_name}::date as period, SUM(${numericCols[0].column_name}) as total FROM ${tableName} GROUP BY 1 ORDER BY 1`
      );
    }

    if (numericCols.length > 0 && textCols.length > 0) {
      suggestedCharts.push("bar", "pie", "donut");
      suggestedQueries.push(
        `SELECT ${textCols[0].column_name}, SUM(${numericCols[0].column_name}) as total FROM ${tableName} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`
      );
    }

    if (numericCols.length >= 2) {
      suggestedCharts.push("scatter", "bubble");
      suggestedQueries.push(
        `SELECT ${numericCols[0].column_name}, ${numericCols[1].column_name} FROM ${tableName} LIMIT 500`
      );
    }

    suggestedQueries.push(`SELECT COUNT(*) as total_records FROM ${tableName}`);
    suggestedQueries.push(`SELECT * FROM ${tableName} LIMIT 100`);

    return { suggestedCharts, suggestedQueries };
  } catch {
    return { 
      suggestedCharts: ["table"], 
      suggestedQueries: [`SELECT * FROM ${tableName} LIMIT 100`] 
    };
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const metasetClient = {
  isHealthy,
  listDatabases,
  getDatabase,
  createDatabase,
  syncDatabaseSchema,
  getDatabaseTables,
  getTableMetadata,
  executeSql,
  listCharts,
  getChart,
  createChart,
  deleteChart,
  listDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  createGuestToken,
  getAutoSuggestions,
  getUrl: () => METASET_URL,
  getPort: () => METASET_PORT,
};

export default metasetClient;
