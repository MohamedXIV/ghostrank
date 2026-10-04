# Phase 5 P4 — Model/Tool Marketplace Provenance and NPC AI Use

Issue: #23 — this slice delivers the phase's last remaining deliverable,
*model/tool marketplace content*, and the `docs/AI_SYSTEMS.md` "NPC use" rule
that "AI is part of the ecosystem, not a player-exclusive superpower". Closing
it closes the phase: every deliverable and every exit criterion of #23 is now
backed by a test, and both #22 handoffs were discharged in-phase (constraints
by P1, author by P3). Builds on: P0's catalog and `properties`, P1's footprint
physics, P3's marketplace-pricing template for local property, and the Phase 3
ecosystem tick whose roll this slice augments without replacing.

## Goal

Two halves, shipped together because each is the other's customer:

- **NPC AI use** — peers in the deterministic ecosystem can *run models*, and
  a running model changes their ticks the same two-way way it changes the
  player's: a competent read helps, an unreliable one backfires, and a
  backfired assist makes incidents *public* — the ecosystem's version of an
  AI-assisted mistake;
- **marketplace provenance** — a model can now carry an in-fiction **author**,
  so buying that copy debits a named peer instead of the anonymous market:
  the P5 tool template (author → counterparty edge in the value graph)
  extended to the model catalog, completing *sell* in "buy, use, author,
  sell" for the model side of the marketplace.

P4 adds **no new commands, no new events, no new upkeep or ledger cause kinds,
no parser or GUI-action surface**: it reuses `model buy/run/stop` verbatim.
That is the point — the ecosystem half reuses the tick's existing roll, and
the marketplace half reuses the catalog's existing `author?` concept, so the
slice's whole blast radius is one optional state field, one pure function, one
counterparty routing line, and read-only projection.

## The identity rule (zero-regression again)

`UndergroundActor.modelId?: string` is a hidden-truth input consumed by one
pure function, `npcAssistDeltas(seed, tickIndex, actorId, model)` in
`src/game/simulation/systems/npc-ai.ts`. With no model — or a stale catalog id
that resolves to nothing — it returns exactly `{ skillDelta: 0,
discretionDelta: 0 }`, and every ecosystem tick computes the untouched pre-P4
math. Every custom-world test in the suite (underground, rumors, retaliation,
reputation-forums, contracts) uses actors without the field, so they re-ran
byte-identical, unchanged — the standing zero-regression pattern, held for
this slice exactly as it held for every Phase 4 and Phase 5 slice before it.

## The assist math: lift and fallibility, symmetric for both seats

A modelled actor's tick draws one salted roll,
`hashUnit(seed, "npc-assist", tickIndex, actorId, model.id)`:

- **mistake branch**, odds `(6 − reliability band)/12` — deliberately nonzero
  even at band 5 (1/12), because the phase rule is *fallible, never
  deterministic*: a reliable model still slips sometimes. A mistake costs
  `skillDelta: −4` and `discretionDelta: −18` — the assistant misread the
  target, so the actor is worse off *and* sloppier about hiding it, which
  pushes the incident toward the public feed. This is "make AI-assisted
  mistakes" as math, not flavour;
- **success branch**, `skillDelta = round(clamp(reasoning,1,5)) − 2`,
  discretion untouched. Across the shipped catalog (minimum reasoning 3) the
  success branch never subtracts: the workhorse's r3 is a modest +1, the
  salvaged core's r4 a +2. A lift that is only ever a lift, mirroring the
  player's own assistant.

The same function reads from the **defender's seat**: the counterpart's
assistant raises its defence this tick when the read is good and lowers it
when the model misses the pattern — `docs/AI_SYSTEMS.md` names "miss a
pattern" as a failure mode, and symmetric math makes "automation to watch"
cost the watcher's model the same way it costs the actor's. One function,
both seats, no second rulebook.

## Marketplace provenance: the author routes the money

`ModelListing.author?: string` is catalog data only. `acquireModel`'s existing
debit line becomes `counterparty: item.author ?? MARKET_COUNTERPARTY`, which
keeps every current model a market house brand — `models.test.ts` pins
workhorse → `market` and re-ran untouched — while one new entry,
**Salvaged Reason Core** (`model-local-salvage`, 600 one-time, ×0.85,
reasoning 4 / context 2 / reliability 2, footprint 3/1, author `moebius`),
demonstrates the shape: buying it pays a named peer, who then appears in the
value graph as a `peer` node with a paid total, exactly the P5 tool-author
edge. No institution set changed; unknown counterparties already classified as
peers. The listing's properties make it the marketplace trade made real: the
cheap stronger planner (`+2` lift) that slips twice as often as the reliable
workhorse (4/12 vs 2/12) — the same reasoning-vs-reliability tension the
player's own model choice already teaches.

