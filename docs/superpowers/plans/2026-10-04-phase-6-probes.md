# Phase 6 P2 — Rival Probes: Automation Aimed at the Player

Issue: #24 — this slice delivers the third of six, *rival probes*, and discharges
#23's first recorded handoff: `docs/AI_SYSTEMS.md` lists "use automation to watch
the player" under "NPC use", Phase 5 P4 shipped NPC model use as NPC-vs-NPC only,
and the deferral was written down twice (D030's "event-layer beat, likely with
Phase 6's threat drama", `2026-10-04-phase-5-marketplace.md`'s "*use AI against
you* is Phase 6 territory"). Builds on Phase 5 P4's `npcAssistDeltas`
(`2026-10-04-phase-5-marketplace.md`, D030 — this is its **third seat**), Phase 6
P0's `anonymity` band (D031 — shipped unread, read here), and Phase 6 P1's
evidence doctrine (D032 — reused, with one deliberate inversion). The slice map
lives in `2026-10-04-phase-6-plan.md`.

## Goal

The approved kickoff plan states the deliverable exactly: "Peers spend their tick
probing the player using the same `npcAssistDeltas` primitive already read from
the offence and defence seats, so AI-assisted probers make AI-assisted mistakes in
the same math. A probe lifts *the prober's* knowledge of the player's
infrastructure standing (hidden truth, persisted, unprojected) and leaks a signal
the player can observe; a player who lays low, changes relays, or relocates raises
the odds the read is wrong. Tests must prove rank is not an input, that an
unprobed world re-runs byte-identical, and that a probe never gates a target or an
action."

`docs/GAME_DESIGN.md`'s evidence line already reserved this slice's vocabulary —
"strange probes, missing contacts" are the *peer* items in a list whose authority
entries P1 shipped and whose physical entries P3 owns. So the goal is two-sided:
give the ecosystem its first act performed *on the player rather than beside them*,
and give the player a threat they can genuinely outplay by moving, quieting, and
changing relays — with the read's hidden half (`who`, `what for`, `right or wrong`)
stored for P3 to be fooled by, and never shown.

## The model

`src/game/simulation/systems/probes.ts` (new; twelve exported constants, five
exported functions).

- **Placement inside the ecosystem loop.** `probeTick(world, tickIndex,
  worldMinute, candidates)` is called from inside `advanceUnderground`'s existing
  tick loop, last in the tick, after `retaliate` and `offerContracts`. A probe is
  an *action*, so it takes its tick index from the loop that already computes it,
  inherits the `MAX_CATCHUP_TICKS = 28` cap the ecosystem already obeys, and needs
  **no second clock cursor on the save** — no `lastProbeMinute`, no new field
  inside `underground`. This is the deliberate inversion of D032: P1's case
  material is a *reading of the record*, so a skipped review must not erase it; a
  probe is a peer *doing a thing*, so a tick that never ran is a probe that never
  happened. Both behaviors are correct, and the difference is exactly what D032
  was pointing at.
- **Candidates: grudge, never rank.** `probeCandidates(world)` returns peers whose
  relationship toward `PLAYER_ACTOR_ID` holds `grudge >= PROBE_MIN_GRUDGE = 5` —
  deliberately below the smear ladder's 30, because curiosity is cheap and
  retaliation is expensive, and the escalation ladder stays P3's to own.
  `player.rank` is not consulted anywhere in the module: not in the candidate
  test, not in an attempt roll, not in an accuracy term, not in an artifact. Below
  the floor there are no candidates at all, which is the mechanical basis of
  byte-identity.
- **Three rolls per attempting peer, all salted the ecosystem way**: `probe-try`
  (`PROBE_TICK_PERCENT = 14`), `probe-subject` over `RIVAL_PROBE_SUBJECTS =
  ["rig","dwelling","habits"]`, and `probe-read` against `probeCorrectPercent`.
  Nothing else is rolled — the artifact is *derived* (see below).
- **Accuracy from player-controlled truth only** (`probeCorrectPercent`): base
  `PROBE_BASE_PERCENT = 36`; footprint band via `perceivedExposureBand` (mirrors
  `footprintLevel`'s own 0/≤2/≤4 cuts, so a rival cannot see a number the player
  cannot infer) with `PROBE_EXPOSURE_ADJUST` −24/−12/0/+10; dwelling `anonymity`
  band via `derivePresence` with `PROBE_ANONYMITY_ADJUST` 0/−10/−18 (D031's band,
  finally consumed); `quiet exits > escalations` — the sim's only vocabulary for
  "changes relays" — adding `PROBE_QUIET_HABIT_ADJUST = −8`; an open `intrusive`
  operation adding `PROBE_ACTIVE_INTRUSION_ADJUST = +10`; and the assist seat:
  `npcAssistDeltas(seed, tickIndex, actor.id, model)` — literally the same call,
  the same salting, the same tick as the offence seat — scaled by
  `PROBE_ASSIST_QUALITY_PER_POINT = 3`, with `PROBE_MISTAKE_PENALTY = 12` on the
  negative branch, because a model that misreads a pattern does so *with
  confidence* and a rival trusts it. Clamped to `[8, 78]`: D030's "fallible, never
  deterministic" binds the threat systems as hard as it binds the player's own
  assistant, so the quietest conceivable player is still readable *sometimes* and
  the loudest is never readable *always*.
- **The read is a durable record, not a hidden scalar.** No per-actor knowledge
  number exists to desync or farm: the `RivalProbe` row *is* the lift — `actorId`,
  `subject`, `correct`, `worldMinute`. `correct: false` is stored as false, so P3
  can target you on a genuinely wrong belief, and D028's rule holds exactly:
  hidden truth persists, never projects.
- **What you see is the tell, not the read.** `probeArtifactOf(subject)` maps
  rig→`probe-ping`, dwelling→`caller-question`, habits→`missing-contact` — the
  three lines of the docs' evidence list that belong to peers ("strange probes",
  "calls", "missing contacts"), deliberately disjoint from P1's authority kinds.
  Nothing is rolled for it and no `artifactKind` is stored: a second field would
  be a second source of truth for one event (D031's rule re-applied). The
  projection carries `{ id, artifactKind, worldMinute }` — three facts *short* of
  the record, because you cannot observe a rival's belief, or even what they were
  looking for; the inference from tell back to seat is the reasoning the game asks
  you to do.

State: `world.probes: RivalProbe[]`, **top level, not inside `underground`** — an
addition inside `underground` would have broken that object's exact-shape legacy
assertion for no gain, and a probe is a fact about the player, not ecosystem
bookkeeping. Optional in `InitialWorldState`, defaulted `[]`, zod `.default([])`.
Event: one new `RivalProbe` variant carrying the artifact and the actor id (world
truth, citable by P3/P5, never projected); it joins the `eventWorldMinute` group
in `sqlite-run-persistence.ts`, the only exhaustive event switch in `src`.

## Surface (Terminal / GUI / Phaser — one path)

- Projection: `WorldProjection.probes: VisibleProbe[]`, newest first so a
  renderer cannot imply a queue. `actorId`, `subject`, and `correct` are withheld
  at the leak boundary; `artifactKind` is re-derived at project time from the
  stored seat, so the surface can never contradict the world and a restored game
  shows exactly the tells it showed before.
- TinyBase: one `probes` table, `{ artifactKind, worldMinute }` per row. No
  actor, no seat, no verdict — a test JSON-scans the table itself, not only the
  projection.
- GUI: the existing **ATTENTION** panel grows a second source. Probe tells render
  through `describeProbeTell` in the same minute-plus-one-sentence grammar
  ("a probe touched a port you were not listening on", "an unknown number asked
  for you by name", "a contact went quiet mid-sentence, right after someone
  leaned on them"), and the panel's caveat — "lay low, change relays, or move, and
  see whether the list stops growing" — is now literally true for both sources.
- Terminal: **no new verb, so no parity obligation**, same argument as D032. If
  P3 makes a terminal read load-bearing, it arrives with a verb that also acts.
- Phaser: untouched. The room shows where you are; it does not read logs.

## Alternatives weighed (and rejected)

- **A second clock cursor (`underground.lastProbeMinute`) with an
  `advanceProbes` fold.** The shape P1's successor might naively copy. Rejected
  twice over: it adds a required field to a persisted object whose exact legacy
  shape is pinned, and it invents a parallel timekeeping rule for something the
  ecosystem loop already times. Probing is what a peer *does on its tick*; it
  belongs in the tick loop, full stop.
- **Interest from rank.** Rejected as the phase's central prohibition and tested
  as an equality: the same history at rank 1 and rank 999,999 is probed by the
  same peers at the same minutes with the same reads. Rank is what the scene
  talks about; grudge is what a rival spends effort on.
- **Knowledge as a per-actor scalar** (a hidden `awareness` 0–100 that decays).
  Rejected: a scalar is farmable, desyncable, and un-citable — P5's postmortem
  needs named records with minutes and sources, and P3 needs to be *wrong* in a
  way it can be shown to have been wrong. Append-only `RivalProbe` rows give both
  for free and add nothing to decay.
- **Rolling `artifactKind` independently of `subject` (and storing it).** The first
  draft did this — two rolls, two fields, two chances for the tell and the belief
  to disagree across a save. Rejected on D031's one-source-of-truth rule; the
  tell is derived from the seat, and the third kind (`caller-question`) was added
  so the three seats map three distinct ways.
- **Exposing the prober's handle, or a per-read accuracy percentage.** Rejected by
  the phase's identity: threat is evidence, and you cannot observe a belief. A
  handle would also launder grudge mechanics into a reputation readout.
- **A new command or panel to "check for probes".** Rejected: detection is not a
  verb the player takes, it is what the logs already contain; adding a command
  would create a parity obligation where none exists and a farming loop out of
  evidence.

## Invariants (all pinned by `src/game/simulation/__tests__/phase-6-probes.test.ts`, 29 tests)

- byte identity: six scenario digests of the *ecosystem/roll-stream payload* —
  captured from the pre-P2 code (`idle-60d`, `quiet-30d`, `reckless-6d`,
  `reckless-60d`, `provoked-30d`, `housed-20d`) — replay exactly; and the same
  runs are shown to genuinely produce probes (or genuinely not), so identity is
  non-vacuous;
- zero regression: `probes: []` on every fresh world; a candidate-less tick emits
  nothing and mutates nothing (`toEqual` a `structuredClone`);
- rank never an input: full-run `probes` arrays identical at rank 1 vs 999,999;
  `probeCorrectPercent` unchanged when rank is rewritten; every verb still answers
  in a heavily probed world (observe, survey, escalate, disengage, rent);
- counterplay monotone in the player's favor: footprint bands strictly ordered,
  `public > quiet > hidden` dwellings, quiet-exit balance applied by exactly its
  term, an open intrusive operation by exactly its term; bounds hold across a
  120-tick sweep with the frontier model, and the quietest legal world is pinned
  to sit *below* its raw terms so the floor — not determinism — is what keeps it
  readable;
- the third seat is the same seat: a 200-tick sweep pins both branches
  algebraically (`bare + delta × 3` on the lift, `bare + delta × 3 − 12` on the
  miss) against the identical `npcAssistDeltas` call, and requires both branches
  to have actually occurred;
- action semantics: hourly splits ≡ one command under the cap; a split across a
  retaliation ≡ one big wait (the per-tick candidate re-derivation is what makes
  this true); a capped 60-day wait records only ticks inside its own window and
  its ids stay `probe:N`-sequential while the chunked run has strictly earlier
  first records — skipping, never fabricating;
- saves: portable round-trip `toEqual` the live state; resume-at-10-days + 15 ≡
  straight 25 including every `correct: false`; legacy JSON without the field
  loads `probes: []`;
- projection: key sets pinned to `{artifactKind, id, worldMinute}` and store rows
  to `{artifactKind, worldMinute}`; serialized output scanned for `actorId`,
  `correct`, `subject`, the three seat names, every actor id, `heat`, `deadline`,
  `percent`; flipping every `correct` in the world changes nothing visible; the
  tell list only grows.

Honest test edits elsewhere: only `world-projection.test.ts`, whose hand-built
fixture must carry `probes` (a shape-forced edit, not a behaviour change).

Gates: tsc clean, **576 tests / 52 files** (547 → 576 from the new file), lint
only the pre-existing `postcss.config.mjs` warning, production build succeeds.
Zero-regression held: every pre-P2 trace, reaction, upkeep, build, ecosystem,
contracts, projection, and persistence test re-ran byte-identical, and the six
golden digests above are the strongest form of that claim.

## Out of scope (recorded, not silently dropped)

- **Nothing consumes `probes` yet.** P3 is the first reader: a rival's targeting
  should consult the records it holds (`subject` says which seat was aimed at,
  `correct` says whether it should be trusted), and P5 folds probe records into
  the causal chain. Stated rather than hidden, the Phase 5 P0 pattern.
- **No physical signals, no relocation consequences, no endings.** Vehicles,
  knocks, outages, and lease loss are P3's; the missing-contact tell here is a
  *rumor of* pressure on a contact, not a contact removed — removal is a physical
  act and P3's to perform. `RunEnded` is Phase 7's by contract.
- **No probe-aware counterplay verb.** "Changes relays" is currently expressed by
  the quiet-exit/escalation balance and by relocation economics; a literal
  relay-rotation mechanic is not in the game yet, and faking one would be
  flavour, not math.
- **No rank-visibility loop.** Rank still never enters probe math even *as
  visibility*; if a later slice wants the scene to talk about a famous handle,
  that is a new decision, and the never-a-gate rule still binds it.
