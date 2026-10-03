# Phase 3 P1 — Rumors and messages

Issue: #21
Builds on: P0 underground substrate (`2026-10-03-phase-3-underground-substrate.md`)

## Goal

Let the ecosystem talk to the player. Private NPC-to-NPC incidents can leak as imperfect rumors through trusted contacts, arrive in a player inbox, and be read through the same typed command from Terminal and GUI. A player's observed footprint also spreads socially and shifts how a target owner's network sees them.

Everything is a fictional abstract model.

## Rules

### Incident leaks (rumor -> message)

- Only **private** incidents leak. Public incidents are already in the feed.
- A *contact* is an actor whose relationship toward the player has `trust >= 10` and who was not a party to the incident.
- Each contact leaks with 35% probability, decided by the stateless hash of `(seed, tick, contact, incident)`.
- A leak is accurate with 75% probability. A distorted leak flips the claimed outcome (succeeded <-> repelled). Accuracy is hidden truth.
- Each leak creates one `rumor` record and one inbox `message` from the contact.
- Rank is never an input.

### Player footprint (rumor -> relationship)

- When a defensive reaction triggers against a linked actor, the owner's network peers (same network, not the owner) spread a `player-footprint` rumor.
- Each peer's relationship toward the player gets `trust -5`, citing the rumor ID (`causeKind: rumor`).
- This produces no inbox message. The player sees the consequence only through behaviour.

### Reading

- New command `readMessage { messageId }`. No world-time cost.
- Failures: `MESSAGE_NOT_FOUND`, `MESSAGE_ALREADY_READ`.
- Terminal: `read <messageId>`. GUI uses the same command.

## State

`UndergroundState.rumors[]`: `id, kind, sourceId, relayId, accurate, claim | null, worldMinute`.
`UndergroundState.messages[]`: `id, fromId, rumorId, worldMinute, read`.

## Events

- `RumorSpread` (rumor ID, kind, source ID, relay, accuracy, world minute)
- `MessageDelivered`
- `MessageRead`
- `RelationshipChanged` gains `causeKind: "rumor"`

## Projection

`inbox`: newest-first messages (cap 30) with sender handle, the *claimed* parties and outcome, minute and read flag, plus an unread count. Accuracy, rumor ID and incident ID never leave the simulation.

## Invariants (tested)

- same seed + commands => identical rumors and messages,
- batching waits never changes them,
- rank never changes them,
- public incidents never leak,
- parties never relay their own incident,
- only trusted contacts relay,
- some rumors are distorted and some accurate across a long run,
- the inbox never exposes accuracy or incident provenance,
- a quiet exit spreads nothing,
- Terminal and GUI produce the same read command,
- legacy saves load with an empty inbox,
- restore-and-continue equals uninterrupted play.

## Out of scope

Verifying rumors, contract offers, retaliation against the player, the unmasking taboo, reputation descriptors.
