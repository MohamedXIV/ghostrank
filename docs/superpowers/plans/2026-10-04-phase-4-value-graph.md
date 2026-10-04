# Phase 4 P6 — Digital-Value Graph (Derived Projection)

Issue: #22
Builds on: Phase 4 P0 substrate, P1 compute budgeting, P2 workload scale,
P3 housing/recurring costs, P4 software marketplace, P5 tool
authorship/trading (`2026-10-04-phase-4-tool-authorship.md`)

## Goal

Deliver the Phase 4 item **digital-value graph** — the design's promise that
"digital currencies are represented as transaction graphs, not anonymous money
bars" (`docs/ECONOMY_PROGRESSION_AND_SKILLS.md`, *Crypto-like economy*). P5's
named author edges made the ledger *legible*; this slice makes it *inspectable*
as a network.

The honest scoping decision: the simulation tracks the **player's** money, and
every ledger entry already names a counterparty, so the graph this slice ships
is a **pure derived projection over the existing append-only ledger** — zero new
state, events, commands, or save-schema surface. A true multi-hop NPC↔NPC graph
(author→buyer chains across simulated peers) requires inter-actor credit flows
the simulation does not yet produce; fabricating those edges would be inventing
history the ledger never recorded, which the design rules forbid. Multi-hop is
deferred, stated plainly, to a later slice that adds simulated peer-to-peer
payments.

## The model

New system `src/game/simulation/systems/value-graph.ts`:

- `deriveValueGraph(movements)` folds ledger movements by counterparty into
  `ValueNode`s. Amounts are player-relative: `received` is value the
  counterparty gave the player, `paid` is value the player gave them; `net =
  received − paid` is the player's standing with each node. Each node also
  tracks `interactions` and the `firstWorldMinute`/`lastWorldMinute` of its
  earliest and latest movement, plus the de-duplicated, sorted set of ledger
  `causeKinds` that touched it.
- Nodes are classified `peer` (any scene handle: contract issuers, tool
  authors) vs `institution` — the four named roles `market`, `landlord`,
  `vendor`, `fence`, which are not people in the scene.
- The `ValueGraph` adds whole-network totals (`counterparties`, `totalInflow`,
  `totalOutflow`, `net`).
- Deterministic by construction: it is a read-time aggregation, and the node
  list sorts by total volume (`received + paid`) descending, then id ascending,
  so the most-traded counterparties lead regardless of ledger insertion order.
  Splitting or reordering the input never changes the output.

Projection (`project-world.ts`): the existing counterparty-resolution helper
(actor id → public handle, roles kept verbatim) is factored out and shared by
both the ledger view and the graph, so nodes are keyed by the same names the
player sees. The graph reads the **full** ledger, not the LEDGER_LIMIT-capped
recent view — it summarises lifetime relationships, so a long run keeps its
history. `EconomyProjection` gains `valueGraph: ValueGraph`.

## State, events, persistence

None. This slice touches no `WorldState`, no `SimulationEvent`, no command, no
Zod schema, no persistence adapter. That is the point: the graph is a read, so
there is nothing to migrate and nothing that can desync.

## Projection and UI

TinyBase (`world-projection.ts`): a `valueNodes` table (one row per node:
kind, received, paid, net, interactions, first/last minute, `causeKinds` joined
with commas) and wallet cells `valueInflow`, `valueOutflow`,
`valueCounterparties`. The view re-applies the volume-then-id ordering because
TinyBase table keys carry no guaranteed order across re-syncs.

The Market app gains a **VALUE GRAPH // N COUNTERPARTIES** panel above the
ledger: each node shows its handle or role with a `peer`/`role` tag, its cause
kinds, interaction count with first/last world times, proportional in/out bars,
and its net. Lifetime totals (in / out / net) close the panel; an empty graph
says so. Two hints explain the reading rules (aggregated by who actually got
paid; institutions are roles, every other name is a scene handle).

## Invariants (tested — `value-graph.test.ts` 12 tests, `world-projection.test.ts` extended)

- empty ledger ⇒ empty graph with zero totals; the untouched slice baseline
  projects an empty graph (zero-regression: nothing to see until money moves);
- aggregation: received/paid/net/interactions and first/last minutes are exact,
  cause kinds de-duplicate and sort;
- classification: the four roles are institutions, handles are peers;
- ordering is volume-desc then id-asc and input-order-independent (forward and
  reversed movement lists produce identical node lists);
- the projected graph names contract counterparties by their **public handle**
  (issuer `vesper` → node `VESPER`) and tool trades by the author handle;
- a buy → resale produces the author edge (paid) and the fence edge (received),
  and the graph totals mirror the player's lifetime inflow/outflow;
- the graph summarises the whole lifetime ledger even when the ledger table
  view is capped at the 30 most recent entries (40-entry run asserted);
- deterministic: two identical runs agree node-for-node;
- runtime sync: `valueNodes` rows and the three wallet cells track a buy
  through TinyBase.

## Out of scope (later slices)

Multi-hop value chains across simulated peers (author→buyer→buyer), which
require credit flows between NPCs, not just the player's ledger; marketplaces
*run by* underground actors; physical-currency tracing and the crypto-like
asset classes (liquidity, volatility, exchange friction) the design's graph
eventually spans; vram/storage consumers, contention, and multiple named
machines. Node layout is currently a ranked list, not a drawn graph — a visual
force-directed layout belongs to the phase-9 polish pass.
