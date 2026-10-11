# G9 P3 — First real declarative contract objective

**Issue:** [#139](https://github.com/MohamedXIV/ghostrank/issues/139). **Design:** [G9 P0](G9_P0_SEMANTIC_CONTRACT.md), [G9 P1](G9_P1_CONDITIONS.md).

## Actual migration

- `src/content/contract-objectives.ts` owns versioned `contract.infrastructure-map.v1` data: finite machine-evidence fact, contract target binding, required-machine count binding and default 1.
- `src/game/content/contract-objectives.ts` resolves the *real* contract's target ID and `requiredMachines`, compiles the exact G9 P1 condition through strict Zod validation and evaluates it in trusted authority. `true` is the only passing result; `false`, `unknown` or malformed/forged bindings fail closed.
- `src/game/simulation/systems/underground.ts:isObjectiveMet` now uses this single authoritative path for `infrastructure-map`. The legacy target-machine count switch case has been **deleted**, not retained as fallback. Other three objectives are unchanged.

## Behavior preserved

`machine-presence` proof must be non-retired and belong to a current machine of the contracted target, counted once per machine. Evidence observed **before acceptance** still qualifies. A target ID missing in world truth cannot pass. The ordinary default is one machine; both authored basic/detailed configurations (one/two machines) use the same generic binder, not additional switches. Valid current-run evidence never references a future minute; the G9 P1 evaluator also rejects any forged future-dated record.

The existing CommandBus continues to own `CONTRACT_NOT_FOUND`, `CONTRACT_NOT_ACCEPTED`, `CONTRACT_EXPIRED`, `OBJECTIVE_NOT_MET`, the three-day map deadline, rewards, ledger, trust/rank adjustments, and any third-party fallout. Contract issue/offer weighting, target selection, no-own-target restriction, seeded NPC actions, event chronology, UI/terminal projection and current save format are untouched. No Nightshade ID is hardcoded into the new definition or adapter.

## Proof and scope

The focused G9 P3 tests use a local test-only oracle for the removed legacy predicate, canonical plus independently generated Fresh Scene/High Pressure worlds, multiple seeds, live CommandBus deliveries, current save/reload, ranks 1 and 999999, wrong target/retired/duplicate evidence, expired/declined/terminal contracts, and player-safe projection. The older canonical golden and seed-sweep tests remain in the full CI. Human unfamiliar-player playtest **NOT RUN**. No new player-visible features or UI claims; G9 P4 is the first independent gameplay opportunity.
