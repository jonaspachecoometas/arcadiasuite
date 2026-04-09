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

  // Middleware to serve pre-compressed .gz files
  app.use((req, res, next) => {
    const acceptEncoding = req.headers["accept-encoding"] || "";
    
    // Only handle GET/HEAD requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    
    // Check if client accepts gzip
    if (!acceptEncoding.includes("gzip")) {
      return next();
    }
    
    const url = req.url;
    // Only handle JS, CSS, and HTML files
    if (!url.match(/\.(js|css|html?)$/)) {
      return next();
    }
    
    const gzPath = path.join(distPath, url + ".gz");
    
    if (fs.existsSync(gzPath)) {
      // Set headers for gzip response
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      
      // Set correct content type
      if (url.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
      } else if (url.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css; charset=UTF-8");
      } else if (url.match(/\.html?$/)) {
        res.setHeader("Content-Type", "text/html; charset=UTF-8");
      }
      
      // Serve the gzipped file
      return res.sendFile(gzPath);
    }
    
    next();
  });

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
