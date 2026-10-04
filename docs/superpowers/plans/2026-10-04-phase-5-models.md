# Phase 5 P0 — AI Substrate and Model Catalog (The Assistant Slot)

Issue: #23
Builds on: the whole Phase 4 stack — P0 ledger/credits, P1 duration path,
P4 license billing and `combineFactors`, P5/P7 property economics
(`2026-10-04-phase-5-plan.md` carries the slice map and both #22 handoffs).

## Goal

Deliver the Phase 5 substrate: **models as a first-class asset class**. Where a
P4 license is a *program* you run and a P7 machine is a *box* you own, a model
is an *assistant* you run — a fictional AI that folds into the rig through the
existing `SoftwareEffect` language. This slice ships the choice, the
economics, and the speed lever only: the catalog, the two opposite cost
shapes, one command trio shared by Terminal and GUI, and the daily-billing
integration. Contention, analysis, and builds are the following slices.

The design reads models through the precedent Phase 4 already proved twice:
**cloud is rent** (the license semantics — a daily fee at crossed boundaries,
unpayable lapses it, no debt) and **local is property** (the tool/machine
semantics — a one-time debit, then it runs free forever). Running *no* model is
exact identity: the factor composes to exactly 1 and all 354 pre-Phase-5 tests
pass untouched, so models are a capability layer, never a gate.

## The model

New catalog `src/content/model-catalog.ts`:

- `ModelListing { id, label, source, dailyCost, cost, effect, properties }` —
  `source` is `"cloud" | "local"` and the two cost shapes are deliberately
  exclusive: cloud carries `dailyCost > 0, cost = 0`; local carries
  `cost > 0, dailyCost = 0`. Effects are all `modifier` (action-duration)
  today: `model-cloud-frontier` 120/day ×0.7, `model-cloud-compact` 40/day
  ×0.85, `model-local-workhorse` 900 one-time ×0.9, `model-local-tuned`
  1_600 one-time ×0.8.
- `ModelProperties { reasoning, context, reliability }` — fictional
  characteristics on a 1–5 band scale, **seeded but consumed by no one yet**,
  stated plainly rather than hidden: P2 (AI analysis) reads reliability/context
  and P3 (builds) reads reasoning before inventing any. Same practice as the
  unconsumed `vram`/`storage` axes P0 seeded for this phase's P1.
- `PROVIDER_COUNTERPARTY = "provider"` — the fifth institution role in the
  value graph (market/landlord/vendor/fence), the recurring party a cloud
  subscription pays.
- `modelEffectOf(modelId: string | null)` takes the plain id, never state, and
  unknown ids are inert — a stale save reference contributes no factor rather
  than breaking the fold.

New state (the only P0 state): `economy.ownedModels: string[]` and
`economy.activeModel: string | null` — a single assistant slot, exactly one
model runs at a time. Legacy saves default to `[]` / `null` (no models owned or
running, the untouched baseline).

Ledger gains one cause kind, `model`: a local acquisition debits `market`, a
cloud subscription debits `provider` at each billed boundary. The value graph
(P6) picks both up with zero changes — both counterparties are institution
roles.

## Commands and events

Three commands, shared verbatim by Terminal and GUI (P0 parity pattern):

- `acquireModel { modelId }` — `MODEL_NOT_FOUND` / `MODEL_NOT_LOCAL` (cloud
  models have no purchase step; renting is running) / `MODEL_ALREADY_OWNED` /
  `INSUFFICIENT_CREDITS` reject before anything moves; otherwise one
  `transferValue` debit (cause `model`, counterparty `market`) plus
  `ModelAcquired`. Buying **never starts the model** — owning and running are
  separate choices, so a purchase cannot silently swap a running subscription.
- `runModel { modelId }` — `MODEL_NOT_FOUND` / `LOCAL_MODEL_NOT_OWNED` /
  `MODEL_ALREADY_ACTIVE` otherwise. Starting, switching, and stopping all move
  zero credits (the license rule, unchanged): running *is* renting for cloud,
  running owned property is free, and switching implicitly stops whatever was
  running, so no boundary can ever double-bill. Emits `ModelChanged`
  (`active: true`, with `source` and `dailyCost` carried for the UI).
- `stopModel {}` — `NO_MODEL_ACTIVE` if the slot is empty; otherwise the slot
  clears and `ModelChanged` (`active: false, dailyCost: 0`) fires. No debt, no
  penalty — the lift simply ends. Ownership survives: a stopped local model can
  be re-run anytime; a stopped cloud model can be re-rented anytime.

Terminal exposes the compound verb `model` (following the `box`/`lease`
precedent): `model buy <model-id>`, `model run <model-id>`, and `model stop`
with **no argument** — the slot holds exactly one assistant, so naming which
one to stop would invent state the sim does not track. `model stop <id>`
therefore parses as invalid, and the verb stays distinct from `use`/`stop`
(licenses) and `buy` (hardware).

## Duration plumbing

Models are **not capability** — they are the *third* term in the existing
shortcut pipeline. `combinedActionDurationFactor` (tools.ts) now composes
`combineFactors([licenses…, tools…, model])` through the shared combinator,
floored once at 0.1, and feeds the same P1 `actionDuration` math, so the
one-minute floor keeps precedence over any model. `projectWorld` surfaces the
resulting factor per action; no consumer elsewhere changes.

## Upkeep integration

`advanceUpkeep` gains the model as its last obligation, after lease and
licenses at each crossed whole-world-day boundary:

- a running **cloud** model's `dailyCost` is debited to `provider` (cause
  `model`), deterministic and split-invariant like everything before it;
