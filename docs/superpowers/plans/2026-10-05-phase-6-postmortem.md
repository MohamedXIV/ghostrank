# Phase 6 P5 — Player-Safe Postmortem Causal Chain

Issue: #24  
Decision: D036  
Depends on: P1 investigations, P2 rival probes, P3 physical retaliation, P4 catastrophic compromise.

## Scope

P5 closes Phase 6 by making failure **learnable** without turning the game into an
omniscient debugger.

The implementation is a pure derived read over existing WorldState. It adds:

- no authoritative state;
- no commands;
- no events;
- no persistence fields or migrations;
- no ending selection;
- no `RunEnded`.

The same provenance that already supports debugging and persistence is traversed
to select the facts that belong to a compromise. Only player-knowable facts are
emitted.

## What a postmortem may show

A timeline can contain:

1. **player action** — an operation escalation/disengagement the player performed;
2. **defensive reaction** — only when that reaction was already player-visible;
3. **authority evidence** — only signals that actually surfaced, and only for a
   target whose profile the player has observed;
4. **probe tell** — the same derived ping/call/missing-contact artifact P2 already
   exposes, never the hidden subject, actor, or correctness;
5. **physical evidence** — the same P3 signal the player already saw;
6. **compromise condition** — the P4 condition label and minute.

The timeline uses hidden source ids internally to select records. Those ids never
cross the projection.

## What it must never reveal

P5 does not project:

- rival actor ids or handles hidden by P2/P3;
- probe subject;
- probe correctness;
- investigation `progress`;
- investigation raw source ids;
- physical location ids;
- destroyed hardware ids;
- outage end times;
- RNG seeds;
- hidden target handles;
- any invented "true story" unsupported by stored provenance.

Target names follow the normal evidence boundary. If the player has no
`target-profile` evidence for a referenced target, their own operation may still
appear as an action against **a target**, but hidden authority evidence tied to
that target is omitted.

## Complete vs incomplete attribution

A postmortem is **COMPLETE** only when all of these survive:

- the compromise resolves its P4 physical threat;
- that threat resolves the cited P2 probe;
- at least one player-caused `OperationTrace` is reachable through the cited P1
  investigation provenance.

If that chain is not fully citable, P5 still shows the visible facts it can prove
and labels the result **INCOMPLETE ATTRIBUTION**.

This rule is intentionally conservative. A satisfying story is not worth
fabricating blame.

## Timeline semantics

The read is flattened into deterministic chronological order for comprehension.

That does **not** mean each adjacent row is asserted to cause the next row.
Investigation pressure and rival probing can be parallel branches that converge on
one physical consequence. The UI says this explicitly:

> These facts are selected by stored provenance and ordered by time; adjacent
> lines are not claimed as one hidden edge.

Tie order is stable:

1. player action;
2. defensive reaction;
3. authority evidence;
4. probe tell;
5. physical evidence;
6. compromise.

This makes save/reload and repeated projections byte-stable without introducing
a new clock or state cursor.

## Projection and UI

`WorldProjection.postmortems` contains one safe read per compromise.

TinyBase receives two tables:

- `postmortems` — compromise label/kind/minute, attribution state, safe note,
  and step count;
- `postmortemSteps` — compromise id, visible step kind, minute, and safe text.

No hidden causal ids enter either table.

The Underground COMPROMISE section renders the timeline immediately under the
condition. A compromised run remains interactive; this is a learning surface, not
an ending screen.

## Verification contract

The dedicated P5 suite pins:

- exact chronological ordering for a complete synthetic chain;
- pure-read behavior (WorldState byte-equivalent before/after derivation);
- **INCOMPLETE ATTRIBUTION** when no player trace is citable;
- hidden target handles never leaking through investigation provenance;
- projection/TinyBase scans excluding actor ids, source ids, locations,
  correctness, progress, seed, and hidden fixture names;
- probe tell derived from the hidden subject without exposing the subject;
- graceful partial-provenance behavior when the threat/probe rows are missing;
- a real seeded P1→P2→P3→P4→P5 scenario from the existing 64-seed balance
  envelope producing a complete player-action → probe → physical → compromise
  chain;
- no authoritative `postmortems` field;
- no `RunEnded`.

Normal gameplay gates remain the repository-standard web-first set: tests,
typecheck, lint, and production web build.

## Phase 6 exit criteria

P4 already measured the first two:

- early runs are genuinely dangerous;
- survival around a few days is plausible.

P5 turns the third into a checked fact:

- players can learn something concrete from failure because a real compromised
  seeded run produces a provenance-backed chain containing at least one
  player-caused action before the observable probing/physical consequence;
- if the simulation cannot prove such a player-caused leg, the UI says so rather
  than inventing one.

This also checks #24's explicit full-chain criterion: operation footprint can be
cited through investigation provenance, followed by observable information
pressure, a physical consequence, and a catastrophic condition.

## Out of scope

- Ending eligibility, terminality, `RunEnded`, run completion — Phase 7 / #25.
- Run-history storage and completed-run browsing — Phase 7.
- Revealing hidden NPC identities or random rolls after failure.
- Adding a second causal recorder when the existing state already carries the
  provenance.
- Real-world operational/evasion guidance.
