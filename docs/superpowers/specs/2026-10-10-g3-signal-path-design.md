# G3 P1 — Signal Path Design Specification

**Date:** 2026-10-10
**Status:** Written design proposed for human review — NOT approved for implementation.
**Owner:** #105 under G3 #79 and initiative #75.
**Direction already approved:** Game-First D072, `docs/GAMEPLAY_PILLARS.md`, and the contextual mini-game approach presented on #105.
**Existing baseline:** D071's Nightshade briefing (`nightshade-v1`) shipped in PR #103. This spec does **not** claim any gameplay implementation, test pass, or human playtest.

## 1. Product intent and the user's experience

Ghostrank should make the player feel like a **cautious, intelligent operator** in a dangerous hacker society, not an administrator clicking a dashboard or an expert typing real intrusion recipes. In the first Nightshade mini-game, the player investigates the Outer Relay, combines **two different clues**, chooses which of three plausible fictional connections leads to the hidden Cold Vault, and commits to **testing their own hypothesis**. The player can wait for information quietly or obtain it faster and more dangerously. Mistakes carry clock time, trace, defensive response and potentially a lost contract.

**Target first-use interaction:** the active link-reasoning portion takes roughly **1–3 real minutes** for a novice; the in-world delayed broker answer and the entire 20–30-minute briefing remain separate pacing choices. A first-time player should explain *why* their route works without prior cybersecurity expertise. The player controls both **how to obtain** evidence and **whether to act**, so having a better rig never becomes an automatic solution and rank never gates a target.

All symbols, nodes, protocols, logs and commands are fictional, local to the game, and not operational security training.

## 2. Integration decision and rejected alternatives

Three options were compared in the Superpowers brainstorming on Issue #105:

1. **Five mandatory successive mini-games:** straightforward to teach but turns contracts into repetitive checklists; rejected.
2. **Independent puzzle popups:** relatively quick to build but disconnected from state, stakes and different routes; rejected.
3. **Selected: contextual evidence and network workspace.** The player manipulates a projection of the same authoritative in-world evidence that the terminal reads. Tentative lines do not count as observed hosts. Committed conclusions spend time/trace, yield evidence if correct, and invite real NPC consequences. An operation can bypass some interactions with other sources or costs. This is the foundation for later mini-games, not a large generic graph editor.

**This delivery ships only Signal Path (network mapping + simple evidence correlation).** Traffic Pattern, Log Forensics, Trust Boundary, and Untrusted Drop remain separately specified *portfolio candidates* on #105. Their full gameplay, generic procedural operations, VM handling, Phaser cameras, travel, room free movement, advanced art, AI/compute assistance and Tauri are out of scope.

## 3. World fiction and a concrete, solvable puzzle

**Existing world objects stay the same:** target `nightshade`; `ns-relay` machine; `ns-signal` broker service; `ns-vault` machine; `ns-archive` service. The infrastructure-map contract continues to require *two observed machines*, the relay and the vault. A new graph route is a **logical transport hypothesis, not a new machine/service** and must not enlarge the contract's machine count.

The player sees three candidate logical routes on the relay's projected topology. Their endpoints are visually **unresolved** until they have earned evidence. Each candidate has two inspectable, invented attributes:

| Example display label | Carrier type | Echo mark | Role in initial puzzle |
| --- | --- | --- | --- |
| Amber | public | triangle | plausible mark, wrong carrier |
| Cobalt | sealed | circle | plausible carrier, wrong initial mark |
| Ivory | sealed | triangle | matches **both** initial constraints |

The correct path is *not* the word “Ivory”; it is whichever candidate matches the player-discovered required **carrier** and active **echo mark**. For the first authored teaching case the relationship above stays fixed; a seed-scoped deterministic permutation changes route display labels/order **without changing solvability**, using a salted hash that cannot consume global simulation RNG or change canonical/non-slice world digests. At least two distinct layouts across seeds 1–120 are required.

**Clue 1 — service manifest.** The player surveys `nightshade`, observes `ns-relay`, and inspects the relay's `ns-signal` service as today. The inspection exposes a player-facing local manifest: “Cold archives use sealed carriers.” This does not prove which route is correct and does not reveal an observed vault. The same inspection promises the existing broker response on the next 360-minute ecosystem boundary.

