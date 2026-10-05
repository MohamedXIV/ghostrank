# Phase 6 P4 — Catastrophic Compromise as a Durable Condition

Issue: #24  
Decision: D035  
Depends on: P1 investigations, P2 rival probes, P3 physical retaliation.

## Scope

P4 names the point at which a physical consequence becomes severe enough to
matter to the run's future. It does **not** end the run. Phase 7 / #25 owns
`RunEnded`, ending eligibility, history, and ending presentation.

The implementation introduces one append-only causal record,
`CompromiseRecord`, and one deterministic fold, `compromiseTick`. There is no
new danger roll and player rank is never an input.

## Conditions

The first vocabulary is deliberately concrete:

- **RIG LOST** — the final destructive P3 property hit removed the last owned
  component and no complete owned machine survives. If multiple actors destroy
  components on the same boundary, only the last destructive hit owns this
  provenance.
- **DWELLING LOST** — D021's scripted eviction: a property hit landed at the
  lease the player still holds on that boundary. The lease becomes `null` and
  normal presence derives back to the baseline room.
- **IDENTITY EXPOSED** — the source probe was a genuinely correct dwelling read
  of the struck location, and a cited authority investigation had already
  reached the P1 converging-material threshold.
- **STRANDED** — after the consequence the player has zero credits, no lease,
  no owned components, no complete owned machine, and no authored player tool
  that can still be sold for recovery money.

These are historical conditions, not replacement sources of truth. Hardware,
machines, tools, housing and credits remain authoritative in `EconomyState`.

## Chronology

P4 runs through `UndergroundAdvanceHooks.afterPhysicalTick`.

For one ecosystem boundary:

1. CommandBus advances upkeep, investigations and strictly-earlier builds.
2. Every P3 actor finishes physical retaliation for that boundary.
3. P4 consumes the complete set of physical consequences that just landed.
4. Social retaliation, offers and probing continue.
5. Exact-boundary builds complete if P3 did not pause them.

This ordering matters for eviction. If a lease is burned exactly at a whole-day
boundary, that boundary's rent was already due and is paid first; the physical
event then evicts the player, and later boundaries cannot charge the lost lease.
It also means one actor's eviction cannot change another actor's P3 targeting
odds halfway through the same tick.

P4 is injected through the command-bus hook rather than imported by
`underground.ts`, which keeps the ecosystem module independent and avoids a
cycle with P1's investigation module.

## Persistence and disclosure

`compromises` is legacy-defaulted to `[]`. A restored historical P3 threat
does not retroactively produce a P4 record: only threats whose minute is the
boundary currently being folded are eligible.

The full record persists:

- source physical threat id,
- source rival probe id,
- source investigation ids,
- physical location id,
- compromise kind and minute.

During the run none of those causal ids or the location projects. TinyBase gets
only `kind`, a human-readable label and `worldMinute`. The Underground app
shows them under **COMPROMISE** and states explicitly that a condition is not an
ending. P5 owns the causal explanation.

## Balance measurement

The slice includes a deterministic 64-seed harness that exercises the actual
P1→P2→P3→P4 chain rather than isolated P4 calls.

Two schedules were sampled to ten world days:

| Schedule | by day 3 | by day 5 | by day 10 | no compromise by day 10 |
| --- | ---: | ---: | ---: | ---: |
| Reckless: five back-to-back intrusion cycles before waiting | 8/64 | 14/64 | 23/64 | 41/64 |
| Measured: disengage and space three cycles by one world day | 6/64 | 13/64 | 16/64 | 48/64 |

Earliest sampled compromise was minute 1800 (day 1.25) in both sets. Among the
runs that did compromise, the median first-compromise minute was 6480 (day 4.5)
for the reckless set and 5400 (day 3.75) for the measured set; that latter
median must **not** be read as "measured is more dangerous" because far fewer
measured runs compromise at all — it is survivor/selection shape. The robust
comparison is cumulative incidence: by day 10 measured play leaves 48/64 runs
uncompromised versus 41/64 for the reckless burst.

Condition counts at the first compromise boundary:

- reckless: 23 `rig-lost`, 23 `identity-exposed`, 23 `stranded`;
- measured: 16 `rig-lost`, 14 `identity-exposed`, 16 `stranded`;
- `dwelling-lost` is 0 in both balance samples because the canonical balance
  fixture holds the free baseline room, not a lease. D021 eviction is covered
  separately by a deterministic exact-day-boundary test.

These numbers are a tuning baseline, not a locked probability contract. The
invariants are causal ordering, rank independence, counterplay, persistence,
and no ending in Phase 6.

## Verification contract

P4 tests pin:

- legacy/default `compromises: []`;
- final-hit provenance when several physical hits destroy hardware in one tick;
- complete owned machines preventing false `rig-lost` / `stranded`;
- sellable authored tools preventing false `stranded`;
- event-driven lease loss only at the location actually hit;
- relocation preventing an old-location hit from evicting a new safehouse;
- upkeep-before-eviction ordering on an exact world-day boundary;
- identity exposure requiring every causal leg;
- explicit stranded-floor semantics;
- rank independence;
- no retroactive P4 records from historical P3 saves;
- save/restore and same-cause deduplication;
- whole-wait versus split-wait equality;
- projection/TinyBase leak boundaries;
- commands remaining usable after compromise;
- absence of `RunEnded`;
- 64-seed cumulative compromise and condition distributions.

## Out of scope

- Ending selection/rendering and terminality — Phase 7 / #25.
- Postmortem causal-chain presentation — P5 of Phase 6.
- Real-world evasion procedures or open-world physical play.
- Treating rank as physical power.
