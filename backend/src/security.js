import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import rateLimit from 'express-rate-limit';

/**
 * index.html carries one small inline script that sets the theme before paint,
 * which a strict `script-src 'self'` would block. Hashing it keeps the policy
 * strict without an 'unsafe-inline' escape hatch, and the hash follows the file
 * automatically if that script is ever edited.
 */
export function inlineScriptHashes(indexHtmlPath) {
  try {
    const html = readFileSync(indexHtmlPath, 'utf8');
    const hashes = [];
    // Only bodies of scripts with no src attribute are inline.
    const pattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const body = match[1];
      if (!body) continue;
      hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
    }
    return hashes;
  } catch {
    return [];
  }
}

export function contentSecurityPolicy({ scriptHashes = [], supabaseUrl = '' } = {}) {
  const supabaseOrigins = supabaseUrl
    ? [supabaseUrl.replace(/\/$/, '')]
    : ['https://*.supabase.co'];

  return {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'form-action': ["'self'"],
      'script-src': ["'self'", ...scriptHashes],
      // Recharts and the theme system set element styles at runtime.
      'style-src': ["'self'", "'unsafe-inline'"],
      // News thumbnails come from whichever CDN the publisher uses (Yahoo
      // proxies its own through s.yimg.com), so the host cannot be pinned.
      // Images carry no execution risk, and script-src stays strict.
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      // Same-origin for our own API, plus Supabase for auth and the watchlist.
      'connect-src': ["'self'", ...supabaseOrigins, 'https://*.supabase.co', 'wss://*.supabase.co'],
      'upgrade-insecure-requests': [],
    },
  };
}

const limiterDefaults = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // A page view fans out into several chart/indicator calls, so limits are per
  // window rather than per second.
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests. Wait a moment and try again.',
      code: 'RATE_LIMITED',
    });
  },
};

/** Broad ceiling so one client cannot saturate the upstream data providers. */
export function apiRateLimiter() {
  return rateLimit({
    ...limiterDefaults,
    windowMs: 15 * 60 * 1000,
    limit: 600,
  });
}

/**
 * NGX requests spend a metered third-party API key, so they get a tighter
 * ceiling than the free Yahoo and CoinGecko routes.
 */
export function ngxRateLimiter() {
  return rateLimit({
    ...limiterDefaults,
    windowMs: 5 * 60 * 1000,
    limit: 120,
  });
}
