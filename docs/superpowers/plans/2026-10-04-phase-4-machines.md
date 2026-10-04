# Phase 4 P7 — Multiple Named Machines (The Rack)

Issue: #22
Builds on: Phase 4 P0 substrate, P1 compute budgeting, P2 workload scale,
P3 housing/recurring costs, P4 software marketplace, P5 tool
authorship/trading (`2026-10-04-phase-4-tool-authorship.md`), P6 digital-value
graph (`2026-10-04-phase-4-value-graph.md`)

## Goal

Deliver the last core Phase 4 deliverable, **multiple machines** — the Phase 0
hardware slice modelled the rig as *components inside one machine* (a CPU, a
NIC); this slice adds *complete named boxes* as a fifth asset class. The player
can own as many whole systems as they can afford, give each a personal name so
the rack stays legible, and sell any one back through the same offline fence.

The design reads them through the same precedent P5 already proved: machines
are **property, not rent**. A one-time purchase, no recurring fee, a resale at a
fraction of the stored paid price, and a lift that folds into the single
`effectiveCapability` source feeding P1 speed and P2 breadth. An empty rack is
exact identity — all 322 pre-P7 tests pass untouched — so machines are a
capability layer, never a gate.

## The model

New catalog `src/content/machine-catalog.ts`:

- `MachineListing { id, label, cost, capability }` — a whole box with a flat
  five-axis `HardwareCapability` contribution (`box-burner` 600, `box-silent-proxy`
  1_100, `box-analysis-node` 1_500, `box-attack-cluster` 2_400). Capability
  comes *only* from the catalog id; the label is identity, never power.
- `MACHINE_RESALE_RATE = 0.5`, `machineResaleValue(paidCost) =
  floor(paidCost × rate)` — resale values what was *actually paid*, so catalog
  retuning never re-values a box already in a player's rack.
- `MACHINE_LABEL_MAX_LENGTH = 24` — player-authored names land in the save, so
  they need a bound; the cap is enforced at the command boundary (the Zod schema
  stays structural, as everywhere else).
- `machineCapabilityOf(catalogId)` returns `null` for unknown ids, so a stale
  save reference contributes zero lift rather than breaking the fold.

New state (the only P7 state): `economy.ownedMachines: OwnedMachine[]`, each
copy `{ id, catalogId, label, paidCost, acquiredWorldMinute }` — label and paid
price are stored so both identity and provenance survive later tuning. Legacy
saves default to `[]` (the empty rack, the untouched baseline).

Ledger gains one cause kind, `machine`: a purchase debits `market`, a resale
credits the `fence`. The value graph (P6) picks both up with zero changes —
`market` and `fence` are already institution roles.

## Commands and events

Three commands, shared verbatim by Terminal and GUI (P0 parity pattern):

- `buyMachine { catalogId }` — `MACHINE_NOT_FOUND` / `INSUFFICIENT_CREDITS`
  reject before anything moves; otherwise one `transferValue` debit (cause
  `machine`, counterparty `market`) plus `MachineAcquired`. Instance ids use
  the max-suffix scheme (`machine:N`), collision-safe across resale history —
  the same bug class P5 solved for `tool:N`.
- `sellMachine { machineId }` — `MACHINE_NOT_OWNED` otherwise; proceeds
  `machineResaleValue(paidCost)` credited through the fence (`MachineSold`
  always fires, the payout event only when credits actually move).
- `renameMachine { machineId, label }` — ownership is checked *before* label
  validity, so `box name machine:9 whatever` says "not owned", not "bad label";
  the label is trimmed and rejected (`INVALID_MACHINE_LABEL`) if empty or
  over-long; a successful rename mutates only `label` and emits
  `MachineRenamed` — capability provably cannot move.

Terminal exposes the compound verb `box` (following the `lease break`
precedent): `box buy <catalog-id>`, `box sell <box-id>`, and
`box name <box-id> <label…>` — the free-text label rejoins the remaining
arguments, and trimming/validation stays in the simulation so the parser never
invents rules.

## Capability plumbing

Machines fold into the existing single source, in order:

```
effectiveCapability = rig components + machines + lease
                    + capability licenses + owned player tools
```

