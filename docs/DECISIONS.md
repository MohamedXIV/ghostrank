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

Rank is an output of ecosystem events and never an input to any decision. ~~A very long wait simulates only its most recent 28 ticks.~~ Superseded by D054: every boundary now runs in order, and long waits are refused rather than truncated.

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

The disclosure rule **inverts P2 where the reason for the leak is absent**. An in-flight build's frozen outcome stays hidden until completion — a report card readable halfway grades the roll for free and melts the build-time tension — but an *owned* workflow projects in full (outcome, tests, which assistant wrote it): analysis predicted someone else's hidden topology, whereas a forge build is the player's own ground truth, witnessed from commissioning, and hiding its result would protect nothing. Completion rides the same clock tick as upkeep (`advanceBuilds` fires on the due minute, due jobs landing in due order), so the queue is split-invariant and save-safe by the same proof as the daily bills. *(Mechanism superseded by D057: completion is now a scheduled system job dispatched on its due minute; the split-invariance and save-safety argument is unchanged.)*

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

## D033 — Probing is an ecosystem action, so it rides the tick loop and a skipped tick never happened (Phase 6 P2)

`docs/AI_SYSTEMS.md` lists "use automation to watch the player" under "NPC use", Phase 5 P4 shipped peer model use as NPC-vs-NPC only, and the deferral was recorded twice (#23's handoff list, D030's "event-layer beat, likely with Phase 6's threat drama"). P2 is that handoff, and the design question it has to answer is not how to roll — `npcAssistDeltas` already exists and D030 fixed its math — but *where a probe lives in time*, because D032 had just argued the opposite direction for P1.

**An action rides the tick loop; a reading of the record is derived.** `probeTick` is called from *inside* `advanceUnderground`'s existing per-tick loop, last in the tick after `retaliate` and `offerContracts`. That placement is the decision, and it is a deliberate inversion of D032 rather than an inconsistency: a probe is a peer *doing a thing on its tick*, so it takes its tick index from the loop that already computes it, inherits `MAX_CATCHUP_TICKS = 28` the way incidents and contracts already do, and needs no second clock cursor — no `underground.lastProbeMinute`, no parallel timekeeping rule, and (decisively) no new required field inside a persisted object whose exact legacy shape `underground-world-schema.test.ts` pins with a field-by-field `toEqual`. The consequence is accepted explicitly: a capped catch-up skips ticks, and a skipped tick is a probe that **never happened**. P1's case material must survive that because it is a reading of a record nobody has to have visited; P2's records must not, because inventing a probe for a tick no peer attended would fabricate an act. The slice's test pins the honest shape: capped records all lie inside the capped window, ids stay append-sequential, and the full-history run has strictly earlier first records — skipping, never fabricating, never re-timing.

**Candidates are re-derived every tick, after retaliation.** This is where split-invariance actually bit. `retaliate` *spends* grudge downward (smear −10, unmask −30), so a candidate list computed once per `advanceWorldTime` command would let one big `wait` keep probing with a peer who had already spent its standing mid-command while chunked waits would not — probe records would depend on how the player pressed the button, exactly the bug D032 called "one the player can feel". `probeCandidates(world)` is therefore called inside the loop, reading standing after each tick's retaliation, which makes the record sequence a function of world history alone. Proven by test at two granularities (hourly ≡ one command; per-day ≡ five-day across an actual retaliation).

**Interest is grudge, never rank — and rank-independence is proven by digests, not assertions.** `PROBE_MIN_GRUDGE = 5` sits deliberately below the smear ladder's 30: curiosity is cheap, retaliation is expensive, and the escalation ladder stays P3's to own. `player.rank` appears nowhere in the module — not the candidate test, not an attempt roll, not an accuracy term, not the artifact. The phase's central prohibition is then tested in the strongest form available: six scenario payloads of the *ecosystem/roll-stream* (incidents, rumors, messages, contracts, retaliations, forum posts, relationships, actors, traces, reactions, investigations, credits, ledger) were digested from the code *before* P2 existed and are replayed byte-identical, alongside an explicit non-vacuity test showing the provoked scenarios really do emit probes while the idle and single-quiet-exit worlds really do not. Byte identity is only defensible because `probeTick` writes nothing any roll consumes: it reads the world and appends to `world.probes`. Rank equality is separately pinned as an equality of whole `probes` arrays at rank 1 and 999_999.

**The lift is a durable record; the tell is a derived field of one.** A peer's knowledge of you is a `RivalProbe` row — `actorId`, `subject` (rig / dwelling / habits), `correct`, minute — not a per-actor `awareness` scalar: a scalar is farmable, desyncable, and un-citable, while P3 needs to be demonstrably *wrong* off a stored `correct: false` and P5 needs named rows with minutes. Every accuracy term is a truth the player controls — footprint band (mirroring `footprintLevel`'s own cuts, so a rival cannot see a number you cannot infer), the dwelling `anonymity` band D031 shipped with nothing consuming it (that promise is now discharged: `public > quiet > hidden` is a tested inequality), quiet-exit-versus-escalation balance (the sim's only vocabulary for "changes relays"), an open intrusive operation — plus `npcAssistDeltas` read a third time with the same seed/tick/actor salt, so an AI-assisted prober makes AI-assisted mistakes in literally the same math, the mistake branch landing twice (`delta × 3` *and* a −12 penalty) because a model misreads a pattern with confidence and a rival trusts it. Clamped `[8, 78]`: D030's "fallible, never deterministic" binds the threat systems as hard as it binds the player's assistant. What the surface gets is `probeArtifactOf(subject)` — ping / caller / missing contact, the docs' peer-owned evidence words, disjoint from P1's authority kinds — with `actorId`, `subject`, and `correct` withheld behind D028's leak boundary. The artifact is *not rolled and not stored*: a second field beside `subject` would be a second source of truth for one event (D031's rule), so the tell is re-derived at projection time and the inference from tell back to seat stays the player's work. The projection is JSON-scanned for all three withheld names, the three seat names, every actor id, and `heat`/`deadline`/`percent`; a world with every `correct` flipped projects identically. `probes` sits at `WorldState` top level for both reasons above — it is a fact about the player, not ecosystem bookkeeping — with the zod `.default([])` legacy pattern and one `eventWorldMinute` case, no `SimulationCommand`, therefore no new parity obligation (D032's argument, reused verbatim).

Accepted 2026-10-04 as the Phase 6 P2 slice, delivering the #24 deliverable *rival probes* and discharging #23's "automation to watch the player" handoff, with no `RunEnded`. Nothing consumes `probes` yet and that is stated rather than hidden — P3's retaliation reads the records as targeting inputs (seat says *which* of your standing a rival believes it holds, `correct` says whether to believe it), P5 folds them into the causal chain. Grudge floor, attempt percent, base percent, band adjustments, assist scaling, and the `[8, 78]` clamp are provisional tuning; a literal relay-rotation verb, a probe-aware "sweep your logs" command, and any rank-as-visibility loop are separate decisions, and the never-a-gate rule binds them: a probe raises what a rival knows and what you can notice, never what you are allowed to do.


## D034 — Physical retaliation consumes prior beliefs; build interruption is a pause, never a rewritten clock (Phase 6 P3)

P3 is the point where Phase 6 stops being only information and reputation. The world may now touch the room, the rig, and owned property — but it must do so without turning rank into combat power, without revealing hidden threat meters, and without breaking Phase 5's frozen-build contract. The implementation therefore starts from facts that already exist rather than inventing a parallel danger score: a rival needs **grudge** toward the player, physical backing from the existing Black-network seat, and a **prior P2 probe**. Rank is not an input. P0's dwelling anonymity and P1's hidden investigation pressure modify the chance, so relocation / safehouses and laying low are real counterplay rather than decorative systems.

**A physical consequence may trust a wrong probe and be wrong for real.** P2 stored `RivalProbe.correct` specifically so P3 would not quietly promote every read to omniscience. A correct rig read can land as an outage; a wrong rig read degrades to suspicious connectivity. A dwelling probe also stores the derived location it actually read: if the player relocates before retaliation, a once-correct address becomes stale and degrades to a door-camera warning instead of following the player into the new safehouse. A correct current dwelling read can damage owned hardware. Habits can produce nearby activity without magically naming a location. The durable `PhysicalThreat` record keeps actor, source probe, investigation citations, the physical location where the consequence landed, impacts, and (for an outage) its hidden end minute. Projection still withholds those ids: ATTENTION gets the signal kind, past minute, and only a derived `atCurrentLocation` boolean so the room can reject history from a place the player left. The room renders any retained cue as timestamped history, not current state; it never shows who caused it, whether their read was right, what was destroyed by id, or when an outage will end.

**Build interruption is true pause/resume.** Rewriting `dueWorldMinute += outage` was rejected because that is still re-timing a frozen job even if the quality roll stays untouched. `startedWorldMinute`, `dueWorldMinute`, model/spec identity, and the frozen outcome remain immutable from commissioning. Interruption is represented separately by optional `pausedAtWorldMinute`, `pausedByThreatId`, and `accumulatedPausedMinutes`; completion derives as frozen due + closed pause time, and an actively paused build cannot complete. The owner id is load-bearing provenance: an old expired outage must not mistake a later outage's active pause for its own and clear it one interruption early. A build commissioned during an active outage joins that outage's pause. Save/restore preserves the pause exactly. The queue may surface **PAUSED**, but the outage's end minute stays hidden so the status never becomes a threat countdown.

That rule forced one chronology correction in `CommandBus.advanceWorldTime`. Previously builds completed for the whole command before the ecosystem acted, which meant an outage arriving on the exact due tick could never interrupt the job. P3 keeps `advanceUnderground` as the sole owner of tick selection and its 28-tick catch-up cap, but gives it before/after-tick hooks: upkeep and investigation state advance to the tick, builds due strictly before it complete, the ecosystem acts, then builds due exactly on it complete only if they were not paused. The same mechanism also prevents a long `wait` from letting a future eviction or future investigation pressure leak backward into an earlier retaliation roll. One 720-minute wait and two 360-minute waits are pinned to the same physical/build truth.

**Consequences may remove property, not the capability floor.** A dwelling hit may destroy one owned hardware instance because losing the thing is the consequence; the player still retains baseline play and no action/target becomes gated. Hardware identity remains run-monotonic after destruction: new purchases allocate past both surviving and historically destroyed `hw:N` ids, so TinyBase rows and threat provenance can never alias a replacement with a lost instance. P3 deliberately does **not** destroy the active lease. Lease loss was the D021 threat hook, but doing it inside this slice would mix a mid-command housing mutation into future upkeep billing and make the result depend on wait chunking. Catastrophic lease/location compromise belongs to P4, where it can be modelled as a durable condition with its own truthful chronology. P3 owns warning / outage / property-hit consequences; P4 owns catastrophic compromise; Phase 7 (#25) still owns endings. No `RunEnded` exists here.

Finally, P3 discharges D030's remaining event-layer beat: a peer involved in a non-warning physical escalation can deterministically adopt the Salvaged Reason Core, with the adoption recorded on both actor and threat and emitted as provenance. This is not a new assistant rule — subsequent ticks feed that model through the same existing `npcAssistDeltas` machinery.

Accepted 2026-10-05 as the Phase 6 P3 slice, delivering #24's *criminal retaliation* and *physical-warning events* plus #23's build-interruption handoff. Chance constants, the Black-network backing proxy, the 360-minute outage length, property-loss frequency, and assistant-adoption rate are provisional tuning; the invariants above are not.


## D035 — Catastrophic compromise is a causal condition, not a second danger roll or an ending (Phase 6 P4)

P1–P3 already answer *why* danger exists: traces create investigation material, grudge creates rival interest, probes store fallible beliefs, and physical retaliation records the consequence that actually landed. P4 does **not** put another hidden difficulty check on top of that chain. `compromiseTick` is deterministic over the facts already established on the current physical boundary. Player rank is not an input, no new Heat score exists, and a historical P3 record loaded from an older save does not retroactively manufacture a P4 condition. A compromise must be caused by a physical consequence that happened **now**.

**The record is history; the existing property fields remain authority.** `CompromiseRecord` is append-only causal provenance — kind, source threat/probe/investigation ids, location, minute. It does not duplicate "do I still own this hardware/lease?" as another mutable flag. `economy.hardware` and `economy.housing` remain the one sources of truth. This is the same derive-don't-store rule used throughout the project with the narrow exception that P4 must remember an irreversible/severe historical condition for P5 and Phase 7. During the run the projection intentionally strips all causal ids and location, exposing only a named condition and the minute it happened. P5 owns explaining the chain.

**The first condition vocabulary is concrete, not speculative.** `rig-lost` means the **final destructive P3 property hit** actually removed the last owned component and no complete owned machine remains; when several actors destroy components on one boundary, only the last destructive threat receives that provenance. `dwelling-lost` is D021's deferred eviction-by-event: a property hit landed at the lease the player still holds on that boundary, so that lease is burned. `identity-exposed` needs three existing facts together — the source probe really was a correct dwelling read at that location, the physical hit landed there, and one of the cited authority files had already reached the P1 converging-material threshold. `stranded` names only a true resource floor after the physical consequence: zero credits, no lease, no owned components, no complete machine, and no authored player tool that could still be sold for recovery money. These are conditions Phase 7 may later interpret; P4 does not claim every one is terminal.

**Eviction obeys the clock rather than reaching backward.** P3 already forced `advanceWorldTime` to advance upkeep/investigation/build state to each ecosystem tick before NPC action. P4 plugs into the same tick through an `afterPhysicalTick` hook owned by the command bus: all P3 actors finish their physical actions first, then P4 consumes that boundary, then social retaliation/probing continues. Therefore a lease lost exactly on a world-day boundary pays the rent that was due for the day just completed, is evicted at that same minute, and can never be billed on a later boundary. P4 is injected through the hook rather than imported directly by `underground.ts`; that keeps the ecosystem module independent and avoids a circular dependency with P1 investigation constants.

**A compromised run still answers.** No `RunEnded` event, terminal boolean, command gate, or ending screen is introduced here. A player with a lost rig still has the baseline capability floor; a player evicted by an event derives back to the baseline room; contracts and actions remain callable. The Underground app labels the durable condition under **COMPROMISE** and explicitly says it is not an ending. Phase 7 / #25 owns deciding when an arrested, unmasked, compromised, stranded, missing, or retirement condition actually ends a run.

Accepted 2026-10-05 as the Phase 6 P4 architectural contract. The exact frequency of these conditions is a balance question measured by the seeded Phase 6 harness, not a new rule; its observed distribution is recorded in the P4 slice document and may be tuned without changing the invariants above.


## D036 — Postmortems derive a player-safe evidence timeline from hidden provenance (Phase 6 P5)

Phase 6 already stores enough causal links to explain a catastrophic condition without recording a second history. P1 investigations cite their source traces/reactions; P3 physical threats cite the probe and investigation rows they consumed; P4 compromises cite the physical threat, probe, and investigations that led there. P5 therefore adds **zero authoritative state, zero commands, zero events, and zero save-schema fields**. `derivePostmortems` is a pure read over the same WorldState that already resumes the run.

**Hidden provenance selects; it does not widen the player's knowledge.** The read is allowed to traverse hidden source ids internally so it can choose the facts that belong to this compromise, but the emitted timeline is restricted to things the player could already know: their own operation actions, a reaction whose `playerVisible` flag is true, authority evidence that actually surfaced for a target whose profile the player knows, the observable artifact derived from a rival probe, the observable physical signal, and the named compromise condition. It never emits the rival actor, probe subject, probe correctness, investigation progress, physical location id, destroyed instance ids, outage end, RNG seed, or any raw hidden source id. A target handle is emitted only when target-profile evidence exists; otherwise the player's own action is described against "a target" and hidden authority evidence is omitted.

**The UI is a provenance-backed timeline, not a claim that every adjacent row is one hidden edge.** P3 can consume both a probe and ambient investigation pressure; those are causal branches that converge on a physical consequence. Flattening the read into time order is for comprehension. Membership in the timeline is provenance-backed, and deterministic tie ordering keeps the view stable, but the copy explicitly says adjacent lines are not asserted to be a single hidden edge. This preserves the distinction between "these facts belong to the chain" and inventing an unseen narrative between them.

**Attribution can be incomplete, and that is a feature.** A compromise is marked `complete` only when its stored provenance still resolves a physical threat, that threat resolves the cited probe, and at least one player-caused operation trace is reachable through the cited investigation records. If any of those causal legs is missing, P5 still shows the player-visible facts it can prove and labels the result **INCOMPLETE ATTRIBUTION**. It never synthesizes a player mistake merely to make the postmortem feel satisfying. This is the hard-fairness rule from `GAME_DESIGN.md` made structural: the game teaches from evidence, not from omniscient fiction.

**P5 remains inside Phase 6's boundary.** The postmortem can be read immediately after a P4 condition while the command bus still answers. It does not choose an ending, freeze a run, or emit `RunEnded`. Phase 7 / #25 may later reuse the same pure read in final run history, but ending eligibility and presentation remain separate.

Accepted 2026-10-05 as the Phase 6 P5 architectural contract. This completes Phase 6's causal-learning layer; future content may add more provenance-bearing systems, but they must join the read without weakening the epistemic boundary above.


## D037 — Every ending uses one durable one-way terminal record (Phase 7 P0)

Phase 7 begins with an important absence: before this slice Ghostrank had no terminal state at all. Phase 6 deliberately stopped at consequences and causal conditions, so a compromised world remained fully playable. P0 introduces the boundary every later ending must share instead of letting each ending invent its own boolean, screen, or command gate.

**There is exactly one authoritative terminal record.** `WorldState.ending` is either `null` (the run is live) or one `RunEndingRecord` containing a status, a typed cause kind/id, and the world minute at which the run ended. `endRun` is the only primitive that writes it. The first ending wins; a second attempt emits nothing and cannot rewrite history. This is why arrested, unmasked, missing, compromised, stranded, retired, and VANISHED are one vocabulary rather than seven unrelated flags.

**Terminality lives in the simulation, not the UI.** Once `ending` is non-null, `CommandBus.execute` rejects every gameplay command with `RUN_ENDED` before any system can mutate state or advance time. The final screen is merely a projection of that fact. Removing or replacing the screen could not make the run live again. The existing testing invariant that run-ending events are terminal is therefore enforced structurally.

**P0 defines the contract but triggers no ending.** Normal worlds still begin with `ending: null`, legacy saves default to `null`, and advancing time cannot spontaneously end a run in this slice. P1 and later slices own eligibility. This separation prevents terminality from being smuggled into Phase 6 compromise logic and lets forced endings, retirement, and rare VANISHED all share one tested transition.

**The cause is durable but not automatically public.** The authoritative record keeps `causeKind` and `causeId` so Phase 7 history and debugging can cite why the run ended. The live final projection exposes only status, label, and minute. Hidden cause ids do not enter TinyBase. A future final report can combine the ending record with Phase 6's player-safe postmortem read instead of dumping hidden provenance.

**Persistence follows the existing active-run contract for now.** P0 adds the terminal record to the canonical WorldState schema and portable save, with `null` as the legacy default. Browser persistence can therefore restore an ended active snapshot faithfully. Moving that snapshot out of the active slot into completed-run history is intentionally P4; P0 does not prematurely expand the persistence interface before the history model exists.

Accepted 2026-10-05 as the Phase 7 P0 terminal contract. Ending eligibility, retirement mechanics, history archival, long-run pressure, and exotic capability remain later Phase 7 slices.


## D038 — Forced endings consume the current causal boundary and freeze that tick immediately (Phase 7 P1)

Phase 6 deliberately recorded dangerous **conditions** rather than endings. Phase 7 P1 now decides when those conditions become terminal, but it does not collapse the distinction by saying “every compromise ends the run.” The evaluator consumes only P4 records created on the **current ecosystem boundary**. Historical Phase 6 compromise rows loaded from an older save remain history; they are not retroactively reinterpreted as terminal just because the executable gained Phase 7 rules.

**Identity exposure is a branch point, not one ending.** The same P4 `identity-exposed` condition can resolve differently depending on the causal history that already exists. If one of its cited authority files has actually surfaced the full visible `converging` evidence band, the ending is **ARRESTED** and cites that investigation. Otherwise, if the physical actor behind the source threat is the same actor who already committed the underground's social unmasking retaliation, the ending is **UNMASKED**. Otherwise the physical actor reached the person without either stronger history, so the ending is **MISSING** and cites the physical threat. This uses existing facts; no new roll, rank threshold, or omniscient morality flag is introduced.

**Resource/infrastructure endings stay bounded.** `stranded` is terminal only because P4 already proved the explicit recovery floor — zero credits, no lease, no component rig, no complete machine, and no authored tool left to sell. A generic **COMPROMISED** ending requires `rig-lost` and `dwelling-lost` on the same current boundary. Losing only a rig or only a dwelling remains recoverable, preserving Phase 6's rule that severe consequences do not automatically erase the run. If several terminal conditions coexist, identity exposure has priority, then stranded, then generic infrastructure compromise; D037's first-ending-wins record makes that ordering final.

**Ending inside a long command ends world time there, not at the requested destination.** `advanceWorldTime` used to set `worldMinute` to the requested `toMinute` before folding ecosystem ticks. P1 keeps that implementation convenience during the fold, but if `RunEnded` is produced it clamps authoritative `worldMinute` and the emitted `WorldTimeAdvanced.toMinute` back to the terminal tick. The ecosystem loop breaks immediately after the P4/P1 physical boundary. No later social retaliation, contract offer, current-tick probe, exact-tick build completion, upkeep, investigation, or partial-tail work may mutate the run after the ending. Work strictly earlier than the terminal tick still happened and remains valid.

**Rank remains irrelevant.** Forced-ending eligibility reads compromise provenance, surfaced evidence, retaliation history, physical threat identity, property/resource conditions, and time. Player rank is not an input. Two otherwise identical histories at rank 1 and rank 999,999 end identically.

**P1 does not invent mechanics for names the simulation cannot yet justify.** The world document lists captured/killed/forced-disappearance possibilities, but the shipped causal state currently supports the five forced statuses above: ARRESTED, UNMASKED, MISSING, COMPROMISED, and STRANDED. New ending names require a concrete causal condition before they can call `endRun`; a label alone is not an implementation.

Accepted 2026-10-05 as the Phase 7 P1 forced-ending contract. Retirement remains P2 and uses the same D037 terminal primitive rather than a second lifecycle.


## D039 — Retirement is a staged wind-down plus survivable cooling, not a menu exit (Phase 7 P2)

A voluntary ending must be meaningfully different from simply pressing Quit. P2 therefore models **intent, cleanup, commitment, and waiting under live world pressure** while keeping every step fictionalized and player-legible.

**PLAN is intent, not a gate.** `startRetirement` records a plan at the current world minute and changes nothing else. The player can begin planning while obligations are still open, then resolve those obligations through the normal simulation verbs. Starting a plan costs no money or time and never calls `endRun`.

**COMMIT is allowed only when the visible life of the handle has actually been wound down.** The checklist is composed entirely from facts the player already owns: no active operation, no accepted contract, no in-flight software build, no running model, no active software license, and no active lease. Hidden grudge, investigation progress, probe correctness, rank, and other secret pressure are never retirement gates. If any blocker remains, COMMIT fails without moving the clock.

**A clean commit spends one hour in the world, then freezes a two-day cooling deadline.** The 60-minute commit is a normal world-time action: upkeep, investigations, rivals, physical consequences, and forced endings can act while it is underway. If the run ends during those 60 minutes, the plan never reaches cooling. If the world is still live, the visible blocker checklist is evaluated again at the arrival minute before cooling starts; a newly-created obligation keeps the plan in PLANNING, while the hour and its world events remain spent. Otherwise the plan stores only `committedWorldMinute` and one `coolingUntilWorldMinute`. READY is derived from the current clock crossing that frozen deadline; it is not another stored state transition or scheduler cursor.

**Cooling is a voluntary discipline with an escape hatch.** Once committed, the command bus permits only waiting, reading messages, or cancelling the plan. Operational/economic actions are rejected with `RETIREMENT_COOLING_ACTIVE` until the player cancels. This is intentionally a temporary gate created by the player's own explicit exit commitment, not a level gate or hidden punishment. Cancelling removes the plan immediately and normal play resumes. The world itself continues to act during every wait, so "lay low" remains survival rather than a skip button.

**P2 stops at READY.** It emits no `RunEnded` and does not decide whether the finished exit becomes ordinary RETIRED, the rare White VANISHED ending, or another retirement tone. P3 owns that classification from actual run history/context and will call the same D037 `endRun` primitive. Keeping that boundary prevents P2's checklist from secretly becoming a morality meter.

**The interface is shared and explicit.** Terminal commands are `retire plan`, `retire commit`, and `retire cancel`; the Underground EXIT PLAN panel emits the same typed commands and shows the same visible blockers/deadline. No real-world evasion procedure, identity-cleaning advice, or networking behavior is represented — the mechanics are abstract simulation state only.

Accepted 2026-10-05 as the Phase 7 P2 voluntary-retirement contract.

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


## D040 — Retirement identity is derived from completed history, not the starting package (Phase 7 P3)

P2 deliberately stopped at READY. P3 closes that gap with one explicit terminal action, `finishRetirement`, shared by Terminal (`retire finish`) and the Underground **CLOSE HANDLE** control. The command is unavailable before READY, costs no additional world time, and calls the same D037 `endRun` primitive as every forced ending. Once it succeeds, the normal `RUN_ENDED` guard applies immediately.

**The starting board is not an alignment flag.** P3 never reads `underground.playerNetwork` to choose the ending. It reads what the run actually did: completed contracts grouped by the issuer's network, plus the already-derived reputation history and consequence records. A Black-starting player can earn the peaceful path through White-scene history; a White-starting player can produce a Black retirement by doing Black-scene work. Player rank is also absent.

**VANISHED is rare because the current simulation must be able to prove a coherent quiet history.** Eligibility requires at least three completed White-network contracts, no completed Black-network contracts, no `Opportunist` descriptor, no `Predator` descriptor, no catastrophic compromise, and no social unmasking. These are all existing authoritative facts. P3 adds no morality scalar, no new roll, and no hidden "good player" flag. The rule is intentionally limited to what the current simulation can establish; it does not pretend to model every ethical consequence behind a fictional contract.

**Every other READY run may still retire.** P3 derives tone rather than denying the exit: `white-quiet`, `black-prosperous`, `black-watchful`, `black-quiet`, or `mixed-exit`. Black-dominant history means at least two completed Black-network contracts and more Black than White completions. A pressure history (retaliation, physical threat, or compromise) yields the watchful tone; otherwise 500+ remaining credits yields prosperous; otherwise Black retirement is quiet. These variants have no post-ending mechanical power.

**The terminal record stays small.** D037's authoritative `ending` remains status/cause/minute. P3 does not persist a second alignment or variant field. For retirement endings the player-safe projection re-derives the structured variant and short closing line from the frozen run history, so save/restore is stable without duplicating mutable counters. The hidden cause id remains outside the UI projection.

Accepted 2026-10-05 as the Phase 7 P3 retirement-outcome contract. P4 now owns completed-run archival/history; P3 does not reintroduce PR #40's superseded competing terminal schema.


## D041 — Completed runs archive final truth once; history is a derived read (Phase 7 P4)

A completed run must remain inspectable without creating a second mutable lifecycle. P4 therefore archives the **final canonical `WorldState`**, including D037's immutable `ending`, and derives every summary/postmortem view later. It does not persist a copied scorecard, alignment value, peak rank, or competing terminal status.

**Browser completion is an atomic move, not a copy-and-hope convention.** IndexedDB v2 adds a `run-history` store beside `active-run`. A successful completion writes the final portable state to history and deletes the active slot inside one transaction. The move is permitted only while an active slot exists, so retrying a completion that already succeeded is a no-op rather than a duplicate archive entry. Closed PR #40 supplied this storage pattern only; its superseded `run.status` schema is not restored.

**Failure may delay archival but may never resurrect gameplay.** If the active→history transaction fails after a terminal command, GameSession durably writes the terminal snapshot back to the active slot before surfacing the persistence failure. A later boot sees canonical `state.ending`, retries archival, and keeps that boot on the ended session. Once archival has succeeded, the following boot finds no active slot and creates a fresh run separately.

**History is player-safe by construction.** `deriveCompletedRunSummary` reads the archived state and exposes final status/label/time, retirement tone when relevant, final (not invented peak) rank, credits, ledger value moved, completed contracts, operation escalations, authored workflows, compromise count, existing reputation descriptors, and the existing P5 safe postmortems. Ending cause ids, relationship numbers, probe correctness, investigation progress/source ids, hidden actor/location truth, and other private simulation data do not cross the history read model.

**Browsing has no command surface.** GHOST/OS gains a History window that loads completed states through the persistence boundary and renders those derived summaries newest-first. An archived run is read-only and cannot mutate itself or the current run.

**P4 is web-first.** Completed-run methods remain optional on `RunPersistence`; browser IndexedDB implements them now, while the deferred Tauri/SQLite adapter keeps its terminal active snapshot until #19 / the desktop phase reconciles native history storage.

Accepted 2026-10-05 as the Phase 7 P4 completed-run history contract. P5 now owns exceptional long-run pressure; archive/history itself does not make veteran runs harder.


## D042 — Veteran pressure compounds existing causal routes; it never creates them (Phase 7 P5)

Phase 7 needs unusually long survival to become harder without quietly turning rank into combat power or punishing the player for the calendar alone. P5 therefore derives pressure from **history that actually happened**, and only after the run has survived long enough for that history to matter.

**Two world weeks is a gate, not a difficulty switch.** Before day 14 the P5 layer is a strict no-op regardless of activity. After day 14, age by itself still contributes nothing: a causally quiet 120-day run remains ORDINARY. Pressure reads completed/missed obligations, intrusive escalation, surfaced authority evidence, retaliation, probes, physical threats, and compromises that existed by the exact tick being evaluated.

**Pressure is bounded and derived.** The current history score maps to ORDINARY / KNOWN / ENTANGLED / VETERAN, with KNOWN/ENTANGLED/VETERAN beginning at 6/12/20. The applicable contract-offer, rival-probe, and physical-retaliation rolls receive only +4/+8/+12 percentage points. Higher bands may also raise the concurrent open-contract ceiling from 3 to 4/5. There is no stored veteran level, no new RNG stream, no rank input, and no starting-board input.

**P5 amplifies routes; it does not manufacture prerequisites.** More accumulated history may make contract offers arrive more often. A rival may try probing more often only if that actor already satisfies the existing grudge candidate rule. Physical retaliation may become more likely only after the existing Black-network + grudge + prior-probe chain exists. P5 does not create grudge, grant physical reach, bypass probe provenance, accelerate a quiet investigation, impose a veteran tax, or gate commands.

**Long waits read pressure at the tick, not at the requested destination.** CommandBus may temporarily hold a far-future destination while the ecosystem folds fixed boundaries. P5 therefore derives from facts whose timestamps are at or before the current tick. A single long wait and equivalent split waits cross day 14 with the same pressure and produce the same state.

**The screen receives interpretation, not the hidden math.** WorldProjection/TinyBase expose only the coarse band and broad causal categories (completed work, intrusive history, counterpressure, physical history). Numeric score, percentage bonuses, raw relationship values, probe truth, and investigation progress remain simulation internals.

**P5 intentionally narrows an older golden-digest promise.** Phase 6's byte-identity digests remain pinned for early or neutral scenarios where later systems should still be inert. The old 20–60-day reckless/provoked digests are no longer “must never change” contracts: P5 is the first explicit later slice whose job is to alter veteran causal histories. Dedicated P5 tests now own that activation and whole/split determinism instead of blessing a new opaque hash.

Accepted 2026-10-05 as the Phase 7 P5 exceptional-long-run-pressure contract. P6 now owns bounded exotic/quantum capability; P5 introduces no new capability tier itself.


## D043 — Exotic capability is scarce access to ordinary capability, never a new power axis (Phase 7 P6)

Phase 7's final slice ships one fictional quantum-adjacent artifact, the **Cryogenic Annealing Rack**, without creating a parallel “quantum hacking” ruleset. The rack is a normal machine as far as the simulation is concerned: it is bought through `buyMachine`, emits the existing machine/value events, lives in `economy.ownedMachines`, and contributes through the existing five-axis `HardwareCapability` fold.

**Late and rare comes from run history, not rank.** The off-market listing appears only after P5 derives the run as **VETERAN** and the player has completed at least one **clean self-authored workflow**. Rank, starting White/Black board, and target rank are not inputs. Before eligibility the listing is absent from the Market projection, and guessing its catalog id through `box buy` is rejected by the same simulation boundary rather than relying on UI secrecy.

**The lift is deliberately bounded.** The rack contributes `memory +8 / vram +5 / storage +4`, with **compute 0 and network 0**. It therefore widens the existing memory-driven discovery scope and increases local model/build headroom, but it does not shorten survey/inspect/escalate/disengage action minutes, grant a new verb, alter a success roll, bypass evidence, unlock a target, or erase the ordinary constraints that made the run difficult. “Quantum” is fiction/content framing around ordinary capability, not an omnipotent cryptography switch.

**The opportunity is one-shot without a new state flag.** A successful purchase already leaves an append-only machine debit in the authoritative value ledger. That existing provenance is the claim record: once the rack has ever been purchased, selling it does not respawn the offer. Save/restore preserves the same result because both the owned machine and the purchase ledger were already canonical persisted state.

**No new subsystem is introduced.** P6 adds no authoritative WorldState field, migration, RNG stream, command family, event family, capability axis, or host-specific persistence rule. Terminal and GUI both reuse the existing machine purchase command. Player-facing projection exposes only the stock once it is legitimately available plus the ordinary capability numbers and an EXOTIC/one-shot label.

Accepted 2026-10-05 as the Phase 7 P6 bounded-exotic-capability contract. With P0–P6 delivered, Phase 7's planned slices and exit criteria are complete; Phase 8 / #26 becomes the next gameplay phase.


## D044 — Content archetypes are authoring metadata; simulation authority stays mechanic-only (Phase 8 P0)

Phase 8 needs substantially more peers, targets and infrastructure, but the runtime fixture is the wrong place to author that breadth. P0 therefore creates a dedicated typed world-content roster and moves the existing Phase 2–7 peer/target definitions into it **without changing the default world**.

**Content metadata is not gameplay state.** Actor and target archetype tags describe editorial intent — apex operator, broker, automation specialist, reckless tinkerer, street operator, elite underground operator — and help later slices build a varied roster. They are stripped when content is instantiated and never enter `WorldState`, persistence, projection, rank math, threat math, or command eligibility. An archetype is not a class or difficulty tier.

**Authored data is validated before simulation owns it.** The content boundary rejects duplicate actor/target/machine/service ids, invalid integer 0–100 actor inputs, invalid ranks, unknown assistant models, empty target infrastructure, dangling actor-owned targets, and owner/target public-identity drift. This is structural validation, not a balance score: P2 can still author weak, strong, deceptive or unusual characters as long as their data is coherent.

**Simulation gets clones, never the catalog objects.** Instantiation deep-clones actors and targets before `createInitialWorldState` receives them. A run can mutate actor ranks, assistant adoption, service state or infrastructure without rewriting the authored catalog used by another run/test.

**P0's compatibility bar is byte identity.** The `alpha-core` roster is the prior NIGHTSHADE / VESPER / LATTICE / HALFMOON / KESTREL content moved verbatim. No peer, target, model, seed, starting relationship, capability, evidence or mechanic is added. Existing deterministic Phase 2–7 tests therefore remain the strongest regression proof; later Phase 8 breadth slices may intentionally change the canonical roster only with new explicit evidence.

Accepted 2026-10-05 as the Phase 8 P0 content-boundary contract. P1 should measure the unchanged baseline before P2 broadens target/NPC content.


## D045 — Balance telemetry measures policies through real commands; it is evidence, not a gameplay oracle (Phase 8 P1)

Phase 8 needs a stable pre-breadth reference before P2–P6 add content. P1 therefore adds a **developer-only deterministic telemetry harness** over the real `CommandBus`. It does not add telemetry fields to `WorldState`, emit gameplay events, expose hidden data to the player, or create a second simulation path.

**Policies are scripted players, not state editors.** The four baseline policies are IDLE, CONTRACTOR, RECKLESS, and CAREER-EXIT. Operator policies discover targets/services, accept and deliver contracts, escalate/disengage, wait, and retire only through the same typed commands available to the game. The only seed variation is applied to the initial ecosystem seed before CommandBus takes authority. Outcomes, evidence, endings, money and rank are never written directly by the harness.

**The canonical baseline is 32 fixed seeds over 30 world days.** The reporting horizon is a hard boundary: a policy may not begin or continue a multi-step retirement sequence past it. Numeric summaries use the mathematical median, averaging the two middle samples for an even seed count. On the P0 content roster:
- IDLE: 32/32 runs remain active at day 30, with zero money/rank/threat movement; 571 offers were created and left untouched (541 expired, 30 still open).
- CONTRACTOR: median run length 25,920 minutes (18 days); 28/32 end ARRESTED and 4/32 remain active; 797 contracts complete; median final credits 3,750; median rank improvement 9,239 places; 25/32 finish in the VETERAN pressure band.
- RECKLESS: median run length 22,140 minutes (~15.4 days); 28/32 end ARRESTED, 2/32 STRANDED, 2/32 remain active; 709 contracts complete; 475 escalations and 60 compromise records are observed across the sample.
- CAREER-EXIT: median run length 23,186.5 minutes (~16.1 days); 20/32 successfully RETIRE and 12/32 end ARRESTED before closure; median final credits 1,930; median rank improvement 3,997 places.

Those numbers describe **these exact policies and this exact content baseline**. They are not hidden difficulty targets, balance acceptance bands, or promises that later content must preserve the same counts. P2–P6 may intentionally change distributions; when they do, the report is rerun so the change is visible and attributable instead of silently retuning the game.

**Content exposure is measured alongside outcomes.** The report records encountered actor/target/machine/service/contract-issuer ids plus authored catalog counts. At P1 the structural baseline is five peers, one target, two target machines, two services, and the existing 6/4/5/5/3/3/3 hardware/housing/machine/model/player-tool/software/workflow catalogs. This gives Content Alpha a direct way to show that breadth actually increased rather than merely adding unreachable rows.

**The harness is local tooling, not a mandatory production dependency.** `npm run telemetry:balance` runs the same deterministic report. The full report is also test-covered for determinism and core invariants; exact distribution numbers are printed for evidence rather than asserted as brittle pass/fail thresholds. Human playtests still decide whether the measured behavior feels fair or interesting.

Accepted 2026-10-05 as the Phase 8 P1 telemetry contract. P2 may now broaden target/NPC content against a measured unchanged baseline.


## D046 — Content Alpha target breadth is authored topology, not a target-class ruleset (Phase 8 P2)

P0 created the world-content authoring boundary and P1 measured the one-target baseline. P2 uses that boundary exactly as intended: it broadens the fictional roster from five peers / one target to **ten peers / six targets**, with fourteen authored target machines and seventeen services, without teaching the simulation any new target class.

**The five new target owners are ordinary actors with ordinary targets.** VELVETWIRE (scam-network), IRONVEIL (extortion-crew), TALLYMAN (predatory-market), DAYSTAR (corporate-infrastructure), and ROOKERY (rival-infrastructure) are authored through the same `UndergroundActor` / `TargetState` / machine / service shapes as NIGHTSHADE. Their archetype tags remain editorial metadata and are stripped before `WorldState`. No target-level, universal difficulty score, command branch, event family, RNG stream, persistence field, or player-rank requirement is introduced.

**Existing relationship rules remain the only starting social rule.** DAYSTAR and ROOKERY are White-network peers, so a White-starting run receives the same existing starting-network trust initialization that already applied to VESPER and HALFMOON. P2 does not seed bespoke relationships for any archetype. Black-network additions receive no special starting trust.

**Every target shares the same epistemic/operation path.** Dedicated tests run all five new targets through observe → open → survey → disengage, and compare player rank 1 with rank 999,999. Command results, discovered evidence, chronology, and traces agree. Distinct machine/service topology creates informational variety; it does not create a second operation engine.

**Historical golden proofs remain historical.** Phase 6's pre-probe byte hashes were not replaced with hashes from the expanded world. Their regression now reconstructs the exact pre-Content-Alpha five-peer / NIGHTSHADE roster and replays the old proof there. Likewise, Phase 7's P5 contract-pressure probability test isolates its intended trusted issuer so P2's extra White contacts cannot masquerade as a pressure regression.

**P1 telemetry is rerun rather than ignored.** The expanded roster is reachable: the 32-seed report exposes all ten actors and all six targets; the contractor policy encounters twelve distinct target machines and twelve services. It also shows a material activity increase: contractor probes rise from 403 to 1,723, while ARRESTED outcomes move from 28/32 to 30/32; idle still remains 32/32 active with zero player-driven threat and ORDINARY pressure. P2 records this as a measured consequence of more autonomous actors and opportunities. It does not secretly retune Phase 6/7 mechanics to reproduce the P1 distribution; P6 owns explicit alpha calibration.

Accepted 2026-10-05 as the Phase 8 P2 target/NPC breadth contract. P3 now owns contract breadth through the existing evidence/operation/value/relationship model.


## D047 — Contract breadth is a predicate over existing world facts, never a mission-script layer (Phase 8 P3)

Phase 8 needs more opportunity shapes, but contracts must stay inside the same freeform simulation as every other operation. P3 therefore expands the contract objective vocabulary from two kinds to four without adding a mission engine, objective-completion flag, special action verb, or target class.

**Objectives ask for facts the simulation already records.** `recon-report` still requires observed service evidence. `infrastructure-map` requires observed machine evidence. `quiet-recon` requires at least one known target machine plus a post-acceptance recon-stage disengagement trace; an intrusive exit does not count. `intrusion` still requires a post-acceptance escalation trace. The player earns every predicate through the ordinary observe/open/survey/inspect/escalate/disengage path.

**Chronology is authoritative.** Trace-based objectives only accept qualifying traces strictly after the contract's acceptance minute. Acceptance itself costs no world time, so strict chronology prevents an earlier zero-time-adjacent trace at the same minute from retroactively completing newly accepted work. Existing evidence may be sold/reported later where that is the actual objective — machine/service knowledge is durable player knowledge, not a per-contract collectible.

**Rewards and deadlines reuse existing systems.** All four objectives resolve through the same accept/decline/deliver commands, ordinary contract expiry, issuer trust change, forum provenance, value-ledger payout, and 1% reputation/rank improvement. Initial deterministic tuning is: recon-report 2 days / 80 + 40 per service; infrastructure-map 3 days / 90 + 45 per machine; quiet-recon 2 days / 180; intrusion 4 days / 260. Rank is never an eligibility, payout, or completion input.

**The only new contract datum is visible scope.** `requiredMachines` parallels the existing optional `requiredServices`. It is persisted and projected because the player must know what the issuer asked for. The projection still does not reveal which machines or services exist; it exposes only the requested count, objective, handles, status, and deadlines.

**Telemetry remains a real-command policy.** The P1 harness learns the two new objectives by surveying and disengaging through CommandBus; it does not mark them complete directly. P3 reruns the 32-seed report so any distribution shift is attributable to opportunity mix rather than hidden retuning.

Accepted 2026-10-05 as the Phase 8 P3 contract-breadth contract. P4 owns location + physical-life breadth after P3 gates and telemetry are reconciled.


## D048 — Location breadth is authored lease trade-offs, not a second physical-world system (Phase 8 P4)

Phase 6 already solved where the player is: `economy.housing` is the authoritative lease and `derivePresence` is the physical read. P4 therefore adds **content only**. The housing catalog expands from four to eight entries while the four existing listings remain unchanged.

**The four new locations occupy existing trade-off space.** Night-Shift Office (quiet workspace, 30m travel, storage/network lift), Sublet Studio (quiet residential, 45m travel, compute/memory lift), Archive Lockup (hidden workspace, 120m travel, storage-heavy lift), and Cellar Studio (hidden residential, 150m travel, memory/network lift) all use the same daily upkeep, capability vector, anonymity band and relocation-distance fields as the shipped Phase 6 locations. They are data rows, not location classes.

**Presence still has one source of truth.** P4 adds no location field, command, event, scheduler, RNG stream, persistence object or migration. Renting any new listing still writes only the ordinary housing id; presence, travel, upkeep, projection and physical-retaliation exposure derive from it. A stale or absent id still falls back to the baseline room exactly as before.

**Anonymity remains counterplay, not a power gate.** Public/quiet/hidden continues to feed the existing physical-retaliation percentage. Housing kind remains descriptive. Rank never participates in availability or leasing. The two safehouses remain capability-zero concealment choices; P4 does not turn a safehouse into a stat upgrade.

**Breadth must not silently retune the world.** P1's telemetry policies never rent housing, so P4 is required to leave their endings, economy, rank, contracts, threats and exposure unchanged. The authored-content count alone moves from four to eight housing listings. Any other telemetry delta is a regression, not intended balance.

Accepted 2026-10-06 as the Phase 8 P4 location/physical-life breadth contract. P5 owns market breadth through the existing capability/economy/contention systems.


## D049 — Market breadth extends catalogs through existing economic/effect contracts (Phase 8 P5)

Content Alpha needs more equipment and software decisions, not another progression layer. P5 therefore broadens six existing catalogs while keeping their economic shapes and effect language unchanged: hardware **6→8**, machines **5→7**, models **5→7**, player tools **3→5**, software licenses **3→5**, and self-built workflow specs **3→5**. P4 housing remains eight.

**Components and boxes remain the same capability system.** Balanced Compute Module (compute 2 / memory 1) and Memory Accelerator (memory 1 / VRAM 3) are ordinary hardware purchases. Archive Node and Model Host are ordinary non-exotic complete machines specializing in storage and local-model capacity respectively. They flow into the same five-axis capability fold; the Cryogenic Annealing Rack remains the only exotic listing and its Phase 7 eligibility rule is untouched.

**AI breadth keeps the cloud/local economic split.** Long-Context Class API is another cloud rental: zero acquisition cost, zero local footprint, daily provider upkeep. Reliable Compact 7B is local property: one-time purchase, local VRAM/storage contention, no recurring fee, and named author LATTICE in the value graph. Neither source creates a new model mechanic, and rank affects neither acquisition nor running.

**Authored tools remain property with provenance.** VESPER's Map Stitcher adds memory/storage/network capability; LATTICE's Trace Comparator contributes the existing action-duration modifier. Buying/reselling them uses the same tool inventory, fence resale, ledger and named-author provenance paths as the original three tools.

**Premium software and self-built software stay one-to-one.** Indexed Storage Suite and Batch Scheduler extend the rental catalog. Local Storage Index and Self-Built Batch Scheduler are Forge specs whose `SoftwareEffect` values exactly equal the licenses they replace. Build time, contention footprint, frozen quality outcome and defective-effect degradation remain the existing Forge rules. P5 adds no executable host code or new effect type.

**No new progression authority appears.** There is no command, event, state field, RNG stream, capability axis, unlock level, player-rank gate or save migration. Existing catalog ids are unchanged; stale ids keep the same inert lookup behavior.

**Telemetry must stay mechanically identical.** The P1 policies do not buy market content, enable licenses, run models or build workflows. P5 therefore may change only authored-content counts in the report. Endings, economy, rank, contracts, threats and exposure must remain identical to P4; any other delta is a regression. P6 owns explicit alpha calibration.

Accepted 2026-10-06 as the Phase 8 P5 market-breadth contract. P6 owns social/event breadth and final Content Alpha calibration.


## D050 — Content Alpha calibration is measured, and the measurement justifies no change (Phase 8 P6)

P6 closes Content Alpha in three parts: broaden the authored social wording that reaches the player, give the telemetry harness a social dimension to measure, then decide calibration **from that measurement**. All three are now delivered, and the honest outcome of the third is that no balance constant moves.

**Social copy varies in presentation only.** `src/content/social-copy.ts` resolves incident, forum, rumor, message and contract wording from variant tables. The variant is selected by a private string hash of the record's **persisted authoritative id**, so the same incident keeps the same phrasing across projection passes, reloads and save restores, and no presentation choice can move a simulation number. P6 adds no command, event, state field, RNG stream, purpose salt or save migration, and the variant key never consults player rank.

**The report gains one dimension and one version bump.** Telemetry `version: 1 → 2` adds a per-scenario `social` block counting public incidents, forum posts, rumors and messages. The counters are read-only over records the world already holds; no policy, seed, horizon or command changed. This is the datum P6C needed, because P1–P5 could measure survival and money but not whether the scene is actually legible.

**P4 and P5 neutrality is now proven rather than asserted.** D048 and D049 each required the telemetry policies to stay outcome-identical to P3, and neither slice could check it because no Actions runner executed after P3. `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts` and `eslint.config.mjs` are byte-identical between the P3 merge (`563bd6a`) and this head, so the P3 v1 report was regenerated locally and diffed field by field against the P6 v2 report after allowlisting exactly `version`, `authoredContent` and `scenarios.*.social`. **Zero fields differ.** Every P3 mechanical figure reproduces: contractor 27 ARRESTED / 5 active, median 31,860 minutes, 1,452 completed contracts, 1,981 probes; reckless 30/1/1 with median 27,720; career-exit 25 retired / 2 vanished / 5 arrested with median 23,344.5. Two independent v2 captures hash identically (`sha256 2a641a0de5a5d08f87a6f8e9c0dce00478368c5177775f77173e89090e4e2c67`), which re-satisfies D045's repeated-report determinism contract on the P6 tree.

**Measured alpha distribution (32 seeds × 30 world days).** Idle stays inert by construction: 32/32 active, zero credits, zero rank movement, zero escalations, ORDINARY band, and its 1,081 contracts expire unaccepted. Contractor earns a median 8,527.5 credits and 28,730.5 rank places across a median 22.1 days and dies 27/32 times. Reckless is strictly worse on both axes (median 7,122.5 credits, 22,066.5 rank, 30/32 arrested, one stranded compromise). Career-exit converts that pressure into a chosen exit: 25 retire, 2 vanish, 5 are caught, with a median 3,905 credits banked. Opportunity, threat and money therefore separate cleanly across the four policies, which is the alpha behaviour D045 asked for.

**Legibility is the new measurement, and it passes.** Dividing the social counters by run-days gives per-day scene rates, and each UI surface has a hard visible cap (`FEED_LIMIT 50`, `INBOX_LIMIT 30`, `FORUM_LIMIT 30`, `CONTRACT_LIMIT 20`). The resulting readable window is 8.61–8.80 days of feed, 5.76–6.07 days of inbox, 3.27–4.30 days of forum, and 156–706 days of contract offers across the four policies. The tightest surface is the forum at roughly three and a quarter days in the busiest policy — above the point where consequential posts scroll off unread — and the offer board never approaches saturation, so hypothesis 1's "permanently jammed surface" is false: expired/created is 0.07% for contractor, 0.08% for reckless, and open offers average 0.63–2.0 per run against a cap of 3–5.

**Hypothesis 2 is unreachable as written, and the residual is presentation, not probability.** `projectProbes` maps every recorded probe to a tell with no cap, so "a probe with no surfaced signal" cannot occur. The remaining question is whether ~62 tells per contractor run stay readable; the playtest below answers that, and the answer is a projection/UI concern rather than a `probes.ts` tuning concern. Threat files stay off the calibration table.

**Hypothesis 4 is unmeasurable by this harness by design.** No telemetry policy ever buys hardware, leases housing, runs a model, enables a license or commissions a build, so the report cannot say anything about market affordability. Tuning a price against it would be exactly the unmeasured tuning D049 and P6C forbid. Market affordability is recorded as a follow-up needing a purchasing policy, not adjusted here.

**Pressure bands are effectively binary, which the measurement newly exposes.** `known` and `entangled` occur in zero of 128 runs: contractor and career-exit land 3 ordinary / 29 veteran, reckless 6 / 26, because the pressure score weights completed contracts and active policies complete 21–45 of them. The middle of the ladder is authored but unreachable. This is Phase 7 territory, pinned at scores 6/12/20 by `phase-7-long-run-pressure.test.ts`, and adjacent to the probe and physical bonuses that P6 may not touch, so it is recorded as evidence with a follow-up rather than retuned inside a calibration slice.

**Hypothesis 3 is answered by a real browser run, not by a statistic.** A scripted 16-day desktop session (Chrome, `npm run dev`, seed `20261003`) was driven entirely through the shipped UI and terminal. Feed wording visibly varies — eight distinct phrasings ("came up empty against", "slipped past X's outer line", "X's perimeter gave way to", "shut the door on", "turned X away", "found a way through", "hit X's defenses and bounced", "got through X's defenses") across 50 rows, and nine distinct forum templates inside the visible 30. At day 16 the 50-row feed and 30-row forum still spanned days 7.5–16 and the 30-row inbox spanned days 10.75–16, matching the telemetry window rather than contradicting it, so the surfaces read as a scene rather than a firehose. Rival attention stayed ambiguous: two tells appeared ("an unfamiliar login touched NIGHTSHADE — not yours, not any relay you recognise", "a contact stopped replying immediately after hinting that somebody had questions") and neither names a probe author, a correctness verdict or a subject, under the standing line "Each line is a thing you noticed, not a verdict." The old hardcoded `CobaltXZ` forum copy is gone from real renders — the handle appears exactly twice, as the player's own OS header and its public rank listing. Terminal and GUI proved to be views of one system: `contract accept contract:11` and the ACCEPT button both mutate the same contract, and `SURVEY` in the Recon window and `survey nightshade` in the shell cost the same 12 world minutes. Reloading the tab restored DAY 16 // 00:45 with **zero** differing social lines against the pre-reload render; only the 18 ephemeral terminal echo lines disappeared, which confirms P6A's variant keys derive from persisted ids. Two honest limits belong here: the alpha slice boots one fixed seed and has no new-run control, so run-to-run variety comes from player policy divergence rather than seed selection; and with three windows open the desktop overlaps them, so a covered panel must be clicked to raise it before its buttons are reachable.

**Two defects surfaced by running the gates for real, both fixed on this branch.** `contention.test.ts` still asserted the pre-P5 five-entry model listing count while P5 shipped seven, and it fails on `main` — an escape that survived P5 only because no gate ever executed there. Separately, the vitest budgets were sized for hosted runners: the default five-second per-test ceiling and the report test's 120-second allowance both timed out on ordinary hardware with no behavioural failure, so the budgets now allow 60 seconds by default and 600 seconds for the 254-second report. No assertion, seed, policy or horizon changed in either commit.

**Merge gate.** GitHub Actions did not execute on this head. The two newest P6 commits are `[skip ci]`, so no run exists for `bbf75fd618aae41b78ef8e2f56e87acaaed68316`; the last Actions attempt in the P6 chain (run `37397578785`, job `112057110909`, head `41b6bab`) completed in 4 s with `steps: []`, `runner_id: 0`, empty `runner_name`/`runner_group_name` and no retrievable log — the repo-wide runner outage since `2026-10-05T23:04Z` that also reddens `main` (`37388207610`). `AGENTS.md` makes web tests, typecheck, lint and the production web build the authoritative per-feature gates and is silent on where they execute; those gates therefore ran locally on a clean tree at `bbf75fd618aae41b78ef8e2f56e87acaaed68316` (Node v24.20.0 / npm 11.19.0): `npm test` passed 71 files / 748 tests, `npm run typecheck` clean, `npm run lint` clean (one pre-existing `postcss.config.mjs` warning), `npm run build` exported `out/`, plus the browser persistence/reload pass recorded above. This bypasses the **host**, not the **checks**: no gate was skipped and no unexecuted code was blessed. Two local deviations are recorded rather than hidden: gates ran against the lockfile-matched `node_modules` (0 absent / 0 mismatched of 385 required packages) instead of a network `npm ci`, and `next build`/`next dev` reformat `tsconfig.json` as a side effect, which was reverted so the shipped tree is unchanged. The exact head is an ancestor of the merge commit, so the checked tree is the shipped tree; the only commit above it is this documentation-only change, and the report was regenerated identically at the final head.

Accepted 2026-10-06 as the Phase 8 P6 social-breadth and Content Alpha calibration contract, and as the closure of #26. Phase 9 — Web Beta/Polish is now unblocked.


## D051 — The computer is a visual operating environment, and distros are presentation-only

Phase 9 treats the simulated computer as an inhabited operating environment rather than a terminal aesthetic stretched across every screen.

**Recognition before reading** is the default information-design direction. When the underlying world contains topology, relationships, evidence confidence, deadlines, value movement or causal history, the UI should use meaningful visual structure — icons, spatial layout, graph/timeline relationships, shape, hierarchy and restrained motion — before adding more explanatory text. Text remains available for precision.

Visuals obey the epistemic boundary. Confirmed, observed, inferred, rumored, stale and unknown information must remain distinguishable, and presentation may never expose hidden authoritative truth. Important meaning cannot rely on color alone.

The terminal remains an important app but is not the design template for Market, Recon, Underground, Forge, History or the OS shell. Terminal output may itself be visually structured.

Phase 9 standardizes the UI foundation on Tailwind + shadcn/ui, adds Motion for React state/layout transitions, and uses native CSS/Tailwind for simple micro-interactions. GSAP and React Spring are not baseline dependencies.

The OS presentation is layered as **core -> distro -> theme -> accessibility/user overrides**. Initial distro identities are:
- **Ghost/OS** — restrained dark default,
- **Lattice** — dense technical/productivity,
- **Velvet** — elegant dark,
- **Daybreak** — bright editorial,
- **Petal** — cute, colorful and playful, with light/dark variants allowed.

Distros may change palette, typography, density, radii, elevation, chrome, launcher/panel treatment, icons, wallpaper, motion character and system sounds. They never change simulation rules, rank, capability, target access, evidence truth, RNG or economy outcomes.

Distro/theme/accessibility selection is presentation settings outside authoritative `WorldState`, even when exposed through an in-fiction install/setup flow.

Accepted 2026-10-06. Canonical detail: `docs/INTERFACE_AND_DISTROS.md`. Phase 9 execution: #27.


## D052 — Phase 9 UI semantics are tokens + owned primitives; Motion is presentation-only

P0 implements D051 without redesigning every app at once.

The existing hard-coded palette is now routed through semantic presentation tokens with compatibility aliases, so later distro profiles can override the shell without forcing a simultaneous rewrite of every legacy selector. Normal OS/application typography uses a readable system sans stack; Terminal and boot identity explicitly retain monospace.

The first owned shared primitives are a CVA-backed `Button` and `TruthMark`. The truth vocabulary is closed to `confirmed | observed | inferred | rumored | stale | unknown`; every level has text plus a glyph and may add shape/border treatment, so color is never its only carrier. These are presentation labels over player-safe projection facts, not new authoritative gameplay flags.

Recon is the proof surface: its unresolved lead is UNKNOWN/UNVERIFIED, while assistant analysis is INFERRED and still shows its separate confidence. This changes no evidence truth and exposes no hidden actor/probe state.

Window enter/exit uses `motion@14.0.0` through `motion/react` with an 180 ms opacity/vertical transition. `useReducedMotion()` selects a zero-duration stationary path; an unavailable/unknown preference fails conservatively toward reduced motion. CSS micro-interactions also honor `prefers-reduced-motion`.

No animation duration owns world time, and no P0 code changes simulation commands, saves, projections, RNG, rank, economy, or target access.

Local verification at code head `f16dd17fecb42d1bfb832431ea4021264a2cc762`: 752 tests across 73 files, typecheck clean, lint clean except the pre-existing `postcss.config.mjs` warning, and production build clean. Hosted GitHub Actions were intentionally not used.

Accepted 2026-10-06 as Phase 9 P0 / #57. P1 / #58 owns distro/theme architecture.


## D053 — A distro change is an OS lifecycle, not an instant theme toggle

Phase 9 P1 treats a distro as an installed operating environment.

Ghost/OS begins installed. Other distros must complete an in-world installer sequence before they can become active. The installer exposes staged package verification, unpack/configuration, identity application, finalization and reboot/handover progress. Once installed, a distro remains in the presentation inventory and later switches use a shorter boot/handover sequence rather than reinstalling it.

All installer and reboot duration is presentation time only. It never advances `WorldState.worldMinute`, ecosystem ticks, contract deadlines, physical pressure or any deterministic simulation outcome. Installation ownership, active distro/theme and UI-sound preference persist in the presentation settings store outside run saves.

Each distro also owns a small sound identity for install, stage, completion and boot cues. P1 uses restrained procedural Web Audio tones so identities are distinct without requiring external audio assets; P7 may replace or enrich them with authored sound design. Audio is optional, mutable/muteable, and never the only carrier of information.

Reduced-motion preference preserves the textual installation stages while shortening the decorative duration. Presentation storage or audio failure is non-fatal and must not interrupt gameplay.

Accepted 2026-10-06 as a refinement of D051/D052 and a required exit condition for Phase 9 P1 / #58.

## D054 — Every ecosystem boundary runs; long waits are refused, not truncated (Game-First G1, #77)

D017's 28-tick catch-up cap is removed. Advancing time now simulates every 360-minute ecosystem boundary between the last processed tick and the target minute, in order. Truncation discarded NPC actions, contract expiries, probes and investigation reviews. In the authored slice a single 14-day wait produced 346 simulation events and a different world state from fourteen 1-day waits, which produced 773.

The invariant is now exact: splitting a wait at any points produces an identical world snapshot and the same simulation events in the same order. The one difference is the `WorldTimeAdvanced` marker, which records how the player split the wait and is excluded from the comparison. Snapshot reload continues identically to an uninterrupted run.

Per-command cost grows with the horizon. Measured synchronously on the authored slice: about 80 ms for 90 days, 0.3 s for a year, and 8 s for a decade (roughly 196k events). ~~`CommandBus` therefore rejects any single `advanceTime` longer than `MAX_ADVANCE_MINUTES` (90 days) with `ADVANCE_TOO_LONG`, and changes nothing. Players chain waits. Explicit refusal is allowed; silent truncation is not.~~ Superseded by D055: longer waits are queued and drained, never refused.

~~Not yet delivered from #77: a resumable chunked advance that yields to the UI and persists a checkpoint, the shared priority-queue scheduler (jobs, reservations, cancellation), sleep until a wake trigger, and fast-forward. Until those land, the 90-day refusal is the bound on single-command UI work.~~ Delivered by D055.

Accepted 2026-10-08 as the G1 correction. It supersedes the truncation rule stated in D017.

## D055 — Time-owning jobs share one scheduler; long waits queue and drain (Game-First G1, #77)

D054 made every boundary run in order, but it bounded the player at 90 days per command and had no sleep or fast-forward. This decision replaces the `ADVANCE_TOO_LONG` refusal with queued jobs on a single authoritative clock.

- **One queue.** Time-owning jobs live in `WorldState.jobQueue`, ordered `(dueWorldMinute, phasePriority, sequence)`. Phase priority is `wait` 0, `sleep` 1, `fast-forward` 2. Sequence is assigned at enqueue and never reused, so equal-minute order is stable across replay and reload.
- **Capacity and dependencies.** The `clock` resource admits one running job. A job is runnable only when its dependencies have left the queue. Cancelling a job cancels everything that depends on it.
- **Synchronous bound unchanged.** A wait up to 90 days still completes inside its command, exactly as D054 defined. A longer wait becomes a `wait` job. Each command simulates at most 360 boundaries itself; ~~`pumpTime` drains the rest in chunks of at most 28 boundaries~~ (pumps are measured in minutes, D056).
- **Three kinds.** `wait` is non-interruptible and cannot be halted. `sleep` stops on `interrupt` events. `fast-forward` stops on `interrupt` and `notice` events. Each event is classified from its public fields only.
- ~~**Stops land on boundaries.** Interruptible jobs advance one boundary per window and check for a stop on each. A stop therefore lands on the same minute however the work is batched, which keeps D054's equivalence invariant.~~ Superseded by D056: stoppable jobs are judged minute by minute, which keeps the same invariant and removes the boundary rounding.
- **Clock ownership.** While a job holds the clock, only `pumpTime` and `cancelAdvance` run. Anything else is refused with `TIME_JOB_ACTIVE`.
- **Ending precedence.** A run ending freezes the tail of the job at its minute and cancels the job silently. The ending is the record. Ending outranks interruption, which outranks completion.
- ~~**Pacing is presentation.** The runtime clock plays a running job at `CLOCK_SPEED_BOUNDARIES_PER_SECOND` (paused 0, live 0.5, x4 2, sprint 8, all tunable). Pause holds the job without cancelling it. The driver issues `pumpTime` through the same session as the terminal and never decides an outcome.~~ Superseded by D056: pacing is in game minutes per real second, and the driver still never decides an outcome.
- **Terminal and GUI parity.** `sleep <minutes>`, `ff <minutes>` (or `fastforward`) and `halt` (or `wake`) produce the same commands as the HUD controls. Halt sends `cancelAdvance`.
- **Player-safe notices.** Interruptions say that something needs attention and where the clock stopped. They never name the hidden actor, probe or trace behind them.
- **Rank independence.** No time job reads player rank. A test runs the same fast-forward at rank 1 and rank 999,999 and requires identical events and ecosystem state.
- **Save.** `jobQueue` is part of the world-state schema with an empty default, so pre-G1 saves load with no job.

Events: `TimeJobStarted`, `TimeJobProgressed`, `TimeJobCompleted`, `TimeJobInterrupted`, `TimeJobCancelled`.

Open or provisional:
- ~~Builds, upkeep, investigations and retirement still use their own due-minute logic, advanced by boundary hooks. They are not yet queued jobs.~~ Superseded by D057 for builds and upkeep; investigations and retirement stay derived, as D057 records.
- ~~A sleep or fast-forward of 90 days or less completes inside one command unless stopped, so its live pacing is not visible. Whether short rests should be paced on screen is a playtest question.~~ Superseded by D056: sleep and fast-forward are always paced.
- The speed rates, the pump bound and the notice classes are provisional tuning (rates and bound replaced by D056).
- Concurrency and dependencies are proven in the pure queue. The game currently holds at most one time job.

Accepted 2026-10-08 as the G1 scheduler slice, pending human playtest. It supersedes the `ADVANCE_TOO_LONG` refusal in D054.

## D056 — Live time plays with no job; paced rests stop minute by minute (Game-First G1, #77)

D055 gave the clock one queue, but idle time still moved only when a command asked. Short rests resolved inside their command, and a stop landed on an ecosystem boundary. This decision makes the clock play on its own, paces every rest, and judges every stop at the minute it happens. It supersedes the struck bullets in D055 and the synchronous short-rest rule.

- **LIVE is the default.** With no job holding the clock, the runtime clock issues `advanceLive` steps of one game minute. A step runs every ecosystem boundary it crosses, in order, and is refused above one boundary (360 minutes). At 1x one game minute takes 1.5 real seconds (`2/3` minute per second, a provisional design candidate). Pause holds the world exactly.
- **Hidden tabs owe nothing.** A hidden tab holds the world and carries no time. When it returns, time resumes at the current pace. Nothing is replayed.
- **Rests are paced.** `sleep` and `fast-forward` run nothing in their command. They queue a job, and the clock plays it at a base of 30 (sleep) or 120 (fast-forward) game minutes per real second at 1x, multiplied by pause 0, 1x, 4x or 16x. `wait` keeps its synchronous first slice of up to 90 days (D054) and is never paced on screen, because nothing can stop it.
- **Pumps are in minutes.** `pumpTime { minutes }` advances the job by at most `MAX_PUMP_MINUTES` (28 boundaries, 10,080 minutes). A pump never crosses the job's due minute.
- **Stops are judged per minute.** A stoppable job (sleep, fast-forward) is simulated one minute at a time and its stop classes are checked after each minute. A stop lands on the minute of the event that caused it. Judging whole boundaries would make the stop depend on where a pump happened to end, and would hold unjudged events between commands. Because each minute is judged alone, the same job stops on the same minute for every pump size. A wait is never judged.
- **Chronological events.** `advanceWorldTime` returns its events stable-sorted by world minute, with subsystem order as the tie-break. One long wait and the same span split into live steps therefore return the same simulation events in the same order. Only `WorldTimeAdvanced` markers differ, because they record how the player split the time.
- **Catch-up is forfeited.** The driver may replay at most 2 seconds of playback per frame (`CLOCK_CATCHUP_MS`) at the current pace and speed. A longer stall forfeits the excess. Time owed to one job or to live time is cleared whenever the job changes or ends, so a halted sleep cannot hand its unspent minutes to live time.
- **Ending precedence.** An ending freezes a job at its own minute and cancels it silently. Ending outranks interruption when both fall in the same minute. Endings resolve on ecosystem boundaries, as D054 defined, so the ending test uses a boundary minute.
- **Save and reload mid-job.** The job lives in `jobQueue` and the pump is an ordinary command, so a save taken mid-sleep resumes to the same world as an uninterrupted run. Tests cover a paced sleep and a live step.
- **Presentation.** The HUD shows the time, the mode, job progress, speed controls, Halt and one player-safe notice. Halt sends `cancelAdvance`, the same command the terminal's `halt` sends. Speed buttons set the driver's multiplier and never touch world state.

Still open, and the reason G1 is not complete:
- **Builds, upkeep, investigations, deadlines and retirement are not queued jobs.** They already run at their exact due minutes inside every window, and the integration tests show a build completing at its due minute under live steps. But they have no queue entries, cancellation, or shared capacity. Moving them into `jobQueue` is a large change, and it must keep the P3 tie rules (outage before build, lapse before tick) and the D054 equivalence. It is the largest remaining G1 item. Builds, upkeep and outage releases are queued jobs as of D057; investigations, contract expiry and retirement stay derived, as D057 records.
- **Per-step cost is unmeasured.** Each pump and each live step is a command, so each one persists the world. A sleep writes about four times a second. The event log also gains one `TimeJobProgressed` per pump, so a long sleep grows the log roughly linearly.
- **Pacing constants are provisional.** The 2/3 minute-per-second live rate, the 30 and 120 rest rates and the 2-second catch-up are tuning values for a human playtest.
- **Stop timing.** A stop lands on the minute of its event, so no event is passed over. The driver shows the notice on its next frame, within 250 ms of real time.

Verification: the full Vitest suite passes (971 tests, 109 files). Typecheck is clean, and `eslint .` reports no errors. The production build succeeds. A browser smoke ran against the static export, and its results are recorded in the G1 status note.

Accepted 2026-10-08 as the G1 live-clock slice, pending human playtest. It supersedes the synchronous-sleep rule and the boundary-judged stops in D055.

## D057 — The world's own deadlines are scheduled system jobs; the ecosystem tick is their cadence (Game-First G1, #77)

D056 left builds, upkeep and outage releases on their own due-minute logic. A build's completion was a lazy settlement that happened when the clock next reached a tick. This decision moves those three deadlines into the same queue as the player's time jobs, and records which subsystems stay on the tick and why.

- **Three system jobs, one ordering.** A system job holds the `rig` or `system` resource, neither of which has capacity, and sorts by the queue's `(dueWorldMinute, phasePriority, sequence)` order. Phase priorities are upkeep 0, outage release 1 and build 3. A build is a `build` job whose id and subject are the build id. The daily charge is one recurring `upkeep` job, due at the next day boundary and moved one day later each time it fires. An outage releases through `release:<threatId>`, due at its `endsWorldMinute`.
- **Release is exact.** An outage returns its paused builds at its own minute, not at the next tick that happens to follow. The paused span is added to the build's frozen due minute, so a build completes at `dueWorldMinute` plus its paused minutes, whether or not a tick fell inside the outage. For the current 360-minute outage on the 360-minute tick the minute is the same as the lazy settlement. The rule matters for any future duration.
- **Ticks stay the cadence.** Around each ecosystem tick T, the command bus runs every system job due before T, then the upkeep and release jobs due at T, then investigations, then the tick body (unchanged, and it breaks on an ending), then the builds due at T. A build due at T completes after that tick's outage check, so an outage at the exact due minute still wins (D034). The window after the last tick dispatches its deadlines at their own minutes, so where a window ends does not change the world.
- **Pauses and aborts leave the queue.** An outage that pauses a build cancels its build job, and aborting a build cancels it too. The queue holds a build job only while the build is running and unpaused.
- **An ending freezes the queue.** The tick loop breaks on an ending before the build phase, so a build due on the ending minute does not complete. Nothing dispatches after the run ends.
- **Capacity is contention, not admission.** `rig` and `system` are unlimited. Two builds run side by side and tax the same VRAM and storage pool (AI_SYSTEMS, compute contention), so a second build costs a slower model and slower builds, never a queue position. `clock` stays at capacity 1. The queue's dependency support is tested in the pure queue, but no system job uses it yet.
- **Derived, not jobs.** Three subsystems keep their existing mechanics on purpose. Investigation progress advances in step with the ecosystem ticks and at the end of each window, as derived case material (D032), not on a deadline of its own. Contract expiry is an ecosystem action resolved on the tick (D054). Retirement cooling is a stored minute compared on read (D039), so it needs no firing event. Moving any of them into the queue would change when it resolves, not only how it is scheduled. They become jobs when a deadline needs a non-tick minute.
- **Legacy saves re-derive the schedule.** `reconcileSchedule` runs in the command bus constructor and is idempotent. It derives the upkeep job, a build job for each running build at its settled due minute, and a release job for each outage that still owes one, so a pre-D057 save reaches the same schedule as a new one. The world-state schema validates the new job kinds, resources and `subjectId`.
- **Event order is unchanged.** Events are collected per subsystem (upkeep, builds, investigations, underground) and stable-sorted by minute, with that order as the tie-break, as D056 defines.

Invariants, tested in `world-schedule.test.ts` at every step of the cases it drives: each running build holds exactly one job at its settled due minute; a paused build holds none; each outage that still owes a release holds exactly one; the upkeep job is due at the next day boundary.

Still open, and not part of this decision:
- Investigations, contract expiry and retirement stay derived, as above.
- Save and event-log growth per pump and per live step is unmeasured. That is the next G1 slice.
- The Clock HUD overlaps the computer header on desktop. That is a separate presentation slice.
- The pacing constants and the human playtest remain provisional.

## D058 — The save path does work proportional to what changed (Game-First G1, #77)

Every successful command saved the run, and every save copied the entire in-memory event log before slicing off the events the adapter had not seen. The cost of a save therefore grew with the whole run, and the cost of a run grew with the square of its number of commands. This decision keeps saves and event reads proportional to what is new, without changing what is saved or what the simulation returns.

- **Event slices, not copies.** The runtime addresses events by absolute index, copies only the tail a reader asks for, and drops events that every reader has consumed. The save path sends the adapter only events it has not yet accepted. The clock names the count it had consumed before each read, so at most the batch it just read is held.
- **Saves coalesce.** At most one save is queued. A command that lands before the queued save takes its snapshot is covered by that save. A command that lands after it queues one more. No command is lost, and a burst costs one trailing save.
- **A failed save keeps its events.** The accepted count advances only on success, so the next save carries the unpersisted events again, as before.
- **Writes are measured, not throttled.** In Chromium on the production build, one save is an open (median 1.9 ms), a readwrite transaction through commit (median 2.2 ms, p95 7 ms), and a close. A rest writes about four times a second and live time about 0.8 times a second. Throttling saves would lose up to a second of play on reload, which a player would see as time running backwards, so every successful command still saves. Caching the connection would save about 2 ms per write and is not worth the lifecycle risk yet.
- **Unchanged by design.** `TimeJobProgressed` and `WorldTimeAdvanced` stay one per pump and one per live step. They record how the player split the time (D056), so thinning them would change the event contract. Flushing on hide or unload was considered and not added. A hidden tab issues no commands, and an unload cannot be awaited, so the flush would not change what survives.
- **Removed.** `GameRuntime.events()`, the full history, had one caller, the save path. The log no longer keeps history, so the method is gone.

Measured in Node on one seed, median of three runs, before and after this decision:

| Scenario | Command time before | After | Events held at end, before | After |
| --- | --- | --- | --- | --- |
| Live day, 1,440 one-minute steps | 3.6 s | 2.3 s | 1,491 | 5 |
| Sleep one day, 1-minute pumps | 5.0 s | 2.2 s | 2,932 | 6 |
| Sleep three days, 7-minute pumps (interrupted by a contract expiry) | 0.7 s | 0.6 s | 840 | 23 |

Both variants end with the same outcome and the same event totals, so the simulation is unchanged. The per-command floor of about 1.5 ms is the projection sync and the snapshot clone, which this decision leaves alone.

Browser smoke, production build, Chromium: a sleep of 1,440 minutes at 1x advanced 30 game minutes per second and wrote four times a second. Reloading mid-sleep resumed the same rest, with no console errors.

Tests: `game-session-saves.test.ts` covers a burst during an in-flight save (one trailing save), exactly-once in-order delivery to the adapter while readers release events, and the bounded hold without persistence. The release without index shift is covered in `game-session-saves.test.ts` (its `runtime` describe), not in `game-runtime.test.ts`. The existing failed-save retry test still holds.

## D059 — The clock strip is part of the page flow, not an overlay (Game-First G1, #77)

The clock HUD was a fixed overlay: centred at the top on desktop, and docked to the bottom below 640 px. On desktop it sat over the computer's header bar. On a phone it covered the room's relocate, move and workstation controls, so "use workstation" could not be tapped. Placement is presentation, so the clock's behaviour and commands do not change; this decision only moves the strip.

- **A strip above the surface.** The HUD is the first row of the shell, in the page flow. The surface is a wrapper that takes the remaining height, so no header or control sits under the clock on any width.
- **It wraps inside its width.** The status and the controls each wrap within themselves, and each time or mode label stays on one line. A long mode label on a phone never runs past the edge, where centring would clip it.
- **The notice is its own row.** This is the one height change: the surface moves down about 34 px while a notice is shown. A notice marks a stop the player must read, and it is dismissable. A reserved row would hold that height in every state.

Verified in the production build in Chromium at 1280×800 and 390×844. In each state (room, computer, rest, halt with a notice) the strip starts at the top and the surface begins directly below it. The room's workstation control is hit-testable, and neither width scrolls horizontally.

Not addressed here, and addressed by D060: the computer's header bar is wider than a 390 px screen, so its DIRECTIVES and ROOM controls were clipped. That layout predates this decision.

## D060 — The computer header wraps in DOM order and gives phone controls touch-sized targets (Game-First G1, #77)

The computer's header is brand, stats, NEW RUN, GLOSSARY, DIRECTIVES and ROOM in one row. It was a non-wrapping flex row inside a fixed 42 px grid row, and the desktop surface clips overflow. At 390 px, DIRECTIVES and ROOM sat wholly off the screen (left edges at 402 and 477 px on a 390 px viewport), GLOSSARY was cut at its right edge, and the stats wrapped out of the bar. Nothing scrolled, so a phone player could not reach those controls. The fault predates D059 and is independent of it.

- **The bar wraps, and its height follows its content.** The header row is `auto` with `min-height: var(--os-bar-height)`, so every distro and density keeps its height whenever the controls fit on one line. The bar wraps in DOM order.
- **The guidance buttons and ROOM are one group.** They sit in an `os-actions` wrapper, so they wrap together and ROOM stays last. DOM order, visual order and focus order are the same, and a markup test in `computer-desktop-a11y.test.ts` asserts it.
- **Narrow screens get touch-sized targets.** At 640 px and below, the help buttons and ROOM are 44 px tall, the actions group takes its own full row, and the stats wrap inside their row.
- **Desktop and tablet do not change.** At 1280 px and 768 px every control has the same measured position as before the change. Text is `nowrap` only inside each stat, so "0 cr" and "DAY 1 // 01:09" no longer split.

Rejected alternatives:
- Horizontal scrolling inside the bar. Controls off the edge are hard to find and hard to tap, and the bar is `overflow: hidden`.
- A collapsed menu. It adds a new navigation model and hides actions the player should see. That needs its own decision.
- Moving ROOM onto the brand row. That breaks the DOM and focus order.
- A fixed mobile breakpoint. The one-row header fits only between about 641 and 900 px, depending on the handle and the credit and day text, so the wrap has to follow content, not a width.

Verified in the production build in Chromium (`check-header.mjs` and `check-header-touch.mjs`, scratch scripts outside the repo; results in `docs/G1_ACCEPTANCE.md`):
- 390×844 and 360×740: all four controls on one 44 px row, each in view and hit-testable, no horizontal scroll. Tap on DIRECTIVES, GLOSSARY and ROOM each does its job.
- 320×640: ROOM takes its own right-aligned row, and nothing is clipped.
- 641–900 px: the actions group wraps as a unit and stays flush right.
- Keyboard: Tab visits the four controls in DOM order, and each shows a 2 px focus ring.
- Distro heights hold on desktop: lattice 38 px, velvet 44 px, comfortable 48 px.

Not changed: the clock HUD's own buttons (Pause, 1×, 4×, 16×, Halt) keep their size. Their touch size is recorded as a human playtest gate, not treated as a PASS.

## D061 — Derived timing stays derived; the queue holds only per-job deadlines (Game-First G1, #77)

D057 made builds, upkeep and outage releases scheduled jobs. Before G1 closes, each remaining time-owning candidate was checked against gameplay. The question was whether it needs its own queue entry, or whether a derived or stored minute already gives the same truth.

- **Compute is a commissioning read, not a job.** A build's minutes are computed once, when it is commissioned, from the rig and the model's delivered factor, and then frozen (`command-bus.ts` `startBuild`, and the header of `systems/builds.ts`). A compute job would charge the same minutes a second time, or invent a per-minute rate that the design does not have.
- **Investigations advance on the ecosystem cadence, not on jobs.** Investigation progress moves at each tick and at each window end (D032; `command-bus.ts` `advanceInvestigations` at both call sites). A job would give a second owner to "how far has this investigation got" and could reorder it against NPC turns.
- **Contract expiry is a tick action.** `expireContracts` runs inside the tick body (D054), so expiry shares the NPC chronology. An expiry that stops a rest is already a dispatched interruption (`TimeJobInterrupted`, cause `ContractExpired`). A queue entry would move it out of that order.
- **Retirement cooling is a stored minute, compared on read.** `coolingUntilWorldMinute` is stored when the plan starts and compared with the world minute when read (`systems/retirement.ts`, D039). It needs no entry. A change to `RETIREMENT_COOLING_MINUTES` applies to plans started after the change, and a plan already cooling keeps the minute it stored.
- **`dependsOn` is unused by any system job.** The queue implements it, and `job-queue.test.ts` tests it, but no system job declares a dependency, and no gameplay rule needs one yet. The field stays, with its tests. Dependencies are not added to create queue entries.
- **`rig` is contention, not admission.** The rig resource is unlimited, and a second build slows the model rather than waiting in a queue (D057). Any future admission rule needs its own decision, because it changes gameplay.

**Decision:** no gameplay change in G1. The four derived items above stay derived. A new time-owning thing becomes a system job only when its deadline cannot be derived from a tick or a stored minute. When it does, it takes the phase rule of D057 and the invariant test of `world-schedule.test.ts`.

## D064 — The player names the run; the world refuses a name it already holds (Game-First G2, #78)

Until G2 every run opened as `CobaltXZ`. The handle is the one identity the player owns, and `GAME_FIRST_REBOOT.md` §4 asks for a chosen, unique, in-run handle that persists through run and History. The rules live in `src/game/identity/player-handle.ts`. They are pure and carry no mechanical weight: rank is never an input, and no handle grants a bonus or a gate (AGENTS.md).

**Shape.** Once trimmed, a handle is 3–16 characters: ASCII letters and digits, with at most one `-` or `_` between parts. It is ASCII only, so a look-alike spelled with another alphabet (a Cyrillic capital A in NIGHTSHADE) cannot pass for an authored name. The shape rule is also the save-data invariant: `storedWorldStateSchema` accepts a stored handle only when it satisfies the same check, applied to the exact string, with no trimming.

**Roster.** A new run may not take the name of an authored actor or target, ignoring case. The entry screen refuses it, and `createSliceWorldState` checks it again and throws a `RangeError`. The roster is an entry rule only. The save schema never reads it, so a content change cannot make an existing save unreadable.

**Entry.** The three screens that start a run (no active run, the replacement prompt from an active or ended run, and the corrupt-save recovery) all show the same field. Their start action stays disabled until the handle is accepted. The standing rule is shown before the player types, and a refusal names the rule, never the name it collided with or any hidden cause. The accepted handle reaches `prepareFreshRunState` and then `createNewRunWorldState({ handle })`, so it is stored with the run and shown in the desktop header, the public rank listing, the ending and History.

**Not decided here.** Renaming is not offered. `GAME_FIRST_REBOOT.md` allows a name change only through an explicit future mechanic. Real-name and profanity policy is not enforced; the field tells the player what it accepts and nothing more. Procedural worlds (G2 scenarios) must pass their generated roster to the same roster check, and that work does not start until this identity flow is accepted.

**Alternatives rejected.** Free text with no rules would allow spaces, look-alikes and unbounded length in the header and History. Putting the roster rule in the save schema would strand saves whenever authored content changes.

**Residual.** `bootSimulation` still builds a default-handle state before restoring. Restoring a saved run discards that state. It is used only when a saved run was reported but no state could be loaded, a case the lifecycle code does not expect to reach. The browser check of this flow ran ad hoc against the production build: 20 assertions covering the refusal and acceptance states, start, reload persistence, the replacement path from inside a run, and a phone-width overflow check. It is not committed. It should move into the G1 smoke harness once #93 merges.
