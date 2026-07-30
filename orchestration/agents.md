# Orchestration Agent Registry

Session started: 2026-07-30
Orchestrator: main Claude Code session (this session ONLY manages agents listed below).

**Rule:** Only agents/IDs recorded in this file belong to this orchestration session.
Never act on, monitor, or stop any agent NOT listed here — it may belong to another session.

---

## Phase A — Decomposition (one agent per initiative)

| Initiative | Title | Agent ID / Task ID | Kind | Status |
| ---------- | ----- | ------------------ | ---- | ------ |
| SIFR-I-0001 | Protocol And Package Design | a0f76ce0d2cfb5805 | bg subagent | DONE — 5 tasks (T-0001..0005), decompose |
| SIFR-I-0002 | Iframe-Side Adapter | aaf0ce2766cf52f76 | bg subagent | DONE — 5 tasks (T-0006,0013,0015,0016,0017), decompose |
| SIFR-I-0003 | Host-Side Overlay Adapter | a1c2b4eebbb801cc9 | bg subagent | DONE — 5 tasks (T-0014,0018,0019,0020,0021), decompose |
| SIFR-I-0004 | Demo Admin And Demo Site | a63469319d85d7160 | bg subagent | DONE — 6 tasks (T-0007..0012), decompose |
| SIFR-I-0005 | Style Rules As Supporting Feature | ab30ff5ed198ea712 | bg subagent | DONE — 4 tasks (T-0026,0027,0028,0029), decompose |
| SIFR-I-0006 | Presence Demo, Not Collaboration Package | a3b7b0416a700e1ab | bg subagent | DONE — 4 tasks (T-0022,0023,0024,0025), decompose |

## Phase B — Task execution

**PUBLIC REPO IDENTITY (recruiter-facing, will be public):** repo name `stardust-iframe-adapter`; npm package `@stardust-cms/iframe-adapter`; single monorepo (package + demo). OLD prototype repos (`Stardust-CMS-App`, `-backup`) are READ-ONLY copy sources — NEVER modified, branched, or added as remote/submodule. All work lives in the NEW repo only.

**Env facts:** prototype at `code_temp/Stardust-CMS-App` + `Stardust-CMS-APP-Original-backup`; transport at `code_temp/frame-link`, `code_temp/frame-link-react`; review docs `code_temp/stardust-package-extraction-review.md`, `code_temp/stardust-metis-project-initialization-plan.md`. Node 20, npm+pnpm. Git repo initialized at project root on `main`. ALL metis calls use project_path ending in `.metis`.

**Wave plan (deps, REVISED):** W1: 0001 (solo) ✅ → W2: 0002+0003 (parallel worktrees) ✅ merged to main @ c3ccfb7 (79 tests green, tsc clean, boundary intact; reconciled to React 18 + frame-link source-alias). → W3: 0004 Demo (SOLO on main; everything after extends it) → W4: 0005 Style + 0006 Presence (parallel worktrees, both extend demo, merge-resolve).
Worktrees wt-0002/wt-0003 removed; branches feat/0002-iframe, feat/0003-host retained (merged).

| Wave | Initiative | Agent ID | Branch/worktree | Status |
| ---- | ---------- | -------- | --------------- | ------ |
| W1 | SIFR-I-0001 Protocol (T-0001..0005) | a32b84ce0fad381c2 | main | DONE ✅ tsc clean, 14 tests, pkg @stardust-cms/iframe-adapter, commits→b767897 |
| W2 | SIFR-I-0002 Iframe (T-0006,0013,0015,0016,0017) | af66800c31822125a | feat/0002-iframe @ ../wt-0002-iframe | DONE ✅ 45 tests, tsc clean. MODIFIED src/protocol/index.ts (ContentPayload now {content: CmsContent}, added ContentKind/CmsContent) + fixtures. Config: React 18, added types/frame-link-react.d.ts + tsconfig paths. |

**MERGE/INTEGRATION (W2 → main):** conflicts expected — (a) protocol ContentPayload reshaped by 0002, consumed as old shape by 0003 → host typecheck may break; (b) React 18 (0002) vs 19 (0003) divergence in package.json/tsconfig/vitest.config; (c) two different frame-link resolution strategies. Resolve to ONE toolchain, get combined tsc clean + ALL tests green before Wave 3.
RESOLVED 2026-07-30 11:55 by orchestrator: React 18 chosen; vitest aliases frame-link/-react to sibling TS source + dedupe react/dom; global jsdom env. Regenerated lockfile. Result: tsc clean, 79 tests pass (13 files), build emits split dist with no cross-imports. Merge commit c3ccfb7.

