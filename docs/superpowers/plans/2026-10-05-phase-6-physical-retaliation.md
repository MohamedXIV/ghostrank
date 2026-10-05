# Phase 6 P3 — Physical Retaliation and Build Interruption

Issue: #24  
Decision: D034  
Depends on: P0 presence/anonymity, P1 investigation pressure, P2 durable rival probes.

## Scope

P3 is the first Phase 6 slice where a threat can cross from information/social
pressure into the physical layer. It ships criminal retaliation and
physical-warning events without inventing a combat-power stat and without
creating a run ending.

A physical escalation requires existing causal facts:

- a peer with enough grudge toward the player;
- the existing Black-network seat as coarse physical backing;
- a prior P2 probe by that peer;
- a deterministic stateless roll.

Rank is never an input. Dwelling anonymity lowers exposure and accumulated
authority pressure raises it.

## Consequences

The prior probe remains a fallible belief rather than becoming omniscience:

- a correct `rig` read may produce a power outage;
- a wrong `rig` read produces only unusual connectivity;
- a correct `dwelling` read may damage one owned hardware instance;
- a wrong `dwelling` read produces only ambiguous door-camera motion;
- a `habits` read produces nearby activity rather than a magically precise
  location.

Durable `PhysicalThreat` truth keeps the actor, source probe, investigation
citations, property/build impacts, and hidden outage end. Projection exposes
only the signal kind and the minute it was noticed. The same projection feeds
the Underground ATTENTION log and the room surface.

## D034 — true pause/resume

An outage does not mutate the build's frozen commissioning truth:

- `startedWorldMinute` stays fixed;
- `dueWorldMinute` stays fixed;
- model/spec identity stays fixed;
- the frozen quality outcome stays fixed.

Interruption is separate state:

- `pausedAtWorldMinute?`;
- `accumulatedPausedMinutes?`.

The effective completion minute is the frozen due minute plus closed pause
time. An active pause has no completion boundary yet. A build commissioned
while the outage is active joins the same pause. Save/restore preserves the
pause exactly.

To make an outage able to beat a build on the exact same ecosystem boundary,
`advanceWorldTime` now interleaves existing deadline folds around
`advanceUnderground`'s own tick loop. The underground system still owns tick
selection and the existing catch-up cap; the hooks only advance upkeep,
investigations, and build completion to the tick being processed. This also
keeps whole waits and split waits equivalent for P3 inputs.

## Capability-floor rule

Physical retaliation may destroy owned property when property loss is the
consequence. It may not turn hardware into a progression gate: a player with no
remaining hardware can still perform baseline play.

P3 intentionally does not destroy the current lease. Mid-command lease loss
would affect later upkeep boundaries and make chronology part of the
catastrophic-compromise contract. That belongs to P4, which owns the durable
compromise condition. Phase 7 still owns endings; P3 emits no `RunEnded`.

## NPC AI beat

A peer involved in a non-warning physical escalation may deterministically
adopt the Salvaged Reason Core. The adoption is persisted and emitted with
provenance; subsequent NPC behavior uses the already-shipped
`npcAssistDeltas` path rather than a new AI mechanic.

## Verification contract

The P3 suite pins:

- grudge / physical backing / prior-probe prerequisites;
- rank independence;
- monotone anonymity counterplay;
- investigation pressure as a hidden input;
- wrong-probe non-destructive behavior;
- relocation invalidating a once-correct dwelling address;
- immutable frozen build truth through an outage;
- exact-boundary outage-over-build ordering;
- build commissioning during an outage;
- sequential outages settling only the pause they own;
- mid-outage save/restore;
- whole-wait versus split-wait equality;
- property loss without losing the baseline capability floor;
- monotonic hardware instance ids after destruction;
- projection/store leak boundaries plus current-room relevance;
- deterministic NPC assistant adoption provenance;
- legacy-save defaults;
- absence of run-ending behavior.

The full pre-P3 suite remains the regression oracle, including P2's six
pre-probe golden ecosystem digests.
