import type { Express, Request, Response } from "express";

const SUPERSET_HOST = process.env.SUPERSET_HOST || "superset";
const SUPERSET_PORT = parseInt(process.env.SUPERSET_PORT || "8088", 10);
const SUPERSET_URL = `http://${SUPERSET_HOST}:${SUPERSET_PORT}`;
const ADMIN_USER = process.env.SUPERSET_ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.SUPERSET_ADMIN_PASSWORD || "arcadia1337";

// Cache do service token (expira em 50 min)
let serviceToken: string | null = null;
let serviceTokenExpiry = 0;

async function getServiceToken(): Promise<string> {
  if (serviceToken && Date.now() < serviceTokenExpiry) return serviceToken;

  const resp = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: ADMIN_USER,
      password: ADMIN_PASS,
      provider: "db",
      refresh: true,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`Falha ao autenticar no Superset: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  serviceToken = data.access_token;
  serviceTokenExpiry = Date.now() + 50 * 60 * 1000;
  return serviceToken!;
}

async function supersetFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getServiceToken();
  const resp = await fetch(`${SUPERSET_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (resp.status === 401) {
    // Token expirado — forçar renovação
    serviceToken = null;
    serviceTokenExpiry = 0;
    return supersetFetch(path, options);
  }

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`Superset API ${resp.status}: ${err}`);
  }

  return resp.json().catch(() => ({}));
}

export function registerSupersetRoutes(app: Express): void {

  // Guest Token — para embedding em qualquer tela React
  app.post("/api/superset/guest-token", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

      const { dashboardId } = req.body;
      if (!dashboardId) return res.status(400).json({ error: "dashboardId obrigatório" });

      const token = await getServiceToken();
      const user = req.user as any;

      const guestResp = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: {
            username: `arcadia_${user?.id || "guest"}`,
            first_name: user?.name?.split(" ")[0] || "User",
            last_name: user?.name?.split(" ").slice(1).join(" ") || "",
          },
          resources: [{ type: "dashboard", id: dashboardId }],
          rls: [],
        }),
      });

      if (!guestResp.ok) {
        const err = await guestResp.text();
        return res.status(502).json({ error: "Falha ao gerar guest token", detail: err });
      }

      const { token: guestToken } = await guestResp.json();
      res.json({ token: guestToken, supersetUrl: "/superset" });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Lista dashboards
  app.get("/api/superset/dashboards", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const data = await supersetFetch(
        "/api/v1/dashboard/?q=(order_column:changed_on_delta_humanized,order_direction:desc,page_size:50)"
      );
      res.json(data.result || []);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Lista charts
  app.get("/api/superset/charts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
      const data = await supersetFetch("/api/v1/chart/?q=(page_size:50)");
      res.json(data.result || []);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Health check
  app.get("/api/superset/health", async (_req: Request, res: Response) => {
    try {
      const resp = await fetch(`${SUPERSET_URL}/health`);
      res.json({ online: resp.ok, url: SUPERSET_URL });
    } catch {
      res.json({ online: false, url: SUPERSET_URL });
    }
  });

  // Manter compatibilidade com rotas antigas do MetaSet
  app.get("/api/bi/metaset/health", async (_req: Request, res: Response) => {
    try {
      const resp = await fetch(`${SUPERSET_URL}/health`);
      res.json({ service: "Superset", online: resp.ok });
    } catch {
      res.json({ service: "Superset", online: false });
    }
  });

  // Autologin — faz login transparente no Superset e redireciona para /superset/
  app.get("/api/bi/superset/autologin", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });

      // Passo 1: obter CSRF token da página de login
      const loginPageResp = await fetch(`${SUPERSET_URL}/login/`);
      const loginPageText = await loginPageResp.text();
      const csrfMatch = loginPageText.match(/name="csrf_token"[\s\S]*?value="([^"]+)"/);
      if (!csrfMatch) return res.status(502).json({ error: "CSRF token não encontrado no Superset" });

      const csrfToken = csrfMatch[1];
      const initialCookies = loginPageResp.headers.get("set-cookie") || "";

      // Passo 2: fazer POST de login com as credenciais de admin
      const formBody = new URLSearchParams({
        username: ADMIN_USER,
        password: ADMIN_PASS,
        csrf_token: csrfToken,
      });

      const loginResp = await fetch(`${SUPERSET_URL}/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: initialCookies,
        },
        body: formBody.toString(),
        redirect: "manual",
      });

      // Passo 3: extrair o cookie de sessão e repassar ao browser
      const setCookieRaw = loginResp.headers.get("set-cookie") || "";
      const sessionMatch = setCookieRaw.match(/session=([^;]+)/);
      if (sessionMatch) {
        res.cookie("session", sessionMatch[1], {
          domain: ".onboardbi.com.br",
          secure: true,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
        });
      }

      res.redirect("https://bi.onboardbi.com.br/superset/welcome/");
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  console.log("[Superset] Rotas registradas em /api/superset/*");
}
