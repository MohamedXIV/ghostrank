# Phase 7 P0 — Terminal Run Contract

Issue: #25  
Decision: D037  
Depends on: Phase 6 / #24 complete.

## Grounded starting point

At Phase 7 kickoff the live repository had:

- no `RunEnded` event;
- no terminal field in `WorldState`;
- no command guard after an ending;
- browser persistence storing exactly one active WorldState;
- no completed-run history;
- Phase 6 compromise conditions that intentionally remained playable.

That means an ending cannot safely start as a UI screen or as a special case in one
threat system. The simulation needs one terminal contract first.

## Scope

P0 introduces the terminal substrate only.

It does **not** decide which Phase 6 condition is terminal. It does not implement
retirement, run history, long-run pressure, or exotic capability.

The slice adds:

- `RunEndingStatus`;
- `RunEndingCauseKind`;
- `RunEndingRecord`;
- `WorldState.ending: RunEndingRecord | null`;
- `endRun` as the one-way writer;
- `RunEnded` as the event;
- the CommandBus terminal guard;
- canonical save/schema support;
- a safe player projection;
- a terminal GameShell surface.

## Ending vocabulary

The contract reserves the statuses already named by Phase 7 / world design:

- `arrested`
- `unmasked`
- `missing`
- `compromised`
- `stranded`
- `retired`
- `vanished`

P0 does not imply that all are currently reachable.

The cause vocabulary is deliberately provenance-oriented rather than
presentation-oriented:

- `compromise`
- `investigation`
- `physical-threat`
- `retirement`

The authoritative cause id stays hidden from the final live projection.

## One-way semantics

`endRun(world, ...)` behaves as an idempotent terminal transition:

- live world → stores the final record and emits one `RunEnded`;
- ended world → no mutation and no second event.

The first final status therefore cannot be overwritten by a later system tick or
a second eligibility rule.

Once the record exists, `CommandBus.execute` returns:

    { ok: false, events: [], error: "RUN_ENDED" }

before dispatching any command. Time cannot advance and no gameplay state can
change after terminality.

## Persistence

The canonical WorldState schema adds `ending` with `null` as the legacy
default. Portable browser saves therefore round-trip a final record without a
format fork.

P0 intentionally leaves `RunPersistence` as the active-run-only interface.
Completed-run archival is a later dependency: P4 will extend the boundary once
the run-summary/history model exists.

The deferred SQLite event adapter recognizes `RunEnded` so the retained desktop
path does not decay, but desktop/native validation remains outside normal
web-first gameplay gates.

## Projection

`WorldProjection.ending` exposes only:

- final status;
- display label;
- ending minute.

It does not expose `causeKind` or `causeId`.

TinyBase mirrors only that safe surface under `meta/run`. GameShell reads the
same projection and replaces the interactive surface with an in-world final
screen. The UI is a consequence of terminality, not its authority.

## Verification contract

Dedicated tests pin:

- default and legacy saves start live;
- first ending wins;
- second ending attempt is idempotent;
- ended runs reject later commands without state mutation;
- canonical portable save round-trips the terminal record;
- projection and TinyBase omit cause ids;
- the TinyBase terminal row clears correctly when projecting a live world;
- ordinary time advancement cannot create an ending in P0.

Normal gates remain tests, typecheck, lint, and production web build.

## Handoff

P1 may now implement deterministic forced-ending eligibility by calling the same
`endRun` primitive from world-time chronology.

P1 must not:

- add another terminal boolean;
- make rank an ending-power input;
- reveal hidden cause ids in the final surface;
- bypass the terminal command guard.

P2 retirement and P3 ending variants use the same contract. P4 moves ended runs
into completed history without changing what "ended" means.
