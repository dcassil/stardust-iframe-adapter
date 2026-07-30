# Presence (edit-locks) — scope and disclaimer

Presence is an **opt-in demo feature** of `@stardust-cms/iframe-adapter`. It shows,
in the admin, **other editors' live cursors** and **which target each editor is
currently editing** (an advisory "edit-lock" signal).

## What this is

- **Presence + edit-locks.** Live remote cursors (labeled by name/color) and a
  per-target "{name} is editing" indicator.
- A **real-time UI signal** layered over the existing overlay geometry
  (SIFR-I-0003 `mapGeometry`), so cursors and locks land correctly under iframe
  scale and scroll.
- Shipped as an **opt-in** subpath: `@stardust-cms/iframe-adapter/presence`.
  Nothing here is auto-loaded by `./host` or `./iframe`.

## What this is NOT

This feature is **not collaborative editing**. Explicitly:

- **No CRDT, no OT, no Yjs.** There is no data structure that merges concurrent
  edits.
- **No conflict resolution.** The edit-lock is advisory only — it does not block
  writes and does not reconcile two people editing the same field. It is a
  presence hint, not a mutation channel.
- **No shared document state over the wire.** Presence carries pointer positions
  and an advisory edit-context (`{ id, target }`) only. Document content still
  flows through the normal `cms/sendElements` path; presence never merges it.

If you need true multi-user concurrent editing, that is out of scope for this
adapter and would require a separate CRDT/OT layer that is deliberately not part
of this project.

## Adapters

- **Default: `MockPresenceProvider`** — server-less. Fans presence out over a
  `BroadcastChannel` (across tabs of the same origin), with an in-memory
  fallback for tests. **No third-party runtime dependency.** This is what the
  demo uses.
- **Optional: `SocketIoPresenceProvider`** — a drop-in second implementation of
  the same `PresenceProvider` interface, backed by a **demo-grade** Node
  Socket.IO server (`demo/presence-server/`). `socket.io`/`socket.io-client` are
  **optional/dev dependencies of the demo only** and are lazily imported; they
  never enter the core `./host`/`./iframe`/`./protocol` dependency graphs.

  The demo server uses an **explicit allowed CORS origin** (default
  `http://localhost:5173`). It deliberately does **not** reproduce the
  prototype's allow-all `callback(null, true)` / `origin: "*"`. A handshake from
  any other origin is rejected (no `Access-Control-Allow-Origin` header).

## Enabling presence in the demo

Presence is **off by default**. With the flag disabled, no provider is
constructed, no overlays mount, and no optional dependency loads — the demo is
identical to its pre-presence behavior.

Enable it via the Vite env flag on the admin app:

```sh
VITE_PRESENCE_ENABLED=true npm run demo:admin
# (run the site separately: npm run demo:site)
```

Then open the admin in **two browser tabs**. Move the pointer / select a target
in one tab and watch the remote cursor and "editing" indicator appear in the
other (the default mock adapter needs no server).

To use the optional Socket.IO transport instead, also start the demo presence
server (explicit CORS origin), then point a `SocketIoPresenceProvider` at it:

```sh
PORT=4010 ALLOWED_ORIGIN=http://localhost:5173 npm run demo:presence-server
```

## Two-tab end-to-end check

```sh
npx playwright install chromium   # once, if not already installed
npm run demo:e2e:presence
```

This starts the site + the admin (with `VITE_PRESENCE_ENABLED=true`) and runs a
two-tab scenario asserting a remote cursor and edit-lock cross between tabs via
the mock adapter, and that no UI copy says "collaboration".
