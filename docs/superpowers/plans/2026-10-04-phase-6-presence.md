# Phase 6 P0 — Physical Presence: The Room Reads the Lease

Issue: #24 — this slice delivers the first of six, *relocation* and *safehouses*,
and turns the physical layer from decoration into a read of simulation truth.
Builds on: Phase 4 P3's housing lease (`2026-10-04-phase-4-housing-costs.md`,
D021) — which already modelled "where you live" as money — and Phase 0's
never-fed bridge contracts (`2026-10-02-phase-1-computer-room.md`). The slice
map and grounding live in `2026-10-04-phase-6-plan.md`.

## Goal

Phase 6's threat work needs a physical subject to threaten. Today it does not
exist as data: the room HUD hardcoded `SHORT-TERM ROOM // UNIT 04`, the
`RoomPresentation` type had no producer anywhere in `src`, and
`PhysicalIntent` had exactly one shape (`wait`), so the physical surface could
only burn minutes. Meanwhile "where the player is" was already real in the
simulation — `economy.housing` — but readable only through the wallet panel.

P0 closes that gap without inventing a second truth: presence is **derived from
the lease**, relocation is **paid in world time**, and a **safehouse buys
distance and no capability at all**. P1's investigations and P3's retaliation
then have a real place to happen, and a real lever (leave town) to pull.

## The model

`src/game/simulation/systems/location.ts` (new, pure derivation, zero state):

- `derivePresence(housingId)` → `{ locationId, label, kind, anonymity, leased,
  dailyCost, distanceMinutes }`. `null` and any **stale catalog id** both
  resolve to the baseline dwelling — the same fail-toward-baseline rule an
  unaffordable boundary already follows, so a hand-edited save cannot fabricate
  a place.
- `relocationMinutes(from, to) = |distance(from) − distance(to)|`, where
  distance is the catalog's `travelMinutes` (absent ⇒ `0`). Taking the
  *difference* rather than the destination's distance makes every move symmetric
  and keeps both Phase 4 listings at distance 0, because they sit in the same
  district as the baseline room.

`src/content/housing-catalog.ts` (extended, not replaced): optional
`travelMinutes?`, `anonymity?: "public"|"quiet"|"hidden"`,
`kind?: "workspace"|"residential"|"safehouse"`; `BASELINE_LOCATION` (the
un-leased room, previously a string inside a React component) becomes catalog
data; two safehouses join the four-dwelling list — Sleeper Unit (Outskirts, 25
cr/day, 180 min, `hidden`) and Basement Cot (Warehouse District, 15 cr/day, 60
min, `quiet`) — each contributing **zero on all five capability axes**.

`CommandBus.rentHousing` / `breakLease` (the only behaviour change): travel is
computed first, and when it is > 0 the bus calls `advanceWorldTime(travel)`
**before** the lease changes. So the journey happens under the old lease (a
day boundary crossed mid-move bills the dwelling you actually slept in),
presence flips on arrival, and `HousingChanged` is stamped with the arrival
minute. `travel === 0` emits no time events at all, which is what keeps every
pre-Phase-6 lease test byte-identical. `breakLease` pays the trip *back* to the
baseline; involuntary eviction in `advanceUpkeep` deliberately stays instant —
the world acting on the player is not the player choosing to travel.

Events: **none new**. Relocation rides `WorldTimeAdvanced` / upkeep / ecosystem
tick events plus the existing `HousingChanged`, which matters because
`sqlite-run-persistence.ts`'s `eventWorldMinute` is an exhaustive switch over
event types — adding none means touching nothing there.

## Surface (Terminal / GUI / Phaser — one path)

- Projection: `WorldProjection` gains `presence: VisiblePresence` (a read of
  `economy.housing`, so it can never disagree with an eviction), and each
  `VisibleHousing` listing gains `kind`, `anonymity`, and `travelMinutes`
  *re-priced from where the player stands now* — the price of a move is legible
  before committing to it. TinyBase gains a `presence/current` row; housing rows
  gain the three fields.
- Bridge (`src/game/phaser/`): `PhysicalIntent` gains `moveTo { housingId }` and
  `leave`; `physicalIntentToCommand` maps them onto the **existing**
  `rentHousing` / `breakLease` commands — no new command types, so parity with
  `rent <id>` / `lease break` and the Market buttons is structural, and the
  bridge stays pure (bus-less, stateless). `presentRoom(presence, worldMinute,
  avatarPosition?)` finally has a producer, and its output is deliberately
  narrow: `RoomPresentation` carries names, one band, one boolean, one minute,
  and one cosmetic `distant` flag — no daily cost, no capability, nothing the
  scene could optimise.
- Room HUD: the hardcoded caption is replaced by `presentation.label`, with an
  atmosphere line derived from the anonymity band, plus RELOCATE / MOVE / PACK UP
  controls that read the same `housing` table the Market does and issue
  `PhysicalIntent`s. Phaser still decides nothing.
- Market HOUSING panel: each listing shows its `kind`/`anonymity` names and the
  travel cost from the current district (`180 min travel from here`, `same
  district`), the sign button reads TRAVEL & SIGN when a journey is involved,
  and the hint states what a safehouse is selling.

## Alternatives weighed (and rejected)