`deriveMachineCapability(economy)` (hardware.ts) sums `machineCapabilityOf`
over the inventory from a zero baseline; `effectiveCapability` (housing.ts)
gains it as the second addend. Nothing new consumes capability: P1 durations
and P2 scope read the same derived profile, and `advanceUpkeep` never sees
machines by construction — there is no recurring fee to bill.

## Projection and UI

`project-world.ts` extends `EconomyProjection` with `ownedMachineCapability`
(the lift), `ownedMachines` (`VisibleOwnedMachine`: id, catalogId, label,
paidCost, resaleValue, acquiredWorldMinute, capability) and `machineListings`
(`VisibleMachineListing`: id, label, cost, ownedCount, capability). Owned
machines sort by acquisition time; listings by price.

TinyBase gains `ownedMachines` and `machineListings` tables and a `rig`
`machineLift` row; the RIG CAPABILITY footnote now reads "lease + software +
tool + machine lift".

The Market app gains a **MACHINES // NAMED BOXES** section between PLAYER
TOOLS and the value graph: owned boxes show their stats line, provenance
(`catalogId · paid X cr · sells Y cr · time`), an inline rename row (input +
NAME, empty drafts ignored client-side, validation still owned by the sim) and
SELL; listings show stats, `X cr one-time · owned ×N` and an
affordability-gated BUY. The hint states the invariants: the rack multiplies
capability, the fence returns half of what was paid, and none of it ever
unlocks or blocks a target.

Events are projected to SQLite run-event rows alongside the existing
`worldMinute` group (MachineAcquired / MachineSold / MachineRenamed).

## Invariants (tested — `machines.test.ts` 26 tests, `economy-commands.test.ts` +6, `world-projection.test.ts` / `world-state-schema.test.ts` extended)

- catalog shape: `box-` ids, positive integer costs and axis values;
  unknown ids resolve to nothing;
- resale is a floored fraction — odd prices never produce fractional balances;
- empty rack is identity: zero machine lift;
- buying charges `market` exactly once with cause `machine`, stores the
  catalog label and paid price, and rejects unknown/unaffordable boxes without
  moving money;
- multiple boxes stack — the rack multiplies capability;
- instance ids stay unique across a buy/sell/rebuy cycle;
- selling credits the fence at `floor(paid × 0.5)` of the *stored* price (a
  historic 500 paid does not resell against a current 600 price), removes the
  box, and drops its lift;
- renaming stores the trimmed label, emits `MachineRenamed`, and provably does
  not move capability; empty/over-long labels fail, unowned boxes fail with
  MACHINE_NOT_OWNED *before* label validation, and the exact 24-char boundary
  is accepted;
- machines have no upkeep: three days of waiting bills nothing, and the
  projection's daily cost stays 0 with only machines held;
- machines flow through the same consumers: a node's memory widens
  `discoveryScope` (one survey discovers both slice machines), a burner's
  network shortens survey and its compute shortens inspect;
- `effectiveCapability` folds all five layers at once (components + machine +
  lease + license + tool per axis), and selling returns durations, scope, and
  lift to the exact baseline;
- persistence: `machine` ledger cause round-trips, legacy economies load as an
  empty rack, malformed inventories are rejected, and a save→load round-trip
  preserves a buy/rename/sell/rebuy history byte-for-byte;
- projection surfaces listings with owned counts and the player's chosen
  label; the runtime syncs lift, owned label, and listing counts through
  TinyBase;
- Terminal/GUI parity: `box buy/sell/name` parse to the same typed commands the
  GUI helpers emit, multi-word labels rejoin, the `box` verb stays distinct
  from `buy`/`buytool`, and malformed forms are rejected.

## Out of scope (later slices)

- vram and storage still have no consumers — local-model capacity and storage
  contention are Phase 5 (AI economy) territory, as planned since P0;
- machines are bought from the abstract `market` institution only; seller-side
  NPC marketplaces (actors *selling* boxes, haggling, stolen-goods provenance)
  belong to later economy slices;
- the rack has no physical footprint (space/power/heat) — a future constraint
  layer, not a gate on capability;
- multi-hop value chains remain deferred with P6 (inter-actor credit flows).
