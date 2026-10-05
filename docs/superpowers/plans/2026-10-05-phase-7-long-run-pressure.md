# Phase 7 P5 — Exceptional long-run pressure

Parent: #25  
Depends on: P0–P4 complete (D037–D041).  
Platform policy: web-first; no desktop-only gate.

## Goal

Make unusually long successful runs harder for causal reasons without turning
rank, age by itself, or a hidden difficulty scalar into power.

P5 compounds pressure the run has actually accumulated. It does not fabricate a
new enemy, grudge, investigation, probe, or physical route merely because the
calendar is old.

## Activation

Veteran pressure is a strict no-op before **14 world days**.

Crossing day 14 is necessary but not sufficient. A very old run with no relevant
history remains **ordinary**. The derived pressure model only counts history that
already happened by the ecosystem tick being evaluated.

This explicit tick-local read is important: a single long wait and the same wait
split into smaller commands see the same pressure at the same boundaries.

## History inputs

P5 derives one bounded history score from existing authoritative facts:

- completed contracts;
- accepted contracts that expired unfinished;
- intrusive operation escalations;
- surfaced authority-investigation evidence;
- underground retaliation;
- rival probes;
- physical threats;
- catastrophic compromises.

The current weighting makes stronger consequences count more than routine work,
but no input is player rank or the starting White/Black package.

P5 stores no score and adds no save-schema field. The pressure read is rebuilt
from the existing run history after save/restore.

## Pressure bands

The derived player-facing band is:

- **ORDINARY** — no veteran modifier;
- **KNOWN** — accumulated history has begun to compound;
- **ENTANGLED** — several causal trails are now active in the run;
- **VETERAN** — a long history substantially increases existing pressure.

The current thresholds are score 6 / 12 / 20 after the day-14 gate.

The projection deliberately exposes the band and broad history reasons only.
Numeric score and percentage bonuses remain simulation internals.

## What pressure may change

P5 attaches only to three existing seams:

1. **Contract traffic** — offer frequency can rise; at ENTANGLED/VETERAN the
   concurrent open-offer cap can rise from 3 to 4/5.
2. **Rival attention** — probe attempt frequency can rise, but only for peers
   who already meet the existing grudge requirement.
3. **Physical pressure** — the existing physical-retaliation probability can
   rise, but only after the existing Black-network + grudge + prior-probe route
   already exists.

The bounded bonuses are +4 / +8 / +12 percentage points for
KNOWN / ENTANGLED / VETERAN on the applicable offer/probe/physical rolls.

P5 does **not**:

- create grudge;
- make a non-candidate rival probe;
- grant White-network peers physical reach;
- bypass the prior-probe requirement for physical escalation;
- accelerate authority investigations while the player is quiet;
- add a veteran tax or recurring fee;
- use rank as combat/difficulty power;
- change access permissions or command availability.

## Player-facing explanation

The Underground index shows **LONG-RUN PRESSURE** with the coarse band and the
history categories contributing to it:

- completed work;
- intrusive history;
- counterpressure;
- physical history.

The text explicitly states that rank is not an input and that pressure only
amplifies routes already earned by run history.

## Determinism and compatibility

- all pressure reads take an explicit current tick minute inside long waits;
- whole and split waits remain equivalent across the day-14 activation boundary;
- the pre-P5 early/neutral golden scenarios remain byte-identical;
- older Phase 6 long-run golden digests that intentionally represent veteran
  causal histories are no longer identity contracts, because P5's explicit job
  is to alter those histories;
- save/restore reconstructs the same pressure with no persisted P5 field;
- the player projection contains no numeric bonus, hidden relationship value,
  probe correctness, or hidden investigation progress.

## Verification

Dedicated P5 tests pin:

- strict pre-14-day zero-regression behavior;
- an old but causally quiet run remains ordinary;
- bounded KNOWN / ENTANGLED / VETERAN progression;
- rank and starting-board independence;
- no probe candidates from pressure alone;
- physical prerequisites remain intact;
- deterministic contract/probe traffic changes at exact seeded roll windows;
- whole/split wait equivalence;
- player-safe projection/TinyBase output;
- save/restore with no new authoritative field.

Normal web tests, typecheck, lint and production build remain the merge gates.
