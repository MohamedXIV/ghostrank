# Roadmap

This is a full-project roadmap, not a disposable prototype plan. Early milestones establish production architecture that later systems will keep.

**Gameplay completion is NOT achieved.** Phase 9 / #27 verified a technically capable Chromium Web Beta within its original scope, but first-hand evaluation on 2026-10-08 identified missing interactive gameplay, world clock/queue issues, hardcoded identity/world roster, procedural variety, roguelike structure and game-first UX. See **Game-First Completion Initiative #75**, `docs/GAME_FIRST_REBOOT.md` and issues #76–#84. Do not describe the complete *game* as feature-complete until #84 passes.

## Current platform policy — Web first

Ghostrank will be completed as a **web game first**. Browser execution is the primary runtime for all remaining gameplay phases.

- #18 — Web-first runtime, durable browser persistence, and authoritative web gameplay CI — is complete.
- Tauri 2 and the existing SQLite adapter remain in the repository, but they are not required for normal gameplay development or per-feature acceptance.
- #19 — Tauri desktop host, SQLite hardening, installer/packaging/distribution work — is explicitly deferred until the web game is feature-complete and stable.
- Gameplay architecture must stay host-agnostic so the later desktop host reuses the same simulation, UI, content, and validated save contract.

Historical Phase 0–2 Tauri CI results remain valid evidence for the work completed at that time; they are not an ongoing requirement for Phases 3–9.

## Phase 0 — Foundation

**Status: complete (2026-10-02).**

Goal: make the repository safe to build on.

Delivered:
- canonical documentation,
- Next.js static-export application shell,
- Tauri 2 desktop shell and launch smoke,
- TypeScript strict configuration,
- Tailwind + shadcn/ui foundation,
- locked npm/Cargo dependency graphs,
- test runner and CI,
- simulation package boundaries,
- command/event contracts,
- SQLite migration system and schema metadata,
- seeded RNG service,
- basic save/run metadata,
- TinyBase player-visible projection boundary,
- Zustand ephemeral UI boundary,
- Phaser-to-command-bus physical intent boundary.

Exit criteria:
- desktop app launch is exercised headlessly in CI,
- tests/typecheck/lint/static build run in CI,
- Tauri builds from locked dependencies,
- architecture boundaries are represented in code and tests,
- no throwaway second architecture is expected.

## Phase 1 — Computer + Room Vertical Slice

**Status: complete (2026-10-02).**

Goal: prove the core feeling using production architecture.

Delivered:
- GHOST/OS simulated desktop/window shell,
- fictional Terminal parser and interactive terminal app,
- Recon GUI as the first information tool,
- Terminal and GUI parity through the exact same typed simulation command,
- visible world clock and player rank,
- Phaser 4 top-down/isometric room,
- simple anonymous hooded avatar,
- desk/workstation interaction and room/computer transition,
- ambiguous physical window/light cue,
- TinyBase player-visible projection wired directly into React,
- Tauri SQLite active-run autosave/load,
- resumable Zod-validated world snapshots,
- atomic snapshot/event persistence,
- failed-save event retry,
- deterministic restart acceptance test.

Exit criteria:
- the player is visibly located in a compact room around the workstation,
- the computer presents one coherent simulated machine,
- Terminal/GUI parity is enforced by tests rather than mocked,
- world time and target knowledge survive a session restart,
- static Next export and Tauri desktop build/launch remain green.

## Phase 2 — Operation Simulation

**Status: complete (2026-10-02).**

Delivered:
- typed target -> machine -> fictional-service truth graph,
- explicit evidence/knowledge model separate from hidden world truth,
- evidence-gated TinyBase projection,
- fictional reconnaissance chain through observe / survey / inspect capabilities,
- Terminal/GUI parity through shared typed simulation commands,
- deterministic world-time costs and explicit failure causes,
- resumable operation sessions,
- explicit recon -> intrusive escalation and voluntary disengagement,
- deterministic causal trace/signature records,
- self-observed footprint summary,
- first deterministic opponent reaction loop,
- exact trace provenance for triggered reactions,
- restart persistence for evidence, operation state, traces, and reactions,
- compatibility normalization for older Phase 1 snapshots.

Exit criteria:
- there is no generic Hack button,
- rank never gates operation access or opponent reaction behavior,
- a complete operation path composes multiple typed capabilities,
- escalation and disengagement materially alter persisted risk,
- traces produce deterministic, explainable consequences,
- failure and reaction causes are reconstructable from stored state/events,
- Terminal and GUI remain alternate interfaces over the same simulation,
- static Next export and Tauri desktop build/launch remain green.

## Platform Gate Before Phase 3 — Web-first Runtime Transition

**Status: complete (2026-10-03). Tracked by #18.**

Delivered:
- native IndexedDB persistence adapter behind the existing `RunPersistence` boundary,
- portable versioned Zod-validated active-run save envelope,
- browser/session recreation restores the complete Phase 2 authoritative state,
- corrupt/invalid durable payloads fail validation instead of fabricating state,
- browser persistence selected automatically outside Tauri,
- normal gameplay CI reduced to tests, typecheck, lint, and production web build,
- Tauri/Rust build and desktop launch removed from normal per-feature gates,
- existing Tauri/SQLite implementation retained unchanged for the deferred desktop phase.

Exit criteria:
- the complete Phase 2 flow survives browser-style persistence reload with authoritative state intact,
- simulation/gameplay code remains independent of IndexedDB, Tauri, and SQLite,
- normal gameplay work ships through web-only CI,
- Phase 3 may proceed without any desktop-host dependency.

## Phase 3 — Underground Ecosystem

**Status: complete. Tracked by #21.**

P0 substrate delivered (see `docs/superpowers/plans/2026-10-03-phase-3-underground-substrate.md`):
- ecosystem actors with public handles and rank,
- White/Black starting networks seeding initial trust,
- directed relationships (trust / fear / grudge),
- deterministic NPC-to-NPC activity that runs inside world-time advancement with no player involvement,
- an observed defensive reaction turning into a provenance-backed grudge,
- evidence-safe projection and a read-only Underground index app.

P1 delivered (see `docs/superpowers/plans/2026-10-03-phase-3-rumors-messages.md`):
- private NPC incidents leak as imperfect, sometimes distorted rumors through trusted contacts into a player inbox,
- the `readMessage` command shared by Terminal (`read <id>`) and GUI,
- the player's observed footprint spreading through the target owner's network and shifting peer trust with rumor provenance.

P2 delivered (see `docs/superpowers/plans/2026-10-03-phase-3-contracts.md`):
- trusted contacts offer time-limited contracts (recon report, intrusion) against real targets, never their own, at most three open at once,
- `acceptContract` / `declineContract` / `deliverContract` shared by Terminal (`contract <accept|decline|deliver> <id>`) and GUI, costing no world time,
- objectives verified from the evidence and traces the player already produces, never from a separate mission script,
- delivering raises issuer trust and improves player rank with provenance; missing an accepted contract costs issuer trust; ignored offers lapse without penalty; rank never gates acceptance.

P3 delivered (see `docs/superpowers/plans/2026-10-03-phase-3-retaliation.md`):
- escalating again against a target that is already watching hardens its owner's grudge (provocation, with trace provenance),
- rivals with a grudge retaliate on their own while the player waits: smears worsen the player's rank and spend grudge,
- unmasking is a rare, taboo escalation: it hurts the player, but the rest of the ecosystem turns on the unmasker and sides with the player,
- all deterministic, rank-independent, with citable provenance, and surfaced in a Heat section (no new commands; the world acts).

