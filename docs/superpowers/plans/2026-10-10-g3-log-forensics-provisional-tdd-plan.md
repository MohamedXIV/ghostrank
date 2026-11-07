# G3 P2 — Log Forensics provisional TDD execution plan (#110)

> **REVIEW-ONLY. NOT AN APPROVED IMPLEMENTATION PLAN.**
>
> Dependencies: written candidate specification `docs/superpowers/specs/2026-10-10-g3-log-forensics-evidence-correlation-proposal.md` in Draft PR #116. Choosing the **Log Forensics mechanic**, approving its **written design**, and approving this **TDD plan** are **three distinct decisions**. No code may start until those decisions and the two-provider feasibility check are signed off.
>
> **User priority:** do not spend engineering time on historic-save migration. Validate **current** saves and authoritative replay, not old versions. Unfamiliar-human G3 playtest remains **NOT RUN**.

## Stage 0 — Feasibility, evidence sources, exact product question (blocking)

**Read before coding:** `src/game/world-generation/generate-scenario.ts`; `src/game/runtime/slice-world.ts`; `src/game/simulation/state/world-state.ts`; `src/game/simulation/systems/investigations.ts`, `probes.ts`, `analysis.ts`, `network-routes.ts`; `src/game/simulation/projection/project-world.ts`; `src/game/simulation/command-bus.ts`.

**Question:** Can a generated target and the player's own rig each produce a meaningful 4–6-record *fictional forensic situation* using genuinely player-accessible existing causal cues, without rebranding the same generated target fixture? `InvestigationSignal` and `RivalProbe` are currently **observable tells**, not full machine logs. Player rig has no general service log inventory today.

- Define one explicit **target-side** synthetic source contract: observed service receipts/clock references, with target/machine/source identities earned from actual survey/inspect (never derived by projecting hidden topology for free).
- Define a different **own-rig** source contract: surfaced signal, own workstation artifact and a contact/clock cross-check earned through an existing player action or an explicitly proposed *small* new action. A hidden `RivalProbe.correct`, actor attribution, investigation material/progress or future event must not leak.
- Demonstrate one **deducible proposition** in each context: show the two relevant records, the rule that makes them contradictory and at least one misleading *but not dishonest* distractor. Be precise about whether “received,” “queued” and “accepted” mean different things. A puzzle that depends on hidden, unknowable semantic definitions **fails**.
- Record required new observations or engine seams and effort estimate. **Stop before Stage 1** if own-rig requires a new general filesystem, target graph, NPC diary or UI engine; present a smaller alternative for review rather than claiming portability.

**Stage 0 acceptance:** table linking every proposed clue to a real producer, earned-by action, privacy class and expiry/rotation. Target and own-rig cases must differ in what the player investigates and what happens after an assertion. At least one legitimate quiet corroboration route versus immediate-risk assertion.

## Stage 1 — Current-run case contract, solver and validation (TDD)

**Files, provisional:**
- `src/game/simulation/systems/forensics.ts` (new; pure case/claim evaluation; **never** import Nightshade or providers);
- `src/game/simulation/state/world-state.ts` (small optional scoped case records, only if persisted data cannot be derived);
- `src/persistence/world-state-schema.ts` (strict current-case validation);
- `src/game/simulation/__tests__/forensics-domain.test.ts` (new);
- `src/persistence/forensics-current-schema.test.ts` (new).

**Write failing tests first:** generated/own-rig scopes, unique case IDs and 4–6 source records, impossible duplicated source, invented outcome, future-earned clue, claim requiring independently sourced *two* records, false/true inference and stale epoch. Include a sample with correctly defined clock offset and receipt semantics; **do not** call a contradictory prompt “solvable” just because hidden truth chooses one answer.

**Implement:** a small discriminator for scope, epoch, source ownership, earned visibility and submitted claim. Hidden truth checked in authority only. Provenance is immutable, source-retirement is epoch-scoped. Rank must never be consulted. Do **not** add a generic puzzle/plugin registry.

**Gate:** Node24 focused GREEN; reproducible independently of GUI, scenario IDs and hidden target rank; current-world JSON round-trip. No historical-format migration.

## Stage 2 — Two *real* providers, not renamed fixtures (TDD)

**Candidate files:** `src/game/world-generation/forensics-provider.ts` (generated-target case generation), `src/game/simulation/systems/forensics-own-rig.ts` (investigation/probe artifact adapter), and narrowly scoped existing source hooks only.

