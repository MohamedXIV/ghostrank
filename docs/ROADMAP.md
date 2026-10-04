# Roadmap

This is a full-project roadmap, not a disposable prototype plan. Early milestones establish production architecture that later systems will keep.

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

**Status: in progress — P0, P1, P2 and P3 delivered. Tracked by #23 (unblocked by #22).**

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
- **builds pay in the triangle, never credits**: `build <spec-id>` is instant and free — the price is frozen at commissioning as `buildMinutes` (compute-accelerated base × the running assistant's *delivered* shortcut) plus VRAM/storage occupancy, so split waits, model swaps, and save/restore all complete the same job on the same due minute with the same report card, and completion rides the upkeep tick (`advanceBuilds`);
- **build quality is P2's fallibility doctrine re-applied**: one seeded roll at start splits clean / warnings / defective — `reasoning` caps clean odds at 0.7 (below analysis's 0.8: whole programs are harder than labels), `reliability` decides whether a failure is cosmetic or bites, and a defective copy delivers halved effect (floor 1, shortcut pulled toward ×1) — disappointing, never a trap, never a gate;
- **the queue is P1's designed second tenant**: `availablePool` subtracts every in-flight footprint before a local model measures its shortcut, making the docs' "model occupies GPU while building — pause / quality / rent / slower" a live four-way choice (tested both directions), while an empty queue subtracts 0/0 and every pre-P3 number re-ran untouched (427 tests, then 462);
- the **disclosure asymmetry** is the honest half: an in-flight build hides its frozen outcome until completion (a halfway report grades the roll for free), but a finished workflow projects in full — outcome, tests, provenance — because it is the player's own ground truth, not someone else's hidden topology; the Market FORGE panel shows specs with live estimates, the queue with due times, and the garage with report cards.

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

**Status: planned / blocked by #23. Tracked by #24.**

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

**Status: planned / blocked by #24. Tracked by #25.**

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

## Phase 8 — Content Alpha

**Status: planned / blocked by #25. Tracked by #26.**

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

**Status: planned / blocked by #26. Tracked by #27.**

Deliverables:
- onboarding,
- accessibility,
- browser performance,
- save migration hardening,
- UI consistency without erasing app individuality,
- audio/room atmosphere,
- balance,
- ending polish,
- browser crash/recovery behavior,
- web release hardening.

Exit criteria:
- the web game is feature-complete and stable enough that remaining work is host/distribution integration rather than gameplay architecture.

## Phase 10 — Desktop Host / Packaging

**Status: explicitly deferred / blocked by #27. Tracked by #19.**

Start only after #27 (Phase 9 — Web Beta / Polish) is complete unless the project deliberately changes the platform decision.

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
