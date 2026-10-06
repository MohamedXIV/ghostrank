# Technical Architecture

## Current platform policy

Ghostrank is **web-first until the full game is feature-complete**.

The browser is the primary runtime for Phases 3–9. Tauri remains a future desktop host and distribution layer, not a gameplay dependency. Durable IndexedDB persistence and authoritative web CI were established by #18. Final Tauri/SQLite hardening and packaging is tracked by #19.

## Stack

### Primary runtime
**Modern browser**

Responsibilities:
- run the complete single-player game,
- host the simulated computer UI,
- host the Phaser room,
- provide durable local browser persistence through an adapter,
- require no production Node server.

### Application UI
**Next.js + TypeScript**

Use the App Router for project organization and static export / browser delivery.

Runtime gameplay must not depend on Next.js server actions, server-only cookies, dynamic route handlers, or a production Node server.

### UI libraries
- Tailwind CSS
- shadcn/ui
- Motion for React state/layout animation
- native CSS/Tailwind transitions for simple micro-interactions
- Zod
- Zustand

GSAP and React Spring are not baseline dependencies. Add one only for a demonstrated interaction Motion/CSS cannot express cleanly.

### Physical world
**Phaser 4**

Used for the small top-down/isometric room and presentation effects.

### Authoritative simulation
**Pure TypeScript deterministic simulation core**

The simulation does not know whether it is hosted by a browser, Tauri, or a test runner.

### Persistence boundary
**RunPersistence / validated save contract**

Primary during web-first development:
- native IndexedDB adapter.

Deferred desktop host:
- Tauri 2 + SQLite adapter (#19).

Persistence backends are adapters. Neither browser storage nor SQLite is gameplay authority.

### Reactive world projection
**TinyBase**

Used as a query-friendly/reactive read model where it materially simplifies UI.

TinyBase is not simulation authority and not the durable save contract.

## Layer diagram

    Browser (primary host)
      |
      +-- Next.js / React UI
      |     +-- OS/Desktop
      |     +-- Terminal
      |     +-- Apps / Tools
      |     +-- Markets / Messages
      |
      +-- Phaser 4
      |     +-- Room scene
      |     +-- Avatar
      |     +-- Props / lighting
      |
      +-- Pure TypeScript Simulation Core
      |     +-- command bus
      |     +-- systems
      |     +-- domain state
      |     +-- event production
      |
      +-- TinyBase projection
      |
      +-- Persistence API
              |
              +-- Browser durable adapter (primary)
              |
              +-- Tauri / SQLite adapter (deferred)

## Authority

The simulation core is authoritative during an active run.

React, Phaser, TinyBase, and persistence adapters are consumers around it.

No UI component and no persistence implementation may directly perform a consequential world mutation.

## Command bus

All player/agent/tool actions become typed commands.

Sources include:
- terminal parser,
- GUI tool,
- purchased automation,
- player-authored workflow,
- AI workflow,
- Phaser physical interaction.

A command pipeline can:
1. validate shape/permissions,
2. resolve context,
3. execute domain rules,
4. emit deterministic state changes,
5. produce events,
6. update projections,
7. schedule future work if needed.

## Events

Events describe meaningful outcomes.

Examples:
- TargetObserved
- IdentityLinked
- ToolExecuted
- ContractAccepted
- ValueTransferred
- SignatureObserved
- RivalBecameSuspicious
- VehicleArrived
- LocationAbandoned
- RunEnded

Names are illustrative; actual event contracts live in code.

Events support:
- UI notifications,
- NPC reactions,
- persistence,
- postmortems,
- tests,
- debugging.

## Simulation time

The simulation owns world time.

Long-running jobs are scheduled against world time:
- software builds,
- AI inference/training-like jobs,
- travel,
- sleep,
- contract deadlines,
- investigations,
- opponent actions.

UI animations never define gameplay duration.

## Deterministic randomness

Inject a seeded RNG service.

No domain code should call Math.random directly.

Separate:
- deterministic world randomness,
- purely cosmetic randomness in Phaser/UI.

## Host boundary

Gameplay code targets browser-standard/application abstractions, not Tauri APIs.

Normal gameplay must avoid direct dependency on:
- Tauri commands,
- Rust-side state,
- native filesystem paths,
- SQLite-specific behavior.

Where platform persistence or native access is needed, define typed adapters behind stable interfaces.

When #19 eventually activates, Tauri should host the existing web game rather than require a second gameplay architecture.

## React state

Use:
- component state for local UI behavior,
- Zustand for shared ephemeral UI state,
- TinyBase hooks/read models for reactive world queries,
- simulation commands for mutations.

Never mirror the entire simulation into Zustand.


## Presentation architecture

Phase 9 separates presentation semantics from simulation authority.

    player-safe projection
            |
            v
    semantic UI view models
            |
            +-- app information design
            |
            +-- OS shell
                    |
                    +-- distro profile
                    +-- theme variant
                    +-- accessibility overrides

Distro/theme selection changes CSS tokens, typography, density, chrome, motion character, icons and related presentation only. It never changes authoritative gameplay state or deterministic outcomes.

Cross-app visual states such as hostile/rival, inferred, rumored, stale, running or urgent should be derived from player-safe projection facts. Do not add gameplay flags solely to style UI.

Shadcn/ui supplies owned primitives rather than one mandatory aesthetic. Individual Ghostrank apps keep distinct information architecture while sharing accessibility and interaction contracts.

Motion is presentation-only. Animation duration never consumes world time, schedules simulation work or changes command ordering.

The canonical presentation contract is `docs/INTERFACE_AND_DISTROS.md`.

## Phaser bridge

Phaser receives a minimal presentation projection.

Examples:
- current room,
- avatar position/action,
- prop state,
- time/lighting,
- weather,
- physical alert cues.

Phaser can submit physical commands such as MoveAvatar or LeaveLocation.

It cannot independently decide domain consequences.

## Tool runtime

In-game software is represented by validated virtual IR/workflows.

The runtime:
- exposes a finite capability registry,
- validates permissions and resource costs,
- schedules operations,
- emits normal commands/events,
- records provenance/signatures.

Never eval arbitrary code generated by in-game AI.

## Content-driven systems

Prefer schemas for:
- tools,
- hardware,
- locations,
- models,
- NPC archetypes,
- contract templates,
- fictional protocols,
- marketplaces.

Systems interpret content; content should not contain unrestricted executable logic.

Phase 8 P0 makes this boundary concrete for world population. `src/content/world-content.ts` owns authored peer/target/infrastructure definitions, editorial archetype tags, and structural validation. `slice-world.ts` deep-clones simulation-shaped content and owns only scenario setup such as the seed, player, starting network and starting economy. Archetype metadata never becomes simulation authority, persistence data, projection state, or a content-specific command branch.

## Suggested source layout

    src/
      app/
      components/
        ui/
        desktop/
        terminal/
        tools/
      game/
        simulation/
          commands/
          events/
          systems/
          state/
        world/
        phaser/
          scenes/
          bridge/
      stores/
        ui/
        projection/
      persistence/
        browser/
        adapters/
        schemas/
      schemas/
      content/
      lib/

    src-tauri/
      ...  # retained, deferred until Phase 10 / #19

Exact structure may evolve, but dependency direction must remain clear.

## Performance targets

The computer UI should remain responsive while background simulation advances.

Use:
- batched projection updates,
- indexed queries,
- background scheduling where appropriate,
- virtualized large tables/logs,
- limited Phaser scene complexity,
- profiling before speculative optimization.

The simulation should not require per-entity per-frame updates. Most world behavior can be event/schedule driven.
