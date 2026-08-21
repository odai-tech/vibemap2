import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(here, '../data');

export const config = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '127.0.0.1',
  production: process.env.NODE_ENV === 'production',
  /** One-tap demo login. Disable with DEMO=0 for a real deployment. */
  demoEnabled: process.env.DEMO !== '0',
  dataDir,
  dbFile: path.join(dataDir, 'vibemap.db'),
  clientDist: path.resolve(here, '../../client/dist'),
  sessionCookie: 'vm_session',
  sessionTtlMs: 30 * 24 * 3600_000,
  bodyLimitBytes: 64 * 1024,
};
