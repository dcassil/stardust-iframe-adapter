---
id: one-command-demo-startup-and
level: task
title: "One-Command Demo Startup And README Screenshots And Capture Instructions"
short_code: "SIFR-T-0012"
created_at: 2026-07-30T16:02:18.244740+00:00
updated_at: 2026-07-30T16:02:18.244740+00:00
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

# One-Command Demo Startup And README Screenshots And Capture Instructions

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[SIFR-I-0004]]

## Objective **[REQUIRED]**

Provide the single documented command that starts both apps (e.g. `npm run demo`) and write the README section that turns the running demo into the portfolio artifact: screenshots plus short GIF/video capture instructions. This is the packaging that satisfies REQ-007 and the vision's five-minute time-to-understanding criterion (NFR-001) — a reviewer clones, runs one command, and sees the value.

## Acceptance Criteria **[REQUIRED]**

- [ ] A single command (`npm run demo`) starts both the demo site and the admin concurrently on localhost with the correct origins.
- [ ] The command is documented and works from a fresh clone after install.
- [ ] A README section explains what the demo shows, how to run it, and the five-minute reviewer walkthrough (Use Case 1: click hero → edit text → watch iframe update).
- [ ] Screenshots of the admin (iframe + overlays + side panel + connection status) are captured and embedded in the README.
- [ ] Written GIF/video capture instructions describe how to record the edit-and-update flow for the portfolio.
- [ ] The README states the explicit-localhost-origin security note (NFR-002): the demo uses explicit localhost, never `*`.

## Test Cases **[CONDITIONAL: Testing Task]**

### Test Case 1: One-command startup from fresh clone
- **Test ID**: TC-001
- **Preconditions**: Fresh clone, dependencies installed.
- **Steps**:
  1. Run `npm run demo`.
  2. Open the admin URL.
- **Expected Results**: Both apps come up; the admin connects to the embedded demo site; the reviewer walkthrough is performable end to end.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

### Test Case 2: README completeness
- **Test ID**: TC-002
- **Preconditions**: README written; screenshots present.
- **Steps**:
  1. Follow the README from run command through the five-minute walkthrough.
  2. Verify screenshots render and GIF/video capture steps are actionable.
- **Expected Results**: A first-time reader can run and understand the demo in under five minutes; screenshots and capture instructions are present and correct.
- **Actual Results**: {To be filled during execution}
- **Status**: {Pass/Fail/Blocked}

## Implementation Notes **[CONDITIONAL: Technical Task]**

Recommended Agent: sonnet + medium

### Technical Approach
Add an `npm run demo` script using a concurrent runner (e.g. `concurrently` or `npm-run-all`) that starts the demo-site and admin dev servers together with their configured localhost ports/origins. Author the README demo section: overview, run instructions, the Use Case 1 walkthrough, embedded screenshots, and a short GIF/video capture guide (tooling suggestion, what to record, where to save). Capture the screenshots from the running demo. Include the NFR-002 localhost-origin note. Follows a stated, scripted pattern — no novel architecture.

### Dependencies
- SIFR-T-0007, SIFR-T-0008, SIFR-T-0010 must run for screenshots and the walkthrough.
- Its startup command is reused by SIFR-T-0011 (Playwright serve) where practical.
- Produces the portfolio artifact consumed downstream by the PORT project.

### Risk Considerations
- Concurrent server ports/origins must match what the host/site expect (NFR-002); verify the handshake still succeeds under the combined command.
- Keep screenshots current with the final overlay styling (SIFR-T-0010) — capture after that task lands.

## Status Updates **[REQUIRED]**

*To be added during implementation*