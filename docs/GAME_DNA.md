# Ghostrank — Game DNA: systemic hacker society

**Status:** accepted design direction (2026-10-11), NOT implementation acceptance. **Owners:** Game-First #75; Semantic Sandbox #135. **Companion:** GAME_DESIGN.md, GAMEPLAY_PILLARS.md, SEMANTIC_SANDBOX_ARCHITECTURE.md, CONTENT_AND_FICTIONALIZATION.md.

## Promise to the player

Ghostrank is a hard, short-run, single-player **systemic sandbox about an anonymous hacker in a living society**. You are not the chosen hero or the central scheduler. Rival hackers, contacts, crews, institutions and the wider fictional world act on their own motives. Your choices change their future; their choices change yours.

**Author situations, not routes through a quest tree.** The player may accept a contract, find and pursue a lead, act without permission, sell information, protect a victim, sabotage a rival, negotiate, walk away, or simply survive. No issuer or quest marker is required for a meaningful operation.

The game is not finished merely because it has many systems, green tests or an attractive OS. Judge every expansion by the new decision it gives the player, its readable consequences and the ways runs diverge.

## The eleven rules of play

1. **The world does not revolve around the player.** NPC-vs-NPC operations, organizational projects, rivalries, rumors, retirements and institutional reactions continue on the authoritative clock. Content can emerge without a broker's offer or a player's involvement.
2. **Skill and knowledge beat rank.** Rank is public notoriety/reputation, never a capability, difficulty, access or content gate. Powerful actors are dangerous for their actual assets, knowledge, skills, organization and connections. A skilled player can attempt an elite target on day one.
3. **Situations admit competing approaches.** Recon, social leverage, source corroboration, indirect networks, tools, negotiation, selling, exposure and abandonment are different ways to deal with the same opportunity, not a fixed minigame chain.
4. **Evidence is situated and fallible.** Distinguish hidden ground truth, an actor's potentially wrong belief, reported testimony, observations earned by the player, and information published to an audience. The UI never grades a secret for free.
5. **Consequences travel through actual relationships.** Victims, third parties, brokers, organizations and investigators respond only to events they could learn about, with credible provenance. No global morality meter or automatic omniscient retaliation.
6. **Content is authored as reusable constraints and consequences.** Contracts, spontaneous leads, world events, NPC projects and arcs reuse a finite vocabulary of scoped conditions and authorized effects. New mechanics can add code deliberately; new combinations should usually need only content.
7. **Operations have scope, not character levels.** Local, network, organization, institutional, national and international impact are measures of scale and consequences, NOT rank tiers, prescribed order or arbitrary unlocks. Institutional/national settings are fictional and need real simulation consequences, not dramatic flavor text.
8. **Runs are dangerous but causally fair.** Time, money, compute, housing, exposure, pressure, opponents and independent deadlines carry weight; false conclusions can hurt. Preserve partial success, retreat, recovery, terminality and explanatory postmortems where feasible.
9. **Tools are means of thinking and acting.** A small general Network Mapping/forensic/defensive mechanic works across real providers; Nightshade remains a small introduction, not a second game engine. A purchase or AI assistant can affect throughput/uncertainty, not replace the player's judgment.
10. **The world is felt as a place.** A believable OS, desk, camera/window fragments, NPC messages and tactile decisions communicate causality. Narrative and visual treatment come from player-safe simulation facts, not independent authored truth.
11. **Replayability is systemic, not a random name generator.** Within one run, incidents can open/close leads and real alliances can form or break. Across seeds, independent agendas, source availability, pressure and consequences create substantially different plans.

## Content vocabulary, not a universal quest system

- **Contract:** an offer with issuer, due date, consideration and evidence-verified objective. Optional; not the master content model.
- **Opportunity:** a player-reachable possibility inferred from world facts, messages or evidence; may have no issuer or reward.
- **Operation:** intentional work performed by a player or NPC, often independent of an offer.
- **World event:** a causal state change that occurs even if ignored.
- **NPC project:** a private or public objective pursued with resources, schedules and real consequences.
- **Story arc:** a sequence of changing situations caused by world events; not an omniscient branching screenplay.

A leak from a **fictional repressive institution** might be obtained through a contract, discovered during another operation, planted by a rival or passed by a contact. Disclose, verify, privately transfer, trade, suppress or ignore it: whoever genuinely learns of each act can react. The author does not predeclare that every disclosure is successful or that every institution collapses. Scope and stakes arise from systems, not badges like Tier S.

## Paradox-inspired principles (ideas, not engine implementation claims)

Borrow the design language of **scopes, triggers/conditions, effects, on-actions, periodic pulses and weighted agendas**. Evaluate only eligible work when a relevant fact changes or a due world-time boundary arrives. Optimize dependencies after measurement; never recalculate a huge content registry every browser frame. Use graded simulation detail when actual world scale justifies it, not a giant full-AI model for each background account.

Prefer stable motives and legible personalities over constant random character rewrites. Make content-debugging first class: developers must be able to ask **Why did this happen? Why not? Whose knowledge is this?** without showing private truth to the player.

## Ink and simulation ownership

**Ink/inkjs is the narrative layer, not the physics or social authority.** It can present dialogue, messaging, reports, negotiations, decisions, documents, and arcs. It consumes permitted narrative context, returns a typed intent, and the authoritative CommandBus checks costs/conditions and applies every mutation. Choice labels must not imply guaranteed outcomes. Narrative version and current-save continuity must be explicit.

## Code and deployment posture

Keep **one cohesive modular TypeScript simulation**. Split files along domain responsibility and actual coupling: neither 1,500-line catch-all modules nor a file for every ten lines. Refactors and replacement of unfun old content are permitted; preserve **invariants**, not every existing abstraction by default. No Rust/WASM game-core rewrite. Prefer a host-neutral, asynchronous, **Web-Worker-ready interface**; a single Worker is a focused follow-up if it materially improves responsiveness, not a prerequisite for this initiative. Tauri remains deferred.

Current saves, fixed-seed replay and authoritative consistency require testing. Do not make historical-save migrations an automatic scope expansion. Preserve player-safe projection, first-ending-wins, real world time, terminal/GUI parity, offline fictional commands, and no arbitrary content execution.

## The gameplay acceptance question

For each slice, answer: **What did the player infer or decide? Which other actor was affected? How did the world react, through what source? What different option was real? Can this arise differently in another seed and without a broker?** Automated suites demonstrate correctness; only observed human playtests demonstrate whether the experience is understandable and fun. Until those happen, human gates remain **NOT RUN**.

Implementation is tracked by [G9 #135](https://github.com/MohamedXIV/ghostrank/issues/135) and child issues #136–#143. G3 P2 Log Forensics #110 / draft PR #116 remain **unapproved and independent**.
