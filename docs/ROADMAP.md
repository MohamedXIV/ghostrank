# Roadmap

This is a full-project roadmap, not a disposable prototype plan. Early milestones establish production architecture that later systems will keep.

## Phase 0 — Foundation

**Status: complete (2026-10-02).**

Goal: make the repository safe to build on.

Delivered:
- canonical documentation,
- Next.js static-export application shell,
- Tauri 2 desktop shell and launch smoke,
- TypeScript strict configuration,
- Tailwind + shadcn/ui foundation,
- locked npm/Cargo dependency graphs,
- test runner and CI,
- simulation package boundaries,
- command/event contracts,
- SQLite migration system and schema metadata,
- seeded RNG service,
- basic save/run metadata,
- TinyBase player-visible projection boundary,
- Zustand ephemeral UI boundary,
- Phaser-to-command-bus physical intent boundary.

Exit criteria:
- desktop app launch is exercised headlessly in CI,
- tests/typecheck/lint/static build run in CI,
- Tauri builds from locked dependencies,
- architecture boundaries are represented in code and tests,
- no throwaway second architecture is expected.

## Phase 1 — Computer + Room Vertical Slice

**Status: complete (2026-10-02).**

Goal: prove the core feeling using production architecture.

Delivered:
- GHOST/OS simulated desktop/window shell,
- fictional Terminal parser and interactive terminal app,
- Recon GUI as the first information tool,
- Terminal and GUI parity through the exact same typed simulation command,
- visible world clock and player rank,
- Phaser 4 top-down/isometric room,
- simple anonymous hooded avatar,
- desk/workstation interaction and room/computer transition,
- ambiguous physical window/light cue,
- TinyBase player-visible projection wired directly into React,
- Tauri SQLite active-run autosave/load,
- resumable Zod-validated world snapshots,
- atomic snapshot/event persistence,
- failed-save event retry,
- deterministic restart acceptance test.

Exit criteria:
- the player is visibly located in a compact room around the workstation,
- the computer presents one coherent simulated machine,
- Terminal/GUI parity is enforced by tests rather than mocked,
- world time and target knowledge survive a session restart,
- static Next export and Tauri desktop build/launch remain green.

## Phase 2 — Operation Simulation

Deliverables:
- target model,
- reconnaissance,
- simulated machines/services,
- evidence/knowledge model,
- capability composition,
- escalation/disengagement,
- traces/signatures,
- causal consequences,
- first opponent reaction loop.

Exit criteria:
- there is no generic Hack button,
- a complete operation can be solved through multiple workflows,
- failure has explainable causes.

## Phase 3 — Underground Ecosystem

Deliverables:
- handles and ranking,
- relationships,
- White/Black starting networks,
- contracts,
- messages/forums,
- rumors,
- NPC-to-NPC activity,
- retaliation,
- unmasking taboo,
- contextual reputation descriptors.

Exit criteria:
- the world creates events without the player,
- rank changes social visibility but never target eligibility.

## Phase 4 — Economy and Hardware

Deliverables:
- hardware catalog,
- compute budgeting,
- multiple machines,
- housing/location costs,
- software marketplace,
- tool authorship/provenance,
- digital-value graph,
- buying/selling player tools.

Exit criteria:
- money creates meaningful strategic choices,
- expensive equipment improves capability/scale without replacing skill.

## Phase 5 — AI Economy and Software Creation

Deliverables:
- cloud/local model choices,
- model properties,
- compute contention,
- AI analysis,
- software specification UI,
- virtual workflow/IR build system,
- build time/tests/defects,
- model/tool marketplace content.

Exit criteria:
- player can replace a premium workflow with a self-built one,
- AI helps but can be wrong,
- generated software is safe virtual data, not host code.

## Phase 6 — Run Threat and Physical Consequences

Deliverables:
- authority investigations,
- rival probes,
- criminal retaliation,
- physical-warning events,
- relocation,
- safehouses,
- catastrophic compromise,
- postmortem causal chain.

Exit criteria:
- early runs are genuinely dangerous,
- first-time survival around a few days is plausible,
- players can usually learn something concrete from failure.

## Phase 7 — Endings and Long-Run Systems

Deliverables:
- voluntary exit plan,
- arrested/unmasked/missing/compromised endings,
- rare peaceful White VANISHED ending,
- Black retirement variants,
- run history,
- exceptional long-run pressure,
- limited exotic/quantum capability.

Exit criteria:
- surviving and leaving can be a meaningful goal independent of rank #1.

## Phase 8 — Content Alpha

Deliverables:
- broader NPC archetypes,
- varied contracts,
- multiple location archetypes,
- larger tool market,
- meaningful hardware/model catalog,
- enough events for repeated runs,
- balance telemetry for local testing.

Focus:
breadth without violating established system rules.

## Phase 9 — Beta / Polish

Deliverables:
- onboarding,
- accessibility,
- performance,
- save migration hardening,
- UI consistency without erasing app individuality,
- audio/room atmosphere,
- balance,
- ending polish,
- crash recovery,
- packaging/distribution.

## Explicitly deferred

- multiplayer,
- open-world physical exploration,
- real network access,
- arbitrary user-code execution,
- mobile,
- live-service backend,
- modding API beyond data-driven content.

These can be reconsidered only after the single-player simulation is complete and stable.
