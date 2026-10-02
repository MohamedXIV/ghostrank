# Data and Persistence

## Principles

- Save data is durable, local-first, and versioned.
- Simulation state is authoritative in memory during play.
- Persistence is accessed through a host-agnostic interface.
- During web-first development, native IndexedDB persistence is primary.
- Tauri + SQLite remains a deferred desktop adapter (#19).
- TinyBase is a reactive/query projection.
- Zustand contains ephemeral UI state only.
- Zod validates file/database/command boundaries where useful.
- Browser and future desktop hosts share one logical validated save contract.

## Current implementation

Phase 2 established the stable `RunPersistence` boundary and the original Tauri/SQLite adapter.

#18 added the primary native IndexedDB browser adapter without changing simulation authority. Active browser saves use a small versioned portable envelope containing the Zod-validated authoritative WorldState. Invalid persisted payloads are rejected rather than silently repaired into a different run.

## Persistence-adapter responsibilities

A durable adapter stores:
- active run snapshots,
- consequential event history where required,
- run metadata,
- settings where appropriate,
- schema/version metadata,
- optional player-wide statistics.

The adapter may use IndexedDB in the browser or SQLite in the later Tauri host, but domain code must not depend on backend-specific query behavior.

## Active run state

On load:
1. read compatible run metadata/state,
2. load the latest compatible authoritative snapshot,
3. apply any required subsequent persisted deltas/events,
4. rebuild derived indexes/projections,
5. resume scheduled world work.

During play, the simulation core owns active state in typed data structures optimized for domain rules.

## TinyBase

TinyBase can project/query live tables such as:
- hackers,
- handles,
- known relationships,
- machines,
- tools,
- contracts,
- messages,
- discovered transactions,
- evidence.

Only known/player-observable information should be projected to UI-facing stores unless a debug mode explicitly exposes hidden state.

The simulation must remain functional without treating TinyBase as authority.

## Save cadence

Potential save points:
- meaningful action completion,
- world-time block completion,
- location changes,
- major contract state changes,
- periodic autosave,
- clean application exit when the host supports it.

Avoid durable writes for every visual update.

Browser refresh/reload is a first-class recovery boundary.

## Event log

Consequential events should store:
- event ID,
- run ID,
- world timestamp,
- type,
- actor/subject references where relevant,
- compact validated payload,
- causality/correlation IDs where valuable,
- schema version.

The log enables:
- postmortem reconstruction,
- debugging,
- analytics,
- deterministic test comparison.

## Snapshots

Snapshots bound load time and decouple save loading from replaying an entire run.

A snapshot includes enough authoritative state to resume:
- world clock,
- player/handle state,
- NPC state required for continuity,
- active relationships,
- known/hidden world state,
- scheduled jobs,
- economy state,
- physical location,
- inventories/assets,
- RNG state or deterministic stream position where necessary.

## Portable save contract

The canonical logical save format is backend-independent.

Browser persistence, exported save files, test fixtures, and the future desktop adapter should all validate against the same schema/version rules.

This permits a later flow such as:

    Browser save
        -> export/portable payload
        -> Tauri import/migration
        -> SQLite-backed desktop run

without moving gameplay rules into persistence code.

## Migrations

Every shipped save schema change must include migration strategy.

Rules:
- do not silently drop state,
- validate before commit,
- preserve or back up user data where the host permits it,
- fail with a readable error rather than fabricating state,
- test migrations across representative historical fixtures.

## Hidden versus known information

The simulation stores truth that the player may not know.

UI projections expose an epistemic model:
- confirmed,
- observed,
- inferred,
- rumored,
- stale,
- unknown.

A target's actual capability and the player's belief about it are different data.

This distinction is central to the game.

## Generated tools

Player/AI-authored tools persist as:
- manifest,
- workflow/IR,
- version,
- author,
- tests,
- known defects,
- resource characteristics,
- signature/provenance metadata.

Do not persist or execute unrestricted generated source as gameplay authority.

## Run history

Completed runs should remain browsable.

Store summary data such as:
- start/end,
- days survived,
- peak rank,
- final status,
- major operations,
- authored tools,
- reputation descriptors,
- important causal chain.

This supports player learning and storytelling.

## Deferred desktop persistence

The existing SQLite/Rust work is retained as prior validated infrastructure.

Do not expand or require it during Phases 3–9. Final reconciliation, migration/import, native crash recovery, and packaging belong to Phase 10 / #19.
