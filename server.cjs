'use strict';

const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// Health check — cPanel and uptime monitors can ping this
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gzip all responses
app.use(compression());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );
  next();
});

// Long-lived cache for content-hashed assets (Vite puts everything in /assets/)
app.use(
  '/assets',
  express.static(path.join(DIST, 'assets'), {
    maxAge: '1y',
    immutable: true,
  })
);

// Short cache for root-level files (favicon, manifest, _redirects, etc.)
app.use(
  express.static(DIST, {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    // Never cache index.html — always serve fresh so new deploys are picked up
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  })
);

// SPA fallback — all unknown paths return index.html
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Tamrakar Complex server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
