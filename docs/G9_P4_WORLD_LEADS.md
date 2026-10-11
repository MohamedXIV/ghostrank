# G9 P4 — Brokerless world leads

**Issue:** #140 · **Scope:** first playable, bounded systemic opportunity. No quest-giver or contract is created.

Two authoritative causal producers: a real public `UndergroundActivity` inside the NPC tick, and a private incident rumor actually delivered by an NPC and read by the player (`MessageRead`). Private rumor content remains **a claim**, not truth. The first producer runs on NPC clock pulses; the second runs on the existing CommandBus command.

In Fresh Scene and High Pressure, the player can see a lead in the Underground app, use normal Recon commands to earn one current `machine-presence` evidence record on a source-related target, then **Investigate** to map it. Mapping alone does *not* prove the reported incident outcome. `Disclose`, `Trade`, `Exploit` and `Ignore` are mutually exclusive choices. Trade pays less than exploitation; both generate grudge and negative trust, while disclosure can help or backfire depending on hidden reality. The real relation system and value ledger record causal provenance and NPC retaliation can subsequently consume the grudge. The amount varies from deterministic run seed and source, never rank.

The lead lasts 2 days, with at most 3 simultaneously actionable leads, a 1-day per-actor cooldown and 128-record cap. Ignore and expiry do not freeze the world. Decisions and expiries persist in current-run saves and honor the first-ending-wins invariant. One source can never be rewarded twice. No hidden actor owner IDs, raw incident truth for unverified rumors, or `rumor.accurate` is projected; only target handles *already discovered by Recon* appear.

Both terminal `lead investigate <id>` / `lead disclose|trade|exploit|ignore <id>` and GUI buttons use the **same CommandBus**. The Underground interface and its TinyBase rows consume only `projectWorld` output. Canonical and Nightshade existing runs remain byte-identical until intentionally enabled separately; P4 runs in Fresh Scene and High Pressure only, preserving the golden regressions while providing live world content.

Verification: focused causal-producer/evidence/projection/seed/choice/save/replay tests; Node24 full test/typecheck/lint/build; browser proof at 390px. Historical save migration not required. Human novice playtest **NOT RUN**.
