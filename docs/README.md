# Ghostrank Documentation

These documents are the canonical design and engineering foundation.

## Product

- [VISION.md](VISION.md) — fantasy, audience, pillars, scope, non-goals
- [GAME_DESIGN.md](GAME_DESIGN.md) — run structure, reputation, ranking, danger, failure
- [HACKING_AND_TOOLS.md](HACKING_AND_TOOLS.md) — moment-to-moment computer play, terminal/GUI parity, software market
- [ECONOMY_PROGRESSION_AND_SKILLS.md](ECONOMY_PROGRESSION_AND_SKILLS.md) — money, hardware, proficiency, player mastery
- [AI_SYSTEMS.md](AI_SYSTEMS.md) — cloud/local models, AI-assisted software creation, compute economy
- [WORLD_RUNS_AND_ENDINGS.md](WORLD_RUNS_AND_ENDINGS.md) — underground ecosystem, physical danger, run endings
- [UI_UX_AND_ART.md](UI_UX_AND_ART.md) — simulated OS, isometric room, visual and audio direction

## Engineering

- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) — application boundaries, command bus, simulation core, Phaser bridge
- [DATA_AND_PERSISTENCE.md](DATA_AND_PERSISTENCE.md) — SQLite, TinyBase, events, snapshots, saves, migrations
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) — deterministic simulation testing and acceptance
- [CONTENT_AND_FICTIONALIZATION.md](CONTENT_AND_FICTIONALIZATION.md) — content model and safe fictionalization

## Delivery

- [ROADMAP.md](ROADMAP.md) — staged project roadmap
- [DECISIONS.md](DECISIONS.md) — accepted architectural/design decisions and deferred questions

## Canonical rule

If implementation changes a documented rule, the same PR must update the relevant document. The project should never require reading old chat history to understand the intended game.
