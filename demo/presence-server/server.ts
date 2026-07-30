/**
 * Demo-only presence server (successor to the prototype `server/index.js`).
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no persistence, no auth. It fans
 * pointer and edit-context events out to the OTHER sockets sharing the same
 * `appId` room, and broadcasts a leave on disconnect. Ephemeral in-memory
 * rooms only.
 *
 * SECURITY: unlike the prototype (`cors.origin: (origin, cb) => cb(null, true)`
 * allow-all), this server uses an EXPLICIT allowed origin. A handshake from any
 * other origin is rejected by Socket.IO's CORS. `origin: "*"` and permissive
 * callbacks are intentionally NOT used.
 */

import { createServer, type Server as HttpServer } from "node:http";
import { Server as SocketIoServer } from "socket.io";

/** Default demo origin — the admin Vite dev server. */
export const DEFAULT_DEMO_ORIGIN = "http://localhost:5173";

export interface PresenceServerOptions {
  /** Port to listen on. `0` picks a free port (useful for tests). */
  port?: number;
  /**
   * The EXPLICIT allowed origin(s). A single string or a list. Never `"*"`.
   * Defaults to {@link DEFAULT_DEMO_ORIGIN}.
   */
  allowedOrigin?: string | string[];
}

export interface RunningPresenceServer {
  /** The actual bound port (resolved even when `port: 0` was requested). */
  port: number;
  /** The underlying Socket.IO server. */
  io: SocketIoServer;
  /** The underlying HTTP server. */
  http: HttpServer;
  /** Stop listening and close all connections. */
  close(): Promise<void>;
}

const CLIENT_POINTER = "presence:pointer";
const CLIENT_EDIT_CONTEXT = "presence:edit-context";
const SERVER_POINTER = "presence:server-pointer";
const SERVER_EDIT_CONTEXT = "presence:server-edit-context";
const SERVER_LEAVE = "presence:server-leave";

interface Identity {
  id: string;
  name: string;
  color: string;
}

interface PointerEnvelope {
  from: Identity;
  pointer: { x: number; y: number };
}
interface EditContextEnvelope {
  from: Identity;
  editContext: { id: string; target: string } | null;
}

/**
 * Start the demo presence server. Returns a handle with the bound port and a
 * `close()` for teardown. Resolves once the server is listening.
 */
export function startPresenceServer(
  options: PresenceServerOptions = {},
): Promise<RunningPresenceServer> {
  const allowedOrigin = options.allowedOrigin ?? DEFAULT_DEMO_ORIGIN;
  const port = options.port ?? 4010;

  const allowList = new Set(
    Array.isArray(allowedOrigin) ? allowedOrigin : [allowedOrigin],
  );

  const http = createServer();
  const io = new SocketIoServer(http, {
    // EXPLICIT origin allow-list enforced by an actual membership check. This
    // is the deliberate correction of the prototype's `callback(null, true)`
    // allow-all: a request Origin that is not in `allowList` is denied (the
    // callback returns `false`), so no `Access-Control-Allow-Origin` header is
    // emitted for it. `origin: "*"` is never used.
    cors: {
      origin: (origin, callback) => {
        // Same-origin / non-CORS requests have no Origin header; allow them so
        // server-to-server and websocket callers are not blocked.
        if (origin === undefined || allowList.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const rawAppId = socket.handshake.query.appId;
    const appId = typeof rawAppId === "string" ? rawAppId : "default";
    // Join the per-app room so fan-out is scoped to sessions sharing the app.
    void socket.join(appId);

    // Track the last identity we saw so a disconnect can announce the leave.
    let lastIdentityId: string | null = null;

    socket.on(CLIENT_POINTER, (payload: PointerEnvelope) => {
      lastIdentityId = payload.from.id;
      // Fan out to OTHER sockets in the same room (sender excluded).
      socket.to(appId).emit(SERVER_POINTER, payload);
    });

    socket.on(CLIENT_EDIT_CONTEXT, (payload: EditContextEnvelope) => {
      lastIdentityId = payload.from.id;
      socket.to(appId).emit(SERVER_EDIT_CONTEXT, payload);
    });

    socket.on("disconnect", () => {
      if (lastIdentityId) {
        socket.to(appId).emit(SERVER_LEAVE, { from: lastIdentityId });
      }
    });
  });

  return new Promise((resolve) => {
    http.listen(port, () => {
      const address = http.address();
      const boundPort =
        typeof address === "object" && address ? address.port : port;
      resolve({
        port: boundPort,
        io,
        http,
        close: () =>
          new Promise<void>((res) => {
            io.close(() => res());
          }),
      });
    });
  });
}
