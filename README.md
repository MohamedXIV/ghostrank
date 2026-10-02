# Ghostrank

Ghostrank is a hardcore single-player hacker-life simulation and roguelite about surviving an anonymous underground ecosystem where every actor can be both predator and prey.

The player begins a run with a handle, a small physical space, limited hardware, a starting toolset, and a loose White- or Black-side network. Those starting choices are not morality locks or power classes. Actions determine reputation, relationships, enemies, opportunities, and ultimately what the underground believes the player has become.

The core promise is simple:

**Rank is reputation, not power. Player skill is the primary progression.**

A veteran player on day one can attempt to attack a top-ranked hacker. The game never blocks that attempt with a level requirement. If the player understands the systems, discovers a real weakness in the simulated world, and executes well enough, they can succeed — and then live with the consequences.

## Design pillars

- **Hardcore but legible.** Runs are dangerous and short. Early runs may last only a few in-game days. Failure should usually be explainable after the fact.
- **Player mastery over character level.** Knowledge, observation, preparation, timing, and judgment matter more than numerical progression.
- **One simulation, many interfaces.** Terminal commands, GUIs, purchased tools, scripts, and AI-built software call the same simulated capabilities.
- **No magic hacking button.** Hacking is a chain of reconnaissance, interpretation, preparation, execution, verification, extraction, and consequence.
- **Everyone can be a target.** Rank never acts as a level gate. High-profile targets are dangerous because of their capabilities, relationships, and consequences.
- **Reputation is contextual.** The world derives descriptors from behavior. White and Black are starting ecosystems, not permanent alignments.
- **Physical life matters.** Most play happens on the computer, but the player exists in a small isometric room or safehouse that can change during a run.
- **Money buys capability, convenience, scale, and safety — never guaranteed victory.**
- **Modern computing matters.** Hardware, local and cloud AI, software markets, crypto-like economies, and limited late-game quantum capabilities are systems rather than decoration.
- **The world does not pause for the player.** Targets change, contracts expire, investigations advance, rivals act, and contacts disappear.

## High-level stack

- Tauri 2 desktop shell
- Next.js + TypeScript application shell
- Tailwind CSS + shadcn/ui
- Phaser 4 for the small top-down/isometric physical world
- Pure TypeScript deterministic simulation core
- Zustand for ephemeral UI state
- TinyBase as a reactive/query-oriented world projection
- SQLite for durable saves, event history, content, and migrations
- Zod at data and command boundaries

Next.js is used as a static-exported desktop UI. Runtime authority lives in the simulation core and Tauri-backed persistence, not in a Next.js server.

## Development

Use Node 24 and stable Rust.

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run desktop:dev
```

CI additionally performs a locked Tauri build and a headless desktop launch smoke test on Linux.

## Documentation

Start with [docs/README.md](docs/README.md). The canonical project documents cover vision, game rules, simulation architecture, hacking/tool design, economy, AI, physical-world presentation, persistence, testing, and the delivery roadmap.

For automated contributors and coding agents, [AGENTS.md](AGENTS.md) is mandatory reading before implementation.

## Status

**Phase 1 — Computer + Room Vertical Slice — implemented. Phase 2 — Operation Simulation — is next.**

Ghostrank is a working title.
