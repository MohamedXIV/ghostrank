# G9 P1 — Finite Scoped Condition Evaluator

**Implementation slice:** [#137](https://github.com/MohamedXIV/ghostrank/issues/137). **Design baseline:** [G9 P0 contract](G9_P0_SEMANTIC_CONTRACT.md). This is pure simulation infrastructure, not yet a new gameplay mechanic.

## What is executable

- `src/game/content/definitions.ts` validates a bounded, strict TS/Zod condition AST: `fact`, `all`, `any`, `not`; at most eight nested condition levels and 64 condition nodes. The finite fact vocabulary is `player.known-active-target-machines`, `incident.actual-outcome`, and `incident.reported-outcome`.
- `src/game/content/conditions.ts` reads existing `WorldState` without mutation, return `true` / `false` / `unknown` plus a finite reason. Conditions use deterministic three-valued logic.
- Knowledge lenses: `authority` reads actual incident truth; `player-known` sees earned machine evidence and **public** actual incidents, but a private incident's transmitted rumor is never promoted to truth; `observer-report` can attribute a **message that an actor really sent to the player**, never infer any NPC's incoming knowledge.
- `incident.reported-outcome` explicitly asserts that a player-delivered report *claims* something, **not** that it happened. If reports disagree, the claim query is unknown. `rumor.accurate`, hidden organization motives and unearned machine IDs are never returned.
- The first machine fact counts unique, non-retired, present/past observations matching the bound target's actual machine IDs; the authoritative query may evaluate a target, but a player-known query for a guessed/undiscovered target returns the same unknown reason as a non-existent target.
- No arbitrary property access, mutating effects, content-script execution or new clock. No save schema or new source of truth. Rank is never queried.

## Deliberately not implemented

The original P1 slice did not migrate contracts or register effects. Subsequently P2 #138 shipped one opt-in authorized on-action and P3 #139 migrates `infrastructure-map` to the P1 evaluator. Broker-free opportunities (#140), incoming NPC belief store, Ink, Web Worker and Rust remain out of scope. This query is trusted server/simulation code; do **not** expose it directly to GUI, terminal or inkjs. Future player-facing condition previews must use a separately authorized/redacted projection.

## Verification

`src/game/content/conditions.test.ts` covers invalid/dangling/wrong scope, malformed/cyclic/deep input, unknown propagation, future/foreign/duplicate/retired evidence, rank independence and immutability, false/contradictory rumors versus actual incidents and false NPC omniscience. Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` on Node 24. No browser change or human playtest in this slice; the G3 unfamiliar-human gate remains **NOT RUN**.
