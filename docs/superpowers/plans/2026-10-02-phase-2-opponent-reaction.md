# Phase 2 P0 — Deterministic opponent reaction loop

Issue: #16
Parent: #7
Dependency: #14 complete

## Goal

Close Phase 2 with the first deterministic opponent reaction driven by persisted causal footprint.

This is a fictional abstract state machine. It does not model real counter-hacking, tracking, law-enforcement, or evasion.

## Reaction rule

For each target independently:

- sum the weights of that target's persisted traces
- score below 5: no active reaction
- score 5 or more: trigger one active `defensive-watch` reaction
- an already-active reaction is not duplicated

The reaction records exactly which trace IDs contributed when it triggered.

## Reaction state

Each reaction stores:
- deterministic reaction ID
- target ID
- kind: `defensive-watch`
- status: `active`
- source trace IDs
- footprint score at trigger
- trigger world minute
- whether this reaction is player-visible

The first reaction is player-visible as an abstract target posture. No operational detail is exposed.

## Event

Triggering creates `OpponentReactionTriggered` with reaction ID, target, kind, source trace IDs, score, and world minute.

## Invariants

- no rank input
- no random roll
- same state + commands => same reaction
- low-footprint early exit can remain without reaction
- severe footprint causes an explainable response
- save/restart preserves the reaction and provenance

## TDD order

1. RED test: early low footprint produces no reaction.
2. RED test: severe footprint triggers one reaction at score 5.
3. RED test: reaction event references the causal trace IDs.
4. RED test: player rank does not affect reaction.
5. RED schema/defaulting tests.
6. Implement reaction state + deterministic evaluation.
7. Project only player-visible reactions through TinyBase.
8. Add read-only Recon reaction panel.
9. Restart acceptance.
10. Exact-head web + Rust/Tauri CI.
