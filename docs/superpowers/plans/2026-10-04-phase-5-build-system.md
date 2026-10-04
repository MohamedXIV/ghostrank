# Phase 5 P3 — Software Specification and Virtual Workflow/IR Build System (The Forge)

Issue: #23 — this slice delivers the phase's *player can replace a premium
workflow with a self-built one* exit criterion, discharges the #22 **self-
authoring handoff** (pinned in the kickoff plan since Phase 4 closure), and
consumes P1's promise that "the pool has a designed next tenant: P3's build
queue". Builds on: P0's seeded model properties (reasoning now decides build
quality), P1's contention pool (now multi-tenant), P2's fallibility doctrine
(frozen seeded rolls, capped odds, disclosure rules), the upkeep tick (builds
complete like bills are levied), and the instance-id pattern every owned layer
uses (`kind:N` max-suffix).

## Goal

Turn the assistant into a programmer: `build <spec-id>` hands it a **workflow
spec** — a safe workflow/IR, pure fictional data — the rig works on it for
world time, and the finished program is a permanent, fee-free workflow whose
effect replaces a premium license and whose *quality* depends on the assistant
that wrote it. Three deliverables from the issue land together here: the
software specification (the spec catalog + FORGE panel), the virtual
workflow/IR build system (queue, commands, completion tick), and build
time/tests/defects (frozen clocks, spec test reports, the three-outcome roll).

## What a spec is (the grounding decision)

`docs/HACKING_AND_TOOLS.md`: "A program is stored as a safe workflow/IR, for
example: `discover(target) → inspect(services) → …`" — and generated software
must be "safe virtual data, not executable host code" (#23). So
`src/content/workflow-spec-catalog.ts` holds specs as **data only**:

- `steps: readonly string[]` — the IR itself, fictional pipeline notation for
  the panel and the fiction, never parsed, never executed;
- `effect: SoftwareEffect` — the payoff, in the *exact* language licenses,
  tools, and models compose in;
- `complexityMinutes` — base build time at a compute-1 rig;
- `footprint { vram, storage }` — what the in-flight job occupies;
- `tests: readonly string[]` — the spec's fictional test report, shown with
  the owned workflow (deliverable "build time/tests/defects" made visible);
- `replaces: string` — the premium license id the clean copy substitutes.

**Three specs mirror the three premium licenses one-for-one**, deliberately:
the exit criterion says "at least one", and the only way to make that
*checkable* rather than vibes-based is a bijection. Homegrown Monitoring Loop
→ network +2 (Commercial Monitoring Suite, 40/day); Automated Recon Pipeline →
memory +2 / network +1 (Automated Recon Framework, 70/day); Self-Built Analysis
Pipeline → ×0.85 (Optimized Analysis Pipeline, 100/day). A test asserts the
bijection (three specs, three distinct real `replaces` ids) and, for every
spec, that a *clean* copy's delivered effect is byte-identical to the license
it substitutes — the exit criterion as a checked fact, not a vibe — while the
IR grammar is pinned to `^[a-z_]+\([^)]*\) → [a-z ]+$` so no executable syntax
can hide in a step.

Reused, not rebuilt: `workflowEffects` returns a plain `SoftwareEffect[]`, so
`combineCapabilities`/`combineFactors` fold self-built software through the
*same* derivation as purchased tools — #23's core rule enforced by there being
no second system. Owned capability enters `effectiveCapability` as one more
`addCapability` term; modifier specs join the factor list between tools and
the model.

## The build economics: the triangle, not the wallet

Commissioning moves **zero credits**. The price is:

- **time** — `buildMinutes =` compute-accelerated `complexityMinutes` (same
  `max(1, ceil(base × 1 / compute))` curve as operation actions) scaled by the
  running model's **delivered** factor (contention-aware, `contestedModelFactor`
  against `poolForNewBuild` = rig minus queue minus this job's own footprint),
  floored at one minute. **Frozen at commissioning**, so a split wait cannot
  re-time a job — the same split-invariance proof as `rigActionMinutes`;
- **occupancy** — the job holds its footprint on the vram/storage pool until
  its due minute, which makes the forge P1's promised **second tenant**:
  `availablePool` subtracts the whole queue before a local model measures its
  shortcut, and before a new commission measures its estimate. Cloud models
  (footprint 0/0) ignore the queue entirely — the provider hosts them. The
  docs' worked example ("model occupies GPU while building — pause / quality /
  rent / slower") becomes a live four-way choice in both directions, and the
  docs' "interruptions" land as a *consequence of freezing*, not a new
  mechanic: mid-build changes reach future builds and the pool, never the
  frozen current job.

Completion rides the clock: `advanceBuilds(world, toMinute)` fires inside
`advanceWorldTime` right after `advanceUpkeep`, moves every due job into
`economy.ownedWorkflows` in due-minute order at `worldMinute = dueWorldMinute`,
and emits `BuildCompleted`. Empty queue → no events, no mutation: exact
zero-regression.

## Quality: one frozen roll, the P2 doctrine re-priced

`rollBuildOutcome(seed, startMinute, modelId, spec, properties)` — deterministic
`hashUnit`, rolled **once at start**, stored on the job:

- `cleanOdds = 0.7 × clamp(round(reasoning),1,5)/5` — capped below certainty
  by construction, and *lower* than analysis's 0.8 cap on purpose: writing a
  whole working program is harder than labelling one host, so even the
  frontier class ships defects some of the time;
- a miss splits on `reliability`: `warningOdds = 0.3 + 0.5 × band/5` →
  **warnings** (cosmetic — delivered in full, fiction for the player to read)
  vs **defective**;
- `deliverableEffect`: defective capability halves every nonzero axis with a
  floor of 1 (never zeroes a lift), defective modifier pulls its factor
  halfway back toward ×1 (0.85 → 0.925, never past). Broken home-built
  software is disappointing, never a trap — the lift-never-punishment rule
  holds even for the player's own copies.

## The disclosure asymmetry (the load-bearing decision)

P2's leak rule protected *someone else's* hidden topology. The forge has the
same problem twice, with opposite answers:

- an **in-flight build's outcome is hidden** (`VisibleBuild` carries no
  `outcome` field; the projection must not contain "clean"/"warnings"/
  "defective" while a job runs) — a report card readable halfway through the
  job grades the roll for free and dissolves the build-time tension;
