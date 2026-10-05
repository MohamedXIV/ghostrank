# Testing Strategy

## Goals

Ghostrank's complexity comes from interacting systems. Tests must protect rules and causality, not only component rendering.

During web-first development, normal gameplay acceptance is browser/web-oriented. Rust/Tauri checks are not required for each gameplay change.

## Required normal gameplay gates

Ordinary gameplay PRs require:
- deterministic/unit tests,
- typecheck,
- lint,
- production web build,
- relevant browser persistence/reload acceptance.

Tauri build/launch checks move to the deferred desktop phase (#19) or an explicitly requested milestone/release check.

## Test layers

### Domain unit tests
Pure rules:
- reputation updates,
- ranking inputs,
- capability validation,
- hardware resource accounting,
- tool workflow execution,
- time scheduling,
- relationship reactions,
- ending eligibility.
- authored world-content structural validation.

### Deterministic scenario tests
Run seeded scenarios across multiple systems.

Examples:
- low-ranked expert-equivalent actor successfully compromises high-ranked target because conditions allow it,
- rank alone never blocks a command,
- tool and terminal routes produce equivalent domain commands,
- a reused signature creates a later correlation chain,
- NPC retaliation can occur while player software is building,
- laying low can reduce some exposure while allowing other deadlines to advance.

### Persistence tests
- snapshot round-trip through the canonical persistence contract,
- browser adapter round-trip,
- browser persistence/session-recreation recovery,
- event round-trip,
- scheduled jobs survive load,
- RNG continuity,
- schema migrations,
- corrupted save handling,
- portable save payload compatibility.
- terminal browser state moves atomically from active storage into completed history,
- repeated successful completion is idempotent and live states cannot enter history,
- archive failure/reload recovery preserves terminality rather than reviving gameplay,
- completed-history summaries derive from final authoritative state and preserve the player-safe postmortem boundary.

### Projection/UI tests
- hidden facts do not leak into TinyBase player projection,
- unearned exotic stock does not appear in the Market/TinyBase listing, while earned stock exposes only ordinary catalog capability plus its exotic tag,
- postmortems expose only player-knowable facts and report incomplete attribution instead of inventing missing causal legs,
- uncertain evidence renders with provenance,
- window and terminal state survive intended UI transitions,
- large logs/tables remain usable.

### Phaser tests
Keep logic minimal.

Verify bridge contracts and scene behavior:
- room loads expected projection,
- avatar actions map to commands,
- physical cues render from events,
- Phaser cannot mutate authoritative state directly.

### Deferred desktop tests

When Phase 10 / #19 activates:
- SQLite adapter parity with the canonical save contract,
- browser/exported-save import/migration,
- locked Rust/Tauri build,
- native packaging,
- headless/native launch smoke,
- desktop crash recovery.

These are not normal gameplay gates before then.

## Golden run fixtures

Maintain a small set of canonical seeded runs with expected major events.

Do not overfit every random detail; assert meaningful outcomes and invariants.

## Invariants

Critical invariants include:
- no target access is denied solely because of rank,
- no UI path bypasses command validation,
- world time is monotonic,
- hidden information does not appear in normal player projections,
- resource balances do not become negative without explicit debt mechanics,
- run-ending events are terminal unless a documented continuation rule exists,
- the first terminal ending is immutable and later gameplay commands cannot mutate or advance that run,
- an ending inside a time command clamps authoritative time to that boundary and prevents all later same-tick/tail systems from running,
- forced-ending eligibility is deterministic from causal history and never player rank,
- voluntary retirement blockers are player-visible, blocked commit spends no time, and READY derives from the frozen cooling deadline,
- forced danger can interrupt retirement commitment/cooling through the same world-time chronology,
- retirement finish is terminal only at READY; RETIRED/VANISHED and retirement tone derive deterministically from run history, never starting board or rank,
- retirement variant/detail survive save/restore as derived presentation without leaking hidden relationship/probe/investigation truth,
- completed history archives final authoritative state once; browse summaries are derived, read-only, and cannot expose hidden ending/probe/investigation/relationship truth,
- a failed archive may delay the active→history move but must never make a terminal run playable again,
- long-run pressure is a strict no-op before day 14 and calendar age alone never raises it,
- veteran pressure derives from causal history, never rank or the starting network,
- long-run pressure may amplify only existing contract/probe/physical routes and may not fabricate their prerequisites,
- whole and split waits crossing the veteran-pressure activation boundary produce the same causal state,
- player-facing long-run pressure exposes only a coarse band and broad reasons, never the numeric score/bonuses or hidden source truth,
- P5 adds no authoritative save field; save/restore must derive the same pressure from existing history,
- exotic stock stays absent and direct purchase is rejected until the same veteran-history + clean-authored-workflow conditions are true,
- exotic eligibility never reads player rank or the starting network,
- exotic capability reuses the existing machine vector only; the shipped rack's zero compute/network must leave operation action minutes unchanged,
- the exotic offer is one-shot from append-only machine-purchase ledger provenance, so resale and save/restore cannot respawn it,
- P6 adds no authoritative save field, migration, new command/event family, RNG stream, capability axis, or target gate,
- save/load preserves causal continuity,
- world-content archetype metadata remains editorial and never enters authoritative WorldState or power/access math,
- authored world content rejects duplicate ids, dangling target ownership, invalid actor ranges, unknown assistant models and empty infrastructure before simulation begins,
- instantiated content is deep-cloned so one run cannot mutate the catalog used by another run,
- Phase 8 P0 preserves the canonical Phase 2–7 default world; existing deterministic/golden tests remain the compatibility proof until a later breadth slice intentionally changes content,
- simulation behavior does not depend on a specific persistence backend or host.

## Balance testing

Automated simulation can sample many seeds to measure:
- run-length distribution,
- cause-of-end distribution,
- money inflation,
- rank movement,
- contract availability,
- NPC activity,
- tool-market concentration.

Automated balance statistics guide tuning; they do not replace human playtests.

## Playtest questions

Human testing should repeatedly ask:
- Did I understand why I failed?
- Did I have a meaningful chance to notice the danger?
- Did the game reward knowledge rather than grinding?
- Did purchased software feel convenient rather than magical?
- Did the terminal and GUI feel like views of one system?
- Did I ever choose not to attack because of uncertainty?
- Did the room add tension without becoming busywork?
