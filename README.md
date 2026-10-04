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

Ghostrank is now **web-first until the game is feature-complete**.

- Next.js + TypeScript application shell
- Tailwind CSS + shadcn/ui
- Phaser 4 for the small top-down/isometric physical world
- Pure TypeScript deterministic simulation core
- Zustand for ephemeral UI state
- TinyBase as a reactive/query-oriented world projection
- Zod at data and command/save boundaries
- native IndexedDB durable browser persistence behind the existing persistence interface
- Tauri 2 + SQLite retained in the repository but deferred to final desktop packaging — tracked by #19

Normal gameplay must run entirely in a browser. Runtime authority lives in the simulation core, not in Next.js server features, Tauri, SQLite, IndexedDB, or any UI layer.

## Development

Use Node 24 for normal game development.

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

Web tests, typecheck, lint, and the production web build are the normal gameplay acceptance path. Rust/Tauri work is not a per-feature requirement and is deferred to the final desktop-host phase.

## Documentation

Start with [docs/README.md](docs/README.md). The canonical project documents cover vision, game rules, simulation architecture, hacking/tool design, economy, AI, physical-world presentation, persistence, testing, and the delivery roadmap.

For automated contributors and coding agents, [AGENTS.md](AGENTS.md) is mandatory reading before implementation.

## Status

**Phase 3 — Underground Ecosystem — complete. Phase 4 — Economy and Hardware — is in progress (P0 economy substrate, P1 compute budgeting, P2 workload scale and P3 housing/recurring costs shipped) and is tracked by #22.**

The web-first platform gate is implemented by #18: IndexedDB persistence is active in the browser and normal gameplay CI is web-only. Planned gameplay phases are tracked by #21–#27, in dependency order. Tauri/SQLite desktop hardening stays deferred to #19 after #27.

Ghostrank is a working title.
