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

- deterministic from the existing visible record id + presentation surface;
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
- physical-signal wording.

The old forum copy also hardcoded the working handle `CobaltXZ`; P6 removes
that assumption and uses generic causal copy instead.

## P6B — social telemetry

Balance telemetry now records four additional sample/summary counters:

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

## Verification

P6A tests pin:

- the same record id always renders the same copy;
- different ids actually produce more than one authored variant;
- actor/counterpart handles remain present in incident copy;
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
