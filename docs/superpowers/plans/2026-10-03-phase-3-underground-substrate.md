# Phase 3 P0 — Underground ecosystem substrate

Issue: #21
Dependency: Platform gate #18 complete

## Goal

Give the Phase 2 operation simulation a living social world. This first slice delivers the substrate every later Phase 3 system (messages, rumors, contracts, retaliation, unmasking) builds on:

- ecosystem actors with public handles and rank,
- White/Black starting networks,
- directed relationships,
- deterministic NPC-to-NPC activity that happens without the player,
- player actions (an observed defensive reaction) changing a relationship through the existing trace/reaction provenance,
- evidence-safe projection and a read-only Underground app.

Everything is a fictional abstract model. No real intrusion detail.

## Out of scope for P0 (later Phase 3 slices)

- contracts, messages/forums, rumors,
- retaliation against the player and the unmasking taboo,
- contextual reputation descriptors (Vigilante, Mercenary, ...),
- NPCs targeting the player.

## State

`WorldState.underground`:

- `seed` — injected world seed for ecosystem randomness,
- `lastTickMinute` — world minute the ecosystem has been advanced to,
- `playerNetwork` — `white | black | null` starting network,
- `actors[]` — `id, handle, rank, network, skill, defense, discretion, activity, targetId?`,
- `relationships[]` — directed `fromId -> toId` with `trust`, `fear`, `grudge`,
- `incidents[]` — causal record of NPC-to-NPC activity.

`skill`, `defense`, `discretion`, `activity` and `network` are authoritative hidden truth and are never projected.

## Activity rules

- The ecosystem ticks on fixed 360-minute world-time boundaries inside every world-time advance. Splitting or merging waits never changes outcomes.
- Randomness is a stateless hash of `(seed, tick, actor, purpose)`. There is no RNG state to persist and no `Math.random`.
- Per tick each actor acts with probability `activity%`, picks a counterpart, and the outcome is `skill - defense + noise > 0`.
- **Rank is never an input.** Rank is an output: winners improve, losers worsen, both clamp at 1.
- A linked actor (`targetId`) keeps its operation target's `rank` in sync in the same step, so there is one writer.
- An incident is public with a chance driven by the victim's (or failed attacker's) `discretion`.
- A very long wait only simulates the most recent 28 ticks (7 days) so a huge `wait` cannot freeze the browser.

## Relationship rules

- Successful intrusion: victim -> attacker `grudge +20, trust -15, fear +10`.
- Repelled intrusion: defender -> attacker `grudge +8`; attacker -> defender `fear +10`.
- Player: when an operation triggers a `defensive-watch` reaction against a linked actor, actor -> player gets `grudge +15, trust -10`, with `causeKind: reaction` and the reaction ID. A quiet early exit changes nothing.
- Starting network: same-network actors begin with `trust +20` toward the player.
- `trust` and `fear` clamp to -100..100, `grudge` to 0..100.

## Events

- `UndergroundActivity`
- `ActorRankChanged`
- `RelationshipChanged` (with `causeKind` and `causeId`)

## Projection

- Public index board: every handle and rank (the player included), sorted by rank.
- Public feed: only public incidents.
- Stances: only toward the player, only for actors the player has evidence on, as a coarse band (`friendly | neutral | wary | hostile`), never raw numbers.

## Invariants (tested)

- same seed + commands => identical state and events,
- changing any rank never changes any outcome,
- batching wait calls never changes outcomes,
- ranks stay positive integers,
- the world creates incidents with no player action,
- a quiet exit does not create hostility,
- projection never exposes hidden actor fields,
- legacy saves without `underground` load with an empty ecosystem,
- restore-and-continue equals uninterrupted play.

## TDD order

1. RED tests for activity, determinism, rank independence, batching, cap.
2. RED tests for relationships and reaction provenance.
3. RED schema/legacy tests.
4. RED projection/TinyBase tests.
5. Implement state, hash, ecosystem system, command bus integration.
6. Persistence schema and slice world content.
7. Projection, TinyBase, Underground window.
8. Web gates: test, typecheck, lint, build.

## Provisional balance

Rank deltas and relationship numbers are first-pass tuning. The ranking formula remains an open decision in `DECISIONS.md`; this slice uses a simple movement rule so the rest of Phase 3 has something to read.
