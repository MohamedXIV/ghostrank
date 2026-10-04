# Design and Architecture Decisions

This file records decisions that should not be repeatedly reopened without new evidence.

## D001 — Working title

**Decision:** Ghostrank.

Status: working title, not guaranteed commercial name.

## D002 — Rank is not power

Rank measures reputation/visibility/history. It never creates a level gate.

Accepted.

## D003 — Starting sides

Use White and Black starting ecosystems/packages.

Do not ship Grey as a required third starting alignment.

Actions after the start remain unrestricted and determine reputation.

Accepted.

## D004 — Player mastery first

Character proficiency changes efficiency and quality, not fundamental permission to attempt targets.

Accepted.

## D005 — Hacking interaction

No universal Hack button and no one-roll success mechanic.

Operations are composed from capabilities and interpreted results.

Accepted.

## D006 — Interface parity

Terminal, GUI, purchased tools, and generated tools use the same simulation command/capability layer.

Accepted.

## D007 — Physical presentation

Include a small top-down/isometric physical space with a minimal avatar and limited movement.

Do not build an open-world walking layer.

Accepted.

## D008 — Main UI stack

Next.js + TypeScript.

Tailwind + shadcn/ui for UI foundation.

The original host assumption was a static export inside Tauri 2. The UI-stack decision remains accepted; host timing is superseded by D016.

## D009 — Physical renderer

Phaser 4 owns the room/world presentation only.

Accepted.

## D010 — State responsibilities

- Pure TypeScript simulation core: active authoritative gameplay state/rules.
- Zustand: ephemeral shared UI state.
- TinyBase: reactive/query read projection.
- Persistence adapter: durable saves/history/migrations.

The original implementation used SQLite through Tauri. Backend timing is superseded by D016; the separation of responsibilities remains accepted.

## D011 — AI-generated software

Represent player/AI-authored software as safe virtual workflow/IR.

Do not execute arbitrary generated host code.

Accepted.

## D012 — Run difficulty

Early runs are expected to be short and dangerous. Several in-game days can be a successful learning run.

Accepted.

## D013 — Retirement

Voluntary retirement/exit is a real operation and possible final objective.

A rare peaceful White VANISHED ending exists.

Accepted.

## D014 — Multiplayer

The social underground is simulated by NPCs. Multiplayer is deferred.

Accepted for initial/full single-player scope.

## D015 — Real-world operational fidelity

Use believable concepts but fictionalize commands, vulnerabilities, protocols, currencies, and harmful operational detail.

Accepted.

## D016 — Web-first completion; Tauri deferred

Complete Ghostrank as a web game before returning to desktop-host work.

