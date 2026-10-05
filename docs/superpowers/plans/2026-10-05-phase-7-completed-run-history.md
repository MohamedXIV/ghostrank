# Phase 7 P4 — Completed-run history

Parent: #25  
Depends on: D037 terminal contract, D038 forced endings, D039 retirement operation, D040 retirement outcomes.  
Reference only: closed PR #40 for its browser archive mechanics; its competing `run.status` lifecycle remains superseded.

## Goal

Preserve completed runs as browsable local history without creating a second source of truth for endings, summaries, or postmortems.

## Authoritative archive

The browser stores the final, Zod-validated portable `WorldState` once.

P4 does **not** persist:

- a duplicate run summary,
- a peak-rank counter the simulation never tracked,
- a copied morality/alignment score,
- a second terminal status,
- a separate postmortem snapshot.

Summary and postmortem presentation are derived from the archived final state when the player opens History.

## Browser persistence

IndexedDB advances from v1 to v2 and adds a `run-history` object store beside the existing `active-run` slot.

On successful terminal persistence:

1. the final portable state is written to `run-history`;
2. the active slot is deleted;
3. both writes happen in one IndexedDB transaction.

Only an existing active slot may perform the move. Repeating an already-successful completion therefore does not append a duplicate archive row.

Archive keys contain archive time plus a random local identifier for ordering/identity only. They are not gameplay state and are never used to derive an ending.

## Failure and recovery

A terminal run must never become playable again because archival failed.

If the active→history move fails during autosave, GameSession writes the terminal snapshot back to the active slot before surfacing the persistence failure. On the next boot, an ended active snapshot is recognized by canonical `WorldState.ending` and the archive move is retried.

The current boot remains on the ended session even when recovery succeeds. A later boot sees no active slot and creates a fresh active run separately. History remains available from the new run.

## Desktop boundary

P4 is web-first. `RunPersistence` exposes optional completed-run methods so the browser can ship history without forcing the deferred Tauri/SQLite adapter to invent a second native history contract before #19 / the desktop phase.

A Tauri session therefore continues to preserve its terminal active snapshot until the native adapter is reconciled later.

## Player-safe browse model

`deriveCompletedRunSummary` reads an archived terminal state and emits only player-safe history:

- final ending status/label/time;
- retirement variant/detail when applicable;
- final rank — explicitly **not** an invented peak rank;
- credits left and lifetime ledger value moved;
- completed-contract count;
- intrusive-escalation count;
- authored-workflow count;
- compromise count;
- existing derived reputation descriptors;
- the existing player-safe P5 postmortem reads.

Ending cause ids, raw relationship numbers, probe correctness, investigation progress/source ids, hidden actor/location truth and other private simulation fields never enter the browse model.

## GHOST/OS surface

A **History** launcher opens a read-only completed-run window. Runs are presented newest-first with the safe summary and postmortems above.

History has no simulation commands. Browsing an old run cannot mutate it or the current active run.

## Verification

P4 pins:

- active-run restore remains unchanged;
- terminal active→history movement;
- repeat completion is idempotent;
- live states cannot enter completed history;
- corrupt/live history records are rejected;
- terminal-active boot recovery does not revive gameplay;
- archive failure falls back to a durable terminal active snapshot;
- the next boot starts a fresh active run after successful archival;
- history summaries are derived, not persisted;
- safe summary leak scans;
- safe postmortem reuse;
- normal web tests/typecheck/lint/build remain green.
