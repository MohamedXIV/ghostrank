# Phase 4 P1 — Compute Budgeting: Rig Capability Becomes Speed

Issue: #22
Builds on: Phase 4 P0 economy substrate (`2026-10-04-phase-4-economy-substrate.md`)

## Goal

Make hardware capability **matter** without ever turning it into a level gate.
P0 accumulated capability (compute / memory / vram / storage / network) and
surfaced it; this slice is the first consumer: **rig capability shortens the
world time an operation action costs.** This is the "money vs time vs skill"
triangle from `HACKING_AND_TOOLS.md` — money (hardware) buys time, and skill
remains the thing that decides whether an action works at all.

The non-negotiables, restated for this slice:

- **No gates.** An action's evidence requirements and outcomes are unchanged by
  hardware. A starter rig completes every action chain a $10,000 rig completes;
  it just takes longer in world time.
- **Never a punishment.** Hardware is strictly an accelerator: durations at or
  below baseline capability equal the base table. Weak gear never makes you
  slower than baseline.
- **Rank is never an input** to any duration.

## The model

New `src/game/simulation/systems/compute.ts` — a pure, deterministic function
of the derived rig capability, no new state:

- **Base table** (unchanged from Phase 2): `survey 12m, inspect 8m, escalate 5m,
  disengage 3m`.
- **Axis mapping** follows the design docs' own semantics: `survey` reads
  **network** (monitoring/throughput), `inspect` and `escalate` read **compute**
  (analysis/exploitation), `disengage` is a deliberate manual exit and reads
  nothing — hardware never speeds up a careful, safe withdrawal.
- **Acceleration**: `minutes = max(1, ceil(base / capability))` when
  `capability > BASELINE_CAPABILITY (1)`, else `base`. Integer, monotone
  non-increasing, with diminishing returns, floored at one minute.

### Baseline is the starter rig, and the old timings survive

The starter workstation has `compute 1 / network 1`, and baseline capability is
1 — so **every default world produces exactly the Phase 2 timings**, and every
existing timing test (the `0→12→20→25` chain) passes untouched. Acceleration is
strictly a reward for upgrades. Example with `compute 4 / network 4`:
survey 3m, inspect 2m, escalate 2m, disengage 3m.

## State, events, persistence

None new. Duration is *derived at action time* from `economy.hardware`, so no
save-schema change, no migration, and restore-and-continue is automatic (the
capability re-derives from the same owned hardware). Wallet impact is zero —
faster work costs time-saved, not credits.

## Projection and UI

`EconomyProjection` gains `actionMinutes` (survey/inspect/escalate/disengage at
the player's current rig), surfaced in TinyBase as the `rig/actionMinutes` row.
The Market app shows a **RIG SPEED // EST. MINUTES PER ACTION** panel with the
explicit no-gate reminder ("capability is speed and scale, not a level gate"),
so the Money/Time trade is visible before buying. Terminal help now says
"rig speed" instead of frozen minute figures; `op exit (3m)` stays honest
because disengage never scales.

## Commands

No new commands. `surveyTarget` / `inspectMachine` / `escalateOperation` /
`disengageOperation` resolve their time cost through
`rigActionMinutes(action) = actionDuration(action, deriveRigCapability(economy))`.

## Invariants (tested)

- starter rig pays the base table for every action (all Phase 2 timing tests
  unchanged and passing),
- upgrading compute/network strictly shortens the affected actions and never
  lengthens any,
- disengagement cost is invariant under any rig,
- duration is never below 1m and is a pure function of (base, axis capability) —
  same rig ⇒ same duration ⇒ deterministic, and mid-chain restore continues
  identically,
- an upgraded rig's full recon chain still completes exactly as the starter's
  does: outcomes identical, elapsed time shorter — capability is speed, not a
  gate,
- faster actions move no credits: wallet and ledger untouched,
- projection exposes `actionMinutes` for starter and upgraded rigs and syncs it
  to TinyBase when hardware is bought.

## Out of scope (later slices)

Concurrent workloads and contention (memory/vram/storage axes still
uncollected), multiple named machines, rented/external compute, housing and
recurring costs, the software marketplace, tool authorship, player-tool
trading, the richer value graph.
