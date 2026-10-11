# G5 P6 — Witnessed NPC solidarity after a public rival breach

**Issue:** #155 (G5 #81 / Game-First #75) · **PR:** pending.

## In-world cause → third-party change → new plans

NPC relations previously adjusted when an attack succeeded or failed, while unrelated, genuinely trusted bystanders never acquired their own standing toward the assailant. G5 P6 adds one narrowly sourced response **one 360-minute ecosystem tick later**, from a published rival successful intrusion and an existing trusted witness on the victim's own underground network.

Eligible: a real public successful incident, both actors owning real faction infrastructure, genuine rival organizations, a same-board real forum post written by a network member, and a same-faction, same-network peer whose directed trust toward the victim is at least 20. The strongest trusting peer (stable ID tiebreak) can respond once with +18 grudge and -4 trust toward the assailant. If no actual accessible post is on the network, none of the relations change; private incidents, rumors alone, a forged post, a nonrival attacker, or an untrusted peer never grant magical situational knowledge. Posts are read **only** from the immediately preceding tick. Duplicate posts from one incident cannot multiply the response. No second RNG, state field, clock, memory ledger, rank input or hidden public status is introduced.

The reaction is committed through the already existing clamped, sourced `RelationshipChanged` authority with `causeKind: "incident"` and the original incident ID. That peer's new grudge is consumed by the existing `counterpartWeight` (future NPC intrusion targets) and `offerTargetWeight` (possible contracts to the player). Those are weighted choices, **not forced raids or guaranteed jobs**. A defender's own response, existing trusted-peers defense, faction emergency agenda and independent-player opportunities remain independently causal. The public forum source is player-visible, but the peer's raw motives, hidden trust and future action roll are never projected.

Only `src/game/simulation/systems/npc-solidarity.ts`, the original ecosystem tick integrator and G5 tests/docs change. Claude Code owns G6 React/Workbench/CSS; this PR **must not touch** those files.

## Validation limits

Node24 full CI / typecheck / lint / Next build; canonical golden, 128-seed bulk/split replay, G5 seed tests and existing Chromium smoke. Tests cover source validation, 1-tick chronology, third-party target and contract weight changes, seeded rank independence, exactly-once across save/replay and post-ending silence.

**Human unfamiliar-player game-feel test NOT RUN.** Parent #81 and #75 remain open until gameplay observation. G3 P2 design PR #116 is unaffected.