- **A stored `locationId` (or `safehouseId`) field.** Rejected: it is a second
  source of truth for a fact `economy.housing` already owns, and it desyncs the
  first time upkeep evicts someone without updating it. Derivation costs one
  pure function and zero schema surface; a field costs a migration, an event,
  and a class of bug where the room says one thing and the wallet another.
- **Relocation priced in credits** (a one-time move fee on the `housing` cause
  kind D021 reserved for it). Rejected: P3's rule is that signing, switching,
  and breaking a lease move no money, and a credit fee would make the outskirts
  a *purchase* — a rich player flees free, a poor one cannot. Priced in world
  time instead, distance is paid by everyone, and time is exactly the resource
  threat systems consume. The reserved cause kind stays reserved.
- **Per-hop travel accumulation** (each move paid from a "current distance"
  state). Rejected as needless: `|d(from) − d(to)|` is additive along a route
  (60 + 120 = 180, tested), so a chain of moves costs the journey, not the
  number of button presses — without any state to hold "where the trip started".
- **New `move` / `safehouse` command types** (the kickoff plan's sketch).
  Rejected on contact with the code: the lease commands already are the
  mechanic, and inventing parallel verbs would split one rule across two
  implementations — the specific drift AGENTS.md's parity rule exists to
  prevent. The plan's phrasing was a sketch, not a contract; this is the
  recorded correction.
- **A numeric anonymity/heat stat.** Rejected per the phase rule and the
  existing band discipline (`FootprintLevel`, `relationshipStance`): three
  names, no bar, nothing to farm.

## Invariants (all pinned by `src/game/simulation/__tests__/phase-6-presence.test.ts`, 35 tests, plus 5 in `src/game/phaser/bridge.test.ts`)

- derivation: baseline for `null`, leased dwelling from the id alone, stale id ⇒
  baseline, and **no state added to the world** (a default state has no
  `presence`/`location`/`safehouse` property to persist);
- relocation: 0 inside the district (incl. both Phase 4 leases), 180/60/120
  between districts, symmetric out and back, additive along a route, stale
  origin treated as baseline rather than throwing;
- safehouse physics: zero contribution to every capability axis, action minutes
  unchanged, rank never an input, daily upkeep still lapses-not-debt when
  unpayable (credits never negative);
- command layer: the clock lands at 180 on arrival, `HousingChanged` is stamped
  at the arrival minute, a 300→480 move crosses the 360-minute tick boundary so
  the ecosystem keeps acting during the journey, a day boundary crossed mid-move
  bills the *origin* lease (loft 30/day, credits 1000→970, arrival stamp 1500),
  sign→switch→sign moves no credits, `breakLease` pays the trip back,
  same-district exit stays instant, and eviction charges no travel;
- parity: `parseTerminalCommand("rent housing-sleeper-unit")` ≡
  `rentHousingFromGui(…)` ≡ `physicalIntentToCommand({type:"moveTo", …})`, and
  `leave` ≡ `breakLease` ≡ `lease break`; an unknown dwelling fails through any
  surface (`HOUSING_NOT_FOUND`) with `worldMinute` untouched;
- projection/TinyBase: baseline presence on a default world, listings priced
  from the current district (incl. the 120-min re-pricing after a move),
  anonymity arrives as a band *string*, `presentRoom` emits the pinned shape;
- persistence: the state round-trips through `worldStateSchema` with **no new
  schema surface**, a legacy portable save loads at the baseline, and the full
  runtime loop (command → projection → store row) agrees;
- catalog breadth: 4 dwellings / 2 safehouses, every id reachable by derivation.

Honest test edits elsewhere: only `world-projection.test.ts`, whose fixture must
carry the fields the growing `VisibleHousing` shape and the new `presence` row
now require (a shape-forced edit, not a behaviour change).

Gates: tsc clean, **515 tests / 50 files** (511 → 515 from the four added bridge
cases; the pre-existing wait case stays untouched), lint only the pre-existing
`postcss.config.mjs` warning, production build succeeds. Zero-regression held:
every pre-Phase-6 lease, upkeep, projection, and persistence test re-ran
byte-identical.

## Out of scope (recorded, not silently dropped)

- **Nothing consumes `anonymity` yet.** P0 ships it as catalog + projection data
  that changes no outcome — the Phase 5 P0 pattern, stated rather than hidden.
  P3 (physical retaliation) reads it as a targeting input.
- **No threat, no signals, no `RunEnded`.** P1's investigation tick, P2's probes,
  and WORLD_RUNS_AND_ENDINGS' signal list (strange vehicle, knock, outage,
  door-camera motion) are later slices; `distant` is cosmetic by contract.
- **Movement within a room** — `avatarPosition` stays a presentation string the
  scene owns (D007's scope control; no open-world walking layer).
- **A third district or a move-between-cities arc** — the catalog's distance
  scale is provisional tuning; the endings doc's "new city" beat waits for
  Phase 8 content breadth.
- **A one-time move-in fee** — the reserved `housing` ledger cause kind stays
  unused; relocation moving no credits is the P3 rule this slice extends rather
  than overturns.
- **Safehouse as infrastructure**: a dwelling that *adds* capability for
  concealment would be a power purchase, so it is not built; if a future beat
  wants a lab with accelerators, that is D027's provisional note, and the
  zero-capability property of `kind: "safehouse"` is what a test defends.
