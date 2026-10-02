# AGENTS.md

This file defines repository-wide implementation rules for human and automated contributors.

## Read first

Before changing gameplay or architecture, read these documents in order:

1. docs/VISION.md
2. docs/GAME_DESIGN.md
3. docs/HACKING_AND_TOOLS.md
4. docs/TECHNICAL_ARCHITECTURE.md
5. docs/DATA_AND_PERSISTENCE.md
6. docs/ROADMAP.md

When code and documentation disagree, do not silently invent a third design. Update the canonical documentation in the same change or raise the conflict explicitly.

## Non-negotiable product rules

- Rank is reputation and visibility, never a power level.
- No target is blocked by player level, rank, or an arbitrary skull/difficulty gate.
- There is no generic Hack button and no universal success-percentage roll.
- Player knowledge and judgment must remain more important than character proficiency.
- White and Black are starting packages and social entry points, not permanent moral classes.
- The world derives reputation and descriptors from actions.
- Runs should be genuinely dangerous. Early runs lasting roughly 3–10 in-game days are healthy.
- The world continues to act while the player prepares, waits, sleeps, builds software, or lays low.
- Terminal and GUI tools must call the same domain commands/capabilities.
- Purchased tools automate, visualize, compose, or scale capabilities; they do not grant supernatural access.
- AI-built in-game software is represented by safe virtual workflows/IR. Never execute AI-generated arbitrary host code.
- The in-game terminal is a fictional simulation interface. Never bridge it to the player's real shell, filesystem, credentials, or network.
- Hacking mechanics must stay fictionalized enough that the game is not a real exploitation toolkit.
- Phaser owns the small physical-world presentation. React/Next owns the computer/OS-style UI. Neither owns simulation truth.
- SQLite is durable persistence. TinyBase is a read/query projection. Zustand is ephemeral UI state. Do not blur these roles.

## Architecture boundaries

All consequential player actions flow through typed simulation commands.

    UI / Terminal / AI Tool / Purchased Tool
                  |
                  v
             Command Bus
                  |
                  v
          Simulation Systems
                  |
          events + state changes
             /          \
            v            v
      TinyBase view   Event log
                           |
                           v
                        SQLite

React components may request commands and render projections. They must not directly mutate authoritative world state.

Phaser may request physical actions such as MoveToDesk or LeaveLocation, and it may render simulation events such as VehicleArrived. It must not decide whether the authorities found the player.

## Determinism

Core simulation behavior should be deterministic under a seed wherever practical. Randomness must come from injected RNG services, not scattered Math.random calls.

Every consequential event should be recordable with enough causal context to support:
- save/load,
- postmortems,
- debugging,
- balancing,
- replay-oriented tests.

## Coding defaults

- TypeScript strict mode.
- Prefer pure domain functions and explicit data structures.
- Zod validates external/data boundaries, not hot inner loops.
- Keep React state local unless it is truly shared UI state.
- Use Zustand only for ephemeral client state.
- Avoid adding state libraries without a documented architectural need.
- Data-driven content should live outside system logic where practical.
- Prefer composable commands and capabilities over one-off feature flags.
- No hidden network access from the shipped game unless explicitly designed and documented.

## Scope control

Do not expand the physical world into an open-world walking game. The physical slice is intentionally small: rooms, safehouses, motels, workshops, and similar locations with limited movement and contextual interactions.

Do not add multiplayer merely because the fiction depicts an online community. NPC hackers and the underground ecosystem are simulated locally unless a future project decision explicitly changes this.

Do not replace the simulated operating environment with a normal website dashboard. The computer must feel like an inhabited, customizable machine.

## Definition of done for systems

A gameplay system is not complete until it has:
- a domain model,
- command/event contracts,
- deterministic tests for critical rules,
- save/load coverage where relevant,
- UI exposure sufficient to understand its state,
- failure/consequence behavior,
- documentation updates when the design changes.
