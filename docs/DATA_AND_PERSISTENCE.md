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

Phase 3 adds `WorldState.underground` (actors, relationships, incidents, ecosystem seed and tick cursor) to the same validated contract. Saves written before Phase 3 load with an empty ecosystem anchored at the saved world minute. Rumors, the player inbox and contracts, retaliations and forum posts live in the same state; saves without them load with none. Reputation descriptors are derived from that history and are not stored. Actor skill, defense, discretion, activity and network, and whether a rumor is accurate, are hidden authoritative truth and are never projected.

Phase 4 adds `WorldState.economy` (a `credits` balance, an append-only value ledger and the list of owned hardware) to the same validated contract. `economy` is optional in the schema; saves written before Phase 4 load with an empty wallet (zero credits, no ledger, no hardware). Credits are validated non-negative integers, so a corrupted negative balance is rejected rather than repaired. Ledger entries carry direction, amount, resulting balance, cause and counterparty. Rig capability is derived from owned hardware at projection time and is never stored, matching the derived-not-stored rule used for reputation descriptors.

Phase 7 P0 adds one legacy-defaulted terminal field to the same authoritative save: `WorldState.ending`. It is `null` for a live run and one immutable status/cause/minute record after `RunEnded`. Browser/portable saves preserve it and player-facing projections omit the hidden cause id. Phase 7 P4 archives that same final canonical state rather than introducing a competing terminal record.

Phase 7 P2 adds the legacy-defaulted `WorldState.retirement` plan; READY remains derived from the stored cooling deadline. Phase 7 P3 adds no new authoritative save field: RETIRED/VANISHED still use the existing `ending` record, while retirement variant/detail are re-derived from the frozen run history for player-facing projection. This keeps P4 free to archive one authoritative final snapshot instead of reconciling a duplicated alignment/result counter.

Phase 7 P4 upgrades browser IndexedDB to version 2 with a `run-history` store. Browser completion atomically writes the final portable `WorldState` to history and deletes the `active-run` slot in the same transaction; only an existing active slot may move, so a successful retry cannot duplicate the archive. If archival fails, GameSession saves the terminal snapshot back to the active slot before surfacing the error, and the next boot retries the move without reviving gameplay. Once the move succeeds, a later boot creates a fresh active run independently. Completed summaries are not persisted: `deriveCompletedRunSummary` rebuilds the player-safe history view from the archived final state, including the already-safe P5 postmortems. Completed-run methods remain optional on `RunPersistence`; native SQLite/Tauri history parity stays deferred to #19.

Phase 7 P5 adds no persisted veteran-pressure field and requires no migration. `deriveLongRunPressure` rebuilds the pressure band from already-authoritative timestamped history (contracts, traces, surfaced investigation signals, retaliation, probes, physical threats, compromises). During a long command callers pass the exact ecosystem boundary being folded, so future records already present in the mutable draft cannot leak backward into an earlier pressure decision. Save/restore therefore preserves P5 behavior by preserving the causal records it already depended on.

Phase 7 P6 adds no persisted exotic-capability field and requires no migration. Availability is derived from P5's existing veteran-pressure read plus existing `economy.ownedWorkflows` history. A successful Cryogenic Annealing Rack purchase is an ordinary `OwnedMachine` plus the ordinary append-only machine debit already stored in `economy.ledger`; that debit is also the one-shot claim provenance, so selling the machine does not erase eligibility history. Portable/browser save round-trips therefore preserve both ownership and prior-claim truth without an `exoticClaimed` flag, special archive table, or host-specific rule.

Phase 8 P0 adds no persisted world-content metadata and requires no migration. `src/content/world-content.ts` is an authoring catalog used only to instantiate the initial actor/target/infrastructure records. Editorial archetype tags are stripped before `WorldState` exists. After startup, the same canonical simulation state remains authoritative and portable/browser saves continue to persist the instantiated facts, not a live dependency on catalog metadata.

Phase 8 P2 adds no new persistence shape or migration. The five additional target-owner pairs are authored catalog rows that instantiate into the same existing actor/target/machine/service arrays as NIGHTSHADE. Their archetype labels are still stripped before authoritative state exists. Saves therefore persist the concrete instantiated world and its later mutations exactly as before; they do not persist or re-resolve editorial archetype metadata on load.

Phase 8 P3 extends the existing contract record rather than adding a new persisted subsystem. The objective enum gains `infrastructure-map` and `quiet-recon`, and contracts may carry optional `requiredMachines` just as recon reports already carry optional `requiredServices`. Existing recon-report/intrusion saves remain valid, the new field is optional, and completion continues to derive from evidence/traces already present in the save. No migration flag, mission-progress object, or duplicated completion state is introduced.

## Persistence-adapter responsibilities

A durable adapter stores:
- active run snapshots,
- consequential event history where required,
- run metadata,
- settings where appropriate,
- schema/version metadata,
- optional player-wide statistics.

The adapter may use IndexedDB in the browser or SQLite in the later Tauri host, but domain code must not depend on backend-specific query behavior.


## Presentation settings

Distro/theme selection, UI scale, reduced-motion preference, density, transparency preference and similar interface choices are application/player settings rather than authoritative run state.

They may persist through the host settings layer and survive completed runs.

Changing presentation settings must not:
- alter deterministic simulation output,
- mutate rank/economy/capability,
- change target access,
- alter evidence truth,
- become required for save compatibility.

An in-fiction distro installer may write these presentation settings, but it does not install gameplay power.

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

Phase 7 P2 adds one more legacy-defaulted live-run field: `retirement: null | RetirementPlan`. A planning record stores only its start minute. A committed record stores the same start minute plus one commit minute and one frozen cooling deadline. READY is derived from `worldMinute`; it is not persisted as a second status transition. The canonical portable/browser save round-trips this plan exactly. P2 does not archive completed runs and does not change the active-run persistence interface.

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
