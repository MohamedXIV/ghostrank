# Phase 6 P1 — Authority Investigations: A Case File Read as Evidence

Issue: #24 — this slice delivers the second of six, *authority investigations*,
and gives Phase 6 its first threat that runs on the world's clock instead of the
player's attention. Builds on: Phase 2's causal substrate
(`2026-10-02-phase-2-traces.md`, `2026-10-02-phase-2-opponent-reaction.md`) — the
`OperationTrace` weights and `OpponentReaction.footprintScore` are the only
inputs — and Phase 6 P0's physical layer (D031), which is what later slices
threaten. The slice map and grounding live in `2026-10-04-phase-6-plan.md`.

## Goal

`docs/GAME_DESIGN.md` names *authorities* first in its threat sources, and
specifies how any of that danger arrives:
"Threat should rarely be summarized by one visible Heat percentage. The player
instead receives evidence: strange probes, missing contacts, unusual logins,
changed marketplace behavior, news, vehicles, calls, door-camera activity,
outages, rumors, or suspicious messages." `docs/WORLD_RUNS_AND_ENDINGS.md` adds
"the game should avoid explicit countdown warnings when ambiguity is more
effective".

Before this slice the causal footprint was real but went nowhere: an
escalate-and-exit cycle raised a target's defensive watch, and the watch sat
there affecting incident rolls while the player was told nothing. P1 turns that
footprint into a **case file that exists in world truth, moves on boundaries the
world already has, and reaches the player only as things they noticed** — no
meter, no percentage, no deadline, and no `RunEnded`.

## The model

`src/game/simulation/systems/investigations.ts` (new; one fold, four constants):

- `advanceInvestigations(world, toMinute)` is called from
  `CommandBus.advanceWorldTime`, between `advanceBuilds` and
  `advanceUnderground`. It takes **no `fromMinute`** (D032): the file is derived
  from the trace history, so a window argument would be a second, drift-prone
  way of saying the same thing.
- **Opening.** A target whose recorded trace weights reach
  `INVESTIGATION_OPEN_FOOTPRINT = 5` gets exactly one `Investigation`. The
  opening minute is not "now": it is the first review boundary strictly after the
  minute the running total crossed, so a wait that covers the boundary and a wait
  that lands on it open the same file with the same material. Five is the same
  threshold that already raises a defensive watch in Phase 2 — the authorities
  and the target's own defenders are reacting to one footprint, not two.
- **Material.** `progress` at a boundary is the footprint recorded by then, plus
  `INVESTIGATION_REVIEW_ATTENTION = 1` per boundary in `(opened, now]` that had
  **new** footprint to look at. A review that finds nothing new files nothing,
  which is what makes laying low a real response instead of a placebo, and
  nothing is subtracted, which is what makes it a cooling rather than a reset.
  A reaction is cited for provenance and never re-counted: its `footprintScore`
  *is* those traces' weights.
