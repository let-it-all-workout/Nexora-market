import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stockRouter } from './routes/stocks.js';
import { cryptoRouter } from './routes/crypto.js';
import { fxRouter } from './routes/fx.js';
import { ngxRouter } from './routes/ngx.js';
import {
  apiRateLimiter,
  contentSecurityPolicy,
  inlineScriptHashes,
  ngxRateLimiter,
} from './security.js';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(appDirectory, '../../frontend/dist');

function corsOptions(origin, callback) {
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const development = process.env.NODE_ENV !== 'production';
  const allowed = development
    ? [
      ...configured,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ]
      : configured;

  if (!origin || allowed.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
}

export function createApp() {
  const app = express();
  const production = process.env.NODE_ENV === 'production';
  const serveFrontend = production && existsSync(frontendDist);

  // Railway, Vercel, and most PaaS hosts terminate TLS at their edge, so the
  // client IP and protocol arrive in X-Forwarded-* headers. Without this the
  // rate limiter would bucket every visitor under the proxy's address.
  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: serveFrontend
      ? contentSecurityPolicy({
        scriptHashes: inlineScriptHashes(path.join(frontendDist, 'index.html')),
        supabaseUrl: process.env.SUPABASE_URL,
      })
      : false,
    // Charts are read from our own origin only; this keeps the API embeddable
    // by nothing while still allowing the SPA to load its own assets.
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  app.use(compression());
  app.use(express.json({ limit: '256kb' }));

  // Scoped to the API on purpose. Vite tags its own bundles with `crossorigin`,
  // so the browser sends an Origin header when fetching them; a global CORS
  // check would reject the app's own assets and serve a blank page.
  app.use('/api', cors({ origin: corsOptions }));

  // Cheap, and used as the platform health probe, so it sits ahead of the
  // rate limiter to keep restarts from being throttled.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', apiRateLimiter());
  app.use('/api/ngx', ngxRateLimiter());

  app.use('/api/stocks', stockRouter);
  app.use('/api/crypto', cryptoRouter);
  app.use('/api/fx', fxRouter);
  app.use('/api/ngx', ngxRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'No such API route.', code: 'NOT_FOUND' });
  });

  if (serveFrontend) {
    app.use(express.static(frontendDist, {
      // Vite fingerprints asset filenames, so they can be cached hard while
      // index.html stays fresh.
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      return res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    if (!err?.status || err.status >= 500) console.error(err);
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.', code: 'PAYLOAD_TOO_LARGE' });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Request body must be valid JSON.', code: 'INVALID_JSON' });
    }
    if (/not allowed by cors/i.test(err?.message || '')) {
      return res.status(403).json({ error: 'Origin is not allowed.', code: 'CORS_DENIED' });
    }
    if (err?.status) {
      return res.status(err.status).json({ error: err.message, code: err.code || 'REQUEST_FAILED' });
    }
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}
