# Game Design

## Core loop

A typical operation is:

1. Discover or choose an opportunity.
2. Gather intelligence.
3. Form a hypothesis about the target.
4. Decide whether the reward justifies the uncertainty.
5. Prepare hardware, routes, tools, AI assistance, identities, and contingencies.
6. Execute one or more simulated capabilities manually or through software.
7. Interpret results rather than receiving a binary success screen.
8. Escalate, pivot, disengage, or abort.
9. Extract information/value if appropriate.
10. Deal with traces, relationships, evidence, retaliation, and world reaction.
11. Recover, lay low, relocate, improve the setup, or select another target.

The most important expert skill is often deciding not to continue.

**Formal player-experience pillars (D072):** `docs/GAMEPLAY_PILLARS.md` is the gameplay/design contract for cautious handling of untrusted material, a visually inhabited world, morally free but consequential action, rival counter-hacking, and living camera/window scenes. Small fictional-security-inspired mini-games connect these pillars. This is design direction, **not shipped G3 content**; art style and international travel remain uncommitted implementation choices.


## Game-first completion note (2026-10-08)

Phase 9 shipped an architecturally verified Web Beta, not an adequate complete game. An interactive hacking roguelike needs player-chosen identity, visibly advancing shared world time with truly concurrent jobs, procedural variations across seeds, actionable network/evidence puzzles, autonomous NPC counterplay, meaningful run loss/replay and embodied game interactions. The current command menus and static authored roster are a foundation, not the end state.

The game-first design contract and dependency roadmap are in `docs/GAME_FIRST_REBOOT.md` / parent #75. In particular, **sleep and fast-forward must never silently skip ecosystem ticks**, and the first gameplay goal is a small truly interactive operation with multiple successful strategies.

## Systemic content and emergent stories (G9 / D074, design direction)

The player may **accept a contract, investigate a rumor, independently target an asset, help a victim, sell or disclose evidence, abandon an opportunity or intervene in an NPC project**. A formal mission offer is not a prerequisite for activity. Contracts, world opportunities, self-initiated operations, NPC projects, events and story arcs are distinct entry/lifecycle forms over **shared evidence, command, time, relationship and consequence rules**. One system should not invent its own success flag because another entry point is called a quest.

Content should specify scopes, observable sources, conditions, viable actions and consequences through a finite typed vocabulary; the authoritative simulation verifies actions, charges costs, emits provenance and lets independently informed actors react. World truth, individual NPC beliefs and player-earned knowledge may diverge. Players and NPCs can make consequential wrong inferences; neither narrative nor UI may disclose authoritative truth for free.

Operations can affect an individual, network, organization, institution or multiple **fictional** nations. These describe **impact scale**, not rank locks. A national-scale scandal requires a bounded, actually simulated institution/public-response domain when needed—not just a contract tagged S with bigger numbers. Outcomes can include corroborated disclosure, quiet handoff, sale, suppression, betrayal, investigation, partial success or silence. There is no universal morality meter or prescribed white/black solution.

**Example:** a fictional regime's disputed records may reach the player through a broker, self-discovered trace or competing NPC leak. The player can verify, quietly pass, sell, expose, suppress or walk away. Rivals and institutions react **only when they have legitimately learned** of each event. Public exposure isn't guaranteed, and doing nothing does not pause the independent actor. The same event can play differently in another run.

Use Ink for authored chats, dossiers, reports, negotiations and branching choices, but **not** as world authority: it consumes player-safe context and emits typed intents back to CommandBus. Prefer small reusable mechanics across real targets; Nightshade remains introductory. Allow redesign of prototype systems when it improves choices and replayability.

