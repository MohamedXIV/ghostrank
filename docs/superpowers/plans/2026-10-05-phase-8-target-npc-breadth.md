# Phase 8 P2 — Target and NPC breadth

Parent: #26  
Depends on: P0 data-driven world roster (D044 / #48), P1 telemetry baseline
(D045 / #49).

## Goal

Expand the authored world from one operation target and five peers into a
meaningfully broader fictional ecosystem without adding target levels,
content-specific commands, rank gates, or a parallel NPC ruleset.

P2 changes authored content. It deliberately does **not** tune Phase 6/7 danger
systems to compensate for the larger population; P6 alpha calibration owns
that later decision.

## Added roster

The Phase 2–7 entries remain unchanged:

- NIGHTSHADE — apex operator / elite-underground-operator;
- VESPER — broker;
- LATTICE — automation specialist;
- HALFMOON — reckless tinkerer;
- KESTREL — street operator.

P2 adds five target-owner pairs:

- **VELVETWIRE** — scam-operator / scam-network;
- **IRONVEIL** — extortion-operator / extortion-crew;
- **TALLYMAN** — market-predator / predatory-market;
- **DAYSTAR** — corporate-operator / corporate-infrastructure;
- **ROOKERY** — rival-operator / rival-infrastructure.

The authored roster therefore becomes:

- 10 actors;
- 6 operation targets;
- 14 target machines;
- 17 target services.

The new infrastructure uses ordinary machine roles and fictional service kinds
such as marketplace, ledger, contacts, dispatch, pricing, portal, scheduler,
records, telemetry and analysis. These strings describe simulated content; they
do not introduce new exploit verbs or real-world procedures.

## Mechanical boundary

Every new owner is an ordinary `UndergroundActor`. Every new target is an
ordinary `TargetState`.

P2 adds no:

- command or event family;
- `WorldState` field or save migration;
- RNG stream;
- target difficulty/level field;
- player-rank requirement;
- special operation path;
- new relationship rule;
- new threat rule.

The existing starting-network relationship rule applies unchanged. DAYSTAR and
ROOKERY are White-network peers, so a White-starting run receives the same
initial trust relationship it already received with VESPER/HALFMOON. Black
peers receive no invented starting trust.

## Operation parity

Dedicated tests run each new target through the same:

PLAN/observe → open → survey → disengage

typed commands used by NIGHTSHADE. The command results, evidence and traces are
identical at player rank 1 and player rank 999,999.

Archetype tags remain P0 authoring metadata and are still stripped before
simulation authority receives the roster.

## Legacy regression discipline

P2 intentionally changes the canonical world, so a whole-world byte digest from
the one-target era is no longer a valid promise for the expanded roster.

The old Phase 6 probe golden hashes were **not replaced with new hashes**.
Instead, their historical byte-identity proof now reconstructs the exact
pre-Content-Alpha actor/target subset and replays against that roster. This
preserves what the Phase 6 test was proving while allowing P2 to add authored
peers.

Likewise, the Phase 7 P5 contract-offer probability test now clears unrelated
starting contacts and isolates VESPER. It continues to measure only the
+veteran-pressure delta rather than accidentally measuring P2's extra White
contacts.

## P1 telemetry comparison

The same 32-seed / 30-day / four-policy harness was rerun after P2.

### Content exposure

Authored breadth changed from **5 actors / 1 target / 2 machines / 2 services**
to **10 / 6 / 14 / 17**.

All six targets and all ten actors appear in the report. The contractor policy
encountered all six targets, 12 distinct machines and 12 distinct services. The
remaining authored infrastructure is not force-revealed just to satisfy a
coverage number; discovery still depends on the ordinary recon path.

### Idle

P1 baseline:

- 571 contracts created, 541 expired.

P2:

- 1,081 contracts created, 1,029 expired;
- still 32/32 active at day 30;
- still zero player economy/rank/threat movement;
- still 32/32 ORDINARY pressure.

The larger social roster therefore increases autonomous offer traffic without
making inactivity dangerous.

### Contractor

P1 baseline:

- 28/32 ARRESTED, 4 active;
- median run 25,920 minutes;
- median credits 3,750;
- median rank improvement 9,239;
- 403 probes.

P2:

- 30/32 ARRESTED, 2 active;
- median run 24,660 minutes;
- median credits 6,260;
- median rank improvement 17,080;
- 1,092 completed contracts;
- 1,723 probes;
- 305 physical threats;
- 447 surfaced investigation signals.

### Reckless

P1 baseline:

- 28 ARRESTED / 2 STRANDED / 2 active;
- median run 22,140 minutes.

P2:

- 31 ARRESTED / 1 STRANDED / 0 active;
- median run 21,960 minutes;
- all six targets appear in exposure.

### Career exit

P1 baseline:

- 20 RETIRED / 12 ARRESTED;
- median run 23,186.5 minutes.

P2:

- 21 RETIRED / 11 ARRESTED;
- median run 23,341 minutes;
- median credits 4,170;
- median rank improvement 12,281.

## Interpretation

The new content is reachable rather than dead data, but the expanded population
also materially increases ecosystem activity. P2 records that consequence
instead of silently retuning threat percentages, activity values, or contract
rates to reproduce the P1 distribution.

P3 may broaden contract objectives on top of this roster. P6 will perform the
explicit alpha calibration pass using the P1/P2 telemetry evidence plus human
playtest judgment.

## Verification

P2 tests pin:

- all six target archetypes and all ten actor archetypes are authored through
  the P0 roster;
- the original five peers and NIGHTSHADE target stay unchanged;
- every new owner and target share public handle/rank identity;
- each new target has at least two machines and three services;
- all new targets use the generic operation command path;
- player rank does not alter operation results;
- deterministic multi-seed play exposes non-NIGHTSHADE content;
- old Phase 6 golden proofs still pass against their exact legacy roster;
- P5 probability tests remain isolated from unrelated content breadth;
- P1 telemetry reports the expanded authored counts and measurable exposure.
