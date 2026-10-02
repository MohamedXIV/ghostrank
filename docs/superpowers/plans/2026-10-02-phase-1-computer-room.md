# Phase 1 — Computer + Room Vertical Slice

Date: 2026-10-02  
Tracker: #4  
Branch: `phase-1/computer-room-slice`

## Goal

Prove Ghostrank's core presentation loop using the production Phase 0 architecture: a small physical room, an inhabited simulated computer, terminal and GUI views over the same commands, world time, one ambient threat cue, and durable autosave/load.

## Delivery rule

Build vertically and preserve authority boundaries. React/Phaser may request commands and render projections; neither may mutate simulation truth. No real shell, filesystem, credentials, or network bridge is permitted.

## Task 1 — Command adapters + world clock (TDD)

Tests first:
- terminal `observe <target>` and GUI Observe action produce the exact same `SimulationCommand`,
- terminal `wait <minutes>` maps to the existing time command,
- malformed/unknown terminal input is rejected before domain execution,
- world-clock formatting is deterministic and derived only from simulation minutes.

Implement:
- `src/game/interfaces/terminal/parser.ts`
- `src/game/interfaces/gui/commands.ts`
- `src/game/simulation/time/world-clock.ts`

No terminal component yet; this task establishes parity at the adapter boundary.

## Task 2 — Simulated desktop/window manager

Implement a client-side computer shell:
- desktop surface,
- app launcher/dock,
- movable/focusable windows,
- z-order/focus,
- terminal window,
- first information/target window,
- world clock in chrome.

Window position/focus belongs in Zustand only. No gameplay state may enter the UI store.

Tests:
- focus/z-order transitions,
- opening/closing windows,
- domain action buttons emit commands rather than mutating projections.

## Task 3 — First terminal + GUI parity loop

Provide one harmless fictionalized vertical interaction:
- terminal can run `observe <known/public target>`,
- GUI information tool can request the same action,
- both pass through the same CommandBus,
- resulting event updates the player-visible projection,
- output/notification is rendered from the resulting event/projection.

The GUI does not receive a privileged command or alternate rule path.

## Task 4 — Phaser room + desk interaction

Create a deliberately small programmatic room scene:
- compact top-down/isometric framing,
- simple hooded avatar silhouette,
- desk/computer prop,
- limited movement or contextual transition to desk,
- room lighting/monitor glow.

Phaser sends physical intents through the bridge. Desk interaction reaches simulation/UI through normal commands/state transitions; Phaser cannot decide consequences.

Avoid asset-heavy art in this phase.

## Task 5 — Ambient physical threat cue

Add one simulation-driven cue such as a suspicious hallway/door/window signal:
- event/state originates outside Phaser,
- room renders the cue,
- computer UI may surface a related notification if appropriate,
- no random visual cue is treated as gameplay truth.

## Task 6 — Autosave/load

Create a persistence repository over the Phase 0 SQLite adapter:
- create/open active run,
- persist versioned snapshot/event data,
- load latest snapshot,
- rebuild player projection,
- preserve world minute and discovered-target state.

Domain tests use a persistence port/fake. Tauri/SQLite integration stays behind the adapter.

## Task 7 — Integrated acceptance

Scenario:
1. app starts in the room,
2. player interacts with desk,
3. computer surface opens,
4. GUI and terminal can invoke the same observe command,
5. world time is visible,
6. ambient physical cue can appear from a simulation event,
7. state autosaves,
8. restart-equivalent load restores world minute and known information.

## Acceptance criteria

Phase 1 is complete only when:
- desktop/window manager feels like a computer rather than a website dashboard,
- terminal and GUI parity is covered by tests,
- room loads and desk interaction is functional,
- Phaser owns presentation only,
- world time is simulation-owned,
- one physical ambient cue is simulation-driven,
- autosave/load round-trip is covered,
- hidden facts remain absent from normal projection,
- exact-head CI is green including desktop build/launch smoke.
