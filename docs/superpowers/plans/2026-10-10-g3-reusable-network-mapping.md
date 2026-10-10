# Reusable Network Mapping (G3 P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one approachable fictional Network Mapping mini-game as a reusable world mechanic, independently demonstrated on Nightshade and a genuinely different G2 Fresh Scene target.

**Architecture:** Typed optional `WorldState.networkChallenges` holds authoritative seeded route definitions and sourced evidence. A pure generic evaluator, CommandBus command and player-safe projection are shared; a Nightshade adapter and a generated-target adapter supply different fiction and clue timing. One Recon GUI and one terminal command surface dispatch the same command.

**Tech Stack:** Node >=24, TypeScript 6, Next.js 16, React 19, Zod 4, TinyBase, Vitest 5, Playwright-core/browser smoke when available.

**Spec:** `docs/superpowers/specs/2026-10-10-g3-reusable-hacking-mechanics-design.md` (D073, #105, #79).

## Global Constraints

- **THIS PLAN IS FOR HUMAN REVIEW, NOT YET APPROVED FOR FEATURE IMPLEMENTATION.** Written spec merged via PR #106, `main` SHA `75c37352ee52ed96c8c64d73dc15399944d457ed`.
- Build only Network Mapping now. Packet Analysis, Log Forensics, Access/Trust, Untrusted Drop, Camera Investigation, travel, isometric room, Tauri and universal puzzle frameworks are out of scope.
- Network-route correctness is inferred from *fictional* constraints, never player/target rank. No real-world network access, host OS operations or real exploits.
- Challenge absent = old world unchanged. Preserve old `nightshade-v1` saves and D071 quiet/intrusive/burn/end outcomes, generated baselines, and first-ending-wins.
- Use authoritative clock/evidence/traces/events only. Initial executed route-test price: 4 base world minutes and +1 low trace, shared by preview and execution; never silently change cost policy.
- Challenge rules and core view must not import Nightshade content or branch on target-name strings. A separate genuine non-Nightshade consumer is a release gate, not just a renamed fixture.
- Terminal and GUI invoke exactly one CommandBus action. Player-safe projection excludes hidden objective identities, correct answer, future defender state and unrevealed constraints. Usable with keyboard and at 390px.
- Local Node 24 verification first; avoid GitHub Actions/paid services. Automated browser proof must never be called a human playtest.
- Use test-first RED→GREEN with a focused commit after each task. Do not modify main directly.

## Review Focus

The five most dangerous expected input/operational cases, and where to test each:

1. **Forged/unknown target, challenge or route:** reject without clock/trace spend or secret disclosure (Task 3).
2. **Clock boundary during verification:** review rotation or terminal ending wins over a stale route; no double-charge or post-ending mutation (Task 3).
3. **Stale, absent or spoofed evidence:** source/epoch filters and projection prevent blind guessing or revelation of the correct link (Tasks 2 and 4).
4. **Structurally plausible corrupted save:** duplicate candidate IDs, missing world-machine references or bad observation/test epoch must fail typed schema validation instead of generating a different puzzle (Task 1).
5. **Unrelated world accidentally gated:** old canonical and generated contracts remain solvable without routing; opt-in Fresh Scene challenge is reproducible (Task 6).

---

## Ownership map (decide file boundaries before coding)

| Domain responsibility | Existing/new files |
| --- | --- |
| Route state and optional WorldState field | `src/game/simulation/state/world-state.ts` |
| Pure route rules, validators and clue helper | New `src/game/simulation/systems/network-routes.ts` |
| Save validation and compatibility | `src/persistence/world-state-schema.ts`; new `src/persistence/network-routes-schema.test.ts` |
| Command, trace, event and clock | `src/game/simulation/command-bus.ts`, `src/game/simulation/commands/types.ts`, `src/game/simulation/events/types.ts` |
| Projection | `src/game/simulation/projection/project-world.ts` |
| Nightshade-only story adapter | `src/content/nightshade-slice.ts`, `src/game/simulation/systems/nightshade-slice.ts`, `src/game/runtime/slice-world.ts` |
| Different seeded target adapter | `src/game/runtime/slice-world.ts`, optional new `src/game/world-generation/network-route-provider.ts` |
| GUI and terminal shared authority | `src/components/game/recon/recon-topology.tsx`, `src/game/computer/apps/target-actions.ts`, `src/game/computer/terminal/parse-command.ts`, `src/components/game/computer-desktop.tsx`, `src/app/globals.css` |
| Acceptance tests | New `src/game/simulation/__tests__/network-routes.test.ts`, `network-route-command.test.ts`, `network-route-projection.test.ts`, `nightshade-v2-routes.test.ts`, `src/game/world-generation/generated-network-routes.test.ts`; existing Nightshade/schema/Recon/parser tests |

### Task 1: Optional, validated generic route state

**Files:** Modify `src/game/simulation/state/world-state.ts`, `src/persistence/world-state-schema.ts`; create `src/persistence/network-routes-schema.test.ts`.

**Interfaces:**

```ts
export type NetworkCarrier = "public" | "sealed";
export type NetworkEcho = "circle" | "triangle";
export interface NetworkRouteCandidate {
  id: string; label: string; carrier: NetworkCarrier; echo: NetworkEcho;
}
export interface NetworkRouteObservation {
  id: string; kind: "carrier" | "echo"; value: NetworkCarrier | NetworkEcho;
  sourceId: string; epoch: number; worldMinute: number;
}
export interface NetworkRouteTest {
  routeId: string; epoch: number; result: "confirmed" | "refuted"; worldMinute: number;
}
export interface NetworkRouteChallenge {
  id: string; targetId: string; entryMachineId: string; objectiveMachineId: string;
  candidates: NetworkRouteCandidate[];
  requiredCarrier: NetworkCarrier; requiredEcho: NetworkEcho; epoch: number;
  baseMinutes: number; traceWeight: number;
  observations: NetworkRouteObservation[]; tests: NetworkRouteTest[];
}
// Add to WorldState and InitialWorldState: networkChallenges?: NetworkRouteChallenge[]
```

- [ ] **Step 1 (RED test):** Test absence of `networkChallenges` on legacy round-trip; a complete challenge round-trips unchanged; duplicate route IDs, bad IDs for target/machines, same-epoch repeated tests, future timestamps, invalid `value`/kind combinations and negative epoch reject.
- [ ] **Step 2 (verify RED):** `npm run test -- src/persistence/network-routes-schema.test.ts`; expect added tests FAIL because model/schema do not exist.
- [ ] **Step 3 (implement):** Add types and strict Zod checks to existing schema, with challenge-target/machine reference validation in `superRefine`. Leave the optional field **absent** in worlds without a provider; do not add `[]` in save defaults or initial-world factory.
- [ ] **Step 4 (GREEN):** Same test command + `npm run typecheck` PASS, with old world serialized form deeply equal.
- [ ] **Step 5 (commit):** `feat(g3): validate optional generic route state`.

### Task 2: Deterministic and epistemically safe core rule

**Files:** Create `src/game/simulation/systems/network-routes.ts`, `src/game/simulation/__tests__/network-routes.test.ts`.

**Interfaces:**

```ts
export function matchingNetworkRoute(challenge: NetworkRouteChallenge, routeId: string): boolean;
export function observedNetworkConstraints(challenge: NetworkRouteChallenge):
  { carrier?: NetworkCarrier; echo?: NetworkEcho };
export function previewNetworkRoute(
  world: WorldState, targetId: string, challengeId: string, routeId: string
): { ok: true; minutes: number; traceWeight: number; footprintAfter: number }
 | { ok: false; error: string };
export function rotateNetworkRoute(challenge: NetworkRouteChallenge, nextEcho: NetworkEcho): void;
export function recordNetworkObservation(
  challenge: NetworkRouteChallenge, observation: NetworkRouteObservation
): void;
```

- [ ] **Step 1 (RED test):** A three-route example `public/triangle`, `sealed/circle`, `sealed/triangle` plus sourced `sealed` and `triangle` clues uniquely selects third route; rotating echo to `circle` changes solution. Missing/currently stale clues, same-route repeated test, invalid route, wrong target all reject without grading the answer; observation source/epoch must be consistent.
- [ ] **Step 2 (RED run):** `npm run test -- src/game/simulation/__tests__/network-routes.test.ts` FAIL as expected.
- [ ] **Step 3 (implement):** Pure helpers, no Nightshade imports, no hidden RNG consumption. Use `hashUnit(seed, "g3-network-route", targetId, candidateId)` to vary labels/order predictably; do not change generated world RNG or rank outcomes.
- [ ] **Step 4 (GREEN):** Target test PASS; 120-seed sweep demonstrates unique solution and >=2 visibly distinct layouts; `previewNetworkRoute` reads but never mutates.
- [ ] **Step 5 (commit):** `feat(g3): add reusable route reasoning and preview`.

### Task 3: Real CommandBus route execution

**Files:** Modify `src/game/simulation/command-bus.ts`, `src/game/simulation/commands/types.ts`, `src/game/simulation/events/types.ts`, `src/persistence/world-state-schema.ts`; create `src/game/simulation/__tests__/network-route-command.test.ts`.

**Interfaces:** `{ type:"testNetworkRoute"; targetId:string; challengeId:string; routeId:string }` becomes a typed `SimulationCommand`. Add `NetworkRouteTested` event (target, challenge, route, epoch, result, world minute) and a distinct `"network-route-test"` `TraceCause`, including all exhaustive formatting/schema consumers.

- [ ] **Step 1 (RED test):** With two earned clues, correct route takes 4 minutes, +1 low trace, grants live `machine-presence` for the real objective; wrong route takes 4/+1 and records refutation but grants nothing; repeated route in same epoch costs 0. Unobserved, other target, unknown route/challenge, no active operation, active clock job, ended slice and ended run reject at zero cost. A four-minute test crossing an owner review yields elapsed time but **no obsolete evidence or additional route trace**; forced ending wins.
- [ ] **Step 2 (RED run):** `npm run test -- src/game/simulation/__tests__/network-route-command.test.ts` FAIL.
- [ ] **Step 3 (implement):** Bus validates, advances via existing `advanceWorldTime`, checks epoch and run terminality after time; then evaluates and records `NetworkRouteTest`, `recordTrace`/reaction, `recordEvidence`/event. Do not mutate in React/terminal. Add `testNetworkRoute` to existing slice-ended command guards; no rank inputs.
- [ ] **Step 4 (GREEN):** Target test and `npm run typecheck` PASS; inspect actual event ordering once and no double clock/tick.
- [ ] **Step 5 (commit):** `feat(g3): verify network hypotheses through CommandBus`.

### Task 4: Player-safe graph and knowledge projection

**Files:** Modify `src/game/simulation/projection/project-world.ts`; create `src/game/simulation/__tests__/network-route-projection.test.ts`.

**Interfaces:** `VisibleNetworkRouteChallenge` includes `id`, `targetId`, `candidates: {id,label,carrier,echo,status}[]`, `known:{carrier?,echo?}` and `preview:{minutes,traceWeight}|null`. Add an optional `networkRoutes` field to `VisibleWorld`, leaving existing schema/projection fields untouched.

- [ ] **Step 1 (RED test):** Before entry machine evidence no candidate map; after discovery, show only fictional candidate descriptions, never hidden objective machine ID or expected constraints. Observations appear only if earned from a source in the current epoch. Refuted/stale/confirmed show with labels not color only; after NPC rotation do not leak new echo; closed operation and ended run cannot get an executable preview.
- [ ] **Step 2 (RED run):** `npm run test -- src/game/simulation/__tests__/network-route-projection.test.ts` FAIL.
- [ ] **Step 3 (implement):** Use `observedNetworkConstraints`, known-target records and current epoch; only map player-safe known routes. Return absent optional field when no challenges; no local correctness calculation or answer field.
- [ ] **Step 4 (GREEN):** Target test plus `npm run test -- src/game/simulation/__tests__/projection.test.ts` PASS.
- [ ] **Step 5 (commit):** `feat(g3): expose player-safe network route projection`.

### Task 5: Nightshade is a *consumer*, not the rule owner

**Files:** Modify `src/content/nightshade-slice.ts`, `src/game/simulation/systems/nightshade-slice.ts`, `src/game/runtime/slice-world.ts`, `src/persistence/world-state-schema.ts`; create `src/game/simulation/__tests__/nightshade-v2-routes.test.ts`; modify old Nightshade test fixture only to select legacy v1 explicitly.

**Interfaces:** `createNightshadeSliceState({ contractId, rules?:"nightshade-v1"|"nightshade-v2" })`; `attachNightshadeRouteChallenge(world:WorldState,seed:number):void` creates generic challenge, never solves it. The v2 story state may hold its broker/review timing but **not** `NightshadeSliceState.routePuzzle`.

- [ ] **Step 1 (RED test):** New Nightshade v2 survey reveals relay, inspection grants carrier clue, delayed next-360-minute broker grants echo (quiet); confirmed escalation grants alternate immediate echo but also its high trace/watch. Neither clue nor escalation grants vault automatically. Generic `testNetworkRoute` correctly verifies before contract delivery. Review retires vault evidence, changes epoch/echo, requires fresh observation. Old v1 fixtures retain D071 quiet 3 and intrusive 5 footprints, six outcomes and saves.
- [ ] **Step 2 (RED run):** `npm run test -- src/game/simulation/__tests__/nightshade-v2-routes.test.ts src/game/simulation/__tests__/nightshade-slice.test.ts` FAIL only for absent new functionality.
- [ ] **Step 3 (implement):** Introduce narrow versioned story adapter preserving v1 branch semantics. Nightshade code supplies challenge + sources and calls **generic** helpers after actual survey/inspect/confirmed escalation/tick/review. Prevent v2 `surveyTarget` from revealing vault without confirmed route; old `nightshade-v1` logic stays byte-identical. Keep old six outcomes.
- [ ] **Step 4 (GREEN):** Target tests, `npm run test -- src/persistence/nightshade-slice-schema.test.ts`, `npm run typecheck` PASS.
- [ ] **Step 5 (commit):** `feat(g3): use generic mapping in Nightshade teaching slice`.

### Task 6: Different generated target proves true reuse

**Files:** Modify `src/game/runtime/slice-world.ts`; create `src/game/world-generation/generated-network-routes.test.ts`, optionally create `src/game/world-generation/network-route-provider.ts` for pure seeded challenge authoring.

**Interfaces:** `attachGeneratedRouteChallenge(world:WorldState,seed:number):void` adds an optional challenge in **Fresh Scene only** for a target with >=2 real machines. Existing G2 `buildMachines` provides 2–3 machines. Entry is the first; objective is the second; challenge choice/order varies by seeded salt. Carrier clue comes from surveyed entry, echo clue from inspecting its real service — different from the Nightshade broker clock.

- [ ] **Step 1 (RED test):** Sweep 120 seeds: one unique solvable route per eligible target, real machine/service references, at least two layouts and different solution/source schedule from Nightshade. Same CommandBus/preview/projection succeed with generated IDs. Original recon-report offers remain finishable **without** route tests. Canonical, High Pressure, old Fresh Scene saves and other targets have unchanged behavior.
- [ ] **Step 2 (RED run):** `npm run test -- src/game/world-generation/generated-network-routes.test.ts` FAIL.
- [ ] **Step 3 (implement):** Add opt-in challenge after the generated world has been instantiated, without touching `generateScenarioContent` random streams. Only attach when eligible; otherwise no new field. On survey/inspect grant sourced observations through generic helpers. Gate only the optional challenge's specific second machine if route testing is chosen; preserve original freeform contract completion paths.
- [ ] **Step 4 (GREEN):** Target tests, existing `generated-seed-sweep.test.ts`, `generated-opportunities.test.ts`, `canonical-golden.test.ts` PASS. Record any unsupported generated scenario as unmet scope, not a false PASS.
- [ ] **Step 5 (commit):** `feat(g3): reuse network routes on seeded non-Nightshade target`.

### Task 7: One Recon GUI and matching terminal capability

**Files:** Modify `src/components/game/recon/recon-topology.tsx`, `src/game/computer/apps/target-actions.ts`, `src/game/computer/terminal/parse-command.ts`, `src/components/game/computer-desktop.tsx`, `src/app/globals.css`; use `src/components/game/recon/recon-topology.test.ts`, `src/game/computer/terminal/recon-parser.test.ts` and `scripts/browser-smoke/g3-slice-smoke.mjs`.

**Interfaces:** `testNetworkRouteFromGui(targetId:string,challengeId:string,routeId:string):SimulationCommand`. Terminal `path test <targetId> <challengeId> <routeId>` returns the exact command. `path map <targetId>`, `path inspect <targetId> <routeId>`, `path preview <targetId> <routeId>` read the same player-safe projection without sending simulation mutations.

- [ ] **Step 1 (RED test):** GUI and terminal command objects are deeply equal; malformed/missing IDs fail; two different targets are rendered by the same route view; mobile/keyboard navigation exposes route state, hints and explicit confirmation without hover/drag dependency.
- [ ] **Step 2 (RED run):** `npm run test -- src/game/computer/terminal/recon-parser.test.ts src/components/game/recon/recon-topology.test.ts` FAIL for missing new interaction.
- [ ] **Step 3 (implement):** Add a small route section **inside existing ReconTopology**, never in a Nightshade-only page. Read-only `path` subcommands use desktop terminal's existing special help/brief rendering path; only `path test` uses `parseTerminalCommand` and `runtime.execute`. Labels distinguish candidate, refuted, confirmed and stale; color is supplemental. Confirmation respects existing G1 clock hold; do not compute answer in JSX.
- [ ] **Step 4 (GREEN):** Target tests, `npm run typecheck`, and actual `npm run smoke:browser:slice` (desktop + 390px if browser available). If unavailable, record NOT RUN, not PASS.
- [ ] **Step 5 (commit):** `feat(g3): wire reusable Recon route play to GUI and terminal`.

### Task 8: Final regression and truthful handoff

**Files:** Add only uncovered regression cases to listed test files, correct directly affected docs, and update issues #105/#79 after evidence. No unrelated features.

- [ ] **Step 1:** Fill gaps in the regression matrix: v1 byte compatibility, six endings, canonical/quiet baselines, 120 seeds, same-seed save/reload/replay, wrong and stale guess, cross-boundary event ordering, first-ending-wins, different target/route IDs and rank independence.
- [ ] **Step 2:** Run and record **real** Node 24 `node --version`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`; only when browser is available, `npm run smoke:browser`, `npm run smoke:browser:identity`, `npm run smoke:browser:slice`. No GitHub Actions unless absolutely required.
- [ ] **Step 3:** Diff review: generic source must not import Nightshade, projection must reveal no secret, generated seed streams and old saves are stable, both apps share event/cost/time authority, no contract was accidentally puzzle-gated. Fix true defects and rerun affected gates.
- [ ] **Step 4:** Prepare one focused reviewed gameplay PR with exact-head evidence. Clearly record **human unfamiliar G3 20–30-minute playtest NOT RUN**; #75/#79/#105 remain open until their respective exit gates are met.

## Plan approval and execution choice

**Stop at this PR for human plan review.** The earlier user permission approved writing this plan, not running it. After approval, select Superpowers `subagent-driven-development` (fresh reviewer per task, higher cost) or `executing-plans` (native implementation and a whole-branch review, lower cost). With eight interdependent tasks, **native** is cost-efficient if no real subagent executor is available; never claim an independent review that did not run.