**Clue 2A — quiet broker response.** On the scheduled boundary, the broker supplies a current routing hint: “Archive echo: triangle.” Combining that with the earlier manifest identifies the only matching candidate. Time passes normally: contracts, jobs, NPCs and threats all continue. Merely waiting does not solve the map or automatically discover the vault.

**Clue 2B — intrusive signal.** After inspecting the broker service, the player can preview and explicitly confirm the already-existing `escalateOperation` action. In v2 the action immediately reveals a noisy spectral hint (“Archive echo: triangle”) but **does not award `ns-vault` presence**. Escalation still carries D071's high trace, footprint and watch consequences. The player needs the same reasoning and deliberate path verification as on the quiet route. The quiet and intrusive paths differ materially in elapsed time, footprint and NPC response; neither is a one-button solve.

**Owner counterplay.** D071 already schedules an owner review when footprint reaches the watch threshold. When that review runs, the previously valid route becomes stale, the confirmed vault/archival evidence is retired, and the required echo changes from triangle to circle; **sealed** still applies. The player can reread the broker and receive the new mark on the *next* scheduled boundary. A previously correct link is no longer a permanent truth or a magic credential. The projection may show a witnessed rotation but not the new mark until the clue arrives. A subsequent correct verification reestablishes the vault as live evidence.

**Player visibility.** A candidate path being drawn never asserts that it reaches the vault. Labels, unknown endpoints, hypotheses, observed sources, refutations and stale evidence are visually distinct (and not color-only). Projected data must never include a hidden `correctRouteId`, a future mark or a “your answer is correct” boolean before an action observes it.

## 4. Player verbs, costs, partial progress and edge semantics

- **Free inspection:** open topology, focus/select links, read the manifest or known marks, compare clue cards, preview the action and cancel. This is UI-only, consumes **no** game time and reveals no hidden truth.
- **Commit route test:** the new typed simulation command `{ type: "testNightshadeRoute"; routeId: string }` tests a player-visible candidate and consumes **4 base world minutes + 1 low trace** for a valid, executed attempt. This is a proposed initial balance value; it may be changed by recorded decision and measurement, not silently. Preview displays the same cost as the bus applies. Decide during implementation planning whether the existing rig-duration mechanism must scale the four minutes; one common shared calculation is mandatory either way.
- **Correct commitment:** the bus marks that candidate as confirmed in the current routing epoch and records ordinary active `machine-presence` evidence for `ns-vault`, with event provenance. The existing accepted infrastructure-map contract is deliverable only if both required machine evidences are live.
- **Wrong commitment:** the bus records a refuted candidate for that epoch, spends exactly the previewed time and trace, and gives a believable “relay refused route” clue, **not the correct answer**. Known partial clues and prior history persist. The player may try another distinct candidate, wait or retreat. Trace and the existing 5-watch/8-burn rules deter mindless guessing without an invented puzzle-health bar.
- **Same candidate twice in one epoch:** refuse **without time/trace charge**, because the earlier refutation is already known. A new epoch permits reevaluation.
- **Unobserved candidate, unread broker, no open operation, active time job, ended slice or ended run:** reject with a specific diegetic reason, no access to hidden route truth and no unearned charge. Neither rank nor tool price is a validity check.
- **Not all clues available:** a player can mark a tentative hypothesis locally, but **cannot commit a route test** until the broker service and current echo mark are legitimately known. This prevents blind route brute-force from becoming a cheaper information source. The delay-or-escalate decision remains.
- **Retreat, failure, incomplete dossier:** preserve partial known manifest, tentative choices as appropriate, refuted attempts and historical provenance in the save. Existing D071 outcomes (delivered, burned, retreated, locked-out, expired, declined) stay unchanged; do not invent a seventh win state or pay incomplete contracts. A clean withdrawal may leave the existing briefing open per v1's decision rules unless a separately approved design changes it.

**Clock crossing a review boundary:** verification can begin with an apparently valid echo and finish after a 360-minute tick that rotates it. The CommandBus advances the authoritative clock and processes the review **before** deciding whether the hypothesis may award fresh evidence. If the route changed mid-verification, the player's **4 minutes remain spent**, **no route-attributed trace is charged**, and a special “route rotated during verification” event/notice is emitted; no stale vault evidence is created. The preview describes this possible known timing risk without leaking hidden review state. The player may reread and respond. Events occurring during elapsed time, including forced endings, take precedence; no command writes gameplay state after an ending.

