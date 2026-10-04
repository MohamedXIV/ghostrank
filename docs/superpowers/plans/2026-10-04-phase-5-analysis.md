# Phase 5 P2 — AI Analysis (Fallible Reads of Unseen Topology)

Issue: #23 — this slice delivers the phase's *AI helps but can be wrong* exit
criterion and consumes the model **properties** P0 seeded (reasoning/context/
reliability), the "stated non-consumers" the kickoff plan pinned for P2.
Builds on: Phase 5 P0 (`2026-10-04-phase-5-models.md` — the assistant slot and
the catalog properties), P1 (`2026-10-04-phase-5-contention.md` — properties
were the last seeded-and-unconsumed half of the model data), the ecosystem's
hidden-ground-truth templates (`UndergroundRumor.accurate`), and the
`hashUnit` stateless-roll primitive.

## Goal

Give the running assistant something *to do*: `analyze <target-id>` asks it for
a read of the target — instant, free of world time, and deliberately,
provably **fallible**. This is the slice where #23's exit criterion becomes
testable rather than aspirational: the AI helps (it predicts structure the
recon has not earned yet, with better models predicting more and being right
more often) and can be wrong (three named failure modes, all reachable, none
fatal, all verifiable by playing recon).

## What the assistant is actually allowed to say

The grounding decision. Survey/inspect already reveal a machine's *true* role
and a service's *true* kind once observed, so a model that restated observed
facts would be a redundant second source — no help at all. The genuinely hidden
ground truth is **not-yet-recon'd structure**, and that is what analysis
predicts:

- **machine-role claims** for machines the player has *not yet surveyed*;
- **service-kind claims only for machines already surveyed** — the assistant
  reasons from the topology it can currently see *outward*, so it never names a
  host the recon has not revealed; its prediction is the services of a known
  box.

A fully recon'd target yields zero claims: the assistant adds no verified
facts, which keeps the command honest (its value is *ahead* of your evidence,
never a rehash of it) and cheap (nothing to leak).

Claims predict **only**, never *locate* — see the projection section for why
even the subject must stay anonymous.

## The model

New pure module `src/game/simulation/systems/analysis.ts`, consuming
`ModelProperties` at last:

- `claimCount = clamp(round(context), 1, 5)` per kind — context is *how much
  topology one pass reads*; a frontier class sees more of a target than a
  compact one. Capped by what is actually unseen, so the number is a budget,
  not a guarantee.
- per-claim accuracy: `hashUnit(seed, "analysis-acc", worldMinute, modelId,
  kind, index) < 0.8 × (reliability band / 5)`. Odds are **capped at 0.8** —
  the best model in the game is wrong one claim in five-plus, because "remains
  fallible" is the rule, not a tuning value.
- an inaccurate claim is one of two things (the docs' failure modes, both
  real): **hallucinate** a host (`subjectId: null`, a pure fabrication — the
  rarer branch at 0.34 of misses, because inventing infrastructure is worse
  than mislabelling it) or **misclassify** a real subject (a vocabulary value
  guaranteed ≠ the truth).
- `confidence = band(reasoning + context)` — high ≥ 8, medium ≥ 5, else low —
  computed **without looking at `accurate`**. This is the *overstate
  confidence* failure by construction: the Fine-Tuned Analyst (reliability 2,
  but r4 c3) states wrong things with the same "medium" polish as right ones.
  Nothing in the visible layer can tell a confident-wrong claim from a
  confident-right one.
- vocabularies are fictional (`relay/vault/gateway/bastion/cache`,
  `signal/archive/http/ssh/proxy`), matching the content rules — no real
  product names in predictions.

Determinism: same world, same minute, same model ⇒ byte-identical claims, via
the existing `hashUnit` primitive — no RNG, no clock, no order dependence,
save/restore replays exactly.

The `accurate` flag rides the rumor template (`UndergroundRumor`): hidden
ground truth recorded at generation time, meaningful only in comparison once
recon reveals (or fails to reveal) the subject.

