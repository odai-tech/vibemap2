/**
 * Minimal, auditable HTTP layer on top of node:http.
 * Routing with :params, JSON bodies with a hard size cap, cookies,
 * same-origin checks for mutating requests, and hardened static file serving.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { config } from '../config.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  cookies: Record<string, string>;
  body: unknown;
  ip: string;
  /** Populated by the auth middleware. */
  userId: string | null;
}

export type Handler = (ctx: Ctx) => unknown | Promise<unknown>;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

export class App {
  private routes: Route[] = [];

  on(method: string, pattern: string, handler: Handler) {
    this.routes.push({
      method,
      segments: pattern.split('/').filter(Boolean),
      handler,
    });
    return this;
  }

  get(p: string, h: Handler) {
    return this.on('GET', p, h);
  }
  post(p: string, h: Handler) {
    return this.on('POST', p, h);
  }
  patch(p: string, h: Handler) {
    return this.on('PATCH', p, h);
  }
  delete(p: string, h: Handler) {
    return this.on('DELETE', p, h);
  }

  private match(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    const parts = pathname.split('/').filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < parts.length; i++) {
        const seg = route.segments[i];
        if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(parts[i]);
        else if (seg !== parts[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { route, params };
    }
    return null;
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const started = Date.now();
    const url = new URL(req.url || '/', 'http://localhost');
    const method = req.method || 'GET';
    const pathname = url.pathname;

    setSecurityHeaders(res);

    try {
      if (pathname.startsWith('/api/')) {
        if (method !== 'GET' && method !== 'HEAD') assertSameOrigin(req);
        const matched = this.match(method, pathname);
        if (!matched) throw new HttpError(404, 'Not found');

        const ctx: Ctx = {
          req,
          res,
          method,
          path: pathname,
          params: matched.params,
          query: url.searchParams,
          cookies: parseCookies(req.headers.cookie),
          body: await readJsonBody(req, method),
          ip: clientIp(req),
          userId: null,
        };
        const result = await matched.route.handler(ctx);
        if (!res.writableEnded) sendJson(res, 200, result ?? { ok: true }, acceptsGzip(req));
      } else if (config.production && (method === 'GET' || method === 'HEAD')) {
        serveStatic(pathname, res, acceptsGzip(req));
      } else {
        throw new HttpError(404, 'Not found');
      }
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) console.error(`[api] ${method} ${pathname} →`, err);
      if (!res.writableEnded) {
        sendJson(res, status, {
          error: err instanceof HttpError ? err.message : 'Internal server error',
        });
      }
    }
    if (!config.production) {
      console.log(`${method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  }
}

function acceptsGzip(req: IncomingMessage): boolean {
  return /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
}

export function sendJson(res: ServerResponse, status: number, data: unknown, gzipOk = false) {
  let payload: Buffer | string = JSON.stringify(data);
  const headers: Record<string, string | number> = { 'Content-Type': 'application/json; charset=utf-8' };
  // Compress anything past ~1KB — pin lists shrink ~5×, and the sync cost is microseconds.
  if (gzipOk && Buffer.byteLength(payload) >= 1024) {
    payload = zlib.gzipSync(payload);
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }
  headers['Content-Length'] = Buffer.byteLength(payload as string);
  res.writeHead(status, headers);
  res.end(payload);
}

function setSecurityHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=()');
  if (config.production) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.basemaps.cartocdn.com",
        "connect-src 'self'",
        "font-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
      ].join('; '),
    );
  }
}

/** CSRF guard: browsers always send Origin on cross-site POSTs. */
function assertSameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  if (!origin) return; // non-browser client (curl, tests)
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Bad origin');
  }
  const host = req.headers.host;
  if (!host || originHost !== host) throw new HttpError(403, 'Cross-origin request blocked');
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

export function setSessionCookie(res: ServerResponse, token: string, maxAgeMs: number) {
  const attrs = [
    `${config.sessionCookie}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (config.production) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function clearSessionCookie(res: ServerResponse) {
  res.setHeader('Set-Cookie', `${config.sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress || 'unknown';
}

async function readJsonBody(req: IncomingMessage, method: string): Promise<unknown> {
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') return null;
  const lengthHeader = Number(req.headers['content-length'] || 0);
  if (lengthHeader > config.bodyLimitBytes) throw new HttpError(413, 'Body too large');

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > config.bodyLimitBytes) throw new HttpError(413, 'Body too large');
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.webmanifest', '.map']);

/** SPA static serving with path-traversal protection, gzip, and sane caching. */
function serveStatic(pathname: string, res: ServerResponse, gzipOk: boolean) {
  const root = config.clientDist;
  let filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) throw new HttpError(403, 'Forbidden');

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(root, 'index.html'); // SPA fallback
  }
  if (!fs.existsSync(filePath)) throw new HttpError(404, 'Client build not found — run `npm run build`');

  const ext = path.extname(filePath);
  const immutable = pathname.startsWith('/assets/');
  const headers: Record<string, string> = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  const stream = fs.createReadStream(filePath);
  if (gzipOk && COMPRESSIBLE.has(ext)) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    res.writeHead(200, headers);
    stream.pipe(zlib.createGzip({ level: 6 })).pipe(res);
    return;
  }
  res.writeHead(200, headers);
  stream.pipe(res);
}
