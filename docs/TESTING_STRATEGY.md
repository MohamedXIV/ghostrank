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

### Projection/UI tests
- hidden facts do not leak into TinyBase player projection,
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
- save/load preserves causal continuity,
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
