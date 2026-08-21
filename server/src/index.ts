/**
 * VibeMap server — fully self-contained:
 *   • node:http + hand-rolled router (no web framework)
 *   • node:sqlite for storage (no database server)
 *   • node:crypto scrypt for passwords (no auth provider)
 *   • local vibe engine (no AI APIs)
 * The only dependency is `ws` for WebSockets.
 */
import http from 'node:http';
import { App } from './lib/http.ts';
import { attachWebSockets } from './lib/ws.ts';
import { authRoutes } from './routes/auth.ts';
import { pinRoutes } from './routes/pins.ts';
import { socialRoutes } from './routes/social.ts';
import { userRoutes } from './routes/users.ts';
import { discoveryRoutes } from './routes/discovery.ts';
import { dmRoutes } from './routes/dm.ts';
import { seedIfEmpty } from './seed.ts';
import { config } from './config.ts';

const app = new App();
authRoutes(app);
pinRoutes(app);
socialRoutes(app);
userRoutes(app);
discoveryRoutes(app);
dmRoutes(app);
app.get('/api/health', () => ({ ok: true, ts: Date.now() }));

await seedIfEmpty();

const server = http.createServer((req, res) => {
  void app.handle(req, res);
});
attachWebSockets(server);

server.listen(config.port, config.host, () => {
  console.log(`VibeMap API listening on http://${config.host}:${config.port} (${config.production ? 'production' : 'dev'})`);
});
