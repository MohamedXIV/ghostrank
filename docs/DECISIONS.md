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