## Command shape

`analyzeTarget` is an **instant command** — the contract-verbs precedent: no
world time, no trace, no upkeep. The player is asking a question, not touching
the network; a pass that cost minutes would tax verification, and verification
is exactly what expert play should stay cheap enough to do.

Gates mirror survey's exact order (`NO_ACTIVE_OPERATION` →
`OPERATION_TARGET_MISMATCH` → `TARGET_NOT_FOUND` → `TARGET_NOT_OBSERVED`),
then `NO_ACTIVE_MODEL` — the assistant itself, the way a contract needs a
contract. That is the *only* thing analysis requires beyond recon's own
prerequisites: it is never gated by hardware, software, or a particular model,
and nothing else gains a model requirement (P1's contention is a factor, not a
gate; survey/inspect stay model-free forever, tested). Each pass **replaces**
the target's single stored record (`analysis:<targetId>`) — the projection
always shows the *current* read, and there is no history to bloat saves or to
mine for a timeline that isn't the point.

The handler threads `world.underground.seed`, `world.worldMinute`, the running
model's catalog `properties`, and the observed sets derived from existing
evidence (`machine-presence` / `service-presence` subjectIds) — no new state to
invalidate.

## The leak rule (the load-bearing decision)

A claim's `subjectId` points at *structure the player has not earned yet*, and
`accurate` grades the assistant. Either one reaching the projection would make
analysis a cheat: read the hidden ids and you have free recon; read the truth
flag and you never need to verify. So the visible claim is exactly
`{ kind, assertion, subject, confidence }` where **`subject` is an anonymous
per-kind counter** — `unmapped host 1`, `unmapped service 2` — and `accurate`
never leaves the simulation.

Anonymous counters rather than "show the id if observed": a claim can only
ever describe an *unobserved* subject by construction, so an observed id can
never legitimately appear — and any real id would leak. Uniform handles also
keep a fabricated subject indistinguishable from a real-but-unmapped one,
which is precisely how a hallucination should feel: the player finds out by
looking. A claimed `vault` on "unmapped host 1" becomes checkable the moment
the next survey names a machine: if it is a relay and the analysis said vault,
the assistant just lied to you — the verification loop closes through *play*,
not through the state.

## Plumbing

- state: `WorldState.analysis: AnalysisRecord[]` (at most one per target);
  `initial.analysis` optional, `[]` default — an untouched world is the exact
  pre-P2 shape, and every default projection has no analysis to show.
- events: `AnalysisCompleted { targetId, modelId, claimCount, worldMinute }`,
  added to the persistence `worldMinute` group; `claimCount` keeps the log
  readable without the payload's hidden fields.
- commands: `analyzeTarget` in the union; `parse-command.ts` maps
  `analyze <id>` via the shared `singleIdCommand`; GUI helper
  `analyzeTargetFromGui` keeps the Terminal/GUI parity test.
- projection: `WorldProjection.analysis: VisibleAnalysisRecord[]` (per known
  target, model label resolved through the catalog), built by `projectAnalysis`
  — empty by default, so the pre-P2 projection is untouched.
- TinyBase: an `analysisClaims` table keyed `<targetId>:<claimIndex>`, carrying
  only the leak-safe fields.
- persistence: `analysisRecordSchema`/`analysisClaimSchema` with
  `subjectId: string | null`, `accurate: boolean` — the full truth *does*
  persist (it must, to survive a reload of the same world), it just never
  *projects*; `analysis: [].default` for legacy saves.
- UI: the Recon app grows an **ASSISTANT ANALYSIS** panel — per claim: subject
  handle, "host/service likely *assertion*", confidence chip, model label and
  world time; empty state teaches the verb; a fixed caveat states the contract
  in the player's terms (predictions, not evidence; verify with SURVEY/INSPECT).
  The ANALYZE button sits beside SURVEY on the active target card — same
  precondition, no gate beyond the assistant.

