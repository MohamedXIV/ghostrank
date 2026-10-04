# Phase 4 P5 — Tool Authorship, Provenance, and Buying Player Tools

Issue: #22
Builds on: Phase 4 P0 substrate, P1 compute budgeting, P2 workload scale,
P3 housing/recurring costs, P4 software marketplace
(`2026-10-04-phase-4-software-market.md`)

## Goal

Turn the *purchased* licenses of P4 into *authored, tradable* artifacts. The
Phase 4 deliverables list names two adjacent items — **tool
authorship/provenance** and **buying/selling player tools** — and this slice
ships the economy half of both: a catalog of tools each credited to a named
author handle, a one-time buy that writes a provenance edge into the value
ledger, and a resale that pays the player back through a fence. What the
underground already simulates for *reputation* (who did what to whom) the
economy now simulates for *value* (who got paid by whom, for what artifact) —
the ledger gains edges to named authors, the seed of the richer digital-value
graph that follows.

The economic shape is deliberately the opposite of P4's licenses: a tool is
**property, not rent**. One-time purchase, no daily upkeep, permanent lift
until resold. Selling returns a fraction of what was *paid* (not what the
catalog currently lists), so retuning prices never re-values a copy already in
someone's inventory.

## The model

New content `src/content/player-tool-catalog.ts`. A listing is
`{ id, label, author, cost, effect }` where `effect` is the exact
`SoftwareEffect` union P4 introduced — capability or action-duration modifier —
so player tools reuse the same combinators (`combineCapabilities`,
`combineFactors`) with zero new effect mechanics.

Catalog (all one-time purchases, none with upkeep):

- `tool-paranoid-scraper` by **nullbyte** — 500 cr, memory +1 / network +1 (capability),
- `tool-ghost-loader` by **hexwidow** — 1 200 cr, compute +2 / memory +1 (capability),
- `tool-silent-dedup` by **cipher-priest** — 900 cr, ×0.9 action time (modifier).

Resale is `TOOL_RESALE_RATE = 0.5` of `paidCost`, floored to whole credits;
resale proceeds are credited with counterparty `fence` (an offline buyer, not a
peer — only the *purchase* names the author, keeping the graph edge
"player → author").

Systems (`src/game/simulation/systems/tools.ts`):

- `derivePlayerToolCapability(economy)` folds all owned copies' capability
  effects through `combineCapabilities` — empty inventory is the zero lift;
- `combinedActionDurationFactor(economy)` composes the license factor and every
  owned tool's modifier factor through `combineFactors`, with the 0.1 floor
  applied *once* at the end (previously the per-list floor lived in
  `actionDurationFactor`; composing raw factors keeps the joint shortcut honest);
- `effectiveCapability` (in `housing.ts`) becomes **hardware + lease +
  capability licenses + owned tools** — the same single capability source
  P1 speed and P2 breadth already consume, so nothing new is wired into
  `compute.ts` or `scale.ts`;
- `rigActionMinutes` and the projection both switch from
  `actionDurationFactor(economy.software)` to `combinedActionDurationFactor(economy)`.
  With no owned tools the factor equals P4's exactly, so every pre-P5 timing
  test is untouched.

Commands (shared Terminal + GUI):

- `buyPlayerTool { toolId }` — `buytool <tool-id>`; one-time debit to the
  author, errors `TOOL_NOT_FOUND`, `INSUFFICIENT_CREDITS`; costs no world time,
  like every other market action;
- `sellPlayerTool { toolId }` — `selltool <tool-id>`; takes the *instance* id
  (`tool:2`), credits the resale through the fence, errors `TOOL_NOT_OWNED`.

Instance ids are collision-safe across resale history: `nextToolId()` takes
`max(existing suffix) + 1` rather than `length + 1`, because sold copies shrink
the list and a length counter would re-issue live ids.

Events: `PlayerToolAcquired { toolId, catalogId, author, cost, worldMinute }`
and `PlayerToolSold { toolId, catalogId, author, proceeds, worldMinute }` —
both carry the author so the event stream itself is provenance-legible for the
value graph. Ledger cause kind `tool` joins
`contract | hardware | housing | upkeep | license`; purchases record
counterparty = author handle, resales record counterparty = `fence`.

## State, events, persistence

- `EconomyState.playerTools: OwnedPlayerTool[]` with
  `{ id, catalogId, author, paidCost, acquiredWorldMinute }` is the entire new
  state surface. Effect and resale are derived — the stored `author` keeps the
  provenance record stable even if catalog authorship later changes, and the
  stored `paidCost` makes resale independent of current tuning.
- `world-state-schema.ts`: `playerTools: z.array(ownedPlayerToolSchema).default([])`,
  the tool shape requires `id`/`catalogId`/`author`/`paidCost`/
  `acquiredWorldMinute`; ledger `cause.kind` enum gains `"tool"`; the legacy
  economy default gains `playerTools: []`, so pre-P5 saves resume untouched.
- `sqlite-run-persistence.ts` maps both new events to their minute.
- Upkeep stays exactly P4's: `advanceUpkeep` and `recurringDailyCost` never see
  `playerTools` — tools cannot lapse, cannot be repossessed, and cannot bill.

## Projection and UI

`EconomyProjection` gains `playerTools` (aggregate tool lift), `ownedTools`
(`VisibleOwnedTool` per copy: label, author, paid cost, resale value, effect),
and `toolListings` (`VisiblePlayerToolListing` per catalog entry with
`ownedCount`). TinyBase gets `ownedTools` and `toolListings` tables plus a
`rig/playerToolLift` row; the RIG CAPABILITY footnote now reads *lease +
software + tool lift*. The Market app adds **PLAYER TOOLS // ONE-TIME**: owned
copies show `by <author> · paid X cr · sells Y cr` with a SELL button, listings
show `by <author> · X cr one-time` with affordability-gated BUY. Terminal `help`
lists `buytool` and `selltool`.

## Invariants (tested — `player-tools.test.ts` 26 tests, `economy-commands.test.ts` 4 new, `world-projection.test.ts` extended)

- baseline: no owned tools ⇒ zero lift, factor 1, no upkeep, starter timings
  untouched (all 280 pre-P5 tests pass unmodified);
- buy charges once, names the author as counterparty, emits
  `ValueTransferred` + `PlayerToolAcquired`; unaffordable/unknown buys move no
  money;
- sell removes the copy, credits `floor(paid × 0.5)` via the fence, and drops
  the lift; resale uses `paidCost`, not the current catalog price;
- ids stay unique across buy/sell/rebuy cycles;
- waiting days bills nothing for tools — the wallet's `dailyCost` stays tools-
  free by construction;
- the lift flows: ghost-loader memory widens survey scope to 2; silent-dedup
  ×0.9 shortens baseline survey 12→11m; license × tool factors compose
  (0.85 × 0.9 = 0.765 ⇒ survey 10m) with the floor respected;
- schema round-trips copies with provenance, rejects malformed entries and
  non-array lists, defaults legacy to `[]`; a full bus snapshot survives a
  JSON round-trip byte-for-byte;
- projection/TinyBase: owned/listing tables and the `playerToolLift` row track
  the runtime through buy and sell; Terminal and GUI emit identical typed
  commands.

## Out of scope (later slices)

Multiple named machines, the richer multi-hop digital-value graph (author→buyer
chains, tool lineage across players), marketplaces *run by* underground actors
(where authors are simulated peers with ranks), tools appearing as contract
rewards or stolen goods, vram/storage consumers, contention, and local-model
capacity. Catalog prices, resale rate, and effect contributions are provisional
tuning.