**Trace integration:** use the existing `recordTrace`/reaction helpers, with `operation-probe` or an explicitly defined `TraceCause` extension. This requires a single causally identifiable source and correct player-facing summary. Never directly mutate trace, reactions or `worldMinute` in React, terminal, TinyBase or Phaser.

## 5. Architecture and existing seams

Baseline code inspected on live main:
- `src/content/nightshade-slice.ts`: v1 authored clues, outcome copy, relay and vault IDs.
- `src/game/simulation/state/world-state.ts`: literal `NightshadeSliceState.rules: "nightshade-v1"` plus `clues`, `pendingClues`, `review`, `outcome`, `log`, no v2 path.
- `src/game/simulation/systems/nightshade-slice.ts`: D071 clue scheduling, footprint preview, review, vault visibility, and end helpers.
- `src/game/simulation/command-bus.ts`: authoritative dispatch, survey/inspect/escalate, time advancement, trace and contracts.
- `src/game/simulation/commands/types.ts`: `SimulationCommand` union.
- `src/game/simulation/projection/project-world.ts`: `VisibleNightshadeBriefing` with v1 map/preview/clues/log.
- `src/components/game/briefing/nightshade-briefing-panel.tsx`: current textual briefing UI.
- `src/game/simulation/__tests__/nightshade-slice.test.ts`: D071 route tests.
- `docs/DATA_AND_PERSISTENCE.md`, `docs/INTERFACE_AND_DISTROS.md`, `docs/TECHNICAL_ARCHITECTURE.md`: validated save, player-safe display, and authority boundaries.

**State/version contract:** introduce a discriminated `NightshadeSliceState` variant for `"nightshade-v2"` with v1's existing common fields plus a small serializable `routePuzzle` state: stable seed/permutation, routing epoch, route IDs refuted in that epoch, and confirmed candidate+epoch (nullable). Authoritative carrier/mark truth can be derived from fixed v2 content + seed + epoch or saved if required by deterministic migration; never stored twice inconsistently. Keep v1 deserializable and executable **without altering its D071 behavior**.

**New-run migration policy:** once implemented, new authored Nightshade runs use v2; loaded v1 runs stay v1 (including existing D071 golden paths: quiet footprint 3, intrusive 5, trace preview, review behavior). Worlds lacking `slice` remain unchanged. Update the portable Zod save validator to admit both *known* variants and reject invalid v2 state explicitly; do not silently rewrite a malformed puzzle, invent a route on load, change save history, or upgrade old active runs. Any D071 tests requiring v1 must instantiate v1 explicitly rather than being accidentally repurposed by the new default.

**Survey/escalation compatibility:** v1 continues to discover the vault after promised routing or escalation according to D071. In v2, `surveyTarget` discovers only `ns-relay`; `escalateOperation` supplies a hint, **not vault evidence**. Only a *correct route verification* adds `ns-vault` evidence. Contract delivery continues to reuse the existing `requiredMachines` evidence predicate rather than a competing mission progress flag.

**Rules ownership:** put v2 path catalogue/text beside Nightshade content; a focused v2 puzzle module may implement pure candidate/permutation/constraint evaluation; CommandBus is the single side-effect owner; the scheduler owns boundary order; the projection maps only legitimate player knowledge. Avoid large unrelated refactors or generic engine abstractions in P1.

**Events:** record route tested/refuted/confirmed/stale with candidate/epoch, world minute and associated trace/evidence identity where applicable. They are causal history; no independent gameplay truth is reconstructed from a GUI component. The exact TypeScript names and signatures belong in the post-approval implementation plan.

**GUI:** a compact, manipulable network map with route cards and readable clue comparison, keyboard/touch focus, 390px mobile layout, alternate list/table view for nonvisual navigation, clear “tentative”, “confirmed”, “stale” and “refuted” states. Optional drag-and-drop is *not* the only input path. Use G1's modal clock-hold behavior for verification confirmation; the clock must not silently run while someone reads its consequences. Small replaceable visual treatments, not final art assets.

