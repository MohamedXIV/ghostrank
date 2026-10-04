# Phase 4 P3 — Housing and Recurring Costs: Credits Become a Flow

Issue: #22
Builds on: Phase 4 P0 economy substrate (`2026-10-04-phase-4-economy-substrate.md`),
P1 compute budgeting (`2026-10-04-phase-4-compute-budgeting.md`),
P2 workload scale (`2026-10-04-phase-4-workload-scale.md`)

## Goal

Give credits their first **recurring sink**. Through P0–P2 money was a
one-shot purchase pool: you saved up, bought a card, kept the rest. The exit
criterion "money creates meaningful strategic choices" needs a *flow*
decision — a standing cost that trades against every other purchase and turns
"how do I spend this week's contract payout" into a real question.

The chosen sink is **housing**: a rented location that adds capability while
you keep paying its daily upkeep. It satisfies the other half of the Phase 4
exit criteria at the same time, because the capability it adds flows into the
*existing* P1/P2 consumers — a lease makes work faster and wider — without
inventing new mechanics, and it is never a gate: no location unlocks or
blocks anything.

## The model

New content `src/content/housing-catalog.ts` (paid listings only — the
baseline is holding *no* lease, modelled as `housing: null`, so state never
couples to a content id):

- `housing-cowork-loft` — 30 cr/day, network +2 (connectivity: fast surveys),
- `housing-rented-lab` — 60 cr/day, compute +2, memory +1, storage +1 (bench
  space: fast intrusive work and wider passes).

New system `src/game/simulation/systems/housing.ts`:

- `deriveLeaseCapability(economy)` — the held listing's capability, zero at the
  baseline; an unknown id degrades safely to zero.
- `effectiveCapability(economy) = owned hardware + lease` — the single
  capability source the command bus and projection already use, so P1 speed
  and P2 breadth pick up housing with **no changes** to `compute.ts`/`scale.ts`.
- `advanceUpkeep(world, fromMinute, toMinute)` — for each whole world-day
  boundary crossed (`day * 1440`), debit `dailyCost` once with ledger cause
  `{kind: "upkeep", id: <listing>}` and counterparty `landlord`. Charging at
  absolute boundaries makes upkeep **split-invariant**: chunked `wait`s bill
  exactly the same set of boundaries as one long wait, so the ledger stays
  deterministic across any action split.
- **Eviction, not debt.** If a boundary cannot be paid, `transferValue`
  returns null (credits never go negative), the charge is skipped, and housing
  becomes `null` with a `HousingChanged` event — the player returns to the
  free baseline. There is no penalty beyond losing the lift.

Commands (shared Terminal + GUI, per the typed-command non-negotiable):

- `rentHousing { housingId }` — `rent <housing-id>`; errors
  `HOUSING_NOT_FOUND`, `ALREADY_RENTED`. Signing **and switching** move no
  credits: the choice is reversible and never double-billed, because cost
  accrues only at boundary crossings.
- `breakLease {}` — `lease break`; error `NO_ACTIVE_LEASE`; also free.

Events: `HousingChanged { housingId, dailyCost, worldMinute }` (eviction
carries `housingId: null, dailyCost: 0` at the boundary minute).

Timing of the charge: `advanceWorldTime` now runs
`WorldTimeAdvanced → advanceUpkeep → advanceUnderground`, so upkeep fires on
the same clock that every action already advances — surveying through a
midnight boundary pays rent, and there is no separate scheduler to drift.

## State, events, persistence

- `EconomyState.housing: string | null` is the entire new state surface.
  `world-state-schema.ts`: `housing: z.string().min(1).nullable().default(null)`;
  ledger `cause.kind` enum widened with `"housing" | "upkeep"`; legacy full or
  partial economies load at the free baseline, so pre-P3 saves resume untouched.
- `sqlite-run-persistence.ts` maps `HousingChanged` to its minute.
- Derive-don't-store holds: lease capability is never cached; only the id is.

## Projection and UI

`EconomyProjection` gains `lease`, `currentHousingId`, `dailyCost`, and a
`housing` listing table; TinyBase gets a `rig/lease` row, `housing` table rows,
and `meta/wallet` `dailyCost` + `currentHousingId` cells. The Market app adds a
**HOUSING // RECURRING** section (label, `N cr / day`, capability stats, MOVE IN /
MOVE OUT), shows the upkeep in the wallet line ("30 cr upkeep per world day"),
and annotates RIG CAPABILITY with the lease lift so the hardware/lease sum is
visible. Terminal `help` lists `rent` and `lease break`.

## Invariants (tested — `src/game/simulation/__tests__/housing-costs.test.ts`, 17 tests)

- baseline: no lease ⇒ zero lift, zero upkeep, starter timings untouched
  (all 229 pre-P3 tests pass unmodified);
- rent/switch/break are free and emit exactly one `HousingChanged`; error paths
  `HOUSING_NOT_FOUND` / `ALREADY_RENTED` / `NO_ACTIVE_LEASE`;
- boundary charging: N crossed days ⇒ N equal debits at the boundary minutes
  with unique ledger ids; chunked waits match one long wait exactly
  (split-invariance);
- eviction: partial ability pays what it can, the unaffordable boundary bills
  nothing, credits never negative, housing ⇒ null; a 0-credit player can still
  sign (the lift is free until a day passes) and is evicted at the boundary;
- the lift flows: loft network +2 ⇒ survey 12m → 4m with zero hardware;
  lab memory +1 ⇒ scope 2 ⇒ both slice machines in one pass; eviction restores
  hardware-only capability;
- projection/TinyBase: listing active flags, wallet `dailyCost`, `rig/lease`
  row track the runtime; schema round-trips a lease id and rejects `""`.

## Out of scope (later slices)

Multiple named machines per player, software marketplace, tool
authorship/provenance, digital-value graph, player-tool trading; vram and
storage consumers (contention, archives); moving to a new city as a scripted
event; lease loss as narrative threat. The `housing` ledger cause kind is
reserved (schema-accepted) for a future one-time move-in fee; P3 charges
upkeep only.
