// @vitest-environment node
/**
 * Smoke test for the demo presence server + Socket.IO client adapter.
 *
 * PRESENCE / EDIT-LOCKS ONLY. Verifies (TC-001) that two clients in the same
 * `appId` room exchange pointer + edit-context while a client in a different
 * room receives nothing, and (TC-002) that the EXPLICIT CORS origin rejects a
 * disallowed origin's handshake while allowing the configured one.
 *
 * Timing uses generous waits (smoke-grade); deterministic deep coverage lives
 * in the mock-adapter unit + Playwright scenarios.
 */

import { afterEach, describe, expect, it } from "vitest";
import { io as ioClient, type Socket } from "socket.io-client";
import {
  startPresenceServer,
  type RunningPresenceServer,
} from "./server.js";
import { SocketIoPresenceProvider } from "../../src/presence/SocketIoPresenceProvider.js";
import type { MinimalSocket, SocketFactory } from "../../src/presence/SocketIoPresenceProvider.js";
import type { Participant } from "../../src/presence/PresenceProvider.js";

const ALLOWED = "http://localhost:5173";

let server: RunningPresenceServer | null = null;
const clients: Array<{ disconnect(): void }> = [];

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  if (server) {
    await server.close();
    server = null;
  }
});

/** A SocketFactory backed by a real socket.io-client connection. */
function realFactory(): SocketFactory {
  return ({ url, appId }) => {
    const socket: Socket = ioClient(url, {
      query: { appId },
      transports: ["websocket"],
      forceNew: true,
    });
    clients.push(socket);
    return socket as unknown as MinimalSocket;
  };
}

function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = (): void => {
      if (cond()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("timeout"));
      setTimeout(tick, 25);
    };
    tick();
  });
}

describe("demo presence server (TC-001)", () => {
  it("fans pointer + editContext to same-appId peers, isolates other rooms", async () => {
    server = await startPresenceServer({ port: 0, allowedOrigin: ALLOWED });
    const url = `http://localhost:${server.port}`;

    const a = new SocketIoPresenceProvider({
      url,
      appId: "app-1",
      self: { id: "A", name: "Ada", color: "#f00" },
      socketFactory: realFactory(),
    });
    const b = new SocketIoPresenceProvider({
      url,
      appId: "app-1",
      self: { id: "B", name: "Bo", color: "#00f" },
      socketFactory: realFactory(),
    });
    const c = new SocketIoPresenceProvider({
      url,
      appId: "app-2", // different room
      self: { id: "C", name: "Cy", color: "#0f0" },
      socketFactory: realFactory(),
    });

    let bList: Participant[] = [];
    let cList: Participant[] = [];
    b.subscribe((ps) => (bList = ps));
    c.subscribe((ps) => (cList = ps));

    a.connect();
    b.connect();
    c.connect();

    // Let sockets join their rooms.
    await new Promise((r) => setTimeout(r, 150));

    a.publishPointer({ x: 50, y: 60 });
    a.publishEditContext({ id: "c9", target: "t-card" });

    await waitFor(() => {
      const seenA = bList.find((p) => p.id === "A");
      return (
        seenA?.pointer?.x === 50 &&
        seenA?.editContext?.target === "t-card"
      );
    });

    const seenA = bList.find((p) => p.id === "A");
    expect(seenA?.pointer).toEqual({ x: 50, y: 60 });
    expect(seenA?.editContext).toEqual({ id: "c9", target: "t-card" });
    expect(seenA?.name).toBe("Ada");

    // C is in a different appId room and must have received nothing from A.
    expect(cList.find((p) => p.id === "A")).toBeUndefined();
  });
});

describe("demo presence server explicit CORS (TC-002)", () => {
  it("rejects a disallowed origin handshake and allows the configured one", async () => {
    server = await startPresenceServer({ port: 0, allowedOrigin: ALLOWED });
    const base = `http://localhost:${server.port}/socket.io/?EIO=4&transport=polling`;

    // Socket.IO applies CORS on the polling handshake using the Origin header.
    const disallowed = await fetch(base, {
      headers: { Origin: "http://evil.example.com" },
    });
    // The CORS layer omits Access-Control-Allow-Origin for a disallowed origin.
    expect(disallowed.headers.get("access-control-allow-origin")).toBeNull();

    const allowed = await fetch(base, {
      headers: { Origin: ALLOWED },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });
});