**Terminal:** discoverable read-only aliases such as `path map`, `path inspect <id>`, `path preview <id>` plus committed `path test <id>`. Only the committed verb mutates and dispatches `testNightshadeRoute`; CLI and GUI must share exactly the same authoritative projection, world time, errors and events. Existing `brief`, `op preview`, contract, survey and inspect remain operational.

**Untrusted information:** this slice's clues have explicit source/provenance and visibility. Do not pretend a broker message is automatically safe or trustworthy, but full attachment/VM simulation belongs to the later Untrusted Drop candidate. No real network requests or host-machine scanning.

## 6. Acceptance matrix and reproducibility

These are **future required tests, not tests run in this design PR**:

1. New v2 briefing shows three **candidate** links and an unresolved destination; before inference, `ns-vault` is not in player-visible confirmed evidence or operation completion.
2. Quiet broker path: survey+inspect; sealed manifest now, triangle mark on the already scheduled 360-minute boundary; player commits the one matching route; vault presence appears; accepted map delivers, with exact trace/time/events.
3. Intrusive path: inspect service, preview + confirmed escalation; triangle spectral hint now, +3 high trace/watch as appropriate; player still commits a hypothesis; same objective, different risk and world time.
4. Bad candidate: 4 minutes +1 trace, no vault evidence, in-world failed-hypothesis clue, partial evidence retained. Same candidate same epoch repeat costs nothing.
5. Watch/review rotates echo from triangle to circle, retires previously confirmed vault evidence and prior route. Re-read broker arrives next boundary; revised link can be proved. Incorrect older link cannot be silently reused.
6. At minute 359 or equivalent near a boundary, a route verification crossing scheduled review cannot smuggle stale evidence. Time charges exactly once; unrelated scheduled events fire once; first-ending-wins.
7. Seed sweep 1–120: at least two layouts, every seed one unique satisfying path, reproducible after save/reload, no hidden truth in projection or candidate labels.
8. Old v1 save and golden D071 routes byte-behavior-equivalent; ordinary worlds and inactive slices retain baseline digests; valid old schemas load, invalid new puzzle payloads explicitly fail.
9. Terminal-vs-GUI command parity, including preview/cost, failures, world minute, trace, replay and save/recovery. Desktop and 390px browser checks, accessible selection/focus/reduced-motion, epistemic truth cues never color-only.
10. Ended/expired/retreated state and incomplete contract cannot gain post-terminal evidence or payments.

**Human experience gate — NOT RUN:** ask a first-time player to identify the relevant clues, explain their hypothesis, choose quiet vs intrusive deliberately, and understand one mistake and NPC countermove during a complete 20–30-minute playtest. Record where they guessed, became bored, misunderstood trace or read a hidden fact through UI. Browser smoke and unit tests cannot satisfy this gate.

## 7. Rollout, risks and explicit stop boundaries

1. Review and approve this **written spec**; do not treat approval of the earlier brainstorming approach as approval of implementation.
2. Invoke Superpowers `writing-plans` only after written-spec approval. Produce a focused, dependency-ordered plan with typed signatures, test-first steps, v1/v2 contract, targeted browser checks, exact Node 24 commands and a second review gate.
3. After plan approval, implement the smallest coherent v2 slice with local validation, small reviewed PRs and no unnecessary GitHub Actions.
4. G3 #79 ultimately requires social/intelligence, technical and indirect/relay **strategy families**, generated worlds and deeper mini-games. This P1 intentionally supplies only **two information paths feeding one network-reasoning challenge**; it cannot close #79 or substitute for the G0/G1/G3 human playtests.

**Highest-risk defects:** a v1 save silently becoming v2; old survey/escalation auto-discovering vault in v2; candidate display showing hidden truth; wrong path not costing its preview; defensive tick racing a verification; stale route surviving review; GUI having a different rule engine; 360-minute quiet wait being dull; reading confirmation while the live clock continues. Each needs explicit implementation-plan tests or human UX observation.

**Decision-log policy:** this is a *proposed design*, not a newly ratified D073 decision. Once the user approves the written spec, record any corresponding D073 decision with the accepted rules and the link to this document. Full art style, VM/sandboxing, cameras, travel and Tauri remain outside P1.
