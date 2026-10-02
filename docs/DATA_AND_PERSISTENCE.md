# Data and Persistence

## Principles

- Save data is durable and versioned.
- Simulation state is authoritative in memory during play.
- SQLite stores durable snapshots/events/content.
- TinyBase is a reactive/query projection.
- Zustand contains ephemeral UI state only.
- Zod validates file/database/command boundaries where useful.

## SQLite responsibilities

Suggested durable concepts:
- runs,
- run metadata,
- snapshots,
- events,
- settings,
- content metadata,
- migrations,
- optional player-wide statistics.

Large content catalogs may also use SQLite or packaged data files according to profiling and authoring needs.

## Active run state

On load:
1. read run metadata,
2. load latest compatible snapshot,
3. apply required subsequent events or persisted deltas,
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
- clean application exit.

Avoid SQLite writes for every visual update.

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

## Migrations

Every shipped save schema change must include migration strategy.

Rules:
- never mutate old save files in place before a backup/transactional migration,
- validate before commit,
- fail with a readable error rather than silently dropping state,
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
