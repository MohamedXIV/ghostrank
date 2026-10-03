# Phase 3 P3 — Retaliation and the Unmasking Taboo

Issue: #21
Builds on: P0–P2 (merged through #29)

## Goal

Hostility must have consequences the world delivers on its own. A rival you have wronged can strike back while you wait, sleep, or lay low. The worst retaliation, unmasking a player, is a taboo: it hurts the player, but the community punishes the person who did it.

Everything is a fictional abstract model. Unmasking is a reputation event in the simulation; it never touches real identity, files, or network.

## Rules

### Provocation (grudge source)

- The first severe run against a target still earns the owner's `defensive-watch` reaction (grudge +15, unchanged).
- Escalating again while that watch is already active is a provocation: owner grudge toward the player `+25`, trust `-10`, cause `intrusion` citing the new escalation trace.

### Retaliation (on ecosystem ticks)

Evaluated per actor per tick after NPC activity, with the same stateless hash. Rank is never an input.

- An actor with grudge toward the player `>= 60` rolls to **unmask** with 3% per tick.
- Otherwise an actor with grudge `>= 30` rolls to **smear** with 12% per tick.
- Smear: player rank worsens by 1% (min 1), actor grudge `-10` (cause `retaliation`).
- Unmask: player rank worsens by 5% (min 1), actor grudge `-30` (cause `unmasking`).

### The unmasking taboo

When an actor unmasks the player the rest of the ecosystem reacts:

- every other actor's trust toward the unmasker `-40` (cause `unmasking`),
- every other actor's trust toward the player `+10` (sympathy, cause `unmasking`),
- the unmasker's own rank worsens by 5% (min 1).

## State

`UndergroundState.retaliations[]`: `id, actorId, kind ("smear" | "unmasking"), worldMinute`.

## Events

`Retaliation {retaliationId, actorId, kind, worldMinute}`; `PlayerRankChanged.causeKind` gains `"retaliation"` (cause id is the retaliation id); `RelationshipChanged.causeKind` gains `"intrusion" | "retaliation" | "unmasking"`; `ActorRankChanged.incidentId` carries the retaliation id for the unmasker's penalty.

## Projection

`underground.retaliations` (newest first, cap 20): `id, actorHandle, kind, worldMinute`. TinyBase table `retaliations`. No raw grudge, no rolls.

## Commands

None. Retaliation is the world acting. The player already sees hostility through stances and the new Heat section.

## Invariants (tested)

- below the grudge thresholds nothing happens,
- same seed + commands => identical retaliations; rank never changes them; waits can be split freely; restore-and-continue equals uninterrupted play,
- a smear worsens player rank with provenance and spends grudge,
- unmasking worsens player rank, punishes the unmasker with provenance, and earns the player sympathy,
- a second escalation on a watched target raises grudge, a first one does not,
- legacy saves load with no retaliations,
- targets are never gated by anything here.

## Out of scope

Authorities, arrest, payments, forums, reputation descriptors.
