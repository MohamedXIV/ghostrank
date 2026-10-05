# Phase 8 P0 — Data-driven world-content roster

Parent: #26  
Depends on: completed Phase 7 / #25.

## Goal

Remove authored peer/target/infrastructure data from the runtime fixture without
changing the world that existing tests and players receive.

P0 is a content-architecture slice, not a breadth slice.

## Content boundary

`src/content/world-content.ts` owns:

- underground actor definitions;
- operation target/infrastructure definitions;
- editorial actor/target archetype tags;
- structural validation;
- clone-on-instantiation.

`slice-world.ts` continues to own scenario/runtime setup:

- world seed;
- player handle/rank;
- starting network;
- starting wallet/rig;
- initial known evidence.

Archetype tags do not enter `WorldState`.

## Validation

Before authored content becomes authoritative simulation state, P0 rejects:

- duplicate actor ids;
- duplicate target ids;
- duplicate machine ids across targets;
- duplicate service ids across targets;
- actor skill/defense/discretion/activity outside integer 0–100;
- invalid actor/target ranks;
- unknown assistant model ids;
- targets with no infrastructure;
- machines with no services;
- actor-owned target ids that do not exist;
- owner/target handle or rank drift.

These checks prevent data breadth from creating ambiguous provenance or broken
cross-system references later.

## Compatibility contract

The first roster, `alpha-core`, is the exact Phase 2–7 content moved verbatim:

- NIGHTSHADE;
- VESPER;
- LATTICE;
- HALFMOON;
- KESTREL;
- NIGHTSHADE's existing relay/vault and two services.

No new peer, target, relationship, model, seed, capability or starting evidence
is introduced by P0.

The full existing deterministic suite is the compatibility proof: if moving the
data changes ecosystem digests, threat chronology, ending behavior, or
projection, P0 is wrong.

## Archetype metadata

The initial tags are intentionally editorial:

- apex operator;
- broker;
- automation specialist;
- reckless tinkerer;
- street operator;
- elite underground operator target.

They describe why content exists and help later P2 breadth stay varied. They
must not become classes, target gates, hidden bonuses or persisted state.

## Verification

P0 pins:

- canonical actor/target ids and public identity;
- archetype metadata remains outside runtime state;
- instantiated content is deep-cloned;
- runtime mutation cannot rewrite the catalog;
- duplicate/dangling/invalid authored content fails loudly;
- existing full tests/typecheck/lint/build remain green.

## Handoff

P1 adds telemetry against this unchanged baseline before P2 intentionally adds
target/NPC breadth.
