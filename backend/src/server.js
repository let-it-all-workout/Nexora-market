import http from 'node:http';
import { createApp } from './app.js';
import { startAutoWarm } from './warmup.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

const server = http.createServer(app);

// Bind on all interfaces: container platforms route to the published port from
// outside the container, so listening on localhost only would fail health checks.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on :${PORT}`);
  // The pre-fetch loop keeps charts instant but spends provider quota even with
  // no visitors, so it can be switched off per environment.
  if (process.env.WARM_CACHE !== '0') startAutoWarm();
});

// Platforms send SIGTERM before replacing a container. Closing the listener lets
// in-flight requests finish instead of being cut off mid-response.
function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Don't hang forever on a stuck upstream request.
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
