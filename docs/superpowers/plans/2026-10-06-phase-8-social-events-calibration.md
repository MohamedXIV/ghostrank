# Phase 8 P6 — Social/event breadth + alpha calibration

Parent: #26  
Depends on: P0–P5 in order (D044–D049).

## Goal

Finish Content Alpha by making repeated runs feel socially less repetitive, then
use the deterministic P1 harness to calibrate pacing **from measurements** rather
than by intuition.

P6 has two intentionally separate layers:

1. social/event presentation breadth that must not alter world truth;
2. explicit alpha calibration that may tune existing probabilities/authoring
   values only after a valid before/after telemetry report exists.

## P6A — authored social/event presentation

The authoritative social world already contains:

- public NPC incidents;
- accurate/inaccurate incident rumors;
- inbox messages relaying those rumors;
- contract-completion forum posts;
- unmasking-taboo forum posts;
- ambiguous physical signals.

P6A does not invent a second event engine. Instead,
`src/content/social-copy.ts` supplies several authored phrasings for the same
visible causal record.

Variant selection is:

- deterministic from the existing visible record id + presentation surface + visible causal handles/target where relevant;
- presentation-only (a private stable string hash, **not** simulation RNG);
- stable across save/load and split/whole waits because the underlying record id
  is stable;
- incapable of changing rank, relationships, events, deadlines, evidence,
  threat state, or persistence.

Surfaces broadened:

- public incident feed;
- rumor/inbox phrasing;
- forum incident commentary;
- forum contract-vouch phrasing;
- forum unmasking-taboo phrasing;
- authority-investigation signal wording;
- rival-probe tell wording;
- physical-signal wording.

The old forum copy also hardcoded the working handle `CobaltXZ`; P6 removes
that assumption and uses generic causal copy instead.

## P6B — social telemetry

Balance telemetry report schema advances from **v1 to v2** because P6 adds a new top-level scenario-summary dimension. It now records four additional sample/summary counters:

- public incidents;
- forum posts;
- rumors;
- messages.

These are observations of existing authoritative arrays. The telemetry policy
still writes none of them directly.

This gives calibration two dimensions it did not have before:

- **danger / economy / ending pressure** from the existing P1 report;
- **social density** from the new counters.

## P6C — alpha calibration gate

No balance constant is changed until the canonical 32-seed × four-policy ×
30-day report can run successfully on the final P5/P6 dependency chain.

Calibration may tune only existing authored/system values when the report
justifies it, for example:

- NPC authored `activity` percentages;
- contract offer density / existing bounded pressure bonuses;
- forum-comment / rumor-message presentation frequency;
- catalog prices/upkeep where economy telemetry shows an actual problem.

Calibration must **not**:

- weaken or bypass Phase 6/7 causal threat prerequisites;
- introduce rank gates, target levels, hidden difficulty multipliers, or
  catch-up cheats;
- mutate outcomes directly in the telemetry harness;
- add a new RNG stream or progression authority;
- tune solely to force a preferred ending distribution.

Every final tuning change must cite the measured problem it addresses and rerun
the same report afterward.

## Current measurement context

The last valid pre-P6 report (P3; P4/P5 are designed to be mechanically neutral)
recorded, across 32 seeds:

- idle: 32/32 active and no player-driven threat;
- contractor: 27 ARRESTED / 5 active;
- reckless: 30 ARRESTED / 1 STRANDED / 1 active;
- career-exit: 25 RETIRED / 2 VANISHED / 5 ARRESTED.

P2 had already shown that the larger autonomous cast materially increased probe
traffic. P6 therefore treats ecosystem/social density as something to measure,
not something to silently normalize away.

## Calibration hypotheses — evidence queue, not tuning decisions

The last valid report already narrows what P6C needs to test, but it does not
justify changing a constant yet.

1. **Opportunity throughput may be a repetition problem before it is a danger
   problem.** Across the 32-seed P3 report, contractor completed 1,452 contracts
   (~45.38/run), reckless completed 1,267 (~39.59/run), and career-exit
   completed 682 (~21.31/run). The v2 report should be read alongside social
   density before offer cadence or pressure bonuses are changed.

2. **Probe volume may be denser than the player-facing counterplay can
   comfortably explain.** Contractor produced 1,981 probes (~61.91/run),
   reckless 1,790 (~55.94/run), and career-exit 733 (~22.91/run). Raw hidden
   probe count is not itself a defect: calibration must compare it with surfaced
   tells, physical signals, messages, postmortems and distinct actors before
   reducing or increasing rival activity.

3. **Scripted-policy run length is not a novice-run acceptance threshold.**
   Contractor's median is 31,860 minutes (~22.13 days), reckless 27,720
   (~19.25 days), and career-exit 23,344.5 (~16.21 days). GAME_DESIGN targets
   first runs around days 3–5 and treats 7–10 days as an early achievement, but
   these telemetry policies are tireless deterministic workers, not first-time
   humans. Human playtests remain the authority for that pacing target.

4. **The current policies cannot calibrate market affordability.** They do not
   buy P5 market content. Contractor median final credits (8,527.5) and rank
   improvement (28,730.5) describe contract throughput, not whether the expanded
   hardware/model/tool market is correctly priced.

When a valid v2 report is available, calibration should prefer the narrowest
lever supported by evidence: presentation-only forum/leak cadence first if the
problem is feed density; contract opportunity cadence if repeated obligations
dominate; authored actor activity only if autonomous-world crowding is the
measured issue; threat probabilities last, because Phase 6/7 causal fairness is
not a tuning shortcut.

## Verification

P6A tests pin:

- the same record id always renders the same copy;
- different ids actually produce more than one authored variant;
- actor/counterpart handles remain present in incident copy;
- investigation-signal variants preserve the visible target and keep a safe fallback;
- rival-probe variants preserve ambiguity and never expose hidden actor/correctness truth;
- physical-signal variants remain category-appropriate with a safe fallback;
- contract forum copy contains the target but never hardcodes the player handle.

P6B tests pin:

- social counters are non-negative and included in deterministic reports;
- multi-seed reckless telemetry observes non-zero social activity;
- repeated seed/policy/horizon reports remain deep-equal.

P6C is not considered delivered until:

- P5 is merged;
- a valid full telemetry run exists for the final P6 head;
- any calibration changes are documented with before/after evidence;
- full web tests/typecheck/lint/build are green on the exact merge head;
- review findings are reconciled.

## Actions outage note

During P4/P5 work GitHub-hosted jobs intermittently failed before **any** job
step began. Those infrastructure failures are not treated as passing gates and
are not bypassed by blessing unexecuted code. Dependency-ready stacked work may
continue, but merge gates remain exact-head green checks.
