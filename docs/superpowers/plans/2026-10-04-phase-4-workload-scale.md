# Phase 4 P2 — Workload Scale: Memory Becomes Breadth

Issue: #22
Builds on: Phase 4 P1 compute budgeting (`2026-10-04-phase-4-compute-budgeting.md`)

## Goal

Give the **memory** axis its consumer, completing the capability-becomes-
mechanics story started in P1: capability should decide *how much* one
operation pass does, not only *how fast*. This is the second exit criterion —
"expensive equipment improves capability/scale without replacing skill" —
scale half, and the "more RAM allows larger concurrent workloads" line from
`ECONOMY_PROGRESSION_AND_SKILLS.md`.

The rule stays absolute: **breadth, never a gate.** The same machines and
services are discoverable on any rig; a modest rig just needs more passes,
and each pass costs its own world time. Skill (choosing what to look at, and
the evidence chain) still decides everything else.

## The model

New pure helper `src/game/simulation/systems/scale.ts`:

- `discoveryScope(memory) = max(1, floor(memory))` — items one scoped pass can
  process.
- **survey** applies the scope across the target's machines, and **inspect**
  across the given machine's services. Both take undiscovered items in
  catalog order, record one evidence entry and emit one observation event per
  item, and charge the P1 action duration **once per pass** — so scale
  converts directly into saved survey/inspect cycles, stacking with P1's
  per-cycle speed.
- The starter rig has `memory: 1`, so **every existing behaviour and test is
  untouched**: one machine and one service per pass, the Phase 2 discovery
  rhythm exactly as written.
- `escalate`/`disengage` are single-step moments, not scoped workloads.

Example: starter rig (memory 1) + Expanded Memory Bank (memory +4) ⇒ scope 5 ⇒
a first survey discovers both slice machines in one 12-minute pass (or 3 with a
NIC upgrade), and one inspect pass covers every service on a machine.

## State, events, persistence

None new. Scope derives from owned hardware at action time — no schema or
migration surface, same as P1. `MachineObserved` / `ServiceObserved` simply
repeat per discovered item within one command result. Wallet impact: zero;
scale saves time, not credits.

## Projection and UI

`EconomyProjection` gains `discoveryScope`; TinyBase gets a `rig/scale` row.
The Market app adds **RIG SCALE // ITEMS PER PASS** with the explicit framing
("a modest rig still discovers everything — it just needs more passes"), next
to P1's RIG SPEED panel, so both halves of the money↔time trade are legible
before buying. Terminal help now describes survey/inspect as "rig scale +
speed".

## Invariants (tested)

- starter rig: exactly one item per survey/inspect pass (all Phase 2 discovery
  tests pass untouched);
- memory widens a pass, floors fractions, never drops below one;
- a wide pass charges one duration and emits one event per item;
- narrow vs wide rigs discover the same total set; wide reaches it in fewer
  passes and less elapsed time — breadth, not a gate;
- deterministic and restore-safe (scope derives from stored hardware);
- projection/TinyBase surface scope and update on purchase.

## Out of scope (later slices)

Contention and concurrent background workloads (the axes still uncollected:
vram, storage), multiple named machines, housing/recurring costs, the
software marketplace, tool authorship, player-tool trading, the richer value
graph.