- **Evidence.** `INVESTIGATION_SIGNAL_THRESHOLDS = [5, 10, 16]` gate the three
  kinds in `INVESTIGATION_SIGNAL_KINDS` (`unusual-login`,
  `marketplace-behavior`, `suspicious-message` — the docs' own words, with
  "strange probes" left for P2's peers and the physical signals for P3). One item
  per boundary at most, so a heavy burst arrives as a drip over following
  boundaries rather than one panic message per click. There is deliberately no
  fourth level: past `converging` the material keeps growing where the player
  cannot read it, for P3 and P4 to consume, and outliving an investigation is
  silence rather than a warning that stops.
- **Stage.** `deriveInvestigationStage(signals)` → `probing` / `warming` /
  `converging`, from the count of *surfaced* evidence, never from material — so
  the band describes what the player has been told rather than being a meter with
  three tick marks. Same bands-not-numbers discipline as `FootprintLevel`,
  `HousingAnonymity`, `relationshipStance`.

State: `world.investigations: Investigation[]` — `id`, `targetId`,
`openedWorldMinute`, hidden `progress`, hidden `sourceIds`, and the visible-by-
provenance `signals[]` (`id`, `kind`, `surfacedWorldMinute`). Optional in
`InitialWorldState`, defaulted to `[]`, zod-parsed with `.default([])` per
array. Event: one new `InvestigationAdvanced`, carrying the surfaced item and the
recomputed stage; it joins the `eventWorldMinute` group in
`sqlite-run-persistence.ts`, which is the only exhaustive event switch in `src`
(`persistedEventSchema.type` is a plain string, so nothing else in persistence
changes).

## Surface (Terminal / GUI / Phaser — one path)

- Projection: `WorldProjection.investigations: VisibleInvestigation[]`, where a
  file is `{ id, targetId, stage, signals }` and a signal is `{ id, kind,
  targetHandle, worldMinute }`. `progress`, `sourceIds`, and
  `openedWorldMinute` are withheld (D028's hidden-truth rule), `targetHandle` is
  the display handle the player already earned by observing the target, and a
  file whose target is not in `knownTargetIds` projects nothing at all. Signals
  come newest-first so a renderer cannot imply a queue.
- TinyBase: `investigations` (one row per file: `targetId`, `stage`) and
  `investigationSignals` (one row per item: `investigationId`, `targetId`,
  `targetHandle`, `kind`, `worldMinute`).
- GUI: a new **ATTENTION** section in the Underground app, immediately after the
  social HEAT list — same visual grammar (minute + one sentence), deliberately
  adjacent so a player reads the two as different kinds of trouble. Empty state
  is "Nothing unusual in the logs. Nobody has asked about you yet."; each line is
  written as a thing the player noticed (`describeSignal`), and the caveat says
  outright that none of it says how close anyone is.
- Terminal: **no new verb, so no parity obligation.** Parity is per-verb
  (AGENTS.md); P1 adds no command, and passive projected state already has
  precedent for living in the GUI only — HEAT, the forum, the public feed and the
  inbox listing are all projection reads, and the terminal's `read <message-id>`
  is the only one with a verb because marking a message read is a state change.
  A `logs` verb would be a read-only command with nothing to change; if P3's
  physical events make a terminal read genuinely useful, it arrives with a verb
  that also *does* something (relocating, burning a relay).
- Phaser: untouched. Nothing in the scene can read a case file, and P3's physical
  signals are the first thing worth drawing in the room.

## Alternatives weighed (and rejected)

- **A roll against a hidden difficulty score** (`hashUnit(seed, "investigation",
  tick, targetId)`). Rejected: it would be the phase's first case of inventing a
  secret number and then rolling against it, and P5's postmortem is supposed to
  show *what the player did*, which a roll launders into luck. Arithmetic over
  the footprint the player already emitted is exact, seed-independent (pinned by
  test), and citable.
- **Accruing material per boundary and storing the total** (the first draft of
  this module). Rejected on verification, not in the abstract: `advanceWorldTime`
  is capped at `MAX_CATCHUP_TICKS = 28` boundaries, so a 60-day wait runs fewer
  reviews than a 60-day wait issued in chunks — an imperative loop would produce
  different `progress` and different evidence depending on how the player pressed
  `wait`. Deriving material and citations from the trace history at `toMinute`
  makes split-invariance a property of the math instead of a property of the
  call pattern. `signals` stays stored because it is the one fact a pure read
  cannot recover: what the player has already been told. D032 records it.
- **A heat/pressure bar in the HUD.** Rejected by the design rule quoted above
  and re-confirmed here: the phase's identity is that threat is *evidence*. A
  bar is also a farmable number, and `deriveInvestigationStage` counts surfaced
  items so the visible band cannot become a proxy meter.
- **Routing the signals through `rumors`/`inbox`.** The kickoff plan sketched
  this. Rejected on contact with the shapes: `UndergroundRumor` is a
  third-party claim with `actorId`/`counterpartId`/`relayId` and an `accurate`
  flag about *someone else's* business, and `UndergroundMessage` requires a
  `fromId` and a `rumorId`. Authority evidence is first-person observation of
  your own logs — filing it as gossip would either fabricate a messenger or force
  a fake rumor kind, and the P0 lesson (build against the code, not the sketch)
  applies again.
- **Opening a file from rank.** Rejected as the phase's central prohibition:
  rank raises who *talks* about you (P2, the grudge ladder), never what an
  authority's paperwork contains. A test runs the identical history at rank 1 and
  rank 999_999 and requires identical files.
- **`RunEnded`, or a deadline on the file.** Out of the phase by contract (the
  Phase 7 boundary in the kickoff plan) and out of this slice by design:
  `surfacedWorldMinute` is a past minute, and the projection is JSON-scanned in
  test for `deadline`/`expires` to keep it that way.

## Invariants (all pinned by `src/game/simulation/__tests__/phase-6-authority.test.ts`, 32 tests)

- zero-regression: a default world has `investigations: []`, the fold emits
  nothing and mutates nothing (`toEqual` a `structuredClone`) over 30 days, a
  30-day idle wait emits no `InvestigationAdvanced`, and a single recon-stage
  trace (weight 1) never opens a file;
- opening: exactly one file per target on the boundary *after* the crossing, at
  `progress === 5`; cites `["trace:1","trace:2","reaction:1"]`; a reaction is
  never double-charged (`progress === sum(trace weights)`); sub-threshold
  footprint stays closed however long you wait (40 days);
- evidence: the first `InvestigationAdvanced` object is pinned field-by-field; a
  30-weight burst in one minute still surfaces one item per boundary and all
  three kinds in order, then silence; hidden material keeps accruing past the
  last band; `deriveInvestigationStage` is pinned for 0/1/2/3 signals; a second
  reckless cycle warms the file, emits exactly one event, and cites 4 traces;
- laying low: with no new footprint, 20 further days add no material, no signal,
  and no citation; nothing already noticed is ever lost;
- no roll / no rank / no gate: seed 20261003 vs 7 identical; rank 1 vs 999_999
  identical (and the low-rank world really was rank 1); every verb still answers
  at a converged file, including `escalateOperation`, `surveyTarget`, and
  `rentHousing`; a file whose target has lost its profile evidence projects
  nothing while still existing in truth;
- split and save invariance: 12 days in one command ≡ 41/200/12d−241; landing on
  a boundary ≡ crossing it; a capped 60-day single wait keeps the same targets,
  the same signal kinds, and the same `sourceIds` as the chunked 60 days; a
  portable round-trip is `toEqual` the live state; legacy JSON without the field
  loads `investigations: []`; resume-at-3-days + 9 ≡ straight 12;
- projection: the key sets are pinned exactly to `{id, signals, stage, targetId}`
  and `{id, kind, targetHandle, worldMinute}`; the serialized projection is
  scanned for `progress`, `sourceIds`, `openedWorldMinute`, `trace:`, `reaction:`,
  `deadline`, `expires`; a default world projects `[]`; both TinyBase tables carry
  the pinned columns; the evidence list only grows as the world keeps reviewing.

Honest test edits elsewhere: only `world-projection.test.ts`, whose hand-built
fixture must carry `investigations` (a shape-forced edit, not a behaviour
change).

Gates: tsc clean, **547 tests / 51 files** (515 → 547 from the new file), lint
only the pre-existing `postcss.config.mjs` warning, production build succeeds.
Zero-regression held: every pre-Phase-6 trace, reaction, upkeep, build,
ecosystem, projection, and persistence test re-ran byte-identical.

## Out of scope (recorded, not silently dropped)

- **Nothing consumes `progress` yet, and nothing consumes `anonymity`.** P1 ships
  the hidden pressure behind the band; P3 (physical retaliation) reads
  `progress` as a targeting input alongside D031's anonymity band, and P4 reads
  both for catastrophic compromise. Stated rather than hidden, the Phase 5 P0
  pattern.
- **No physical signals.** Vehicles, knocks, door-camera motion, outages are
  P3's, where something can actually arrive at a place.
- **No rival probes.** "Strange probes" and "missing contacts" are P2's, from
  the `npcAssistDeltas` third seat — a peer's curiosity is not an authority's
  paperwork, and the two must not share an event type.
- **No `RunEnded`, no endings, no run history.** Phase 7's by contract.
- **No takedown mechanic.** A converging file blocks nothing and weakens nothing
  today; if it ever should, that is a new decision, and the never-a-gate rule
  means the answer is "more exposure and more evidence", never "you may not".
- **Postmortem chains.** `sourceIds` is exactly the data P5 needs, and P5 reads
  it; surfacing causality is its own slice, not a side effect of this one.
