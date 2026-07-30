/**
 * Runnable entry for the demo presence server.
 *
 * Reads `PORT` and `ALLOWED_ORIGIN` from the environment (defaults: 4010 and
 * the admin Vite dev origin http://localhost:5173) and starts the server. This
 * is demo-only tooling; it is never bundled into the library.
 *
 * Run: `PORT=4010 ALLOWED_ORIGIN=http://localhost:5173 tsx demo/presence-server/index.ts`
 */

import { startPresenceServer, DEFAULT_DEMO_ORIGIN } from "./server.js";

const port = Number(process.env.PORT ?? 4010);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? DEFAULT_DEMO_ORIGIN;

void startPresenceServer({ port, allowedOrigin }).then((server) => {
  // Presence/editing terminology only — no "collaboration".
  process.stdout.write(
    `[presence] demo presence server listening on :${server.port} (allowed origin: ${allowedOrigin})\n`,
  );
});
