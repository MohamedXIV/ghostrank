# Phase 0 Foundation Implementation Plan

Date: 2026-10-02  
Branch: `foundation/phase-0`

## Goal

Establish the production architecture described in the canonical Ghostrank docs before gameplay implementation. This phase must leave the repository with a desktop-capable Next.js/Tauri application, strict TypeScript boundaries, deterministic simulation primitives, persistence scaffolding, and CI that proves the foundation builds and launches.

## Task 1 — Application/tooling scaffold

Create:
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `components.json`
- `.nvmrc`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/lib/utils.ts`

Decisions:
- Next.js static export.
- Node 24 in CI.
- strict TypeScript.
- Tailwind 4 + shadcn-compatible aliases.
- no server actions or runtime Node server dependency.
- minimal foundation screen only; no throwaway prototype gameplay.

Verification:
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Task 2 — Simulation contracts (TDD)

Create tests first for:
- rank never acting as an authorization gate,
- deterministic seeded RNG,
- command execution emitting typed events,
- monotonically advancing world time,
- callers being unable to mutate authoritative state outside commands.

Then create:
- `src/game/simulation/commands/types.ts`
- `src/game/simulation/events/types.ts`
- `src/game/simulation/state/world-state.ts`
- `src/game/simulation/rng/seeded-rng.ts`
- `src/game/simulation/command-bus.ts`

The initial domain command is deliberately harmless and fictionalized: `observeTarget`. It proves the architecture without implementing exploitation.

## Task 3 — State-layer boundaries

Create:
- `src/stores/ui/use-ui-store.ts` — Zustand, ephemeral UI only.
- `src/stores/projection/world-projection.ts` — TinyBase read/query projection.
- `src/game/simulation/projection/project-world.ts` — explicit mapping from authoritative state to player-visible projection.

Tests prove undiscovered targets and hidden target facts do not leak into the player projection.

## Task 4 — Persistence/Tauri scaffold

Create:
- `src-tauri/Cargo.toml`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/migrations.rs`
- `src/persistence/schema.ts`
- `src/persistence/database.ts`

Initial SQLite schema:
- schema metadata,
- runs,
- snapshots,
- events.

The Tauri SQL plugin registers SQLite migrations. Front-end database access stays behind a persistence adapter.

Verification:
- `cargo check --locked --manifest-path src-tauri/Cargo.toml`
- Tauri debug build from the static frontend.
- headless launch smoke under Xvfb/DBus in CI.

## Task 5 — Phaser boundary

Create only the integration boundary:
- `src/game/phaser/types.ts`
- `src/game/phaser/bridge.ts`

Do not build the room scene in Phase 0. The bridge accepts a minimal presentation projection and converts physical UI intents to normal simulation commands.

Test that Phaser-facing code cannot mutate authoritative state directly.

## Task 6 — CI

Create `.github/workflows/ci.yml`.

Jobs:
1. Web/simulation on Node 24:
   - `npm ci`
   - typecheck
   - lint
   - test
   - static Next build
2. Tauri desktop:
   - locked npm install,
   - stable Rust,
   - platform packages needed by Tauri on Ubuntu,
   - `cargo check --locked`,
   - Tauri debug build,
   - lockfile drift check,
   - headless desktop launch smoke.

CI is the canonical cloud verification for this branch.

## Task 7 — Documentation reconciliation

Update:
- `docs/ROADMAP.md` Phase 0 status.
- `docs/DECISIONS.md` only if implementation forces a new architectural decision.
- README developer commands.

## Acceptance criteria

Phase 0 is complete only when:
- static Next build succeeds,
- all unit/scenario tests pass,
- Rust/Tauri check succeeds,
- Tauri debug build and headless launch smoke succeed,
- CI is green on the exact PR head,
- npm and Cargo dependency graphs are locked,
- command/event boundaries exist in code,
- seeded RNG has deterministic tests,
- callers cannot mutate simulation truth outside command execution,
- undiscovered/hidden target information does not leak into player projection,
- TinyBase/Zustand/SQLite responsibilities remain separated,
- no real shell/network attack surface is exposed,
- no gameplay implementation bypasses the command bus,
- the branch contains no known throwaway architecture.
