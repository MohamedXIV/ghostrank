# Phase 2 P0 — Evidence-producing reconnaissance capabilities

Issue: #10
Parent: #7
Dependency: #8 complete

## Goal

Create the first playable operation-information chain on top of the evidence substrate without introducing exploitation, access escalation, or real-world network mechanics.

## Capability chain

### observeTarget

Existing shallow capability.

Input:
- target ID

Requires:
- target exists

Produces:
- target-profile evidence

Time:
- currently zero; this is the lead-resolution boundary from Phase 1.

### surveyTarget

Input:
- known target ID

Requires:
- target-profile evidence

Produces:
- exactly one previously unknown machine-presence evidence record, using deterministic truth order.

Time:
- 12 world minutes on success.

Explicit failures:
- TARGET_NOT_FOUND
- TARGET_NOT_OBSERVED
- NO_NEW_MACHINE_EVIDENCE

Failures do not consume world time.

### inspectMachine

Input:
- machine ID

Requires:
- machine exists
- machine-presence evidence

Produces:
- exactly one previously unknown service-presence evidence record, using deterministic truth order.

Time:
- 8 world minutes on success.

Explicit failures:
- MACHINE_NOT_FOUND
- MACHINE_NOT_OBSERVED
- NO_NEW_SERVICE_EVIDENCE

Failures do not consume world time.

## Events

Successful survey/inspection emits:
1. WorldTimeAdvanced
2. specific observation event (MachineObserved or ServiceObserved)

Evidence timestamps use the completion world minute.

## Interfaces

Terminal:
- `survey <target-id>`
- `inspect <machine-id>`

Recon GUI:
- SURVEY on an observed target
- INSPECT on an observed machine

Both construct the exact same typed simulation commands.

## Safety / fiction boundary

These are game-specific information capabilities. They do not model real ports, addresses, credentials, shell commands, scanners, protocols, or exploitable procedures.

## TDD order

1. Red domain tests for preconditions, deterministic one-at-a-time discovery, time cost, and evidence.
2. Red terminal parser tests.
3. Add typed commands/events.
4. Implement domain capabilities.
5. Add GUI command adapters + parity tests.
6. Wire Recon controls.
7. Verify save/restart preservation through existing state persistence.
8. Exact-head web + Rust/Tauri CI.
