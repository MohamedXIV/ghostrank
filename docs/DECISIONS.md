# Design and Architecture Decisions

This file records decisions that should not be repeatedly reopened without new evidence.

## D001 — Working title

**Decision:** Ghostrank.

Status: working title, not guaranteed commercial name.

## D002 — Rank is not power

Rank measures reputation/visibility/history. It never creates a level gate.

Accepted.

## D003 — Starting sides

Use White and Black starting ecosystems/packages.

Do not ship Grey as a required third starting alignment.

Actions after the start remain unrestricted and determine reputation.

Accepted.

## D004 — Player mastery first

Character proficiency changes efficiency and quality, not fundamental permission to attempt targets.

Accepted.

## D005 — Hacking interaction

No universal Hack button and no one-roll success mechanic.

Operations are composed from capabilities and interpreted results.

Accepted.

## D006 — Interface parity

Terminal, GUI, purchased tools, and generated tools use the same simulation command/capability layer.

Accepted.

## D007 — Physical presentation

Include a small top-down/isometric physical space with a minimal avatar and limited movement.

Do not build an open-world walking layer.

Accepted.

## D008 — Main UI stack

Next.js + TypeScript.

Tailwind + shadcn/ui for UI foundation.

The original host assumption was a static export inside Tauri 2. The UI-stack decision remains accepted; host timing is superseded by D016.

## D009 — Physical renderer

Phaser 4 owns the room/world presentation only.

Accepted.

## D010 — State responsibilities

- Pure TypeScript simulation core: active authoritative gameplay state/rules.
- Zustand: ephemeral shared UI state.
- TinyBase: reactive/query read projection.
- Persistence adapter: durable saves/history/migrations.

The original implementation used SQLite through Tauri. Backend timing is superseded by D016; the separation of responsibilities remains accepted.

## D011 — AI-generated software

Represent player/AI-authored software as safe virtual workflow/IR.

Do not execute arbitrary generated host code.

Accepted.

## D012 — Run difficulty

Early runs are expected to be short and dangerous. Several in-game days can be a successful learning run.

Accepted.

## D013 — Retirement

Voluntary retirement/exit is a real operation and possible final objective.

A rare peaceful White VANISHED ending exists.

Accepted.

## D014 — Multiplayer

The social underground is simulated by NPCs. Multiplayer is deferred.

Accepted for initial/full single-player scope.

## D015 — Real-world operational fidelity

Use believable concepts but fictionalize commands, vulnerabilities, protocols, currencies, and harmful operational detail.

Accepted.

## D016 — Web-first completion; Tauri deferred

Complete Ghostrank as a web game before returning to desktop-host work.

For Phases 3–9:
- browser execution is the primary runtime,
- normal gameplay must not depend on Tauri/Rust/native APIs,
- durable browser persistence is implemented behind the existing persistence boundary (#18),
- web tests/typecheck/lint/build become the authoritative normal gameplay gates.

Retain the existing Tauri 2 and SQLite work, but defer further hardening, native persistence reconciliation, installer/packaging, and desktop distribution until the web game is feature-complete (#19 / Phase 10).

The future desktop build must host the same game and consume the same validated logical save contract rather than fork gameplay architecture.

Accepted 2026-10-03.

## D017 — Ecosystem simulation model

NPC ecosystem activity advances on fixed 360-minute world-time boundaries inside every world-time advance. Randomness is a stateless hash of the world seed, tick, actor and purpose, so there is no RNG state to persist and splitting a wait never changes outcomes.

Rank is an output of ecosystem events and never an input to any decision. A very long wait simulates only its most recent 28 ticks.

Accepted 2026-10-03 as the Phase 3 substrate. Numeric rank/relationship deltas are provisional tuning; the ranking formula remains open.

## D018 — Economy substrate model

The player holds one `credits` balance plus an append-only value ledger. Every movement records direction, amount, resulting balance, cause and counterparty. Credits are non-negative by construction: a transfer that would take the balance below zero is rejected and mutates nothing, so there is no debt.

Income begins with contract delivery, paying a deterministic amount — `80 + 40 × requiredServices` for a recon report, `260` for an intrusion. Hardware is a data-driven catalog across five capability axes (compute, memory, vram, storage, network); every run starts with a free secondhand workstation. Rig capability is derived as the sum of owned hardware, never stored, and never gates a target or a purchase.

Accepted 2026-10-04 as the Phase 4 substrate. All payout figures and catalog costs are provisional tuning pending playtest.

## D019 — Compute budgeting model (Phase 4 P1)

Derived rig capability is consumed as operation speed, never as an availability gate. Action durations follow a fixed base table (`survey 12m, inspect 8m, escalate 5m, disengage 3m`); above baseline an action costs `max(1, ceil(base / capability))` world minutes, with `survey` on network and `inspect`/`escalate` on compute. Baseline capability is the starter rig's value of 1, so an unupgraded world produces exactly the Phase 2 timings. Disengagement is a deliberate manual exit and never scales with hardware.

Duration is derived at action time from owned hardware, so it adds no state, no events and no save-schema surface.

Accepted 2026-10-04. The base table, axis mapping and the division curve are provisional tuning; the vram/storage axes remain unconsumed (memory was consumed by D020) and contention remains open.

## D020 — Workload scale model (Phase 4 P2)

The memory axis is consumed as workload breadth: one scoped pass (survey over a target's machines, inspect over a machine's services) processes `max(1, floor(memory))` previously-undiscovered items, charges its action duration once, and emits one observation event per item. Baseline scope 1 is the starter rig, so Phase 2's one-item-per-pass behaviour is the untouched default. Scale is breadth, never a gate: every item is discoverable on any rig; modest hardware costs more passes and therefore more world time. Escalation and disengagement stay single-step moments.

Scope derives at action time from owned hardware; no state, events or save-schema surface is added.

Accepted 2026-10-04. The memory catalog values are provisional tuning; vram and storage remain unconsumed pending contention/background-workload and archive decisions.

## D021 — Housing and recurring-cost model (Phase 4 P3)

Credits gain a recurring sink. A housing lease contributes capability to the rig while held, and capability remains the *sum* — `effectiveCapability = owned hardware + lease` — so P1 speed and P2 breadth consume it with no new mechanics. Housing is a lift, never a gate or a punishment: holding no lease is the free baseline, and an unpayable day boundary moves the player out (back to baseline) rather than charging, indebting, or penalising them.

Upkeep is levied only at crossed whole-world-day boundaries (`advanceUpkeep(world, from, to)` charges each boundary minute once). Signing, switching, or breaking a lease costs nothing, so the choice is reversible and never double-billed; the ledger records these charges with cause kind `upkeep` and counterparty `landlord`. The only new save surface is one nullable `housing` id on the economy; legacy saves load `housing: null` — the baseline behaviour by construction, which is why every pre-P3 test passes untouched.

Accepted 2026-10-04 as the P3 slice. Listing daily costs and capability lifts are provisional tuning; per-day billing at a lease's first partial day, rival landlords, and lease loss as a scripted threat remain open for later phases.

## Open decisions

These remain intentionally unresolved until implementation/playtesting provides evidence:

- exact world-time scale,
- exact ranking formula,
- exact visible proficiency labels,
- whether language names remain fully real or partly fictionalized,
- exact number of concurrent locations/rooms in content alpha,
- whether TinyBase is used for every projection or only query-heavy domains,
- exact balance of procedural versus authored NPCs,
- exact commercial model names versus fictional AI ecosystem,
- final art style and palette,
- final commercial title.
