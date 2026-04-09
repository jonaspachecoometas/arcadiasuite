import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import compression from "compression";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Enable gzip compression for static assets
  // Caddy/Traefik devem respeitar isso ou fazer override
  app.use(compression({
    level: 6,
    threshold: 1024, // Compress files > 1KB
    filter: (req, res) => {
      // Don't compress if already compressed by proxy
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Compress JS, CSS, JSON, HTML
      const contentType = res.getHeader('content-type') || '';
      if (typeof contentType === 'string') {
        if (contentType.includes('javascript') ||
            contentType.includes('css') ||
            contentType.includes('json') ||
            contentType.includes('html')) {
          return true;
        }
      }
      return compression.filter(req, res);
    },
  }));

  // Serve static files with proper caching
  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