For Phases 3–9:
- browser execution is the primary runtime,
- normal gameplay must not depend on Tauri/Rust/native APIs,
- durable browser persistence is implemented behind the existing persistence boundary (#18),
- web tests/typecheck/lint/build become the authoritative normal gameplay gates.

Retain the existing Tauri 2 and SQLite work, but defer further hardening, native persistence reconciliation, installer/packaging, and desktop distribution until the web game is feature-complete (#19 / Phase 10).

The future desktop build must host the same game and consume the same validated logical save contract rather than fork gameplay architecture.

Accepted 2026-10-03.

## D017 — Ecosystem simulation model

NPC ecosystem activity advances on fixed 360-minute world-time boundaries inside every world-time advance. Randomness is a stateless hash of the world seed, tick, actor and purpose, so there is no RNG state to persist and splitting a wait never changes outcomes.

Rank is an output of ecosystem events and never an input to any decision. A very long wait simulates only its most recent 28 ticks.

Accepted 2026-10-03 as the Phase 3 substrate. Numeric rank/relationship deltas are provisional tuning; the ranking formula remains open.

## D018 — Economy substrate model

The player holds one `credits` balance plus an append-only value ledger. Every movement records direction, amount, resulting balance, cause and counterparty. Credits are non-negative by construction: a transfer that would take the balance below zero is rejected and mutates nothing, so there is no debt.

Income begins with contract delivery, paying a deterministic amount — `80 + 40 × requiredServices` for a recon report, `260` for an intrusion. Hardware is a data-driven catalog across five capability axes (compute, memory, vram, storage, network); every run starts with a free secondhand workstation. Rig capability is derived as the sum of owned hardware, never stored, and never gates a target or a purchase.

Accepted 2026-10-04 as the Phase 4 substrate. All payout figures and catalog costs are provisional tuning pending playtest.

## D019 — Compute budgeting model (Phase 4 P1)

Derived rig capability is consumed as operation speed, never as an availability gate. Action durations follow a fixed base table (`survey 12m, inspect 8m, escalate 5m, disengage 3m`); above baseline an action costs `max(1, ceil(base / capability))` world minutes, with `survey` on network and `inspect`/`escalate` on compute. Baseline capability is the starter rig's value of 1, so an unupgraded world produces exactly the Phase 2 timings. Disengagement is a deliberate manual exit and never scales with hardware.

Duration is derived at action time from owned hardware, so it adds no state, no events and no save-schema surface.

Accepted 2026-10-04. The base table, axis mapping and the division curve are provisional tuning; the vram/storage axes remain unconsumed (memory was consumed by D020) and contention remains open.

## D020 — Workload scale model (Phase 4 P2)

The memory axis is consumed as workload breadth: one scoped pass (survey over a target's machines, inspect over a machine's services) processes `max(1, floor(memory))` previously-undiscovered items, charges its action duration once, and emits one observation event per item. Baseline scope 1 is the starter rig, so Phase 2's one-item-per-pass behaviour is the untouched default. Scale is breadth, never a gate: every item is discoverable on any rig; modest hardware costs more passes and therefore more world time. Escalation and disengagement stay single-step moments.

Scope derives at action time from owned hardware; no state, events or save-schema surface is added.

Accepted 2026-10-04. The memory catalog values are provisional tuning; vram and storage remain unconsumed pending contention/background-workload and archive decisions.

## D021 — Housing and recurring-cost model (Phase 4 P3)

Credits gain a recurring sink. A housing lease contributes capability to the rig while held, and capability remains the *sum* — `effectiveCapability = owned hardware + lease` — so P1 speed and P2 breadth consume it with no new mechanics. Housing is a lift, never a gate or a punishment: holding no lease is the free baseline, and an unpayable day boundary moves the player out (back to baseline) rather than charging, indebting, or penalising them.

Upkeep is levied only at crossed whole-world-day boundaries (`advanceUpkeep(world, from, to)` charges each boundary minute once). Signing, switching, or breaking a lease costs nothing, so the choice is reversible and never double-billed; the ledger records these charges with cause kind `upkeep` and counterparty `landlord`. The only new save surface is one nullable `housing` id on the economy; legacy saves load `housing: null` — the baseline behaviour by construction, which is why every pre-P3 test passes untouched.

Accepted 2026-10-04 as the P3 slice. Listing daily costs and capability lifts are provisional tuning; per-day billing at a lease's first partial day, rival landlords, and lease loss as a scripted threat remain open for later phases.

## D022 — Software marketplace model (Phase 4 P4)

Premium software is a stackable, *recurring* capability layer — licenses that make the same rig more productive. Licenses come in two shapes: capability licenses fold raw axes into `effectiveCapability` (hardware + lease + software), and modifier licenses multiply derived hardware minutes by a discount factor after the P1 acceleration curve, respecting its one-minute floor. Baseline with no licenses is identity (zero lift, factor 1), so all pre-P4 behaviour is the untouched default and software is never a gate.

Enabling and stopping a license move no credits; the daily fee is levied only at crossed whole-world-day boundaries by a single `advanceUpkeep` that now bills the lease first (cause `upkeep`, counterparty `landlord`) and then every active license in activation order (cause `license`, counterparty `vendor`). Each obligation is all-or-nothing per boundary: an unpayable license lapses just that one license — no charge, no debt, no penalty beyond losing its lift, and it can be re-run later.

The only new state is `economy.software: string[]` (active ids); legacy saves default to the empty list.

Accepted 2026-10-04 as the P4 slice. License costs, capability contributions, and discount factors are provisional tuning; tool authorship/provenance, player-tool trading, and vram-consuming local-model tools remain open for later slices.

## D023 — Tool authorship and provenance model (Phase 4 P5)

Player tools are authored artifacts, deliberately the *opposite economic shape* from P4 licenses: **property, not rent**. A one-time purchase debits the wallet to the tool's named author (ledger cause `tool`, counterparty = the author handle — the value ledger's first person-to-person artifact edges), there is no daily fee, and a held tool can never lapse. Selling a copy credits `floor(paid × 0.5)` through an offline `fence`; resale values the stored `paidCost`, not the current catalog price, so retuning never re-values inventory. Owned tools reuse the exact `SoftwareEffect` shape and combinators as licenses: capability folds into `effectiveCapability` (hardware + lease + licenses + tools) and modifier factors compose with license factors through `combineFactors`, floored once at 0.1 — so P1 speed and P2 breadth consume the layer with no new mechanics, and an empty inventory is the untouched pre-P5 baseline.

Each copy stores its catalog id, author, paid cost, and acquisition minute; the author is captured at purchase so provenance survives later catalog retuning. Instance ids are collision-safe across resale history (max-suffix, not list length). The only new state is `economy.playerTools: OwnedPlayerTool[]`; legacy saves default to `[]`, and `advanceUpkeep` never sees tools by construction.

Accepted 2026-10-04 as the P5 slice. Catalog authors, prices, resale rate, and effects are provisional tuning; author→buyer chains across simulated peers, multi-hop digital-value graphs, tools as contract rewards or stolen goods, and player-driven marketplaces remain open for later slices.

## D024 — Digital-value graph is a derived player-centred projection (Phase 4 P6)

The Phase 4 deliverable *digital-value graph* realises the design's "transaction graphs, not anonymous money bars" as a **pure derived read over the existing append-only ledger**: `deriveValueGraph` aggregates every movement by counterparty into nodes carrying received / paid / net, interaction counts, first/last world minutes and the distinct cause kinds involved, with whole-network totals. No new state, events, commands, or save-schema surface is introduced — the ledger P0 seeded and P5 gave named counterparties already contains the graph, so there is nothing to migrate and nothing that can desync from the wallet.

Scope is deliberately honest: the simulation tracks the *player's* money, so this is the player's value network — contract issuers and tool authors appear as `peer` nodes keyed by their public handles, while `market`, `landlord`, `vendor`, and `fence` are classified `institution` roles, not people in the scene. True multi-hop NPC↔NPC chains (author→buyer→buyer) require simulated inter-actor credit flows the world does not yet produce; fabricating those edges would invent history the ledger never recorded, so multi-hop is explicitly deferred to a slice that adds peer-to-peer payments. Determinism follows from construction: a read-time fold, ordered by total volume descending then id ascending, independent of ledger insertion order, and summarised over the full lifetime ledger even though the ledger table view stays capped at the most recent entries.

Accepted 2026-10-04 as the P6 slice. The ranked-list layout is provisional — a drawn graph layout belongs to polish — and the graph currently spans one currency; the crypto-like asset classes (liquidity, volatility, exchange friction, tracing difficulty) remain design targets for later phases.

## D025 — Named machines are a property layer, not a new mechanic (Phase 4 P7)

The last core Phase 4 deliverable, *multiple machines*, lands as a fifth asset class following the precedent P5 already proved: machines are **property, not rent**. A `buyMachine` is a one-time debit to the `market` institution (new ledger cause `machine`), there is no recurring fee — `advanceUpkeep` never sees the rack by construction — and `sellMachine` credits `floor(paid × 0.5)` through the same offline `fence`, valuing the *stored paid price* so catalog retuning never re-values an owned box. Owned boxes carry max-suffix instance ids (`machine:N`), collision-safe across buy/sell/rebuy cycles exactly like P5's `tool:N`.

A machine is a *complete box*, distinct from a P0 component: components upgrade one axis inside the rig you already have, boxes add whole systems to the rack. Each stores `{ id, catalogId, label, paidCost, acquiredWorldMinute }` — the label is **identity, not power**: capability derives solely from the catalog id through `deriveMachineCapability`, and a rename mutates only the label (ownership is validated before label shape; labels are trimmed, non-empty, and capped at 24 chars at the command boundary, with the Zod schema staying structural). The lift folds into the single existing source — `effectiveCapability` = components + machines + lease + licenses + tools — so P1 speed and P2 breadth consume the rack with zero new mechanics, and an empty rack is exact identity (the 322 pre-P7 tests pass untouched). Terminal and GUI share the commands through the compound `box buy|sell|name` verb, with multi-word labels rejoined by the parser and validated by the simulation.

Accepted 2026-10-04 as the P7 slice, completing the core Phase 4 deliverables except vram/storage consumers, which wait for Phase 5's local-model capacity. Catalog prices and capability profiles are provisional tuning; seller-side NPC marketplaces (actors selling boxes, haggling, stolen-goods provenance), rack physical footprint (space/power/heat), and true multi-hop value chains remain open for later slices.

## D026 — Models are assistants on the duration factor, with rent-vs-property economics (Phase 5 P0)

Phase 5's substrate lands models as the rig's *assistant slot*, deliberately **not** a capability layer: exactly one `economy.activeModel` contributes an action-duration factor through the existing `combinedActionDurationFactor` → `combineFactors` path (licenses × tools × model, floored once at 0.1, the P1 one-minute floor still leading). Capability, targets, and requirements are untouched — no model running is exact identity, so the 354 pre-Phase-5 tests pass untouched and models are a shortcut, never a gate.

The two sources are opposite economic shapes, each reusing an established template rather than inventing mechanics. **Cloud models are rent**: running one *is* renting — no acquisition, no credits to start, switch, or stop (the single slot makes double-billing impossible by construction) — and `advanceUpkeep` bills the `provider` (new ledger cause `model`, fifth institution role) at each crossed world-day boundary; an unpayable boundary lapses the model, the license semantics verbatim. **Local models are property**: a one-time `market` debit following the P5/P7 template, then running costs nothing forever; buying never auto-runs, because owning and using are separate choices. Model properties (reasoning/context/reliability on 1–5 bands) ship as seeded catalog data that nothing consumes yet — stated rather than hidden — reserved for P2 analysis and P3 builds; the hardware footprint waits for P1 contention, keeping both #22 handoffs on-map.

Accepted 2026-10-04 as the P0 slice. Catalog names, prices, factors, and property bands are provisional tuning; compute contention (vram/storage consumers), fallible AI analysis, provider privacy/refusal/rate-limit drama, and NPC model use remain open for later slices.

## D027 — Compute contention taxes a local model's shortcut, never the player (Phase 5 P1)

The two capability axes Phase 4 P0 seeded and never consumed — `vram` and `storage` — finally get their reader, discharging the #22 *constraints* handoff: a running **local** model occupies a catalog footprint (`ModelListing.footprint`) on the player's own rig, and how well the derived pool (`effectiveCapability`) covers it decides how much of the model's advertised shortcut arrives (`min` of per-axis `have/need`, capped at 1; the scarcer axis bottlenecks). **Cloud models carry a zero footprint**: the provider hosts them, so renting never contends — the deliberate counterweight to their daily fee, completing the P0 rent-vs-property symmetry (rent costs credits and is rig-free; property is free to run and rig-hungry).

The direction of the squeeze is the load-bearing decision. Contention scales only *the model's own factor*, sliding it from its catalog promise toward ×1 — the exact speed of running no model — so it is mathematically incapable of slowing any action below the no-model baseline, preserving the Phase 4 rule that hardware is a lift and never a punishment; a starved local model still runs, still helps less, never blocks, never bills. And it stays **pure derived physics**: no reservation state, no new commands (the `docs/AI_SYSTEMS.md` remedies — pause, drop quality, rent compute — map onto the already-shipped stop/switch/run and the existing GPU/storage purchases), one optional `pool` parameter on `combinedActionDurationFactor` whose absence reproduces P0 exactly, so every existing caller and the 28 P0 model tests stay untouched. The projection surfaces the choice before it costs anything: each listing shows its footprint and the factor *this rig* would deliver.

Accepted 2026-10-04 as the P1 slice. Footprints and coverage math are provisional tuning; multi-tenant pressure on the pool arrives with P3's build queue (the designed next holder), and housing currently contributes storage but no content carries vram in a lease — a lab-with-accelerators beat, not a mechanic.

## D028 — Analysis predicts unseen structure, and its truth never reaches the projection (Phase 5 P2)

The assistant finally has a job, and the shape of that job was the whole design question. Survey and inspect already reveal a machine's *true* role and a service's *true* kind once observed, so a model that restated earned facts would be a redundant second source — no help, and worse when it disagreed. The genuinely hidden ground truth is **not-yet-recon'd structure**, so `analyze <target-id>` proposes machine roles the player has not surveyed and service kinds only on hosts already surveyed: reasoning from the visible topology outward, never naming a box the recon has not revealed. A fully recon'd target yields no claims, which keeps the value honest (ahead of your evidence, never a rehash) and leaves nothing to leak. It is an **instant command** on the contract-verb precedent — no world time, no trace — because the design calls verifying AI conclusions *expert play*, and a timed, trace-adding pass would tax exactly the behavior the docs ask for; the cost signal is the model's rent or footprint, already paid at P0/P1.

Fallibility is encoded rather than tuned. Per-claim accuracy rolls `hashUnit(seed, minute, modelId, kind, index) < 0.8 × reliability/5` — capped below certainty by construction, so even the best model in the game is wrong some of the time — and a miss is either a **misclassification** (a vocabulary value guaranteed ≠ the truth) or, at the rarer 0.34 branch, a **hallucination** (`subjectId: null`, an invented host). `confidence` derives from reasoning + context and is computed **without looking at `accurate`**, making the docs' "overstate confidence" failure structural: an unreliable but eloquent model states nonsense with the same polish as insight. `context` budgets how much topology one pass reads, capped by what is actually unseen.

The load-bearing rule is the **leak boundary**. `subjectId` points at unearned structure and `accurate` grades the assistant, so neither may be projected: the visible claim is `{ kind, assertion, subject, confidence }` with `subject` an anonymous per-kind counter (`unmapped host 1`), and uniform handles deliberately keep a fabrication indistinguishable from a real-but-unmapped subject — how a hallucination *should* feel: you find out by looking. Full truth still persists (a restored world must remember what it said), it just never surfaces. Retro-editing records when recon later agrees, or a per-claim `verified` marker, were both rejected: the first rewrites a snapshot history (a save/restore hazard) and the second joins evidence to claims forever after while grading the assistant for free. Verification is play, and the Recon panel's caveat says so in the player's terms. `analyzeTarget` requires the assistant (`NO_ACTIVE_MODEL`) and nothing else new — survey/inspect stay model-free forever — so the never-a-gate rule survives even as the model's own function becomes a prerequisite.

Accepted 2026-10-04 as the P2 slice. Accuracy cap, confidence thresholds, hallucination branch share, claim budgets, and vocabularies are provisional tuning; refusal/rate-limit/behavior-modification drama from `docs/AI_SYSTEMS.md` waits for provider-behavior content work, and an explicit claim-vs-evidence diff is a playtest question, not this slice. P3 (spec → workflow/IR builds, the remaining #22 *author* handoff) inherits the properties' semantics for build quality and P1's pool as the queue's shared resource.

## D029 — The forge builds safe workflow/IR specs, pays in time and pool, and reveals its roll only at completion (Phase 5 P3)

Self-authoring was the last #22 handoff, and the shape it had to take was constrained from three sides at once: `docs/HACKING_AND_TOOLS.md` says a program "is stored as a safe workflow/IR", #23 requires that generated software "reuse the same capability system as purchased tools" and be "safe virtual data, not executable host code", and the exit criterion demands the player *replace at least one premium workflow*. The resolution is a spec catalog (`src/content/workflow-spec-catalog.ts`) whose entries are pure data — an ordered list of fictional pipeline steps plus a `SoftwareEffect` — and three specs that mirror the three premium licenses one-for-one, so the exit criterion is not a vibe but a checked fact: the Homegrown Monitoring Loop delivers the exact network +2 the Commercial Monitoring Suite rents at 40/day. Reuse is enforced by construction rather than discipline: a finished workflow folds through `combineCapabilities`/`combineFactors` like any license or tool, so there is no second capability system to drift from the first. "Not executable" is equally structural — the IR is display-and-gate data, matched by tests to a notation grammar no shell or script could hide in.

Builds are bought with the triangle, not credits. Commissioning moves **zero credits**: the price is world minutes (`complexityMinutes` over the compute axis, scaled by the running model's *delivered* shortcut) and rig occupancy. Both clock and quality are **frozen at start** — the duration against the pool left after builds already queued (and the job's own footprint), the outcome on one seeded roll — so a job's deadline cannot be re-timed by splitting a wait, stopping the model, or restoring a save; the docs' "interruptions" land not as a new mechanic but as the designed consequence that mid-build changes reach *future* builds and the shared pool, never the frozen current one. This makes the forge P1's promised second tenant: `availablePool` subtracts the whole queue before a local model measures its shortcut, so the AI_SYSTEMS example ("model occupies GPU while building — pause / quality / rent / slower") becomes a real four-way decision, while an empty queue subtracts 0/0 and every pre-P3 number is bit-identical.

Quality inherits P2's doctrine with the caps moved to match the stakes: `reasoning` sets clean-build odds capped at 0.7 (lower than analysis's 0.8 — writing whole programs is harder than labelling a host), and a non-clean roll lets `reliability` split warnings (cosmetic, delivered in full) from defects (a halved effect — floor 1 on any nonzero axis, a shortcut pulled halfway back to ×1, never past it, never zero). Defects are disappointing, never traps: the lift-never-punishment rule holds even for the player's own broken software.

The disclosure rule **inverts P2 where the reason for the leak is absent**. An in-flight build's frozen outcome stays hidden until completion — a report card readable halfway grades the roll for free and melts the build-time tension — but an *owned* workflow projects in full (outcome, tests, which assistant wrote it): analysis predicted someone else's hidden topology, whereas a forge build is the player's own ground truth, witnessed from commissioning, and hiding its result would protect nothing. Completion rides the same clock tick as upkeep (`advanceBuilds` fires on the due minute, due jobs landing in due order), so the queue is split-invariant and save-safe by the same proof as the daily bills.

Accepted 2026-10-04 as the P3 slice, discharging the #22 *author* handoff. Estimates, footprints, odds caps, and defect halving are provisional tuning; spec variety, NPC-authored specs, and selling self-built workflows wait for P4's marketplace; a player-editable IR (modifying a spec before building) is a design beat, not a mechanic yet.

## D030 — Peers run the same fallible assistants, and an authored model pays its author (Phase 5 P4)

P4 closed the phase with its last deliverable — *model/tool marketplace content* — and the promise `docs/AI_SYSTEMS.md` makes under "NPC use": "AI is part of the ecosystem, not a player-exclusive superpower." The design question was how to make peers use AI without buying a second rulebook or a new command surface. The answer is that the ecosystem already rolls one deterministic tick per actor per period; an assistant belongs *inside* that roll, not beside it. `UndergroundActor.modelId?: string` is a hidden-truth input to `npcAssistDeltas`, a pure function of seed, tick, actor, and catalog entry — the same primitive every other ecosystem roll already uses, so determinism, split-invariance, and save-replay ride for free, and no command, event, cause kind, or parser changes. Because no model is exactly `{ skillDelta: 0, discretionDelta: 0 }`, every world without assisted peers re-runs byte-identical, and the slice's single honest test edit anywhere in the suite was the listings count (4 → 5) that the new catalog entry forces.

The assist's two branches encode the phase's own doctrines rather than inventing ecosystem physics. The success branch is a **lift that is only ever a lift** — reasoning band − 2 (the workhorse's r3 gives +1, the salvaged core's r4 a +2), never a subtraction on a good read, mirroring how an assistant helps the player. The mistake branch is *the point*: odds `(6 − reliability)/12`, deliberately nonzero even at band 5, because "fallible, never deterministic" binds the peers too — and a mistake costs skill **and** 18 discretion, which is the mechanism by which an AI-assisted mistake reaches the public feed: the actor hid badly, not just fought badly. The same function is read a second time from the defender's seat (`counterpart.defense + assist.skillDelta`), making "automation to watch" literal — a watching assistant raises a box's defence on a good read and lowers it on a missed pattern, the failure mode AI_SYSTEMS names — with one function serving both seats instead of a parallel watcher mechanic.

Marketplace provenance lands the same reuse discipline. `ModelListing.author?: string` is catalog data only; `acquireModel`'s existing debit line became `counterparty: item.author ?? MARKET_COUNTERPARTY`, so house-brand models keep the anonymous market edge (the pinned `workhorse → market` assertion re-ran untouched) while the one authored entry — Salvaged Reason Core, 600 one-time, ×0.85, r4/c2/rel2, footprint 3/1, author `moebius` — debits a named peer, who then surfaces in the value graph as a `peer` node under the existing `model` cause kind: the D023 tool-author template, reused verbatim, no institution set changed. Its properties make the marketplace trade the player already learns with their own choice *legible in the fiction*: the cheap strong planner slips twice as often as the reliable workhorse (4/12 vs 2/12), and the slice world's two assisted peers are exactly those two archetypes — chosen inside bounds that keep the phase's own rule intact, since even a maximal assisted roll cannot beat nightshade's defence of 88 (lattice 62 + 1 + 20, halfmoon 45 + 2 + 20): the assist re-shuffles the mid-table, it never crowns a peer.

The **leak rule crosses to the ecosystem side** with the same boundary D028 drew for claims: `modelId` never projects raw. The read-only `assistants` surface carries `{ actorId, handle, modelLabel, modelAuthor }` — *that* a peer runs an assistant is public inference (the marketplace lists the very model), while the lift it gives them stays hidden ground truth: a test pins the exact four-key set and JSON-scans the surface for `skill`, `defense`, `discretion`, `activity`. Names, never numbers.

Accepted 2026-10-04 as the P4 slice, completing Phase 5 (#23): all eight deliverables shipped and all three exit criteria held as checked facts — the self-built replacement by P3, fallibility by P2 and here, safe virtual data by P3's spec shape. Honest scope note: what P4's marketplace ships is an authored *model*; player-authored *workflow* sales and NPC-authored *specs* (D029's deferrals) are recorded as still-open, waiting for content breadth rather than retro-claimed. Peers are seeded with assistants rather than acquiring them through world events, and player-facing AI automation (watching *you*) is deliberately Phase 6 (#24) threat drama; catalog prices, lift/penalty constants, and mistake odds are provisional tuning.

## D031 — Presence is derived from the lease, and relocation is paid in world time (Phase 6 P0)

Phase 6 needs a physical subject to threaten, and the design's "small physical space that can change during a run" already had one owner: `economy.housing`, the nullable lease id D021 introduced and `advanceUpkeep` already moves a player out of when a boundary cannot be paid. A parallel `locationId` (or `safehouseId`) state field was the obvious modelling move and is **rejected**: it is a second source of truth for one fact, and it desyncs the first time eviction updates one and not the other — plus a migration, an event type, and a class of bug where the room says one thing while the wallet says another. So presence is a **pure derivation** (`systems/location.ts`: `derivePresence`, `relocationMinutes`) over the lease id alone, exactly the D018/D024 derive-don't-store doctrine: zero new state, zero new events, zero save-schema surface, and eviction, lapse, and relocation can never disagree about where the player is. A stale id resolves to the baseline dwelling rather than fabricating a place — the same fail-toward-baseline rule an unpayable boundary already follows.

Distance enters the game as **world minutes, not credits**. `travelMinutes?` is optional catalog data (absent ⇒ 0, which is why both Phase 4 listings and the baseline stay in one district and every pre-Phase-6 lease test re-runs byte-identical), and a move costs `|distance(from) − distance(to)|` — a difference, so it is symmetric and additive along a route (60 + 120 = 180) without any state holding "where the trip started". The bus pays it by calling `advanceWorldTime(travel)` *before* the lease changes, so the journey happens under the dwelling you actually slept in, a day boundary crossed mid-move bills the origin, and `HousingChanged` carries the arrival minute. Pricing relocation in money was explicitly rejected: D021's rule that signing, switching, and breaking a lease move no credits would have become a purchase of safety — a credit fee means a rich player flees and a poor one cannot, while time is the resource every threat system already consumes. Symmetry is load-bearing too: `breakLease` pays the trip back, because if leaving were free, relocation would be a one-way button rather than a decision about exposure. **Involuntary eviction stays instant**, deliberately: the world acting on the player is not the player choosing to travel, and a forced move should not gift the player a discounted journey.

A **safehouse buys distance and no capability at all** — the zero-on-all-five-axes property is the tested invariant, not a coincidence of the current entries. That keeps this slice inside two standing rules at once: hardware is a lift that never gates (a safehouse cannot be a power purchase, and `kind: "safehouse"` is what a test defends), and fleeing has a real cost (a player who hides in the outskirts gives up rig lift *and* pays 180 minutes of exposure each way). `anonymity: "public"|"quiet"|"hidden"` ships as a **band, never a number**, following the `FootprintLevel`/`relationshipStance` discipline; nothing consumes it in P0, and that is stated rather than hidden (the Phase 5 P0 pattern) — P3's physical retaliation reads it as a targeting input.

Parity and the thin-renderer rule shaped the interface decision: the kickoff plan sketched new `move`/`safehouse` verbs, and implementing against the actual code rejected that. `PhysicalIntent`'s `moveTo`/`leave` map onto the *existing* `rentHousing`/`breakLease` commands through the pure, bus-less bridge, so Terminal, Market GUI, and Phaser share one implementation of "moving house" and the record here supersedes the plan's sketch. `presentRoom` finally has a producer, and its output is deliberately narrow — names, one band, one boolean, one minute, one cosmetic `distant` flag — so the room can render where it is and cannot learn a hidden fact or optimise a stat; `avatarPosition` stays presentation-only (D007: no open-world walking layer).

Accepted 2026-10-04 as the Phase 6 P0 slice, delivering the #24 deliverables *relocation* and *safehouses*. Distance scale, daily costs, and the three anonymity bands are provisional tuning; a third district or a move-between-cities arc waits for content breadth; the `housing` ledger cause kind D021 reserved for a one-time move fee stays unused and still reserved.

## D032 — Case files are derived from trace history; only surfaced evidence is stored (Phase 6 P1)

`docs/GAME_DESIGN.md` puts *authorities* at the head of its threat sources and then dictates how any danger may be read: "Threat should rarely be summarized by one visible Heat percentage. The player instead receives evidence: strange probes, missing contacts, unusual logins, changed marketplace behavior, news, vehicles, calls, door-camera activity, outages, rumors, or suspicious messages", and `docs/WORLD_RUNS_AND_ENDINGS.md` forbids "explicit countdown warnings when ambiguity is more effective". Phase 2 already made the player's footprint causal and citable (`OperationTrace.weight`, `OpponentReaction.footprintScore`) but left it going nowhere visible: a defensive watch raised, rolls changed, and the player was told nothing. P1's job is to spend that existing substrate, and the whole design question is what a case file *is* — a thing that accrues, or a thing that is read.

**No roll, at all.** Every prior ecosystem quantity is `hashUnit(seed, purpose, tickIndex, ...)`. An investigation takes none of the seed: its material is arithmetic over traces the player already emitted, plus one unit of follow-up per review boundary that found *new* footprint to look at. Rolling against a hidden difficulty score was the obvious modelling move — the upkeep and ecosystem ticks already do exactly that — and is rejected because it launders the phase's premise into luck: P5's postmortem must show what the player did, and a seeded file cannot be cited, only explained. The absence of a roll is what makes the slice's invariants testable as equalities rather than distributions: two worlds at rank 1 and rank 999_999 with identical traces produce identical files (rank raises who talks about you — P2's grudge ladder — never what paperwork contains), and a seed 20261003 world equals a seed 7 world.

**Derive the file, store only the evidence.** This is the correction the slice's own verification forced. The first implementation looped review boundaries and incremented `progress` as it went — the same shape `advanceUpkeep` and `advanceUnderground` use — and it is *wrong here for a reason those systems don't share*: `advanceWorldTime` is capped at `MAX_CATCHUP_TICKS = 28`, so one 60-day command runs fewer boundaries than sixty one-day commands. For a roll that is legitimate (a tick that never ran never happened, and D017 states split-invariance over ticks actually taken), but a case file is not a series of rolls — the footprint a player emitted in minute 40 is not erased by an idle calendar, and a design where `wait` phrasing changes how much trouble you are in is a bug the player can feel. So `progress` and `sourceIds` are recomputed from the trace history as-of `toMinute`, monotone and window-free, and the fold takes no `fromMinute` at all: a window argument would be a second, drift-prone way of saying the same thing. What stays stored is `signals` — the one fact a pure read cannot recover is which evidence the world has already *told* the player about, and `derived.surfaced.slice(signals.length)` is exactly "what is new since the last telling". Derive-don't-store (D018/D024/D031) applied with the honest exception named.

**Bands over meters, and one boundary per telling.** `deriveInvestigationStage` counts *surfaced signals*, not material, so the visible band describes what the player has been shown rather than being a heat bar with three tick marks, and thresholds `[5, 10, 16]` deliberately stop at `converging`: past the last band the pressure keeps accruing where the player cannot read it, for P3's targeting and P4's compromise to consume, and a player who outlives a file gets silence instead of a warning that stops. Five equals `DEFENSIVE_WATCH_THRESHOLD` on purpose — the authority and the target's own defenders read one footprint, not two parallel scores. A heavy burst therefore arrives as a drip over following boundaries, never one panic message per click, and a review that finds nothing new adds nothing, which is what makes laying low a real response (cooling, never resetting — nothing noticed is ever un-noticed). The three kinds are the docs' own words, chosen so P2 keeps "strange probes" (a peer's curiosity is not an authority's paperwork, and the two must not share an event type) and P3 keeps the physical ones, where something can actually arrive at a place.

**Evidence, not a new panel with a bar — and not a rumor.** The kickoff plan sketched routing signals through `rumors`/`inbox`; contact with the shapes killed it: `UndergroundRumor` is a third-party claim with `actorId`/`counterpartId`/`relayId` and an `accurate` flag about someone else's business, and `UndergroundMessage` needs a `fromId` and a `rumorId`. Authority evidence is first-person observation of your own logs, so filing it there would fabricate a messenger. It rides the projection instead as `{ id, targetId, stage, signals: { id, kind, targetHandle, worldMinute } }`, withholding `progress`/`sourceIds`/`openedWorldMinute` behind D028's leak boundary (hidden truth persists, never projects) and leaking only a `targetHandle` the player already earned by observing the target. `surfacedWorldMinute` is a *past* minute, which is how "no countdown" is enforced structurally rather than by review; the slice's tests JSON-scan the projection for `progress`, `trace:`, `reaction:`, `deadline`, and `expires`. The GUI gets an **ATTENTION** section next to the social HEAT list — same grammar, deliberately adjacent, so a player learns these are two different kinds of trouble — with the caveat written in the player's terms ("Each line is a thing you noticed, not a verdict").

**No verb, therefore no parity obligation.** P1 adds no `SimulationCommand`, which is the cheapest possible parity guarantee: AGENTS.md's rule is per-verb, and passive projected state already lives GUI-only (HEAT, the forum, the public feed, the inbox listing), with `read <message-id>` the sole exception because marking a message read *changes* state. A `logs` verb would be a read-only command with nothing to do; if P3's physical events make a terminal read genuinely load-bearing, it arrives with a verb that also acts. Phaser is untouched — nothing in the room can read a case file, and P3's physical signals are the first thing worth drawing there.

Accepted 2026-10-04 as the Phase 6 P1 slice, delivering the #24 deliverable *authority investigations* and no `RunEnded` (Phase 7's by contract: this phase produces conditions and causes). Nothing consumes `progress` yet and that is stated rather than hidden — P3 reads it as a targeting input alongside D031's anonymity band, P4 reads both, P5 reads `sourceIds`. Opening threshold, attention unit, thresholds, and the three kinds are provisional tuning; a terminal-facing read of the evidence list, and any authority mechanic that could *act* on a converging file, are separate decisions, and the never-a-gate rule binds them: exposure and evidence, never "you may not".

## Open decisions

These remain intentionally unresolved until implementation/playtesting provides evidence:

- exact world-time scale,
- exact ranking formula,
- exact visible proficiency labels,
- whether language names remain fully real or partly fictionalized,
- exact number of concurrent locations/rooms in content alpha,
- whether TinyBase is used for every projection or only query-heavy domains,
- exact balance of procedural versus authored NPCs,
- exact commercial model names versus fictional AI ecosystem,
- final art style and palette,
- final commercial title.