| W3 | SIFR-I-0004 Demo (T-0007..0012) | a555a3d38ff7a357f | main | DONE ✅ 6 tasks, main@95d24f6. 79 lib tests + 19 demo + 2 e2e green. Fixed real bug: discoverTargets now reports document-absolute geometry (was double-counting scroll). Demo seams: site provider demo/site/src/App.tsx; admin sidebar demo/admin/src/editing/SidePanel.tsx; presence seam Editing.tsx/host-context.ts + admin-overlay-layer; store swap = ContentStore iface. |
| W4 | SIFR-I-0005 Style (T-0026..0029) | a99993f6ef26aec82 | feat/0005-style @ ../wt-0005-style | DONE ✅ 127 lib tests, demo 19, e2e 3+2. Protocol: firmed StyleUpdatePayload additively (cms/updateStyles only). Demo edits: site App.tsx (1 line StyleFeature), admin Editing.tsx (import+StylePanel), new useSendStyles.ts/StylePanel.tsx/style-panel.e2e.ts. |
| W4 | SIFR-I-0006 Presence (T-0022..0025) | afb3a610196ae4992 | feat/0006-presence @ ../wt-0006-presence | DONE ✅ 88 lib tests, demo 21, 2-tab e2e 1. Protocol NOT touched. Added ./presence export + socket.io/socket.io-client/tsx devDeps + scripts. Demo edit: Editing.tsx (PresenceLayer mount, flag VITE_PRESENCE_ENABLED off by default), new PresenceLayer.tsx/presence-config.ts/presence-server/*, aliases.ts + tsconfig.base.json. |
Expected merge conflicts (W4→main): demo/admin/src/App.tsx sidebar + demo/site/src/App.tsx (both add UI), package.json deps (0006 adds socket.io). Protocol: 0005 edits cms/updateStyles area only, 0006 edits cms/presence area only → should be additive/non-conflicting.

## ✅ PROJECT COMPLETE — 2026-07-30 ~13:25
- W4 merged to main (style 704a27c, presence 4bc6e81) — **ZERO merge conflicts** (isolated component files + single mount-lines worked). Lockfile reconciled via reinstall.
- FINAL VERIFICATION (main @ 4bc6e81):
  - Library: `tsc --noEmit` clean; `vitest run` **136 tests pass** (16 files).
  - Demo: `demo:typecheck` clean; `demo:test` **21 tests pass**.
  - Build: emits dist/{iframe,host,presence,protocol}.js — module boundaries clean (each entry imports only its own dir; protocol pure).
  - Earlier waves: Playwright e2e green (overlay-alignment 2, style-panel 3, presence 2-tab 1) per agent reports.
- METIS: all 29 tasks `completed`, ADR SIFR-A-0001 `decided`, all 6 initiatives transitioned to `completed`.
- Worktrees removed. Branches feat/0001..0006 retained (merged). Old prototype repos never modified.
- Public repo identity: `stardust-iframe-adapter` / npm `@stardust-cms/iframe-adapter`. NOT pushed anywhere (awaiting user go-ahead).
| W2 | SIFR-I-0003 Host (T-0014,0018,0019,0020,0021) | ae68912977b103fb0 | feat/0003-host @ ../wt-0003-host | DONE ✅ 48 tests, tsc clean. NOTE: modified shared tsconfig.json/vitest.config.ts/package.json devDeps (React test infra) + built code_temp/frame-link dist. Expect config merge conflicts vs 0002. |

---

## Event log
- 2026-07-30 10:59 — Orchestration initialized. 6 initiatives in discovery phase, each with a detailed Decomposition Plan.
- 2026-07-30 11:01 — Launched 6 background decomposition subagents (one per initiative), all in parallel.
- 2026-07-30 11:05 — LESSON: 6-way parallel Metis writes cause SQLite read-during-write contention. Agent 0005 failed with transient "not found"/project_prefix errors (NOT real corruption; tasks ARE stored in .metis/metis.db which grew 393KB→737KB). Agent 0001 succeeded (5 tasks). Remaining agents still running. Plan: let running agents finish, verify via MCP once writes settle, then RE-RUN any failures SERIALLY. Note: create_document uses `parent_id`, not parent_short_code. Ignore stray root-level metis.db (unchanged 143KB artifact).
- 2026-07-30 11:10 — REAL ROOT CAUSE (per agent 0003): Metis MCP tools need `project_path` ending in `.metis` (`.../stardust-iframe-adapter/.metis`). Root path gives misleading "not found"/"no strategies directory"/"project_prefix" errors. 0005 failed only because it used root path and gave up instead of appending `.metis`. Re-run 0005 with `.metis` path. NOT a contention or corruption issue.