## The leak rule, applied to the ecosystem

`modelId` is hidden truth, so it never projects raw. The projection gains a
read-only `assistants` surface listing only `{ actorId, handle, modelLabel,
modelAuthor }` — *that* a peer runs an assistant and *which* model, which
every marketplace observer can already infer, never the lift it gives them:
no skill, defence, discretion, or activity number crosses the boundary (a
test JSON-scans the surface for those key names and pins the exact key set).
This is D028's principle at ecosystem scale: P2 leaked nothing because claims
described unearned structure; P4 leaks nothing because a peer's hidden power
is hidden ground truth.

## The seeded world as the exhibit

`createSliceWorldState` gives **lattice** the reliable workhorse (a modest
steady assist) and **halfmoon** the salvaged core (an unreliable stronger
planner). The lift bounds were chosen so the assist changes the world's
*texture*, never its power structure: nightshade (defence 88, no model) can
only be beaten by a roll of `skill + lift − 88 + noise > 0`, and even the best
possible assisted rolls fall short — lattice `62 + 1 + 20 = 83`, halfmoon
`45 + 2 + 20 = 67` — so no assisted peer can ever take the top box, assisted or
not, while the assist still re-shuffles the mid-table contests. The mistake
branch's `−18` discretion likewise never manufactures an impossible success:
it only makes the incidents that *do* happen likelier to surface in the public
feed. The only honest test edit the catalog growth forced anywhere in the
suite: the listings count, `toHaveLength(4)` → `toHaveLength(5)`.

## Surface

The Underground app gains a **PEER ASSISTANTS // ECOSYSTEM AI** section under
"HOW THEY SEE YOU" — each modelled peer with handle, model label, and `— by
<author>` when the model is authored — plus a note stating the two rules in
the player's terms (you see who runs what, never what it earns them; peers'
AI is fallible like yours, which is how their mistakes reach the public feed).
The Market AI MODELS panel gains one conditional line on authored listings:
`by <author> · paid to them directly`. CSS extends the existing shared
underground list block; no new panel language.

## Invariants (all pinned by `marketplace.test.ts`, 14 tests)

- identity: no model over 500 ticks is exactly `{0, 0}`; an unmodelled custom
  world twin runs byte-identical;
- fallibility bounds: a reliable model lifts and slips rarely (slips > 0,
  lifts > slips); the salvaged core slips strictly more than the workhorse
  and never lifts more than its band promises;
- ecosystem determinism survives the new input: the assisted slice world is
  twin-deterministic, split-invariant (14 × half-days ≡ one 7-day wait), and
  restore-equal mid-run;
- the assist is a live force, not decoration: a modelled actor's 30-day
  incident stream diverges from the identical bare crew's (aggregate, not a
  pinned script);
- provenance: every authored entry is a purchasable local (`source local`,
  `cost > 0`); buying the core debits 600 to `moebius` (credits 2000 → 1400,
  owned list exactly `[salvage]`); the author joins the value graph as a
  `peer` node paid 600 under the existing `model` cause kind; the core runs
  like any local, and cloud stays rent-only (`MODEL_NOT_LOCAL`);
- leak rule: the assistants surface has exactly four keys and its JSON
  contains none of the hidden-truth number names;
- persistence: `modelId` round-trips through the save schema; a legacy actor
  without the field loads unassisted, not broken; TinyBase mirrors author
  rows and assistant rows.

Gates: tsc clean, **476 tests / 49 files** (462 + 14, one honest count
update), lint only the pre-existing `postcss.config.mjs` warning, production
build succeeds.

## Out of scope (recorded, not silently dropped)

- selling *player-authored workflows* on the marketplace — P3's garage output
  is owned, not listed; peer-to-peer goods wait for Phase 8 content breadth;
- NPC cloud/rent economics — peers run owned locals in fiction; a peer
  subscription is texture, not a value flow (inter-NPC credits still wait on
  D024's multi-hop note);
- actors *acquiring* models dynamically through world events — `modelId` is
  seeded world truth for now; a peer adopting an assistant is an event-layer
  beat, likely with Phase 6's threat drama;
- "use automation to watch **the player**": the defender-side assist is
  NPC-vs-NPC. Player-facing automation (rival probes, investigations that
  *use AI against you*) is Phase 6 (#24) territory by the roadmap's own shape.
