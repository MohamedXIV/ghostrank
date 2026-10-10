# G3 P1 — Reusable Network Mapping: Engineering Acceptance

**Issues:** #105 (P1), #79 (G3), #75 (Game-First parent).  
**Canonical implementation:** merged PR #108, main commit `ed7bc9acbbb12ac84804a3f57b70fbdb05d5d6ea`.  
**Status:** engineering validation **MERGED** after exact-head CI/Chromium success; **unfamiliar human playtest NOT RUN**. A browser script is never counted as human gameplay acceptance. Playtest procedure: `docs/G3_HUMAN_PLAYTEST_PROTOCOL.md`.

## What is shipped by this candidate

Network Mapping is **one general fictional mechanic**, not a full Nightshade-specific game engine. Three candidate carrier/echo paths, current sourced clues, route tests, trace, deterministic route-order variation, and defender epoch rotation live in the shared simulation. Truth/cost/time/evidence are owned by CommandBus, never React or the terminal. Wrong tests incur the same 4-world-minute/+1 low-trace cost as correct tests; repeating a route in the same epoch is refused.

Two genuinely different consumers prove the abstraction:

1. **Nightshade v2** — an explicitly versioned, small authored teaching briefing. The relay's broker gives a current carrier/echo hint; a quiet clue arrives at the next 360-minute boundary, while intrusive access yields an earlier echo clue with a trace/watch consequence. The player selects/tests a route before obtaining the Vault evidence and can recover after the owner's rotation. The old `nightshade-v1` rule is still the default for `createSliceWorldState` fixtures and preexisting saves. New *played* Nightshade runs opt into v2.
2. **G2 Fresh Scene** — an opt-in generated challenge attached after deterministic world generation, with generated target/machine/service IDs and a seed-dependent echo. New *played* Fresh Scene runs opt in, while existing `createSliceWorldState` baselines and historical saved worlds do not. Original generated recon-report contracts must remain achievable without any route challenge on unrelated targets.

The same `testNetworkRoute` command drives Recon GUI and `path test <target> <challenge> <route>`. The desktop terminal's `path map`, `path inspect`, and `path preview` consume the **same player-safe projection** as Recon. The UI exposes candidate/refuted/stale/confirmed labels, carries keyboard-focus affordances, previews cost and asks for confirmation while holding the G1 playback clock. No real-network or host-system access.

## Regression/proof matrix

| Gate | Evidence | Meaning |
| --- | --- | --- |
| Strict optional world/save schemas | `src/persistence/network-routes-schema.test.ts` | Missing optional field stays missing; malformed target IDs, candidate IDs, source/epoch/timestamps, ambiguous solutions reject |
| Shared route and preview | `network-routes.test.ts`, `network-route-preview.test.ts` | Current clues, deterministic seeded layout, wrong/duplicate tests, no hidden correctness grading in previews |
| Simulation | `network-route-command.test.ts`, `nightshade-v2-routes.test.ts` | Time, trace, evidence, review boundary, rank independence, persistence replay and first-ending-wins guard |
| Projection | `network-route-projection.test.ts`, `network-route-store.test.ts` | No hidden objective IDs, answer or future echo in player-visible JSON or TinyBase |
| True second consumer | `generated-network-routes.test.ts` | 120 seeded generated targets, unchanged original generation, fresh-source observations, same generic CommandBus |
| GUI/terminal parity | `network-routes-commands.test.ts`, `network-route-view.test.ts` | Same command object, same safe visible route descriptions and explicit costs |
| Historical G3 v1 | `nightshade-slice.test.ts` and persistence tests | Existing v1 branch and save rule retained without migration |
| Real Chromium browser | `.github/workflows/g3-browser-acceptance.yml`, `scripts/browser-smoke/g3-network-map-smoke.mjs` | Authored Nightshade on desktop + phone 390px, generated Fresh Scene desktop, from the real static Next build |

### Observed CI checkpoints (2026-10-10)

- Main shared-core checkpoint `0c5852c0`: GitHub Actions Node 24 full test/typecheck/lint/build **PASS**: [run 38042841062](https://github.com/MohamedXIV/ghostrank/actions/runs/38042841062).
- Browser script checkpoint `47473103`: real Chromium **35/35 assertions PASS**, **0 failed**, including two Nightshade viewports, independent generated route, Terminal map and GUI route confirmation: [run 38043217270](https://github.com/MohamedXIV/ghostrank/actions/runs/38043217270).
- **Final PR head `471c92e56fe2d96d4d7214b61777647cba004f35`: Node 24 CI SUCCESS** (1,204 tests across 138 files, typecheck/lint/build PASS) [run 38043409322](https://github.com/MohamedXIV/ghostrank/actions/runs/38043409322).\n- **Same exact head: real Chromium acceptance SUCCESS** (35/35 assertions, no page JavaScript errors; desktop + 390px Nightshade and independent Fresh Scene) [run 38043409325](https://github.com/MohamedXIV/ghostrank/actions/runs/38043409325). GitHub verifies both workflow runs completed successfully.\n- Squash merge: [PR #108](https://github.com/MohamedXIV/ghostrank/pull/108) → main `ed7bc9acbbb12ac84804a3f57b70fbdb05d5d6ea`. Human acceptance remains separate.

### Historical smoke compatibility

`npm run smoke:browser:slice` now invokes the v2 Network Mapping Chromium acceptance, as does `npm run smoke:browser:network`. The older `scripts/browser-smoke/g3-slice-smoke.mjs` is retained as a historical D071 v1 script, not the release gate for freshly started v2 runs. Historical v1 behavior is still exercised in unit/persistence regression suites.

## Known limits and remaining gates

The G3 P1 feature is an approachable first Network Mapping puzzle, **not** Packet Analysis, Log Forensics, OS sandboxing, a universal engine, or a complete hacker world. The route hypotheses are fictional, intentionally small, and do not provide real cybersecurity instructions. This slice is a stepping stone to wider multi-mechanic play.

The automated smoke verifies that UI actions are reachable and work in Chromium; it does **not** measure player comprehension, fun, frustration, clarity of clues or pacing. An **unfamiliar human 20–30 minute Game-First playtest is NOT RUN**. Keep #105, G3 #79 and parent #75 open until their human/design acceptance requirements are met. Human results may require further tuning; do not claim the game complete or G3 fully finished based on CI.
