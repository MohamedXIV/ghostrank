# Phase 7 P0 — Terminal Run Lifecycle and Browser Archive

Issue: #25  
Decision: D037  
Base: Phase 6 complete at `4e45ed8b9423836fc60352b01c3f5dca11cc7874`.

## Problem

Every Phase 7 ending needs the same answers:

- where terminality lives;
- what a `RunEnded` event means;
- whether commands still mutate after an ending;
- how the final state survives reload;
- how completed runs enter history;
- what the live projection may reveal.

Implementing an arrested ending before those answers would force each ending to
invent its own lifecycle and persistence behavior.

## State contract

`WorldState.run` is authoritative:

- `{ status: "active" }`; or
- `{ status: "ended", ending: RunEnding }`.

`RunEnding` stores:

- stable in-run ending id;
- ending kind;
- cause kind;
- cause id;
- world minute.

Legacy saves default to `active`.

The vocabulary mirrors the design document but carries no eligibility policy in
P0: arrested, unmasked, captured, killed, missing, compromised, stranded,
forced-disappearance, retired, vanished.

## Terminal primitive

`endRun(world, input)`:

- mutates active → ended;
- emits exactly one `RunEnded`;
- becomes a no-op if the run already ended;
- never rewrites the first cause.

`CommandBus.execute` rejects every command with `RUN_ENDED` after terminality.

P0 deliberately provides no player command or automatic condition that invokes
`endRun`; P1+ owns eligibility.

## Projection

Normal player projection gets only:

- active/ended;
- ending kind;
- player-facing label;
- ending world minute.

It never gets `causeKind` or `causeId`. Explanation continues through the P5
safe postmortem rather than a terminal-state leak.

TinyBase exposes the same safe row and GameShell renders a minimal terminal
surface. Ending-specific art/copy belongs to later slices.

## Browser persistence

IndexedDB moves from schema version 1 to 2 by adding `run-history`.

On completion:

1. serialize/validate the final portable WorldState;
2. write it to `run-history`;
3. delete `active-run/current`;
4. commit both operations in one IndexedDB transaction.

The archive stores the complete final state, not a hand-maintained summary.
Future run history derives summaries/postmortems from that state.

If a terminal active snapshot exists on boot — e.g. a fallback adapter or crash
between older save behavior and archive — GameSession archives it immediately.
The current in-memory session remains terminal for that boot.

## Desktop boundary

The SQLite/Tauri adapter is not a Phase 7 gameplay gate. It receives the
`RunEnded` timestamp case so terminal saves remain valid, but completed-history
storage stays deferred to #19/Phase 10. `RunPersistence` therefore exposes
completed-history methods as optional capabilities. Ending eligibility never
depends on them.

## Tests

P0 pins:

- new and legacy runs default active;
- endRun emits once and first cause wins;
- all commands reject after ending and world state stays unchanged;
- lifecycle survives schema round-trip;
- safe projection/TinyBase omit cause ids;
- player-facing ending labels are stable;
- browser adapter rejects archiving an active state;
- browser completion removes active state and retains full final state in history;
- boot recovers a terminal active snapshot into history and remains terminal in
  the current session;
- normal Phase 6/P5 tests stay green.

## Out of scope

- deciding that any Phase 6 condition is terminal;
- retirement/exit-plan mechanics;
- ending-specific scenes;
- history browser/summary UI;
- desktop archive parity;
- long-run pressure;
- exotic capability.