- an **owned workflow projects in full** — outcome, test report, which
  assistant built it, when it landed. It is the player's own ground truth,
  witnessed from commissioning; hiding it would protect nothing and leave the
  "tests and defects" deliverable unsurfaceable.

The asymmetry is principled, not inconsistent: P2 leaked because claims
described unearned structure; P3 hides only because the *roll* isn't settled
in the player's eyes until the job lands. Once it lands, the player earned it.

## Commands and gates

- `build <spec-id>` → `startBuild` — gates: `WORKFLOW_SPEC_NOT_FOUND` (catalog
  lookup first, mirroring the analyze gate order), then `NO_ACTIVE_MODEL`,
  then stale-save `MODEL_NOT_FOUND`. Instant: no world time, no trace, no
  credits. The assistant is the *function* required, never a target gate —
  survey/inspect/buy stay model-free forever (P2's tested rule, re-asserted).
- `build abort <build-id>` → `abortBuild` — `BUILD_NOT_FOUND` or free removal;
  no penalty, the slot just opens. Compound verb on the `box`/`model` parser
  precedent: a bare first arg is the spec id, `abort` claims the sub-word.
- Terminal + GUI parity: `parseBuildCommand`, `startBuildFromGui`,
  `abortBuildFromGui` (economy-actions), parity tests appended to
  `economy-commands.test.ts`; terminal banner and `help` gain both verbs;
  `describeCommandResult` covers them.

## State and persistence

- `WorldState.builds: InFlightBuild[]` and `economy.ownedWorkflows:
  OwnedWorkflow[]` — both optional-default-empty (`InitialWorldState.builds`,
  schema `.default([])`): every default world starts with no queue and an empty
  garage, the exact zero-regression pattern;
- `InFlightBuild { id, specId, modelId, startedWorldMinute, dueWorldMinute,
  outcome }` — everything load-bearing is frozen at start; `OwnedWorkflow
  { id, specId, label, outcome, builtWithModelId, acquiredWorldMinute }` —
  effect derives from the spec, build facts persist per copy, label captured at
  completion (identity vs power, the machine pattern);
- ids share one `workflow:N` sequence across queue and garage (`nextBuildId`)
  so a completed job and a fresh commission can never collide;
- zod schemas `inFlightBuildSchema` / `ownedWorkflowSchema`; the three new
  events join `eventWorldMinute`'s grouped list; legacy saves load the empty
  baseline (tested); a mid-build save restores and replays identical
  completions (tested).

## Surface

Market gains the **SOFTWARE FORGE** section: spec shelf (IR steps, tests,
this-rig estimate, footprint, "replaces <license label>", BUILD button disabled
with the reason until a model runs), **BUILD QUEUE** (soonest due first, ABORT
button, occupancy shown, no outcome anywhere), **SELF-AUTHORED** garage
(outcome chip, test list, `built by <assistant> · delivered <time>`), and a
hint that teaches the whole contract — no credits, time + occupancy, frozen
roll, defective copies still lift. CSS block after the P2 analysis rules.

## Invariants (all pinned by `forge.test.ts`, 32 tests)

- zero-regression: an empty queue and empty garage change no pre-P3 number —
  the 427 pre-P3 tests re-ran untouched, plus new parity/persistence assertions
  (462 total), `combinedActionDurationFactor(economy)` identity at 1,
  `effectiveCapability` unchanged, projections empty;
- determinism/split-invariance: same inputs → same duration, same outcome;
  split waits ≡ one long wait; stop-model mid-build re-times nothing; a
  restored save finishes identically;
- fallibility: clean odds capped below certainty across a 60-minute sweep;
  a low-reliability model's failures bite more often than a high-reliability
  one's; defective delivery never zeroes or overshoots ×1;
- pool physics: a queued build slows a running local model's delivered
  shortcut (tested upward, capped at the no-model baseline), never a cloud one;
  a queued second job sees a smaller pool than alone;
- leak rule: the mid-build projection contains no outcome word anywhere in
  its JSON; an owned workflow contains the full report;
- economy: commissioning and aborting move no credits, ever;
- parity: Terminal `build <id>` / `build abort <id>` produce exactly the GUI
  helpers' commands; malformed forms rejected.

## Out of scope (recorded, not silently dropped)

- P4 marketplace: selling/trading self-built workflows, NPC-authored specs,
  and spec variety beyond the three license mirrors;
- player-editable IR (modify a spec before building) — a design beat;
- build *interruption* events (power cuts, raids) — the frozen-clock design
  already defines their semantics: they cannot re-roll or re-time a job;
  whether they can pause the queue at all waits for Phase 6 threats;
- proficiency gating build quality — still deferred until playtesting earns it
  (the kickoff plan's standing rule).
