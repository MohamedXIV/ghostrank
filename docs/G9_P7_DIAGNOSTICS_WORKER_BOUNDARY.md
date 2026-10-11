# G9 P7 — Content diagnostics, replay proof and Worker-ready host boundary

**Issue:** #143 · **PR:** #152. Completes implementation scope of G9 Epic #135.

## Diagnostics are privileged, NOT another player mechanic

`src/game/content/dev/diagnostics.ts` is a deliberate developer-only import: it can view actual source IDs and hidden truth. Do **not** import it from React, Next routes, TinyBase projections, inkjs or any Worker→UI transfer handler. The player sees only `projectWorld` and the existing authoritative CommandBus error code. `diagnoseContentCondition` compiles with G9 P1's actual bounded Zod validator (depth 8/nodes 64), traces facts/all/any/not, and reports the original tri-state value and reason under explicitly supplied `KnowledgeLens`; no synthetic true for an unobserved clue. There are source-bound `diagnoseOpportunity`, `diagnoseInstitutionalCase`, and `diagnoseContentReaction` helpers, with exact guard errors obtained by dispatching against a **cloned CommandBus**, never editing the live world. Chronology is from real recorded simulation events, not inferred story text.

The regression tests contrast a genuine private, repelled incident against a mistaken but delivered claim that it succeeded. Authority knows the actual truth, player-known returns UNKNOWN, the relay reports the mistaken outcome; the player projection never inherits the authority debug detail. Unsupported facts and arbitrary JavaScript-like fields are rejected by the same content compiler.

## Determinism + performance evidence

`src/game/content/dev/seed-harness.test.ts` runs **128 distinct generated scenario-seed pairs**, split evenly across Fresh Scene/High Pressure. Each tests 1080 world minutes via one bulk advance versus 360 + Zod save/JSON reload + 360 + 360, checking **byte-equal state and all causal domain events in exactly the same chronological order**; `WorldTimeAdvanced` command envelopes are explicitly verified as one bulk interval versus three clicked intervals (these are input receipts, not NPC causality), unique opportunity/civic IDs, terminal rejection and real autonomous NPC incident/lead emergence. Both actual world scopes and their runtime code are exercised; no mock clock or invented RNG.

The harness prints a `[G9 P7 PERF BASELINE node=...]` line in CI containing per-seed median/p95/max wall time, aggregate emitted NPC/lead/civic/rumor counts, **384 simulated tick boundaries** and heap change, using Node's `performance.now` and `process.memoryUsage`. These are *observed measurements* (machine/load-sensitive, especially heap allocation/GC), not deterministic test thresholds. The exact numbers belong to the passing CI log, **not a promise or estimated optimization**. Subsequent work should compare the same harness under controlled hardware before moving to a Worker or Rust/WASM.

## Async, serialized simulation host (no Worker instantiated)

`src/game/runtime/simulation-host.ts` defines a small `SimulationHostRequest/Response` shape and local `createLocalSimulationHost` adapter that dispatches typed `SimulationCommand` through the **existing CommandBus** in a serial Promise queue, returning the player's authorized `WorldProjection` and **only** a redacted `{ok,error?}` acknowledgement. Raw `CommandResult.events` may include hidden incident/rumor truth, so they NEVER cross this prospective Worker→UI boundary. The privileged `snapshotForPersistence` is a separate host method and is **not** in the UI transport protocol. Requests and outputs are cloned; no React/DOM/TinyBase coupling is imported in the port, and no second authority is introduced.

The old synchronous `GameRuntime` and production UI are intentionally untouched; no Web Worker, thread migration, Rust or WASM is introduced. Actual worker migration would require a separate measured decision, transport validation/security review, and acceptance tests.

## Acceptance status

- Node 24 full `npm ci`, Vitest, typecheck, ESLint, production build and existing browser/390px acceptance must pass.
- Human unfamiliar-player test **NOT RUN**. iPhone Safari NOT RUN. No G3 P2 Log Forensics implementation; the design-only PR #116 remains separate.
- Intentional limitations: no incoming NPC belief store, no full country simulation, no perpetual hidden DevTools panel in the shipped UI; bounded typed data and traced causality only.
