# Ghostrank Documentation

These documents are the canonical design and engineering foundation.

## Product

- [VISION.md](VISION.md) — fantasy, audience, pillars, scope, non-goals
- [GAME_DNA.md](GAME_DNA.md) — systemic hacker-society sandbox principles and game-first invariants
- [GAME_DESIGN.md](GAME_DESIGN.md) — run structure, reputation, ranking, danger, failure
- [HACKING_AND_TOOLS.md](HACKING_AND_TOOLS.md) — moment-to-moment computer play, terminal/GUI parity, software market
- [ECONOMY_PROGRESSION_AND_SKILLS.md](ECONOMY_PROGRESSION_AND_SKILLS.md) — money, hardware, proficiency, player mastery
- [AI_SYSTEMS.md](AI_SYSTEMS.md) — cloud/local models, AI-assisted software creation, compute economy
- [WORLD_RUNS_AND_ENDINGS.md](WORLD_RUNS_AND_ENDINGS.md) — underground ecosystem, physical danger, run endings
- [UI_UX_AND_ART.md](UI_UX_AND_ART.md) — simulated OS, isometric room, visual and audio direction

## Engineering

- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — application boundaries, command bus, simulation core, Phaser bridge
- [DATA_AND_PERSISTENCE.md](DATA_AND_PERSISTENCE.md) — persistence contracts, browser saves, TinyBase, events, snapshots, migrations, deferred SQLite desktop adapter
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) — deterministic simulation testing and acceptance
- [CONTENT_AND_FICTIONALIZATION.md](CONTENT_AND_FICTIONALIZATION.md) — content model and safe fictionalization
- [SEMANTIC_SANDBOX_ARCHITECTURE.md](SEMANTIC_SANDBOX_ARCHITECTURE.md) — G9 authority, semantic scopes, conditions/effects and narrative boundaries
- [SEMANTIC_CONTENT_AUTHORING.md](SEMANTIC_CONTENT_AUTHORING.md) — G9 authored content examples and review rules
- [G9_P1_CONDITIONS.md](G9_P1_CONDITIONS.md) — shipped finite scoped evaluator and knowledge-lens limits
- [G9_P2_EFFECTS.md](G9_P2_EFFECTS.md) — authoritative opt-in on-action, scheduled effect, replay/receipt contract
- [G9_P3_CONTRACT_MIGRATION.md](G9_P3_CONTRACT_MIGRATION.md) — migrated infrastructure-map objective, authored variants and regression proof
- [G9_P4_WORLD_LEADS.md](G9_P4_WORLD_LEADS.md) — NPC-driven brokerless leads, earned investigation, choices, visibility and replay
- [G9_P5_INK_NARRATIVE.md](G9_P5_INK_NARRATIVE.md) — versioned Ink dialogue/lead choices, CommandBus intents and replay boundary
- [G9_P6_INSTITUTIONAL_ARC.md](G9_P6_INSTITUTIONAL_ARC.md) — sourced local/federated public-office response, independent multi-tick consequence
- [G9_P7_DIAGNOSTICS_WORKER_BOUNDARY.md](G9_P7_DIAGNOSTICS_WORKER_BOUNDARY.md) — developer-only provenance, 128-seed baselines, local async Worker-ready host
- [G6_FIRST_CONTACT.md](G6_FIRST_CONTACT.md) — scenario-correct opening Recon leads and contextual field directives (automated UX proof; human NOT RUN)
- [G9_P0_SEMANTIC_CONTRACT.md](G9_P0_SEMANTIC_CONTRACT.md) — verified code seams, exact legacy objectives, first contract and P1/P3 test plan

## Delivery

- [ROADMAP.md](ROADMAP.md) — staged project roadmap
- [DECISIONS.md](DECISIONS.md) — accepted architectural/design decisions, including the web-first/Tauri-deferred platform policy, and deferred questions

## Canonical rule

If implementation changes a documented rule, the same PR must update the relevant document. The project should never require reading old chat history to understand the intended game.
