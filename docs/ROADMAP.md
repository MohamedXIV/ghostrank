# Roadmap

This is a full-project roadmap, not a disposable prototype plan. Early milestones establish production architecture that later systems will keep.

## Current platform policy — Web first

Ghostrank will be completed as a **web game first**. Browser execution is the primary runtime for all remaining gameplay phases.

- #18 — Web-first runtime, durable browser persistence, and authoritative web gameplay CI — is complete.
- Tauri 2 and the existing SQLite adapter remain in the repository, but they are not required for normal gameplay development or per-feature acceptance.
- #19 — Tauri desktop host, SQLite hardening, installer/packaging/distribution work — is explicitly deferred until the web game is feature-complete and stable.
- Gameplay architecture must stay host-agnostic so the later desktop host reuses the same simulation, UI, content, and validated save contract.

Historical Phase 0–2 Tauri CI results remain valid evidence for the work completed at that time; they are not an ongoing requirement for Phases 3–9.

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

**Status: complete (2026-10-02).**

Delivered:
- typed target -> machine -> fictional-service truth graph,
- explicit evidence/knowledge model separate from hidden world truth,
- evidence-gated TinyBase projection,
- fictional reconnaissance chain through observe / survey / inspect capabilities,
- Terminal/GUI parity through shared typed simulation commands,
- deterministic world-time costs and explicit failure causes,
- resumable operation sessions,
- explicit recon -> intrusive escalation and voluntary disengagement,
- deterministic causal trace/signature records,
- self-observed footprint summary,
- first deterministic opponent reaction loop,
- exact trace provenance for triggered reactions,
- restart persistence for evidence, operation state, traces, and reactions,
- compatibility normalization for older Phase 1 snapshots.

Exit criteria:
- there is no generic Hack button,
- rank never gates operation access or opponent reaction behavior,
- a complete operation path composes multiple typed capabilities,
- escalation and disengagement materially alter persisted risk,
- traces produce deterministic, explainable consequences,
- failure and reaction causes are reconstructable from stored state/events,
- Terminal and GUI remain alternate interfaces over the same simulation,
- static Next export and Tauri desktop build/launch remain green.

## Platform Gate Before Phase 3 — Web-first Runtime Transition

**Status: complete (2026-10-03). Tracked by #18.**

Delivered:
- native IndexedDB persistence adapter behind the existing `RunPersistence` boundary,
- portable versioned Zod-validated active-run save envelope,
- browser/session recreation restores the complete Phase 2 authoritative state,
- corrupt/invalid durable payloads fail validation instead of fabricating state,
- browser persistence selected automatically outside Tauri,
- normal gameplay CI reduced to tests, typecheck, lint, and production web build,
- Tauri/Rust build and desktop launch removed from normal per-feature gates,
- existing Tauri/SQLite implementation retained unchanged for the deferred desktop phase.

Exit criteria:
- the complete Phase 2 flow survives browser-style persistence reload with authoritative state intact,
- simulation/gameplay code remains independent of IndexedDB, Tauri, and SQLite,
- normal gameplay work ships through web-only CI,
- Phase 3 may proceed without any desktop-host dependency.

## Phase 3 — Underground Ecosystem

**Status: in progress. Tracked by #21.**

P0 substrate delivered (see `docs/superpowers/plans/2026-10-03-phase-3-underground-substrate.md`):
- ecosystem actors with public handles and rank,
- White/Black starting networks seeding initial trust,
- directed relationships (trust / fear / grudge),
- deterministic NPC-to-NPC activity that runs inside world-time advancement with no player involvement,
- an observed defensive reaction turning into a provenance-backed grudge,
- evidence-safe projection and a read-only Underground index app.

P1 delivered (see `docs/superpowers/plans/2026-10-03-phase-3-rumors-messages.md`):
- private NPC incidents leak as imperfect, sometimes distorted rumors through trusted contacts into a player inbox,
- the `readMessage` command shared by Terminal (`read <id>`) and GUI,
- the player's observed footprint spreading through the target owner's network and shifting peer trust with rumor provenance.

Still to deliver: contracts, forums, retaliation, the unmasking taboo, contextual reputation descriptors.

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

**Status: planned / blocked by #21. Tracked by #22.**

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

**Status: planned / blocked by #22. Tracked by #23.**

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

**Status: planned / blocked by #23. Tracked by #24.**

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

**Status: planned / blocked by #24. Tracked by #25.**

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

**Status: planned / blocked by #25. Tracked by #26.**

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

## Phase 9 — Web Beta / Polish

**Status: planned / blocked by #26. Tracked by #27.**

Deliverables:
- onboarding,
- accessibility,
- browser performance,
- save migration hardening,
- UI consistency without erasing app individuality,
- audio/room atmosphere,
- balance,
- ending polish,
- browser crash/recovery behavior,
- web release hardening.

Exit criteria:
- the web game is feature-complete and stable enough that remaining work is host/distribution integration rather than gameplay architecture.

## Phase 10 — Desktop Host / Packaging

**Status: explicitly deferred / blocked by #27. Tracked by #19.**

Start only after #27 (Phase 9 — Web Beta / Polish) is complete unless the project deliberately changes the platform decision.

Deliverables:
- reconcile final save contract with the Tauri SQLite adapter,
- browser/exported-save import or migration where appropriate,
- native save-location/filesystem policy,
- desktop window/application behavior,
- installer/package/signing,
- native crash diagnostics and recovery,
- release-only Tauri build/launch verification,
- desktop storefront/distribution integration if chosen.

Exit criteria:
- the desktop build runs the same game rather than a fork,
- browser and desktop saves share one validated logical format,
- no gameplay system exists only because of the desktop host,
- desktop packaging does not regress the finished web game.

## Explicitly deferred

- multiplayer,
- open-world physical exploration,
- real network access,
- arbitrary user-code execution,
- mobile,
- live-service backend,
- modding API beyond data-driven content.

Tauri itself is **not abandoned**; its completion is separately deferred to Phase 10 / #19.

These can be reconsidered only after the single-player simulation is complete and stable.