P4 delivered (see `docs/superpowers/plans/2026-10-04-phase-3-reputation-forums.md`):
- contextual reputation descriptors (Professional, Opportunist, Hunter, Predator) derived from contracts and traces, each shown with its context and basis,
- public forums, one board per network: commentary on public incidents, condemnation of unmasking, and a public vouch when the player delivers a contract,
- both are read surfaces; rank is never an input.

Deliverables:
- handles and ranking,
- relationships,
- White/Black starting networks,
- contracts,
- messages/forums,
- rumors,
- NPC-to-NPC activity,
- retaliation,
- unmasking taboo,
- contextual reputation descriptors.

Exit criteria:
- the world creates events without the player,
- rank changes social visibility but never target eligibility.

## Phase 4 — Economy and Hardware

**Status: complete (2026-10-04). Tracked by #22.**

All eight deliverables shipped (P0–P7 below). Two of the issue's exit-criterion phrases were recorded at closure as **Phase 5 handoffs** rather than retro-claimed: player *self-authoring* (trading + provenance shipped; building from a spec does not) and real *constraints/contention* (hardware so far is pure lift; vram/storage have no consumers yet). Both are pinned in the Phase 5 kickoff plan (`docs/superpowers/plans/2026-10-04-phase-5-plan.md`) so they cannot be lost.

P0 substrate delivered (see `docs/superpowers/plans/2026-10-04-phase-4-economy-substrate.md`):
- a credits wallet and an append-only value ledger with cause-and-counterparty provenance; credits can never go negative,
- contract delivery now pays out deterministically (recon `80 + 40 × requiredServices`, intrusion `260`), closing the payment Phase 3 deferred,
- a data-driven hardware catalog across five capability axes (compute / memory / vram / storage / network) and a free starter rig every run begins with,
- the `buyHardware` command shared by Terminal (`buy <catalog-id>`) and a new Market app, costing no world time,
- derived rig capability (the sum of owned hardware) projected read-only; capability is never stored and never gates a target or a purchase,
- persistence: `economy` is optional in the schema and loads as an empty wallet on legacy saves.

P1 delivered (see `docs/superpowers/plans/2026-10-04-phase-4-compute-budgeting.md`):
- rig capability now shortens the world time an operation action costs (survey reads network, inspect/escalate read compute; `max(1, ceil(base / capability))` above baseline), the money-vs-time trade made real,
- the starter rig sits exactly at baseline, so every default world keeps the Phase 2 base timings; hardware is strictly an accelerator and disengagement never scales,
- requirements and outcomes are untouched by hardware — no gates — and the Market app shows the rig's per-action minutes,
- duration derives at action time: no new state, events, or save-schema surface.

P2 delivered (see `docs/superpowers/plans/2026-10-04-phase-4-workload-scale.md`):
- the memory axis now sets workload breadth: one survey pass can discover several machines and one inspection pass several services (`max(1, floor(memory))` items, one pass-duration per pass),
- the starter rig sits at scope 1, so Phase 2's one-item-per-pass rhythm is untouched; scale saves passes and time, and every item stays discoverable on any rig — breadth, never a gate,
- Market surfaces RIG SCALE (items per pass) beside RIG SPEED, so both halves of the money↔time trade are legible before buying.

P3 delivered (see `docs/superpowers/plans/2026-10-04-phase-4-housing-costs.md`):
- credits gain their first recurring sink: a housing lease (`src/content/housing-catalog.ts`) adds capability to the rig while it is held, flowing into the same P1 speed and P2 breadth consumers through `effectiveCapability` (hardware + lease),
- signing, switching, or breaking a lease moves no credits; rent is levied only when a whole world-day boundary is crossed (`advanceUpkeep` charges fixed boundaries, so it is deterministic and split-invariant across chunked waits),
- an unpayable boundary moves the player out instead of charging: back to the free baseline, no debt, no penalty beyond losing the lift — housing is capability, never a gate or a punishment,
- new state is one nullable `housing` id on the economy (legacy saves load as the free baseline); new commands `rentHousing` (`rent <id>`) and `breakLease` (`lease break`) are shared by Terminal and the Market housing app, which shows listings, daily upkeep, and the lease lift inside RIG CAPABILITY.

P4 delivered (see `docs/superpowers/plans/2026-10-04-phase-4-software-market.md`):
- a second recurring sink: stackable **software licenses** (`src/content/software-catalog.ts`) that make the same rig more productive — capability tools fold new axes into `effectiveCapability`, an efficiency tool multiplies derived hardware minutes by a discount factor — without ever gating a target,
- a unified `advanceUpkeep` now bills the lease *and* every active license at each crossed world-day boundary (lease `upkeep`/landlord first, licenses `license`/vendor after), deterministic and split-invariant,
- each obligation is all-or-nothing: an unpayable license lapses just that one tool (no debt, no penalty, re-runnable) while the rest keep running — software is a lift, never a punishment,
- `use <id>` / `stop <id>` shared by Terminal and the Market SOFTWARE panel (RUN/STOP, combined daily upkeep in the wallet, lease + software lift annotated on RIG CAPABILITY); the only new state is a `software: string[]` id list that legacy saves default to empty.

P5 delivered (see `docs/superpowers/plans/2026-10-04-phase-4-tool-authorship.md`):
- **tool authorship/provenance** and **buying/selling player tools** — authored artifacts (`src/content/player-tool-catalog.ts`) each credited to a named author handle, reusing the exact P4 `SoftwareEffect` shape through shared combinators, so no new effect mechanics,
- tools are *property, not rent*: a one-time purchase debited to the author (ledger cause `tool`, counterparty = author — the value graph gains its first named edges) and a resale credited through a `fence` for `floor(paid × 0.5)`, so retuning prices never re-values a copy already owned — and with no upkeep, a held tool can never lapse or bill,
- the lift flows through the same single capability source: `effectiveCapability` becomes hardware + lease + licenses + owned tools, and a `combinedActionDurationFactor` composes license × tool shortcuts with the 0.1 floor applied once, feeding P1 speed and P2 breadth untouched,
- `buytool <tool-id>` / `selltool <instance-id>` shared by Terminal and the Market PLAYER TOOLS panel (owned copies show author, paid price, resale value and SELL; listings show `by <author> · X cr one-time` and BUY); owned-tool ids stay unique across buy/sell/rebuy cycles, and the only new state is `economy.playerTools`, legacy-defaulted to `[]`.

P6 delivered (see `docs/superpowers/plans/2026-10-04-phase-4-value-graph.md`):
- **digital-value graph** — the design's "transaction graphs, not anonymous money bars" made inspectable: `deriveValueGraph` folds the ledger by counterparty into nodes with received / paid / net, interaction counts, first/last world times, and the distinct cause kinds that touched each, with whole-network totals;
- purely derived: zero new state, events, commands, or save-schema surface — the graph is a read over the append-only ledger P0 seeded and P5 named, so there is nothing to migrate and nothing that can desync;
- honest player-centred scope: every node is the *player's* standing with a real counterparty — contract issuers and tool authors as `peer`s (keyed by their public handles), `market`/`landlord`/`vendor`/`fence` as `institution` roles; true multi-hop NPC↔NPC chains are deferred to the slice that adds simulated inter-actor credit flows, rather than fabricating edges the ledger never recorded;
- deterministic by construction (volume-desc then id-asc ordering, input-order independent) and summarised over the **full** lifetime ledger even though the ledger table view stays capped; surfaced in a Market VALUE GRAPH panel with in/out bars and `valueNodes` / wallet-total TinyBase rows.