- **RED tests for generated target:** 120 fixed seeds; valid service/clock sources and target ownership; only attach if topology can support earned evidence; no omniscient initial records; same seed same layout; other RNG streams unaffected; optional puzzle never gates other contracts.
- **RED tests for own-rig:** trigger only from actual surfaced tells/owned rig artifacts; no nonexistent hidden attacker facts; false NPC beliefs produce plausible uncertainty, not a leaked “fake probe” marker; relocation/retirement makes appropriate sources stale. Prove **different consequence adapter** from external target.
- **Implementation:** providers instantiate case content / permissions only, **not** solve claims or charge time. If Stage 0 didn't establish a proper own-rig cross-check source, this stage is blocked, never marked PASS.

## Stage 3 — Authoritative paid verbs, chronology and counterplay (TDD)

**Candidate files:** `src/game/simulation/commands/types.ts`, `command-bus.ts`, `events/types.ts`, new `__tests__/forensics-command.test.ts`.

**Command envelope, for review:** `forensicCorroborate({caseId,sourceId})`; `forensicAssert({caseId,claimId,supportIds})`; `forensicWithdraw({caseId,claimId})`. Browsing/sorting/comparing is read-only.

**RED tests:** forged case/source/claim, insufficient or duplicate same-origin support, active/source epochs, replay after a refused assertion, missing resource/operation/permission, already-ended run, and no cost on invalid commands. A valid assertion pays costs and records result whether correct or wrong. Two independently sourced records are mandatory. Same-epoch re-assertion cannot farm cheap successes. NPC standing/attention or target footprint changes only through provider-specific, existing simulation consequences.

**Chronology:** explicitly test a paid corroboration that crosses a 360-minute review/rotation boundary and a first-ending-wins boundary. Apply existing world event ordering; do not quietly add a parallel timer. Preview and actual costs must match. Proposed 12 world minutes for local verification is **not** a fixed code constant until user approves it and the compute resource actually exists.

## Stage 4 — Player-safe projection and same-authority GUI / terminal (TDD)

**Candidate files:** `src/game/simulation/projection/project-world.ts`; a small reusable Recon evidence panel under `src/components/game/recon/`; `src/game/computer/terminal/parse-command.ts` and existing terminal handlers; minimal CSS.

- **Projection RED:** never show unseen entry content, source IDs that identify a hidden NPC, private progress, a secret solution, future record, source-retirement reason or `probe.correct`. A prediction is a prediction, not an observed fact.
- **Presentation RED:** two-source comparison displays clear timestamp/offset/source semantics without color-only truth, uncertain cues, an accessible 390px layout and keyboard route; no “scan reveals liar” button. The player can abstain or choose a faster risky assertion. Browser UI gives exact cost/risk preview.
- **Parity RED:** terminal `forensics cases/read/compare/corroborate/assert/withdraw` and GUI use exactly the same CommandBus commands, events, world minutes and world evidence. No React/terminal truth evaluation.

## Stage 5 — Real replay and scenario acceptance

**Exact-head gates after each narrow implementation PR:** Node24 focused + full tests, typecheck, lint, production Next build; **real Chromium** (not screenshot proof alone) for a generated target, independent own-rig defense, desktop and 390px mobile, keyboard-only route, no page JS errors. Replay/save/resume/deterministic split vs bulk time; 120-seed solvability and several wrong assertions plus recovery. Do not claim a human playtest from automated smoke.

**Human proof is separate:** unfamiliar player demonstrates they understand *why* two records contradict, distinguishes hearsay vs corroboration, makes an explicit risk decision, and can recover from wrong evidence; record time-to-first meaningful inference, confusion and consequences. Keep #105/#79/#75/#84 OPEN until relevant human exit criteria have actual evidence.

## Delivery sequence and stop conditions

1. Review/approve mechanic family and written candidate spec in Draft PR #116; explicitly review this **plan separately**.
2. Stage 0 source feasibility **before modifying game code**. If two providers cannot be credible, pause P2 implementation and revise the scope.
3. Commit RED tests on focused branches, verify actual RED cause, implement narrow domain and providers, then commands/projection/presentation. Avoid enormous all-at-once merges.
4. Merge only exact-head checked increments; keep issue #110 open until genuinely distinct independently playable contexts and human acceptance. Do not claim P2 delivered from unit tests or a Nightshade-only demonstration.

**Non-goals:** old-save migrations, actual cyber intrusion, generic source log parsers, Nightshade as engine, unrelated UI redesign, Tauri, travel or isometric room rewrites.