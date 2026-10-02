# Platform Gate — Web-first runtime

Issue: #18

## Goal

Make the browser the complete primary Ghostrank runtime before Phase 3 begins.

## Architecture

Simulation and gameplay stay unchanged:

    UI / Terminal / Phaser
            |
        Command Bus
            |
      WorldState + Events
            |
       RunPersistence
        /          \
       /            \
 IndexedDB        SQLite/Tauri
  primary          deferred

The browser adapter owns only persistence mechanics. It never mutates gameplay state.

## Portable save envelope

The logical active-run save is host-independent and Zod validated:

- format identifier
- save version
- authoritative WorldState

The same envelope can later be exported/imported by the deferred desktop host.

## IndexedDB policy

Use native IndexedDB through a small storage adapter:
- one database,
- one active-run object store,
- one active-run key,
- atomic single-record replacement for the latest resumable run.

Do not introduce SQLite WASM, OPFS, a backend, or server actions.

## CI policy

Normal gameplay CI becomes web-only:
- npm test
- npm run typecheck
- npm run lint
- npm run build

Rust/Tauri build and launch smoke are removed from required normal CI. Existing Tauri source stays in the repository for #19.

## Acceptance

1. Portable save round-trips the current full Phase 2 state.
2. Browser persistence survives adapter/session recreation.
3. Invalid/corrupt persisted payload is rejected rather than silently accepted.
4. GameShell chooses browser persistence outside Tauri.
5. Current Phase 2 flow restores after a browser-style reload.
6. Web CI is sufficient for normal PRs.
7. No Phase 3 gameplay is added.
