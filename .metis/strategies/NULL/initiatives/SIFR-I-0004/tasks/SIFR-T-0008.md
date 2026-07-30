---
id: admin-shell-with-iframe-embed-and
level: task
title: "Admin Shell With Iframe Embed And Host Wiring And Connection Status"
short_code: "SIFR-T-0008"
created_at: 2026-07-30T16:02:03.164018+00:00
updated_at: 2026-07-30T16:02:03.164018+00:00
parent: SIFR-I-0004
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/todo"


exit_criteria_met: false
strategy_id: NULL
initiative_id: SIFR-I-0004
---

# Admin Shell With Iframe Embed And Host Wiring And Connection Status

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Build the admin shell — the host app that embeds the demo site (SIFR-T-0007) in an iframe, mounts `useStardustHost` (from the SIFR-I-0003 host-side package), establishes the frame-link connection over an explicit localhost origin, and renders the connection lifecycle (connecting/connected/error) in the UI. This is the structural "host" half of the demo pair: it stands up the iframe, the scaled canvas, and the connection status strip that later tasks build overlays and panels onto. It replaces the entangled prototype `code_temp/Stardust-CMS-App/app/` (`IFrame.tsx` with `transform: scale(...)`, `ConnectStatus`, and the `useFrame`/overlay machinery) with a clean consumer of the extracted host package.

## Acceptance Criteria **[REQUIRED]**

- [ ] A React app (admin) exists in the demo workspace that renders an `<iframe>` pointing at the demo-site dev server URL, using an explicit localhost origin (never `*`).
- [ ] The admin mounts `useStardustHost` from the SIFR-I-0003 package and completes the frame-link handshake with the embedded site.
- [ ] The center canvas scales the iframe (successor to the prototype `IFrame.tsx` `transform: scale(...)`) and exposes the current scale/geometry so overlays (SIFR-T-0010) can position over it.
- [ ] A top status strip shows connection state — connecting, connected, and error — with legible messages surfaced in the UI, not console logs (successor to `ConnectStatus`; addresses initiative REQ-005 / NFR).
- [ ] On host connect, positions are requested and the raw geometry from the site is available via the host hook (mapped through `mapGeometry`) for downstream overlay rendering.
- [ ] Error states (e.g. site not reachable, handshake timeout) render a clear message in the status strip.
- [ ] The admin builds and runs, and when both apps run it visibly connects to the embedded demo site.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: Handshake and connected state
- **Test ID**: TC-001
- **Preconditions**: Demo site and admin both running on localhost.
- **Steps**:
  1. Start both apps.
  2. Open the admin.
  3. Observe the status strip.
- **Expected Results**: Status transitions connecting → connected; the embedded site is visible in the scaled iframe; host reports geometry for the site's targets.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: Error surfaced in UI
- **Test ID**: TC-002
- **Preconditions**: Admin running, demo site NOT running (or wrong origin).
- **Steps**:
  1. Start the admin only.
  2. Observe the status strip after the handshake timeout.
- **Expected Results**: An error state with a legible message appears in the status strip; nothing is silently swallowed to the console only.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: opus + medium

### Technical Approach
Scaffold a Vite + React admin app. Render a layout with a top status strip and a center canvas holding the iframe. Configure the iframe src to the demo-site localhost URL and pass the explicit origin into `useStardustHost`. Wire the hook's lifecycle state into the status strip component (the `ConnectStatus` successor). Apply the scale transform on the iframe wrapper and expose scale + mapped geometry (via `mapGeometry`) through context/props so SIFR-T-0010 overlays and SIFR-T-0009 store consumers can read them. Keep overlay rendering and edit controls out of this task — this is the shell, connection, and geometry plumbing only.

### Dependencies
- SIFR-I-0003 host package (`useStardustHost`, `mapGeometry`) and SIFR-I-0002 iframe package.
- SIFR-T-0007 (demo site) must exist to embed and connect to.
- Provides geometry/scale surface consumed by SIFR-T-0010 (overlays) and connection surface used by all editing.

### Risk Considerations
- The scale transform and iframe coordinate space must be reconciled with `mapGeometry` so overlays land correctly; get this contract right here to avoid compounding overlay-position bugs downstream.
- Handshake origin must be explicit localhost per NFR-002; never fall back to `*`.

## Status Updates **[REQUIRED]**

*To be added during implementation*