P7 delivered (see `docs/superpowers/plans/2026-10-04-phase-4-machines.md`):
- **multiple machines** — complete named boxes (`src/content/machine-catalog.ts`) as a fifth asset class: the player can own several whole systems, rename each so the rack stays legible, and sell any box back through the same offline `fence`;
- property, not rent, following the P5 template exactly: a one-time `market` debit (new ledger cause `machine`), **no recurring fee**, and resale at `floor(paid × 0.5)` of the *stored* price so catalog retuning never re-values an owned box; instance ids stay unique across buy/sell/rebuy cycles (max-suffix, same fix class as `tool:N`);
- a machine's label is identity, never power: capability derives solely from the catalog id and folds into the single source — `effectiveCapability` is now components + machines + lease + licenses + tools — so P1 speed and P2 breadth consume the rack with no new mechanics, and an empty rack is exact identity (all 322 pre-P7 tests untouched);
- `box buy <catalog-id>` / `box sell <box-id>` / `box name <box-id> <label…>` shared by Terminal and the Market MACHINES panel (owned boxes show paid/sell price and an inline rename; listings show `X cr one-time · owned ×N`); rename validates ownership before label shape, trims, and caps at 24 chars; the only new state is `economy.ownedMachines`, legacy-defaulted to `[]`.

Deliverables:
- hardware catalog,
- compute budgeting,
- multiple machines,
- housing/location costs,
- software marketplace,
- tool authorship/provenance,
- digital-value graph,
- buying/selling player tools.

Exit criteria:
- money creates meaningful strategic choices,
- expensive equipment improves capability/scale without replacing skill.

## Phase 5 — AI Economy and Software Creation

**Status: complete (2026-10-04). Tracked by #23 (unblocked by #22).**

All eight deliverables shipped (P0–P4 below). All three exit criteria are checked facts, not vibes: a player can replace a premium workflow with a self-built one (P3's three specs mirror the three premium licenses one-for-one, delivered effect byte-identical on a clean build), AI helps but can be wrong (P2's capped accuracy, structural overconfidence, and hallucinations; P4's peers make the same kind of mistake), and generated software is safe virtual data (P3's IR is display-and-gate data pinned to a notation grammar, never executed). The two #22 handoffs stayed on-map and discharged in-phase: real constraints/contention by P1, player self-authoring by P3.

