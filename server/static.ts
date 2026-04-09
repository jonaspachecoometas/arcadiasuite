import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // NOTA: Gzip é gerenciado pelo Traefik (coolify-proxy)
  // Não usar middleware compression aqui para evitar conflito
  // O Traefik já tem: traefik.http.middlewares.gzip.compress=true

  // Serve static files with proper caching
  app.use(express.static(distPath, {
    maxAge: '1y', // Cache static assets for 1 year (they have hash in filename)
    etag: true,
    lastModified: true,
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
