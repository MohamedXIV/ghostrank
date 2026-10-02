# Phase 1 — Computer + Room Vertical Slice

Issue: #3  
Branch: `feat/3-computer-room-slice`

## Goal

Build the first playable Ghostrank slice on the production architecture established by Phase 0. The slice proves that the player exists in a small physical room while Terminal and GUI applications operate one authoritative simulation.

## Delivery order

1. Shared computer commands
   - fictional Terminal parser
   - GUI command adapters
   - parity tests proving both produce identical `SimulationCommand` values

2. Game runtime
   - owns one `CommandBus`
   - publishes player-visible state to TinyBase after commands
   - exposes immutable snapshots/events
   - initializes one deterministic slice target and world clock

3. Computer shell
   - desktop/window presentation
   - Terminal app
   - first target/network information app
   - visible clock and rank
   - switching between room and computer surfaces

4. Phaser room
   - compact top-down/isometric room
   - simple anonymous hooded avatar
   - desk/computer hotspot
   - ambient window/light cue
   - no gameplay authority inside Phaser

5. Persistence
   - save active run snapshots/events through SQLite adapter
   - load existing active run on startup
   - autosave after consequential commands
   - persistence tests around serialization boundaries

6. Acceptance
   - terminal and GUI discover the same target through the same command
   - time advances from the command layer
   - room-to-computer interaction works
   - static Next build, Tauri build, and desktop launch smoke stay green

## Non-goals

- exploitation mechanics
- full network simulation
- free-roaming environment
- final art
- marketplace/contracts
- real shell/network access

Those belong to later phases.