Slice map and grounding in the current repo: `docs/superpowers/plans/2026-10-04-phase-5-plan.md` — P0 model catalog/substrate, P1 compute contention (vram/storage become live; carries the *constraints* handoff from #22), P2 AI analysis, P3 software spec + workflow/IR build system (carries the *author* handoff from #22), P4 marketplace + NPC AI use. Proficiency is explicitly deferred until playtesting earns it.

P0 delivered (see `docs/superpowers/plans/2026-10-04-phase-5-models.md`):
- **AI substrate and model catalog** — fictional models (`src/content/model-catalog.ts`) as a new asset class: one *assistant slot* (`economy.activeModel`) over an owned-local inventory (`economy.ownedModels`), each contributing an action-duration factor through the existing `combineFactors` path — never capability, never a gate, and no model running is exact identity (all 354 pre-Phase-5 tests untouched);
- the two sources are deliberately opposite economics, each an established template: **cloud is rent** (running *is* renting, zero credits to start, `advanceUpkeep` bills the `provider` at each crossed world-day boundary, an unpayable boundary lapses the model — no debt, the license semantics verbatim) and **local is property** (a one-time `market` debit, new ledger cause `model`, then it runs free forever, and buying never auto-runs what you own);
- starting, switching, and stopping move no credits and cannot double-bill; `model buy <id>` / `model run <id>` / `model stop` (argument-free — the slot holds exactly one) are shared by Terminal and the Market AI MODELS panel, which shows each model's factor, its rent-or-property price shape, and owned/running state;
- model *properties* (reasoning/context/reliability, 1–5 bands) ship as seeded catalog data consumed by no one yet — stated plainly, reserved for P2 analysis and P3 builds; the hardware footprint waits for P1 contention, so both #22 handoffs stay on-map;
- the `provider` joins the value graph as a fifth institution role, and the wallet's combined daily upkeep now folds lease + licenses + a running cloud subscription.

P1 delivered (see `docs/superpowers/plans/2026-10-04-phase-5-contention.md`) — **the #22 constraints handoff, discharged**:
- **compute contention** makes the two dead axes live at last: `vram` and `storage`, summed by every Phase 4 catalog since P0 but read by no one, now decide how much of a running *local* model's shortcut the rig actually delivers (footprint `2/1` workhorse, `4/2` tuned; cloud carries `0/0` — the provider hosts it, so renting never contends, the counterweight to its daily fee);
- contention scales only *the model's own factor* between its catalog promise and ×1 — the speed of running nothing — so it is mathematically incapable of slowing a player below baseline (the standing lift-never-punishment rule) and a starved model stays runnable: it helps less, never blocks, never bills;
- pure derived physics: zero new state, reservation, or save surface — deterministic by construction, with remedies that are already-shipped choices (buy GPUs/storage, stop the model, rent from the cloud) rather than new commands, and the scarcer axis bottlenecks via `min` across the pool;
- one optional `pool` parameter on `combinedActionDurationFactor` plus the two real consumers (command bus, projection) means every existing caller behaves exactly as before — the 28 P0 model tests and 26 tool tests re-ran untouched — while listings, the `rig.assistant` row, and a new Market "rig load / your rig / delivers ×" line make the feed-it-or-rent-it decision legible before spending.

P2 delivered (see `docs/superpowers/plans/2026-10-04-phase-5-analysis.md`) — **"AI helps but can be wrong", now testable**:
- **AI analysis** spends P0's seeded properties at last: `analyze <target-id>` asks the running assistant for a **fallible read of the target's unseen topology** — machine roles the recon has not surveyed, and service kinds on hosts it has (reasoning outward from what the player can see, never naming a hidden box). An instant command on the contract precedent: no world time, no trace — verification stays cheap because the design calls expert verification *good play*;
- the three failure modes `docs/AI_SYSTEMS.md` names are all reachable and all proven by tests: **misclassify** (wrong vocabulary token on a real subject), **hallucinate** (an invented host, `subjectId: null`), **overstate confidence** (the band is computed from reasoning + context *without looking at accuracy*, so the unreliable-but-eloquent tuned model states wrong things with the same polish as right ones);
- fallibility is a rule, not tuning: accuracy odds are `0.8 × reliability/5` — capped below certainty by construction — while `context` budgets how much topology one pass reads; determinism rides the existing `hashUnit` primitive, so a save replay returns the byte-identical read;
- the **leak rule** is the load-bearing decision: `accurate` never leaves the simulation (it persists, it never projects) and a claim's `subject` is an anonymous `unmapped host N` handle, because every claim describes structure the player has *not* earned — projecting a real id would be free recon and grading the assistant for free; the verification loop closes through play (compare the panel against the next survey), not through state;
- `analyzeTarget` needs the assistant (`NO_ACTIVE_MODEL`) and nothing else new — survey/inspect stay model-free forever (tested), keeping the never-a-gate rule intact while making the model's *function* the requirement, and the Recon panel teaches the contract in the player's own terms ("predictions, not evidence").

P3 delivered (see `docs/superpowers/plans/2026-10-04-phase-5-build-system.md`) — **the #22 author handoff, discharged**:
- **the software specification and virtual workflow/IR build system** — `src/content/workflow-spec-catalog.ts` stores specs as pure IR: an ordered list of fictional pipeline steps (`discover(target) → …`), a `SoftwareEffect`, build minutes, a rig footprint, a test report, and the premium license each replaces. Nothing here executes: the safe-virtual-data rule is structural, and tests pin the step notation to a grammar no script could hide in;
- **three specs mirror the three premium licenses one-for-one**, so the issue's exit criterion ("replace a premium workflow with a self-built one") is a checked fact: the Homegrown Monitoring Loop delivers the exact network +2 the Commercial Monitoring Suite rents at 40/day — build it once with time, stop paying forever; the pipeline's ×0.85 lands through the same `combineFactors` path as any license, enforcing #23's "reuse the same capability system" by having only one system to reuse;
- **builds pay in the triangle, never credits**: `build <spec-id>` is instant and free — the price is frozen at commissioning as `buildMinutes` (compute-accelerated base × the running assistant's *delivered* shortcut) plus VRAM/storage occupancy, so split waits, model swaps, and save/restore all complete the same job on the same due minute with the same report card, and completion is a scheduled system job on its exact due minute (D057);
- **build quality is P2's fallibility doctrine re-applied**: one seeded roll at start splits clean / warnings / defective — `reasoning` caps clean odds at 0.7 (below analysis's 0.8: whole programs are harder than labels), `reliability` decides whether a failure is cosmetic or bites, and a defective copy delivers halved effect (floor 1, shortcut pulled toward ×1) — disappointing, never a trap, never a gate;
- **the queue is P1's designed second tenant**: `availablePool` subtracts every in-flight footprint before a local model measures its shortcut, making the docs' "model occupies GPU while building — pause / quality / rent / slower" a live four-way choice (tested both directions), while an empty queue subtracts 0/0 and every pre-P3 number re-ran untouched (427 tests, then 462);
- the **disclosure asymmetry** is the honest half: an in-flight build hides its frozen outcome until completion (a halfway report grades the roll for free), but a finished workflow projects in full — outcome, tests, provenance — because it is the player's own ground truth, not someone else's hidden topology; the Market FORGE panel shows specs with live estimates, the queue with due times, and the garage with report cards.

P4 delivered (see `docs/superpowers/plans/2026-10-04-phase-5-marketplace.md`) — **model/tool marketplace content, and AI is no longer player-exclusive**:
- **NPC AI use**: a peer can run a model (`UndergroundActor.modelId`, hidden truth), and one pure function `npcAssistDeltas` turns it into this tick's assist — a competent read lifts the actor's offence (reasoning band − 2), a miss costs skill *and* discretion, so **AI-assisted mistakes surface in the public feed** (discretion decides incident privacy); mistake odds `(6 − reliability)/12` stay nonzero even at band 5, because fallible-never-deterministic binds the ecosystem too, not just the player's assistant;
- the same math read from the **defender's seat** is "automation to watch": a modelled counterpart's assistant raises its defence on a good read and lowers it when the model misses a pattern (`docs/AI_SYSTEMS.md`'s named failure mode) — one function, both seats, no second rulebook;
- **no model is exact identity `{0, 0}`**: every unmodelled world re-ran byte-identical (the zero-regression pattern again), and the seeded slice world demonstrates both marketplace archetypes — lattice on the reliable workhorse, halfmoon on the cheap unreliable salvaged core — within bounds that keep rank-not-power intact: even the best possible assisted rolls cannot beat nightshade's defence of 88 (lattice 62+1+20, halfmoon 45+2+20), so the assist re-shuffles the mid-table, never crowns a peer;
- **marketplace provenance**: `ModelListing.author` routes an authored purchase's debit to the named peer (`moebius`) instead of the market house brand — the P5 tool-author value-graph edge, reused; the Salvaged Reason Core (600, ×0.85, r4/c2/rel2, footprint 3/1) is the trade made real: a stronger planner that slips twice as often;
- the **leak rule at ecosystem scale**: the projection gains a read-only `assistants` surface with handle + model label + author *only* — which peer runs which assistant is observable inference, what it earns them never crosses the boundary (tests pin the exact key set and JSON-scan for hidden-truth numbers);
- zero new commands, events, upkeep logic, or ledger cause kinds: `model buy/run/stop` already covered it, so the slice's whole surface is one optional state field, one pure function, one counterparty routing line, and read-only projection (476 tests / 49 files; one honest update: the listings count 4 → 5).

Deliverables:
- cloud/local model choices,
- model properties,
- compute contention,
- AI analysis,
- software specification UI,
- virtual workflow/IR build system,
- build time/tests/defects,
- model/tool marketplace content.

Exit criteria:
- player can replace a premium workflow with a self-built one,
- AI helps but can be wrong,
- generated software is safe virtual data, not host code.

## Phase 6 — Run Threat and Physical Consequences

**Status: complete (2026-10-05). P0–P5 delivered. Tracked by #24.**

Slice map and grounding in the current repo: `docs/superpowers/plans/2026-10-04-phase-6-plan.md` — P0 physical presence (location derived from the lease, never a second source of truth), P1 authority investigation as a deadline-driven tick, P2 rival probes (carries the **"automation to watch the player"** handoff from #23, read from the same `npcAssistDeltas` primitive), P3 retaliation goes physical (carries the **build-interruption** handoff from #23), P4 catastrophic compromise as a durable condition (now explicitly owns D021's lease-loss threat), P5 postmortem causal chain as a pure derived read. The Phase 7 boundary is drawn explicitly: Phase 6 produces conditions and causes, #25 produces endings — `RunEnded` is not built here, because no terminal state exists yet to extend.

**P0 delivered** (`docs/superpowers/plans/2026-10-04-phase-6-presence.md`, D031): presence is *derived* from `economy.housing` (`systems/location.ts`), so eviction, lapse, and relocation cannot disagree and the slice adds zero state, zero events, and zero save-schema surface. Relocation is priced in **world minutes** (`travelMinutes`, a symmetric difference between districts) and paid by advancing the clock *before* the lease changes, so the journey happens under the dwelling you slept in; same-district leases stay at 0 minutes, which is what keeps every pre-Phase-6 lease test byte-identical. Two zero-capability safehouses join the catalog (`anonymity` as a band nothing consumes yet — P3 reads it; P2 now reads it as a probe-difficulty term, so the safehouse choice is already counterplay), `PhysicalIntent` gains `moveTo`/`leave` mapped onto the existing lease commands for Terminal/GUI/Phaser parity, and the room HUD's hardcoded caption is now a read of the projection. The kickoff plan's sketched `move`/`safehouse` verbs were rejected on contact with the code; D031 records the correction.

**P1 delivered** (`docs/superpowers/plans/2026-10-04-phase-6-authority.md`, D032): authority investigations land as a **case file derived from the causal footprint the player already emitted** — `OperationTrace` weights, reviewed on the underground's existing 360-minute boundaries, with **no roll and no seed** so identical histories produce identical files (pinned at rank 1 vs 999_999 and across seeds). Material and citations are recomputed from trace history at the current minute rather than accrued per boundary, because `advanceWorldTime`'s catch-up cap would otherwise let `wait` phrasing change how much trouble you are in; only the **surfaced evidence** is stored, since a pure read cannot recover what the player has already been told. What reaches the screen is the docs' own list — unusual login, changed marketplace behavior, suspicious message — as an **ATTENTION** evidence log beside the social HEAT list, never a heat percentage, never a countdown: `progress`, `sourceIds`, and the opening minute stay hidden truth, and a file whose target the player has not identified projects nothing. One file per target, one item per boundary, three bands (`probing`/`warming`/`converging`) counted from surfaced evidence, and silence past the last band, so laying low cools a file instead of resetting it and outliving one is quiet rather than a warning that stops. No new command means no parity obligation; the kickoff plan's rumors/inbox routing was rejected on contact with those shapes (they model third-party gossip, not first-person logs). Nothing consumes `progress` yet — P3's retaliation reads it as a targeting input, P4's compromise reads both, P5's postmortem reads `sourceIds` — and there is no `RunEnded`, per the phase boundary.

**P2 delivered** (`docs/superpowers/plans/2026-10-04-phase-6-probes.md`, D033): rival probes discharge #23's "automation to watch **the player**" handoff by reading `npcAssistDeltas` a **third time** — same primitive, same seed/tick/actor salt, same failure mode — so an AI-assisted prober makes AI-assisted mistakes in literally the same math as the offence and defence seats, and a miss lands twice (negative delta plus a confidence penalty) because a model that misreads a pattern does so with conviction. A probe is an **ecosystem action**, so it runs inside `advanceUnderground`'s existing tick loop rather than as a new fold with its own clock cursor: it inherits the catch-up cap, candidates are re-derived every tick after retaliation (a cached list would make `wait` phrasing change who probes you), and a skipped tick is a probe that never happened — the deliberate inversion of D032's derived-read rule, and the contrast D033 records. Interest is **grudge, never rank** (`PROBE_MIN_GRUDGE = 5`, below the smear ladder's 30): `player.rank` appears in no candidate test, roll, accuracy term, or artifact, and byte-identity is proven the strongest way available — six scenario digests of the ecosystem/roll-stream captured from the pre-P2 code replay exactly, with a separate test showing the provoked scenarios really do emit probes and the idle ones really do not. Every accuracy term is a truth the player controls: footprint band, the dwelling `anonymity` band D031 shipped unread (now consumed: `public > quiet > hidden` is a tested inequality), quiet exits versus escalations — the sim's only vocabulary for "changes relays" — and an open intrusive operation, clamped to `[8, 78]` so D030's "fallible, never deterministic" binds the threat systems as hard as it binds the player's assistant. The lift is a **durable record** (`RivalProbe`: actor, seat, `correct`, minute) rather than a farmable per-actor knowledge scalar, so P3 can be genuinely fooled by a stored `correct: false` and P5 can cite rows by minute; what reaches the screen is only the **derived tell** (ping / caller / missing contact — the docs' peer-owned evidence words, disjoint from P1's authority kinds), with the prober's handle, their aim, and their accuracy withheld behind D028's leak boundary and a test proving that flipping every `correct` in the world changes nothing visible. No new command, so parity stays structural; nothing consumes `probes` yet, and P3 is stated as the first reader.

**P3 delivered** (`docs/superpowers/plans/2026-10-05-phase-6-physical-retaliation.md`, D034): retaliation now crosses into the physical world by consuming a **prior** P2 probe, the rival's grudge, existing Black-network backing, P0 anonymity and P1 investigation pressure — never player rank. Probe correctness remains real hidden truth: a correct rig read may cause an outage while a wrong one degrades to suspicious connectivity; a correct dwelling read may destroy one owned hardware instance while a wrong one leaves only an ambiguous door-camera tell. `PhysicalThreat` persists the causal truth for P5, but projection exposes only a signal kind and past minute, shared by ATTENTION and the room; actor, source probe, correctness, impact ids and outage end never leak. #23's build-interruption handoff is discharged as **true pause/resume**: `startedWorldMinute`, frozen `dueWorldMinute`, spec/model identity and the quality roll never mutate; optional pause state accumulates elapsed outage time into the *derived* completion boundary, including builds commissioned during an outage and save/restore mid-pause. Exact-boundary ordering is explicit: an outage on a build's due tick wins the tie, while work due strictly earlier has already landed. That required interleaving upkeep/investigation/build deadlines around the ecosystem's existing tick loop so long and split waits read the same as-of-tick world without adding a second scheduler or bypassing the 28-tick cap. Property loss is allowed without violating the capability floor — zero hardware still permits baseline play — but P3 deliberately does **not** destroy the active lease: D021's lease-loss threat moves to P4 catastrophic compromise, where mid-command housing/upkeep chronology can be modelled honestly. The final D030 event-layer beat also lands: a peer involved in a non-warning physical escalation may deterministically adopt the Salvaged Reason Core, then uses the already-shipped NPC-assist math on later ticks. No `RunEnded`; Phase 7 still owns endings.

**P4 delivered** (`docs/superpowers/plans/2026-10-05-phase-6-catastrophic-compromise.md`, D035): catastrophic compromise is now a **durable causal condition, not a second danger roll and not an ending**. The fold consumes only physical consequences that actually landed on the current boundary, so rank remains irrelevant and loading historical P3 records cannot retroactively fabricate failure. Four named conditions ship: `RIG LOST` only when the final destructive hit removes the last component and no complete machine survives; `DWELLING LOST` as D021's event-driven eviction when the struck place is the lease still held; `IDENTITY EXPOSED` only when a correct current dwelling read, the physical hit, and already-converging cited authority material all meet; and `STRANDED` only at a real resource floor (zero credits, no lease/components/machine, and no authored tool left to sell). Current property remains authoritative; append-only compromise rows store cause provenance for P5/Phase 7. The visible projection strips threat/probe/investigation/location ids and shows only the named condition plus minute in a **COMPROMISE** section that explicitly says the system still answers. Chronology is pinned: upkeep bills first on an exact day boundary, all P3 actors finish their physical actions, P4 folds the boundary, and a burned lease cannot bill later; the hook is injected from CommandBus so `underground.ts` stays independent. A 64-seed real-chain harness measured early pacing rather than asserting it by feel: reckless play reached compromise in 8/64 by day 3, 14/64 by day 5, 23/64 by day 10 (41/64 uncompromised at day 10); measured/disengaging play reached 6/64, 13/64, 16/64 respectively (48/64 uncompromised at day 10). This is a tuning baseline, not a probability contract. No `RunEnded`; P5 explains causes and #25 still owns endings.

**P5 delivered** (`docs/superpowers/plans/2026-10-05-phase-6-postmortem.md`, D036): every P4 compromise now gets a **pure derived postmortem** with zero new authoritative state, commands, events, or save fields. Hidden source ids are allowed to select the correct records internally, but the player-facing timeline contains only facts the player could already know: their own operation actions, player-visible defensive reactions, surfaced authority evidence for known targets, the P2 probe tell, the P3 physical signal, and the P4 condition. Hidden actor identity, probe subject/correctness, investigation progress/source ids, struck location, impact ids, outage end, and seed never project. The timeline is chronological for comprehension rather than a claim that every adjacent row is one hidden edge; parallel causal branches may converge on the same physical consequence. Attribution is **COMPLETE** only when the compromise resolves its physical threat, the threat resolves its probe, and at least one player-caused operation trace is reachable through the cited investigation provenance. Missing legs produce **INCOMPLETE ATTRIBUTION** and whatever visible facts remain — never fabricated blame. TinyBase receives only safe postmortem headers/steps, the Underground COMPROMISE section renders them while the run remains interactive, and a seeded P1→P5 scenario proves an actual player-action → probe → physical → compromise chain. No `RunEnded`; Phase 7 / #25 remains the sole owner of endings.

Deliverables:
- authority investigations,
- rival probes,
- criminal retaliation,
- physical-warning events,
- relocation,
- safehouses,
- catastrophic compromise,
- postmortem causal chain.

Exit criteria:
- early runs are genuinely dangerous,
- first-time survival around a few days is plausible,
- players can usually learn something concrete from failure.

## Phase 7 — Endings and Long-Run Systems

**Status: complete — P0–P6 delivered. Tracked by #25. Phase 8 / #26 is next.**

Canonical plan: `docs/superpowers/plans/2026-10-05-phase-7-plan.md`.

Grounded slice order:
- **P0 — terminal run contract + outcome projection** *(delivered; D037 / #41)*: one durable `WorldState.ending` record, shared `endRun` transition, `RunEnded` event, terminal command guard, legacy-save default, safe final projection and in-world final screen. P0 triggers no ending by itself.
- **P1 — forced ending eligibility** *(delivered; D038)*: current Phase 6 conditions/provenance deterministically produce ARRESTED / UNMASKED / MISSING / STRANDED / COMPROMISED, with rank absent and exact-tick terminal freeze.
- **P2 — voluntary exit plan** *(delivered; D039)*: PLAN → visible wind-down checklist → 60-minute COMMIT → two-day live-world cooling → derived READY, with cancellation and no ending decision yet.
- **P3 — retirement variants + rare White VANISHED** *(delivered; D040)*: READY closes only on explicit finish; VANISHED/RETIRED tone derives from completed-work/reputation/consequence history, never the starting board or rank.
- **P4 — completed-run history** *(delivered; D041)*: browser IndexedDB atomically moves the canonical final state from active to history; summaries/postmortems are derived on demand in a read-only GHOST/OS History app, while fresh active-run creation remains separate. Closed #40 supplied only the archive pattern; D037 remains the terminal model.
- **P5 — exceptional long-run pressure** *(delivered; D042 / #46)*: after a strict two-week no-op gate, accumulated causal history can increase existing contract/probe/physical pressure in bounded bands; age alone, rank, and starting board never create difficulty.
- **P6 — bounded exotic/quantum capability** *(delivered; D043 / #47)*: one one-shot off-market Cryogenic Annealing Rack appears only from veteran history + a clean authored workflow; it reuses the ordinary machine/capability path, adds only memory/VRAM/storage, and never grants an attack, success roll, target gate, or rank-based unlock.

**P0 delivered** (`docs/superpowers/plans/2026-10-05-phase-7-terminal-contract.md`, D037): Phase 7 now has one simulation-owned terminal contract instead of an ending screen convention. `WorldState.ending` is null while live and becomes one immutable `RunEndingRecord` when `endRun` succeeds; the first final status wins and later attempts cannot rewrite it. Every gameplay command is rejected with `RUN_ENDED` before dispatch once terminality exists, so time and state cannot move after a run ends. The canonical save schema persists the record with a legacy `null` default, while the player projection/TinyBase expose only final status/label/minute and keep the authoritative cause id private. GameShell renders the final state from that projection. No eligibility rule ships in P0: an ordinary live run still cannot end spontaneously.

**P1 delivered** (`docs/superpowers/plans/2026-10-05-phase-7-forced-endings.md`, D038): forced endings consume only catastrophic conditions created on the **current** ecosystem boundary, so a Phase 6 save is not retroactively killed by new policy. `identity-exposed` branches by existing history: cited visibly-converged authority evidence yields **ARRESTED**; a prior social unmasking by the same physical actor yields **UNMASKED**; otherwise a physical reach to the person yields **MISSING**. `STRANDED` consumes P4's already-proven resource floor. Generic **COMPROMISED** requires both rig and dwelling loss on the same boundary, leaving either loss alone recoverable. No rank or fresh roll participates. Terminality is chronological: after P4/P1 the ecosystem stops immediately, authoritative `worldMinute` and `WorldTimeAdvanced.toMinute` clamp to the ending tick, and no later retaliation, offer, probe, exact-tick build completion, billing, investigation, or requested wait tail runs after `RunEnded`.

**P2 delivered** (`docs/superpowers/plans/2026-10-05-phase-7-voluntary-retirement.md`, D039): voluntary retirement now begins as intent, not terminality. PLAN leaves normal play live while the player resolves a fully visible checklist: no active operation, accepted contract, in-flight build, running model, active license, or lease. COMMIT refuses without spending time until that wind-down is true, then spends 60 world minutes through the ordinary danger chronology; a forced ending during that hour wins and cooling never begins. The same visible checklist is revalidated at the arrival minute before cooling can start; if a future world system creates a new obligation during that hour, the hour remains spent and the plan stays in PLANNING. Success freezes a two-day cooling deadline. While cooling/ready, only waiting, reading messages, or cancelling is allowed; cancellation restores normal play. READY is derived from clock truth and P2 emits no `RunEnded`, leaving P3 to choose ordinary RETIRED versus the rare VANISHED/other retirement tone from actual history rather than rank or a morality checkbox.

**P4 delivered** (`docs/superpowers/plans/2026-10-05-phase-7-completed-run-history.md`, D041): browser persistence upgrades to IndexedDB v2 with a `run-history` store and moves a terminal portable `WorldState` out of the active slot in one transaction. A failed archive falls back to durably saving the terminal active snapshot, so reload can never revive gameplay; boot recovery retries the move, while the next boot after success creates a fresh run separately. The archive stores final truth once. `deriveCompletedRunSummary` reconstructs the browse model — ending/tone, final rank/credits, lifetime value moved, contracts, escalations, authored workflows, compromises, descriptors, and existing safe postmortems — without leaking hidden cause/probe/investigation/relationship truth. GHOST/OS exposes that read in a History window. Browser ships now; Tauri/SQLite completed-history parity remains deferred to #19.

Deliverables:
- voluntary exit plan,
- arrested/unmasked/missing/compromised endings,
- rare peaceful White VANISHED ending,
- Black retirement variants,
- run history,
- exceptional long-run pressure,
- limited exotic/quantum capability.

Exit criteria:
- surviving and leaving can be a meaningful goal independent of rank #1.


**P6 delivered** (`docs/superpowers/plans/2026-10-05-phase-7-bounded-exotic-capability.md`, D043): the late exotic layer is deliberately ordinary under the hood. The fictional **Cryogenic Annealing Rack** is a one-shot machine listing derived from a P5 **VETERAN** run plus at least one clean self-authored workflow; rank and starting network never participate. Before eligibility it is absent from the Market and direct catalog-id purchase is rejected. Once earned it reuses `buyMachine`, the existing machine/value events, ledger, ownership and capability fold. Its profile is `compute 0 / memory 8 / vram 5 / storage 4 / network 0`: discovery/local workload headroom grows, but operation action minutes, success math, evidence rules and target access do not. The append-only machine debit is the one-shot claim record, so resale and save/restore cannot respawn the offer. No new state field, migration, command/event family, RNG stream or capability axis is added.

## Phase 8 — Content Alpha

**Status: complete (2026-10-06). P0–P6 delivered. Tracked by #26. Phase 9 / #27 is next.**

Canonical plan: `docs/superpowers/plans/2026-10-05-phase-8-plan.md`.

Grounded slice order:
- **P0 — data-driven world-content roster** *(delivered; D044 / #48)*: authored peers/targets/infrastructure move out of `slice-world.ts` into a typed, validated, clone-on-instantiation content roster while the default Phase 2–7 world remains behaviorally identical.
- **P1 — local balance telemetry baseline** *(delivered; D045 / #49)*: 32 fixed seeds × four real-command policies over 30 world days report run length, endings, economy/rank movement, contract/threat activity and content exposure before breadth tuning.
- **P2 — target + NPC breadth** *(delivered; D046 / #50)*: expand to 10 peers / 6 targets / 14 machines / 17 services through the P0 roster only; all targets reuse the same evidence/operation rules and no rank gate or target level is added.
- **P3 — contract breadth** *(delivered; D047 / #51)*: expand from two to four objective predicates — service report, infrastructure map, quiet recon, intrusion — all verified from existing evidence/traces and resolved through the same contract/value/relationship path.
- **P4 — location + physical-life breadth** *(delivered; D048 / #52)*: expand housing from 4 to 8 authored lease trade-offs through the existing capability/anonymity/travel/upkeep/presence rules only.
- **P5 — market breadth** *(delivered; D049 / #53)*: broaden hardware, machines, models, authored tools, software and Forge specs through the existing capability/economy/contention/value-provenance rules only.
- **P6 — social/event breadth + alpha calibration** *(delivered; D050 / #54)*: deterministic authored social presentation, social-density telemetry, and a calibration decision taken from the measured report.

**P0 delivered** (`docs/superpowers/plans/2026-10-05-phase-8-world-content-roster.md`, D044): the live five-peer / one-target world is now authored in `src/content/world-content.ts`, not inside the runtime fixture. Actor/target archetype tags are editorial metadata only and are stripped before `WorldState`. The content boundary validates duplicate ids, actor ranges/ranks, assistant model references, empty infrastructure, dangling ownership and owner/target identity drift, then deep-clones definitions before simulation authority can mutate them. `slice-world.ts` now owns scenario facts only: player, seed, starting network/economy. P0 intentionally adds no breadth, so the full Phase 2–7 deterministic suite remains the compatibility proof; P2 can later add entries without teaching runtime code individual handles.

**P1 delivered** (`docs/superpowers/plans/2026-10-05-phase-8-balance-telemetry.md`, D045): developer-only balance telemetry now drives the real `CommandBus` across 32 fixed ecosystem seeds, four deterministic policies (idle / contractor / reckless / career-exit) and a 30-day horizon. It reports run length, ending status/cause, economy, rank movement, contract traffic, compromise/pressure/threat activity and actually exposed content, while also pinning the authored catalog breadth. The first baseline is intentionally descriptive: contractor ends ARRESTED in 28/32 seeds, career-exit RETIRES in 20/32, and idle stays mechanically quiet while the autonomous world continues producing/expiring offers. P1 changes no gameplay state, rules, RNG, persistence or UI; later breadth slices should rerun the report rather than silently retune around memory.


**P2 delivered** (`docs/superpowers/plans/2026-10-05-phase-8-target-npc-breadth.md`, D046): the authored world now contains ten peers and six targets. VELVETWIRE, IRONVEIL, TALLYMAN, DAYSTAR and ROOKERY add scam/extortion/predatory-market/corporate/rival topology through ordinary actor/target/machine/service records; archetypes remain editorial-only. Generic operation tests prove the new targets use the same command/evidence path at rank 1 and rank 999,999. P1 telemetry confirms the breadth is reachable (all six targets and all ten actors appear), while also measuring the expected ecosystem-density increase; no P2 mechanic retune hides that change, leaving explicit calibration to P6.


**P3 delivered** (`docs/superpowers/plans/2026-10-05-phase-8-contract-breadth.md`, D047): contracts remain predicates over the freeform simulation rather than scripted missions. `recon-report` still sells observed service evidence; `infrastructure-map` asks for observed machine coverage; `quiet-recon` requires known infrastructure plus a post-acceptance recon-stage disengagement; `intrusion` keeps the post-acceptance escalation requirement. All four reuse accept/decline/deliver, ordinary expiry, ledger payout, issuer trust, forum provenance and reputation movement. `requiredMachines` parallels `requiredServices` as visible persisted scope; no mission-progress flag, new gameplay verb, target level or rank gate is introduced. P1 telemetry is rerun through public commands so P6 can later calibrate the measured opportunity mix rather than P3 hiding its consequences.


**P4 delivered** (`docs/superpowers/plans/2026-10-05-phase-8-location-breadth.md`, D048): the housing catalog grows from four to eight entries without adding a location subsystem. Four new quiet/hidden workspace/residential trade-offs reuse the existing lease id, derived presence, symmetric relocation time, daily upkeep, capability fold and anonymity-based physical counterplay. Existing listings remain unchanged, safehouses remain capability-zero, and rank never affects leasing. No save migration, new command/event family or RNG is introduced; P1 telemetry is expected to remain outcome-identical because its policies never rent housing, with only the authored housing count moving from 4 to 8.


**P5 delivered** (`docs/superpowers/plans/2026-10-06-phase-8-market-breadth.md`, D049): the ordinary market broadens to 8 hardware components, 7 complete machines, 7 models, 5 authored tools, 5 premium software licenses and 5 self-built workflow specs. New entries reuse the existing five-axis capability vector, cloud-rent/local-property model economics, named-author ledger provenance, tool resale, software upkeep and Forge quality/contention paths. Every added premium license has a self-built spec with the exact same effect. The Annealing Rack remains the only exotic machine. No new effect kind, command/event/state field, rank gate or migration is introduced, and P1 telemetry is required to remain outcome-identical apart from authored catalog counts.


**P6 delivered** (`docs/superpowers/plans/2026-10-06-phase-8-social-events-calibration.md`, D050): social presentation and alpha calibration close Content Alpha. Authored incident/forum/rumor/message/contract wording now resolves from variant tables keyed on the record's persisted authoritative id, so presentation varies deterministically while no simulation input changes. Telemetry `version: 2` adds a per-scenario `social` block, and the 32-seed report was regenerated both at the P3 merge and at this head: after allowlisting `version`, `authoredContent` and `scenarios.*.social`, **zero fields differ**, which proves the P4 and P5 neutrality promises that were previously only asserted. The measured alpha distribution justifies no calibration: feed/inbox/forum visible windows stay at 8.6–8.8 / 5.8–6.1 / 3.3–4.3 days, expired-over-created contract traffic is 0.07–0.08% for the working policies, and a 16-day browser run confirms varied, ambiguous, reload-stable social copy. Market affordability remains unmeasurable by this harness because no policy purchases content, and the `known`/`entangled` pressure bands never occur in 128 runs; both are recorded as follow-ups rather than tuned inside a calibration slice, since the levers involved are pinned by deliberate test contracts or sit in Phase 7 threat territory.


Deliverables:
- broader NPC archetypes,
- varied contracts,
- multiple location archetypes,
- larger tool market,
- meaningful hardware/model catalog,
- enough events for repeated runs,
- balance telemetry for local testing.

Focus:
breadth without violating established system rules.

## Phase 9 — Web Beta / Polish

**Status: completed — P0–P8 delivered via PRs #66–#74; parent #27 closed on 2026-10-08. Web Beta feature-complete for the tested Chromium target.**

Canonical plan: `docs/superpowers/plans/2026-10-06-phase-9-plan.md`.

Canonical interface direction: `docs/INTERFACE_AND_DISTROS.md` / D051.

Grounded slice order:
- **P0 — UI foundation + semantic visual language** *(delivered; #57 / PR #66)*: semantic tokens, owned shared primitives, UI/terminal typography separation, non-color epistemic markers, focus/reduced-motion baseline, and restrained Motion window transitions.
- **P1 — OS shell + distro/theme architecture** *(delivered; #58 / PR #67)*: five cosmetic distro profiles, Petal Light/Night, installed-distro inventory and versioned presentation settings, in-world staged installer/reboot, short boot for installed distros, distinct optional sounds with mute, and distro-aware shell/chrome without gameplay changes.
- **P2 — visual-first app information** *(delivered; #59 / PR #68)*: Recon topology, relationship/rival signatures, evidence semantics, contract/deadline visuals, market comparisons, rich terminal output and History/postmortem timelines.
- **P3 — onboarding + discoverability** *(delivered; #60 / PR #69)*: teach the fictional OS/capability model through contextual, dismissible in-world guidance, first-run orientation briefing, visual command discovery, in-app glossary, and progressive field directives.
- **P4 — accessibility + interaction comfort** *(delivered; #61 / PR #70)*: keyboard shortcuts/navigation, modal focus containment/restore, presentation-only text/motion/transparency/density/contrast overrides, terminal parity, screen-reader semantics/live regions, multi-distro compliance, and explicit STANDARD motion override semantics.
- **P5 — new-run, save, migration + recovery hardening** *(delivered; #62 / PR #71)*: explicit no-run/new-run lifecycle, varied deterministic seeds, historical-save migration fixtures, typed corrupt/incompatible diagnostics, non-destructive corrupt backup archival, flush-before-replace safety, terminal-run recovery, and completed-history preservation.
- **P6 — beta balance + telemetry follow-ups** *(delivered; #63 / PR #72)*: canonical 32-seed × 6-policy telemetry, measured purchasing/affordability, pressure-band reachability, novice pacing, ending/economy/rank/failure distributions, and evidence-backed decision to keep existing economy/pressure tuning.
- **P7 — ending/history polish + room/audio atmosphere** *(delivered; #64 / PR #73)*: authored presentation for all seven endings, player-safe archived run timeline/postmortem, restrained room atmosphere and known physical-warning cues, optional distro-aware ending/warning audio, and preserved accessibility/presentation-only boundaries.
- **P8 — browser performance + web release hardening** *(delivered; #65 / PR #74; release checklist: `docs/WEB_BETA_RELEASE_HARDENING.md`)*: bounded completed-run and large archive rendering, memoized large table projections, reduced room/window animation cost, narrow-screen touch fixes, deterministic long-run stress fixtures, production Chromium persistence/recovery smoke, and explicit Firefox/Safari/physical-device evidence limits.

Cross-cutting rules:
- the game must not collapse into terminal-styled menus and text,
- prefer recognition before reading without hiding precise values,
- visualizations never reveal hidden authoritative truth,
- distros/themes never affect gameplay power,
- apps retain individual identity while sharing semantic/accessibility contracts,
- terminal/GUI parity remains mandatory,
- animation never owns simulation time.

Exit criteria:
- the web game is feature-complete and stable,
- core systems can be understood through a coherent visual language rather than text alone,
- multiple distro identities work without forking gameplay/UI architecture,
- browser persistence/migrations/recovery are robust,
- performance/accessibility meet release expectations,
- remaining planned work is Phase 10 host/distribution integration rather than gameplay or UI architecture.

## Game-First Completion Track — G0–G8 (active; supersedes gameplay-ready claim)

**Status: NOT gameplay-complete.** The prior Phase 9 Web Beta closure remains valid only as a technical milestone for the tested Chromium target. Parent **#75** is the new gameplay readiness owner. Canonical design and scheduling contract: `docs/GAME_FIRST_REBOOT.md`.

**Immediate order:** G0 audit is merged (PR #85), pending human playtest; G1 clock correctness (#86) and the first persisted clock-job scheduler/HUD (#87) are merged, live idle time and paced sleep/fast-forward are delivered by merged PR #88 / D056 with Chromium production browser smoke passing; builds, upkeep and outage releases are queued system jobs (D057); investigations, contract expiry and retirement stay derived by design, the save path is proportional to what changed (D058), and the HUD overlap remains. Prove game feel and the clock first; keep the existing engine/UI/persistence infrastructure where helpful. The first prototype is one interactive, consequential 20–30-minute operation, not a whole UI rewrite.

| Gate | Issue | Delivery | Status |
| --- | --- | --- | --- |
| G0 | #76 | Current playability audit, benchmark research, gameplay north star and focused playable slice | PR #85 merged; human playtest pending |
| G1 | #77 | Authoritative visible clock, no-skipped-ticks scheduler, queue, sleep and interruptible fast-forward | Partial: PRs #86/#87/#88 merged; D056 live-clock slice delivered; D057 subsystem jobs deliver builds, upkeep and outage releases as queued system jobs with exact release and an invariant suite. D058 bounds the save path and event log. Pending: HUD overlap, human playtest. Investigations, contract expiry and retirement stay derived by design |
| G2 | #78 | Chosen handle, curated/generated scenarios, weighted procedural NPC/organization/network generation | Planned |
| G3 | #79 | Hands-on interactive fictional hacking operations, multiple player-skill routes, evidence and defense | Planned |
| G4 | #80 | True roguelike run loop, emergent pressure/loss, replay variety, non-power meta | Planned |
| G5 | #81 | Autonomous NPC agendas, organizations, alliances, consequences and story generation | Planned |
| G6 | #82 | Embodied game-first UX, evidence board, tactile network tools, diegetic time/feedback | Planned |
| G7 | #83 | Select and deepen varied, procedural hacking-inspired gameplay mechanics | Planned |
| G8 | #84 | Human playtest evidence, determinism/solvability checks, balance and gameplay-ready sign-off | Planned |

**Hard invariants:** rank is never a capability gate; deterministic fixed-seed/inputs; no hidden knowledge leaks; queued or sleeping world processes every due tick; first-ending-wins; save migrations and Terminal/GUI parity; no GitHub Actions unless necessary.

**Tauri status:** #19 remains **blocked by #75/#84**, even though old #27 is closed. Avoid native host work until the *gameplay* is worth packaging.

## Phase 10 — Desktop Host / Packaging

**Status: DEFERRED/BLOCKED by gameplay initiative #75 and final human playtest gate #84. Tracked by #19.**

Old prerequisite #27 is complete, but **gameplay is not**. Start only after #75 / #84 validate a playable, fun game-ready web build, unless the player explicitly revises this policy.

Deliverables:
- reconcile final save contract with the Tauri SQLite adapter,
- browser/exported-save import or migration where appropriate,
- native save-location/filesystem policy,
- desktop window/application behavior,
- installer/package/signing,
- native crash diagnostics and recovery,
- release-only Tauri build/launch verification,
- desktop storefront/distribution integration if chosen.

Exit criteria:
- the desktop build runs the same game rather than a fork,
- browser and desktop saves share one validated logical format,
- no gameplay system exists only because of the desktop host,
- desktop packaging does not regress the finished web game.

## Explicitly deferred

- multiplayer,
- open-world physical exploration,
- real network access,
- arbitrary user-code execution,
- mobile,
- live-service backend,
- modding API beyond data-driven content.

Tauri itself is **not abandoned**; its completion is separately deferred to Phase 10 / #19.

These can be reconsidered only after the single-player simulation is complete and stable.
