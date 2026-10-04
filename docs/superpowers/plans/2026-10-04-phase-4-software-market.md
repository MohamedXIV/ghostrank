# Phase 4 P4 — Software Marketplace: Premium Tools as a Recurring Sink

Issue: #22
Builds on: Phase 4 P0 substrate, P1 compute budgeting, P2 workload scale,
P3 housing/recurring costs (`2026-10-04-phase-4-housing-costs.md`)

## Goal

Add a **second recurring money decision** that is *stackable* and *distinct*
from both hardware (a one-time physical purchase) and housing (a one-location
capability lift). The Phase 4 exit criteria — "money creates meaningful
strategic choices" and "expensive equipment improves capability/scale without
replacing skill" — need the player to weigh *several* ongoing costs against
each other and against one-time purchases. Software licenses do exactly that:
they turn "which premium tools do I keep running this week?" into a real
portfolio decision, without ever gating a target.

Software stays a **lift, never a gate**: no license unlocks or blocks anything;
running nothing is the untouched baseline. This is the same safety posture as
P1/P2/P3 — the empty default reproduces prior behaviour exactly.

## The model

New content `src/content/software-catalog.ts`. A license is one of two effect
shapes, so tools and hardware are genuinely different layers:

- **capability** licenses add raw axes to the rig (a Commercial Monitoring Suite
  gives network +2; an Automated Recon Framework gives memory +2 / network +1),
  feeding the existing P1 speed and P2 breadth consumers;
- a **modifier** license is an efficiency tool that multiplies derived
  *hardware* minutes by a factor (`Optimized Analysis Pipeline`, ×0.85),
  respecting the P1 one-minute floor. This is the one genuinely new consumer:
  software that makes the *same capability* produce *less elapsed time*, which
  no hardware axis does on its own.

Catalog (all recurring, none a one-time purchase):

- `software-net-monitor` — 40 cr/day, network +2 (capability),
- `software-auto-recon` — 70 cr/day, memory +2 + network +1 (capability),
- `software-analysis-pipeline` — 100 cr/day, ×0.85 action time (modifier).

Systems:

- `softwareCapability(ids)` / `actionDurationFactor(ids)` derive from the
  active-id list; both return identity (zero / 1) for the empty list, so no
  licenses ⇒ hardware-only behaviour.
- `effectiveCapability` (in `housing.ts`) now sums **hardware + lease +
  capability licenses** — the single capability source P1/P2 already read, so
  nothing in `compute.ts` beyond an added optional `factor` argument changes.
- `actionDuration(action, capability, factor = 1)` applies the shortcut after
  the hardware minutes (`max(1, ceil(hardwareMinutes × factor))`), never
  breaching the one-minute floor. `factor` defaults to 1 ⇒ P1 durations exact.

Recurring cost moved to a new `systems/upkeep.ts`: `advanceUpkeep(world, from,
to)` now bills, **per crossed whole-day boundary**, the lease first
(cause `upkeep`, counterparty `landlord`) then every active license (cause
`license`, counterparty `vendor`) in activation order. Boundary arithmetic
keeps it deterministic and **split-invariant** across chunked waits.

**Lapse, not debt.** Each obligation is all-or-nothing at a boundary. An
unpayable lease fee moves the player out (baseline); an unpayable license fee
lapses *just that one license* and keeps the rest running. Nothing is charged
for a failed bill, credits never go negative, there is no debt, and the only
consequence is losing the capability lift — never a punishment. A lapsed
license can simply be re-run later.

Commands (shared Terminal + GUI, per the typed-command non-negotiable):

- `enableSoftware { softwareId }` — `use <software-id>`; errors
  `SOFTWARE_NOT_FOUND`, `ALREADY_ACTIVE`. Activation is free: the fee accrues
  only at the next boundary, so stacking/swapping never double-bills.
- `disableSoftware { softwareId }` — `stop <software-id>`; errors
  `SOFTWARE_NOT_FOUND`, `NOT_RUNNING`. Also free.

Event: `SoftwareChanged { softwareId, active, dailyCost, worldMinute }`
(lapse carries `active: false, dailyCost: 0` at the boundary minute).

## State, events, persistence

- `EconomyState.software: string[]` is the entire new state surface (active ids
  in activation order).
- `world-state-schema.ts`: `software: z.array(z.string().min(1)).default([])`;
  ledger `cause.kind` enum gains `"license"`; legacy economies (with or without
  the field) default to `[]`, so pre-P4 saves resume untouched.
- `sqlite-run-persistence.ts` maps `SoftwareChanged` to its minute.
- Derive-don't-store holds: no license effect is cached; only the id list is.

## Projection and UI

`EconomyProjection` gains `software` (aggregate capability lift),
`softwareListings` (per-tool label, daily cost, capability-or-discount, active
flag), and `dailyCost` becomes the **combined** lease + license upkeep.
TinyBase gets a `software` table, a `rig/softwareLift` row, and the wallet
`dailyCost` cell now totals everything. The Market app adds **SOFTWARE //
RECURRING** (RUN/STOP per tool, `×0.85 action time` shown for the modifier),
the wallet line reads the combined daily upkeep, and RIG CAPABILITY annotates
the lease + software lift. Terminal `help` lists `use` and `stop`.

## Invariants (tested — `software-market.test.ts`, 22 tests)

- baseline: no licenses ⇒ zero lift, factor 1, zero cost, starter timings
  untouched (all 280 tests pass, 258 pre-P4 unmodified);
- enable/stop are free and emit exactly one `SoftwareChanged`; error paths
  `SOFTWARE_NOT_FOUND` / `ALREADY_ACTIVE` / `NOT_RUNNING`;
- boundary billing: N licenses × M boundaries, lease charged before licenses at
  the same minute; chunked waits match one long wait (split-invariance);
- lapse: an unaffordable license drops only itself, the rest keep billing,
  credits never negative, and it can be re-run;
- the lift flows: monitor network +2 ⇒ survey 12m→4m; auto-recon memory ⇒
  scope 3 covers both slice machines; pipeline ×0.85 shortens even baseline
  work (survey 12→11m) and never breaches the one-minute floor;
- projection/TinyBase: listing active flags, combined `dailyCost`, and the
  `softwareLift`/`actionMinutes` rows track the runtime; schema round-trips a
  license list, defaults legacy to `[]`, rejects a non-array.

## Out of scope (later slices)

Tool authorship/provenance and buying/selling player-made tools (a Phase 4
deliverable that turns these *purchased* licenses into *authored, tradable*
artifacts), the richer multi-hop digital-value graph, vram consumers
(local-model capacity), contention/background workloads, and multiple named
machines. License discount factors and daily costs are provisional tuning.
