# Phase 7 P2 — Voluntary Retirement Operation

Issue: #25  
Decision: D039  
Depends on: P0 terminal contract (D037) and P1 forced endings (D038).

## Goal

Make "I choose to stop while I still can" a playable process rather than a menu
button, without encoding real-world evasion procedures.

P2 owns the wind-down and cooling process. P3 owns the final retirement outcome.

## State

A live run may carry one optional `RetirementPlan`:

- `planning` — intent exists; normal play continues while the player winds down;
- `cooling` — the exit was committed and a frozen cooling deadline exists.

There is no stored `ready` stage. READY is derived when world time reaches the
frozen `coolingUntilWorldMinute`.

Legacy saves default to `retirement: null`.

## Commands

The same typed commands are exposed through Terminal and GUI:

- `retire plan` / PLAN EXIT → `startRetirement`;
- `retire commit` / COMMIT EXIT → `commitRetirement`;
- `retire cancel` / CANCEL EXIT → `cancelRetirement`.

PLAN costs no time and emits no ending.

## Wind-down checklist

COMMIT requires all of these player-visible facts:

- no active operation;
- no accepted contract;
- no in-flight build;
- no running AI model;
- no active software license;
- no active lease.

The checklist intentionally does **not** read:

- rank;
- hidden grudge;
- investigation progress;
- rival identity;
- probe correctness;
- hidden physical-threat probability.

A blocker causes `RETIREMENT_BLOCKED` and consumes zero world time.

## Commit and cooling

A clean COMMIT spends 60 world minutes through the normal world clock.

That hour is dangerous. Existing upkeep/investigation/ecosystem chronology runs,
and a P1 forced ending can terminate the run before commitment completes. In
that case the plan remains at `planning` and no cooling event is emitted.

A successful commit freezes:

- `committedWorldMinute`;
- `coolingUntilWorldMinute = committed + 2 world days`.

During cooling/ready, the command bus allows only:

- WAIT / `advanceTime`;
- reading messages;
- CANCEL EXIT.

Other gameplay commands return `RETIREMENT_COOLING_ACTIVE`. Cancelling removes
the plan and immediately restores normal command access.

This temporary restriction is voluntary discipline chosen by the player, not a
level gate or hidden punishment.

## Ready boundary

`retirementStatus(world)` derives:

- `idle`;
- `planning`;
- `cooling`;
- `ready`.

READY does not mutate state, emit an event, or end the run. P3 consumes this
derived condition and actual run history to choose an ending.

## UI / projection

`WorldProjection.retirement` exposes only:

- visible status;
- visible blocker names;
- plan start minute;
- commit minute when applicable;
- ready minute when applicable.

TinyBase stores the same safe values in `retirement/current`.

The Underground EXIT PLAN panel presents the checklist and the same three typed
commands used by the Terminal.

## Safety / fiction boundary

The retirement system is deliberately abstract. It models shutting down
simulated work, ending simulated obligations, leaving the simulated lease, and
waiting while the fictional world continues to act.

It does not model or advise on real identity concealment, financial laundering,
law-enforcement evasion, credential destruction, networking procedures, or any
other real operational technique.

## Verification

Dedicated P2 tests pin:

- legacy/default state;
- exact visible blocker list;
- PLAN spends no time and never ends the run;
- blocked COMMIT spends no time;
- clean COMMIT spends 60 minutes;
- frozen two-day cooling deadline;
- READY derived from clock truth;
- cooling command restrictions;
- cancellation from planning/cooling;
- portable save round-trips;
- projection/TinyBase leak boundary;
- rank independence;
- deterministic P1 danger interrupting the 60-minute commit before cooling.

Terminal/GUI parser parity has its own tests.

Normal gates remain tests, typecheck, lint, and static production web build.

## Handoff to P3

P3 may finalize a READY plan by deriving the retirement outcome from actual
history/context and then calling D037's `endRun`.

P3 must not:

- replace the wind-down with a one-click exit;
- use rank as the retirement class;
- infer White/Black morality from the starting package alone;
- reveal hidden pressure through the retirement panel;
- add real-world evasion instructions.