**Canonical references:** `docs/GAME_DNA.md`, `docs/SEMANTIC_SANDBOX_ARCHITECTURE.md`, `docs/SEMANTIC_CONTENT_AUTHORING.md`; [G9 #135](https://github.com/MohamedXIV/ghostrank/issues/135), #136–#143. These are **planned**, not shipped. Human unfamiliar-player playtests remain NOT RUN.

## Interface as part of the world

The simulated computer is a place the player inhabits, not a neutral menu wrapper around the simulation.

The player spends most of a run looking at applications, so the interface must be:
- comfortable for long sessions,
- visually informative,
- expressive without becoming noisy,
- understandable without professional technical knowledge,
- consistent in semantics while allowing individual apps to retain identity.

Prefer recognition before reading. Relationships, evidence confidence, operation state, deadlines, topology, value movement, and causal history should use meaningful visual language where it improves comprehension.

The UI must not reveal hidden truth. A graph, icon, color, animation, or rival treatment may only express information that the player-facing projection already knows.

Color is never the only carrier of important meaning.

Canonical interface, visual-language, motion, and distro rules live in `docs/INTERFACE_AND_DISTROS.md`.

## No universal difficulty score

Targets should not expose a five-star danger rating or recommended level.

The player may know:
- public rank,
- known tools,
- known associates,
- rumors,
- observed infrastructure,
- prior incidents,
- estimated wealth,
- partial history.

Unknown information remains dangerous.

A low-ranked account may be a front, decoy, relative, contractor, burner identity, or protected affiliate of a much stronger group.

## Ranking

The global underground index is a reputation/visibility system.

Rank may be influenced by:
- difficulty and notoriety of operations,
- known targets defeated,
- money or information moved,
- reliability,
- tool authorship,
- public incidents,
- community discussion,
- survival under pressure,
- victories over higher-ranked handles.

Rank must never directly:
- increase damage,
- grant access to attacks,
- block low-ranked players from high-ranked targets,
- make an NPC statistically invulnerable.

Higher rank indirectly increases danger because the handle is better known, watched, challenged, imitated, hunted, and researched.

## Reputation

There is no single Good/Evil bar.

The simulation tracks dimensions and relationships such as:
- trust,
- reliability,
- greed,
- discretion,
- fear,
- vindictiveness,
- technical reputation,
- loyalty,
- collateral behavior,
- treatment of other hackers,
- treatment of victims,
- willingness to cooperate,
- taboo violations.

UI-facing descriptors are derived from history. Examples may include Vigilante, Mercenary, Predator, Toolsmith, Hunter, Rat, Broker, Professional, or Opportunist.

Descriptors are observations, not player-selected classes.

## The unmasking taboo

Revealing another hacker's real-world identity is a severe underground taboo because shared anonymity is part of the ecosystem's survival.

Unmasking can be used as retaliation or leverage, but normally creates strong social consequences even among actors with few conventional morals.

Exceptions may emerge when a target is considered burned, outcast, or open season because they violated community survival norms or crossed a broadly recognized boundary.

The game should simulate disagreement: there is no omniscient morality referee.

## Contracts

Contracts are opportunities sent through relationships and markets.

White-side examples:
- investigate a predatory marketplace,
- identify an extortion crew,
- recover evidence,
- disrupt infrastructure,
- trace stolen value,
- help another vigilante under pressure.

Black-side examples:
- data theft,
- corporate espionage,
- financial theft,
- sabotage,
- acquiring information,
- attacking a rival,
- brokering access.

Contracts are not mandatory missions. They exist inside the same world model as freeform targets and can go wrong in unscripted ways.

## Threat sources

The player can be endangered by:
- authorities,
- rival hackers,
- criminal groups,
- betrayed contacts,
- victims with resources,
- careless tool authors,
- compromised infrastructure,
- financial tracing,
- physical exposure,
- their own operational mistakes.

Threat should rarely be summarized by one visible Heat percentage. The player instead receives evidence: strange probes, missing contacts, unusual logins, changed marketplace behavior, news, vehicles, calls, door-camera activity, outages, rumors, or suspicious messages.

## Hard but fair

The game may hide information but should not casually kill a run without causality.

A postmortem can reveal enough of the chain to teach:

    Day 2: reused a compromised relay
    Day 4: a rival correlated two signatures
    Day 6: the handle was sold to a broker
    Day 8: an investigator connected payment activity
    Day 9: arrest

The postmortem does not need to reveal every hidden system or random seed.

## Time

The game uses meaningful in-world time. Software builds, local AI jobs, travel/relocation, sleep, waiting, and long operations consume time.

The world advances while these actions occur.

Exact pacing remains a tuning decision, but the target experience is:
- first runs can end around days 3–5,
- reaching roughly 7–10 days is a real early achievement,
- experienced successful runs can reach multiple weeks,
- very long runs are exceptional rather than expected.

## Failure and success

Failure can include:
- arrest,
- unmasking,
- physical capture or death,
- catastrophic compromise,
- financial ruin,
- forced disappearance,
- loss of the handle/infrastructure.

Not every run must end in death.

Success is not simply achieving rank #1. A player may decide that survival itself is the final challenge and attempt an exit.