## Why this shape (the alternatives, weighed)

- **Restate observed facts ("this surveyed box is a relay")?** That is a
  second source for information already earned — zero help, or worse, a
  contradiction the player can't resolve. Predicting the *unseen* is the only
  claim type with actual value.
- **Deterministic-correct analysis for good models?** A perfect reader makes
  recon optional and dissolves the phase's exit criterion; the 0.8 accuracy cap
  is the rule encoded.
- **Analysis as a timed, trace-adding action?** Then verifying AI claims costs
  risk *and* the assistant's own output — double-taxing exactly the behavior
  the design calls expert play. Instant is the honest shape: the cost signal is
  the model's rent/footprint, already paid at P0/P1.
- **Show the subject id once the claim is later verified by recon?** The
  stored record is a snapshot at generation minute; retro-editing it on new
  evidence would rewrite history (a save/restore hazard) and turn the panel
  into a second evidence ledger. The player compares panels; the game does not.
- **A per-claim `verified` marker?** It needs a join from evidence to claims
  forever after, and it grades the assistant for free whenever recon happens to
  agree. Verification is *play*, and play already has the tools.

## Invariants (tested — `analysis.test.ts` 18 new tests; `target-actions.test.ts`
and `recon-parser.test.ts` each gained one, and every pre-P2 assertion re-ran
untouched)

- determinism: identical inputs byte-identical; two runs at one minute equal;
  a restored save re-run returns the stored record exactly;
- unseen-only: observed machines drop out of the candidate set; a fully
  recon'd target yields `[]`; service claims require a surveyed host and never
  name an observed service;
- budgets: claim count = clamp(round(context)) per kind, capped by what is
  unseen (frontier 4→2 machines on a 2-machine target);
- fallibility: across a two-day minute sweep, the reliability-4 model is
  accurate more often than the reliability-2 one, and **neither is ever
  right everywhere**; inaccurate role claims split between mislabels (assertion
  ≠ truth, subject real) and hallucinations (`subjectId: null`), both branches
  exercised;
- overconfidence: bands are a pure function of reasoning+context (frontier
  always "high", compact/tuned always "medium"), and the tuned model's wrong
  claims are still "medium" — confidence never tracks accuracy;
- command: error order mirrors survey; `NO_ACTIVE_MODEL` is the only new gate
  and plain recon (inspect) still succeeds without any model; instant — world
  minute and traces untouched; one record per target, replaced on re-run;
  a different model at the same minute re-reads differently; a stale
  `activeModel` id fails `MODEL_NOT_FOUND` and stores nothing;
- leak-safety: the stringified visible analysis never contains `accurate`,
  `subjectId`, or any real machine/service id of the target; subjects match
  `unmapped (host|service) N`; a fresh world projects `analysis: []` exactly;
- persistence: snapshot → JSON → schema → state preserves a record
  byte-for-byte; a legacy save without the field loads `[]`;
- parity: `analyze <id>` parses to the typed command; malformed `analyze` /
  `analyze a b` rejected; GUI helper equals the parsed command.

## Out of scope (later slices)

- claims stay *display* predictions; there is no comparison UI that says
  "the assistant was wrong about host 3" — by design (the per-claim marker
  alternative above), and the first playtest of the verification loop will say
  whether an explicit diff earns its keep;
- refusal/rate-limit/behavior-modification drama from `docs/AI_SYSTEMS.md`
  (some models refuse certain requests) is content, not a mechanic — it waits
  for provider-behavior work after P4's NPC AI makes model usage visible on
  the other side;
- `properties` now has its consumer, so P3 (spec → workflow/IR builds, the
  remaining #22 *author* handoff) inherits reasoning/context/reliability
  semantics for build quality, and the pool contention model P1 built becomes
  the build queue's shared resource;
- the vocabulary is fixed catalog data; specializations ("this model is good
  at services") are a tuning beat for playtesting, not this slice.
