# Phase 8 P1 — Local balance telemetry baseline

Parent: #26  
Depends on: P0 world-content roster (D044 / #48).

## Goal

Measure the unchanged pre-breadth game through the real deterministic simulation
before Phase 8 adds targets, contracts, locations, market items, or authored
social situations.

P1 is developer telemetry. It adds no gameplay mechanic, player-visible stat,
save field, command, event, RNG stream, or balance change.

## Harness

`src/game/telemetry/balance-telemetry.ts` runs the real `CommandBus` across:

- 32 fixed seeds;
- a 30-world-day horizon;
- four deterministic policies:
  - **idle** — waits only;
  - **contractor** — accepts the oldest offered contract and completes it using
    ordinary recon/intrusion/delivery commands;
  - **reckless** — begins with repeated intrusive operations, then follows the
    same contract policy;
  - **career-exit** — works contracts, then attempts the real retirement
    PLAN/COMMIT/COOLING/FINISH path after day 14 and at least three completions.

Policies do not write evidence, contract results, ending records, threat records,
credits, or rank directly. The only test-specific world change is choosing the
ecosystem seed before `CommandBus` is constructed.

Run locally with:

`npm run telemetry:balance`

## Reported dimensions

Per sample:

- final world minute / run length;
- ending status and cause;
- credits, ledger value moved, contract income;
- final rank and rank-number improvement;
- contract traffic (created / accepted / completed / expired / declined / open);
- escalations, compromises by kind, probes, physical threats, surfaced
  investigation evidence, retaliation;
- final long-run-pressure band;
- observed/exposed actor, target, machine, service and contract-issuer ids.

The report also pins authored catalog breadth for world actors/targets and the
hardware, housing, machine, model, tool, software and workflow catalogs.

## Canonical pre-breadth baseline

CI on the first green P1 implementation ran 32 seeds × four policies for 30
world days.

### Idle

- 32/32 still active at day 30;
- 0 credits, 0 rank movement, 0 completed contracts;
- 0 escalations/probes/physical threats/compromises;
- all 32 remain ORDINARY pressure;
- the ecosystem still creates/ages offers (571 created total, 541 expired), so
  "idle" means no player action rather than a paused world.

### Contractor

- 28/32 end **ARRESTED**, 4/32 remain active;
- median run: 25,920 minutes (18 days);
- 797 accepted and 797 completed contracts across the sample;
- median final credits: 3,750;
- median rank-number improvement: 9,239;
- 25/32 finish in VETERAN pressure;
- totals: 426 escalations, 403 probes, 258 physical threats, 57 compromise
  records, 96 surfaced investigation signals and 224 retaliations.

This is a baseline finding, not a tuning target: the current two-objective
contract mix drives substantial intrusive exposure.

### Reckless

- 28/32 end **ARRESTED**, 2/32 **STRANDED**, 2/32 remain active;
- median run: 22,140 minutes (~15.4 days);
- 709/709 accepted contracts complete;
- median final credits: 3,390;
- median rank-number improvement: 2,322;
- totals: 475 escalations, 336 probes, 221 physical threats, 60 compromise
  records and 236 retaliations.

### Career exit

- 20/32 reach **RETIRED**;
- 12/32 end **ARRESTED** before retirement;
- no sample remains active at the horizon;
- median run: 23,186.5 minutes (~16.1 days);
- 356 completed contracts;
- median final credits: 1,930;
- median rank-number improvement: 3,997;
- 25/32 finish in VETERAN pressure.

No VANISHED result appears under this deliberately generic policy; P1 does not
retune policy or mechanics to manufacture one.

## Content breadth baseline

Before P2 breadth:

- actors: 5;
- targets: 1;
- target machines: 2;
- target services: 2;
- hardware listings: 6;
- housing listings: 4;
- machine listings: 5;
- model listings: 5;
- player-tool listings: 3;
- software listings: 3;
- workflow specs: 3.

## Interpretation

P1 is a measuring instrument, not an acceptance threshold. Later Phase 8
slices may intentionally move these distributions, but they should do so with
the report available for before/after comparison.

In particular:

- the high contractor arrest rate is evidence for later breadth/calibration, not
  a reason to weaken Phase 6/7 threat causality in P1;
- P2 should increase target/NPC exposure diversity without introducing rank
  gates;
- P3/P6 can revisit opportunity mix and pacing using this baseline;
- human playtests remain necessary because deterministic telemetry cannot judge
  clarity, tension, or whether choices feel meaningful.

## Verification

P1 tests pin:

- authored-content counts;
- deterministic equality for repeated seed/policy/horizon runs;
- all four policies produce the expected class of activity;
- idle is mechanically quiet while the world continues;
- contractor earns real contract income/rank movement and discovers content;
- reckless produces real threat activity;
- career-exit reaches actual retirement in at least part of the seed set;
- numeric summaries remain non-negative and ordered;
- even-sized numeric samples use the mathematical median;
- career-exit never advances beyond the requested telemetry horizon.

Full web CI remains the normal acceptance gate.