- unpayable ⇒ the model **lapses** — `activeModel = null`, a
  `ModelChanged (active: false)` fires, no charge, no debt, no penalty beyond
  losing the speed (the license semantics verbatim);
- a running **local** model bills nothing and is skipped, never charged zero;
- the model bills last, so an unpayable subscription cannot starve a payable
  license of its boundary (tested: 150 credits, 40 license + 120 model ⇒
  license paid, model lapsed, 110 left).

`recurringDailyCost` gains an optional `activeModelId` third argument folding
the cloud fee into the wallet's combined daily upkeep; every existing call site
is untouched by the default.

## Projection and UI

`project-world.ts` extends `EconomyProjection` with `actionDurationFactor`,
`activeModelId`, and `modelListings` (`VisibleModelListing`: id, label,
source, cost, dailyCost, factor, owned, running). Affordability stays a view
concern — the listing carries the raw prices and the UI derives BUY vs RUN.

TinyBase gains a `modelListings` table and a `rig` `assistant` row
(`modelId`, `factor`); the RIG SPEED footnote annotates the multiplier while
one runs.

The Market app gains an **AI MODELS // ASSISTANTS** section between MACHINES
and the value graph: each listing shows `analysis ×{factor} action minutes`
plus its economic shape — `{X cr / day while running}` for cloud, `{cost cr
one-time · runs free}` for local — with `owned` / `running` markers and one
button per row (running → STOP; owned or cloud → RUN; otherwise BUY, gated on
credits). The hint states the invariants: an assistant is not an autopilot,
cloud rents and lapses, local runs free once bought, switching is free, no
model is ever a gate.

Events are projected to SQLite run-event rows alongside the existing
`worldMinute` group (ModelAcquired / ModelChanged).

## Invariants (tested — `models.test.ts` 28 tests, `economy-commands.test.ts` +5, `world-projection.test.ts` / `world-state-schema.test.ts` extended)

- catalog shape: `model-` ids, modifier-only effects, the exclusive cloud/local
  cost shapes, factors inside (0.1, 1), integer 1–5 properties; unknown ids and
  the empty slot resolve to nothing;
- **empty slate is identity**: no model running ⇒ factor exactly 1;
- starting a cloud model moves no credits; the ×0.7 factor shortens survey
  12→9 and inspect 8→6 over the P1 hardware minutes, and axisless disengage
  never scales;
- switching is free and swaps in one step; stopping ends the speed with no
  debt; stopping nothing is `NO_MODEL_ACTIVE`;
- day-boundary billing: two boundaries ⇒ exactly two 120 debits to `provider`;
  an unpayable boundary lapses the model — no debit, credits untouched, factor
  back to 1; split waits bill the same boundaries in the same order
  (chunked-economy deep-equals whole-day economy);
- local models: one-time 900 `market` debit with cause `model`, never
  auto-runs, then three days of running bill nothing; running unowned local is
  `LOCAL_MODEL_NOT_OWNED`; buying cloud is `MODEL_NOT_LOCAL`; double-buying is
  `MODEL_ALREADY_OWNED`;
- composition: license ×0.85 × model ×0.7 = 0.595 under one floor (survey
  12→8); the wallet folds lease+license+model into 60+40+120 = 220/day;
- persistence: `model` ledger cause and both fields round-trip, legacy
  economies load as none-owned/none-running, and a save→load preserves an
  acquire/run/switch/stop history byte-for-byte;
- projection: listings default to none-running with factor 1; owned/running
  markers track the slot; the provider joins the value graph as an
  `institution` paid 120 with cause kinds `["model"]`;
- runtime: the `rig` assistant row and `modelListings` cells sync through
  TinyBase, and switching to an owned local drops the wallet daily cost to 0;
- Terminal/GUI parity: `model buy/run/stop` parse to the same typed commands
  the GUI helpers emit, the verb stays distinct from `use`/`stop`, and
  malformed forms (`model`, `model buy`, two ids, `model stop now`,
  `model rent …`) are rejected.

## Out of scope (later slices)

- **compute contention** — vram/storage still have no consumers; the footprint
  a local model imposes is P1's job (the #22 *constraints* handoff), not this
  slice's;
- **AI analysis** — P2 turns `properties` into fallible, evidence-shaped
  conclusions; today they are seeded catalog data with a stated non-consumer;
- **specs and builds** — P3 registers player-authored workflows through the
  same `SoftwareEffect` runtime (the #22 *author* handoff);
- cloud privacy/rate-limit/refusal *risks* from `docs/AI_SYSTEMS.md` (provider
  logs, access interruption) are fiction-level drama for later slices; P0 ships
  only their economic half (the subscription);
- NPC model use (P4) — providers are still an abstract institution, not actors.
