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

  // Enable gzip compression for all responses
  app.use(compression({
    level: 6, // balance between speed and compression
    filter: (req, res) => {
      // Compress all JSON and static assets
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  }));

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
