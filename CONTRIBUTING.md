# Contributing

Ghostrank is being built from a documentation-first foundation. Contributions should preserve the core simulation model rather than optimize a local feature in isolation.

## Workflow

1. Read AGENTS.md and the relevant design documents.
2. Open or reference an issue for material work.
3. Keep changes scoped to one coherent system or vertical slice.
4. Add or update tests with gameplay rules.
5. Update canonical documentation when behavior changes.
6. Prefer small reviewable PRs over broad speculative rewrites.

## Product questions

If a requested feature conflicts with a design pillar, stop and surface the conflict. Do not solve it by silently weakening the pillar.

Examples:
- adding level-gated targets conflicts with player-mastery-first design;
- implementing a one-click success roll conflicts with simulation-driven hacking;
- executing real host shell commands conflicts with the safe virtual-computer boundary;
- storing world truth in React state conflicts with the simulation architecture.

## Commit/PR expectations

PR descriptions should state:
- player-facing behavior changed,
- domain systems affected,
- persistence/schema impact,
- verification performed,
- documentation changed,
- known follow-ups.

## Security

The shipped game must not act as a real intrusion utility. In-game networking, terminals, malware-like tools, credentials, cryptography, and AI automation are simulated or fictionalized. Do not introduce real exploit payloads, credential theft, stealth persistence against the host, arbitrary command execution, or access to unrelated local user data.
