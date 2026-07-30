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

## Phase B — Task execution (per initiative task set)

(to be populated after decomposition)

---

## Event log
- 2026-07-30 10:59 — Orchestration initialized. 6 initiatives in discovery phase, each with a detailed Decomposition Plan.
- 2026-07-30 11:01 — Launched 6 background decomposition subagents (one per initiative), all in parallel.
- 2026-07-30 11:05 — LESSON: 6-way parallel Metis writes cause SQLite read-during-write contention. Agent 0005 failed with transient "not found"/project_prefix errors (NOT real corruption; tasks ARE stored in .metis/metis.db which grew 393KB→737KB). Agent 0001 succeeded (5 tasks). Remaining agents still running. Plan: let running agents finish, verify via MCP once writes settle, then RE-RUN any failures SERIALLY. Note: create_document uses `parent_id`, not parent_short_code. Ignore stray root-level metis.db (unchanged 143KB artifact).
- 2026-07-30 11:10 — REAL ROOT CAUSE (per agent 0003): Metis MCP tools need `project_path` ending in `.metis` (`.../stardust-iframe-adapter/.metis`). Root path gives misleading "not found"/"no strategies directory"/"project_prefix" errors. 0005 failed only because it used root path and gave up instead of appending `.metis`. Re-run 0005 with `.metis` path. NOT a contention or corruption issue.
