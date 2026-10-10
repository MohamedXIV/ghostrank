# Ghostrank — Gameplay Pillars (Game-First Design Contract)

**Status:** approved design direction, **not shipped feature acceptance**.  
**Recorded:** 2026-10-10, D072; parent #75.  
**Source of gameplay truth:** `docs/GAME_DESIGN.md`, `docs/GAME_FIRST_REBOOT.md`, `docs/GAME_FIRST_VERTICAL_SLICE.md`.  
**Related tracks:** G3 #79 hands-on hacking, G4 #80 stakes, G5 #81 living society, G6 #82 embodied UX, G7 #83 breadth, G8 #84 playtests.  
**Current baseline:** PR #103 / D071 merged the **Nightshade Briefing**, a small two-route authored slice. It does **not** prove that the principles below are implemented, enjoyable, or complete.

## North-star player fantasy

You are an anonymous operator in a dangerous, autonomous hacker society. You make a living by observing, interpreting, preparing, taking risks, protecting yourself, and deciding what you will or will not do to other people. Your rig, tools, home, contacts and glimpses of the outside world are things you inhabit, not rows in a dashboard. **The best move may be to distrust an offer, abandon a lucrative target, or disappear.**

Ghostrank is a **hard, short-run, systems-driven hacker-life roguelike**, not a cybersecurity training suite, hacking tutorial, terminal-only simulator or moral-alignment game. The fiction borrows recognizable *concepts* from computer security; puzzles operate solely on invented systems and data.

## Pillar 1 — The cautious operator: distrust and compartmentalize

**Player feeling:** “Opening an email is a decision; my own computer is a target.”

- Treat inbound contracts, mail, chat dumps, links, archives and tools as **untrusted**, including material from past contacts or seemingly legitimate clients. Familiarity is evidence, never a guarantee.
- Offer meaningful fictional handling approaches: inspect metadata and provenance; quarantine; open on the main workstation (fast, exposed); inspect in an isolated local sandbox/VM (resource and time cost, reduced but nonzero risk); use a disposable remote environment (expense/latency/limited context); decline or defer.
- The danger is contextual: malicious attachments, misleading evidence, contaminated tools, identity correlation and planted telemetry can compromise equipment, money, trust or anonymity. Exposure should have causal, learnable signals, never an arbitrary “clicked once = instant death” roll.
- **Do not make caution a repetitive confirmation tax.** The player can establish policies and reusable workflows, but automation carries scope, capacity and false-confidence tradeoffs. A low-risk routine need not summon the same dialogue for every message.
- A VM is **not magically safe**. Isolation changes probability, surface area, cost and what can be inspected; it does not grant immunity.

**Proof of play:** two plausible inputs call for different handling strategies; a careful novice can explain *why* one was suspicious; bypassing isolation has a noticeable benefit and a credible downside. Player-safe clues only.

## Pillar 2 — The world is a place, not a dashboard

**Player feeling:** “I want to remain in this room and believe the world beyond the screen exists.”

**Visual uplift now (small, modular assets):** distinctive fictional logos and identity marks for organizations/services, app wallpapers/backgrounds, evidence thumbnails, readable device illustrations, target dossiers, documents/paperwork, character portraits or silhouettes, and occasional location/window scenes. Use consistent art direction and asset slots rather than scattering decorative images. Each image should establish identity, mood or usable information, not merely fill space.

**Mid-term:** screens with tangible manipulation, spatial network views, tactile evidence boards, animated but legible world fragments, character presence and glimpses of the surroundings.

**Later, not a prerequisite:** proper isometric room, free movement, controllable physical objects, deep housing visuals and travel presentation. Keep hooks for them now; do not block G3 gameplay or rewrite the UI architecture to fake their completion.

**Geography and travel:** start with a limited home locality. Later unlock travel through understandable world circumstances (resources, information, contacts or opportunities), **never through rank or a level gate**. Relocation already costs world time; long-distance travel should consume *authoritative* time and resources, with jobs, deadlines and NPC actions continuing during transit. Cities such as Paris, Tokyo and Bangkok may feature distinct windows, streets, lighting, weather, signage, routines, contacts and risk profiles. Travel should generate decisions and break monotony, not become a city-select cosmetic wallpaper.

**Art direction remains open.** The working preference is grounded stylization at approximately **3–4/10 on an abstraction-to-photorealism axis**, somewhere among stylized 2D, pixel-influenced texture treatment and restrained abstraction. “Abstract” does not mean faceless triangles. No final style, asset pack, camera perspective or visual-production pipeline has been approved.

**Proof of play:** in a screenshot-free test, a player recognizes places, actors and tasks without reading a wall of cards; added visuals respect the player-known projection and all accessibility/display modes. Pretty dashboards alone do not pass.

## Pillar 3 — Moral agency without class labels

**Player feeling:** “The world judges what I *do*, and not everyone judges it the same way.”

- The player is **not locked into white, gray or black**. Starting affiliations, contacts and prior behavior are situational history, not morality classes or access restrictions.
- Opportunities cover victim assistance (fraud and extortion recovery), criminal-network investigation, evidence preservation, security defense, rival disruption, mercenary intelligence and theft, predatory privacy abuse, coercion and exploitation. Not everything is a brokered mission: curiosity, revenge, temptation and unsolicited trouble also exist.
- Fiction may depict ugly choices involving vulnerable people, invasive observation or reputational blackmail. Treat victims as people with agency and fallout, **not disposable loot containers**. Represent sensitive intimate materials through redacted metadata, implications and consequences, not voyeuristic explicit images or exploitative collectibles.
- Do not introduce a universal good/evil bar or a sermon from the UI. Model credible witnesses, exposure, victim responses, inconsistent faction norms, trust, fear, retaliation, reputation, evidence and legal/physical consequences. Good intentions cannot guarantee safety or favorable reception; profitable cruelty has victims and enemies.
- Keep the underground's anonymity and unmasking taboo; actors may disagree when they interpret it.

**Proof of play:** at least one dilemma offers self-serving and helpful responses with mechanically different consequences that emerge from known people and history, not an abstract alignment score.

## Pillar 4 — Every gain creates exposure; sometimes you are the target

**Player feeling:** “My last mistake can find me tomorrow, and I may have to negotiate from weakness.”

- Every significant action trades some combination of time, money, compute, attention, footprint, trust, safety or opportunity. Quiet preparation may miss a deadline; rushing may leave durable evidence; a successful theft may fund recovery but create a vindictive opponent.
- Rival hackers and groups can surveil, impersonate, probe, corrupt an offered tool, steal infrastructure, exert financial pressure or coerce the player into working for them. **Counter-hack and defense are first-class play**, not only background alerts.
- The player may isolate a compromised machine, audit evidence, rotate an identity, patch a flaw, negotiate, seek help, move house, spend resources or walk away. Neither good alignment nor owning the best tool grants immunity.
- Escalation has visible *symptoms* with uncertainty: suspicious login patterns, route instability, unusual messages, changed contact behavior, missing data, door-camera activity. Do not expose hidden NPC truth or compress every risk into a perfect “heat meter.”
- Compromise creates branching, bounded stories (debt, leverage, partial loss, escape) before a terminal end when feasible. Still honor the established hard short-run stakes, first-ending-wins, fair causal postmortem and deterministic world clock.

**Proof of play:** a previously successful operation can provoke an observable, player-responsive countermeasure; both mitigation and reckless continuation have explainable costs.

## Pillar 5 — Life through windows, cameras and world fragments

**Player feeling:** “I am glimpsing a living city, not watching the same clip on repeat.”

- Cameras and remote visual feeds are **fictional simulated spaces**, not embedded prerecorded video loops or real-world feeds. Use Phaser 4 for a reusable scene runtime when warranted: actors enter/leave, weather or lighting changes, day/night and schedules matter, and the same camera reveals different events on different visits.
- Player actions include switching authorized/compromised simulated feeds, looking at an event timeline, marking an observation, cross-correlating a sighting with logs/messages, and deciding whether observed patterns justify a costly operation.
- Physical-world fragments may include streets, shops, offices, corridors, apartment exteriors and criminal sites. They support both protective and predatory stories; visibility itself can be ethically consequential. Never imply the player sees every action everywhere.
- **Deterministic authority owns truth.** Phaser renders a seeded projection of the simulation; sprites, lighting, animations or camera switching never independently determine evidence, spawn omniscient actors or advance game time.
- Camera gameplay must remain legible with non-visual alternatives (event summaries/keyboard interaction) and without requiring reflex-timing for essential clues.

**Proof of play:** revisit a feed at two world times and observe plausibly different, causally correct activity; a player can connect at least one visual clue to another evidence surface. The same world seed plus decisions reproduces it.

## The connective tissue — small, real-world-relative mini-games

Mini-games are the **verbs inside an operation**, not stand-alone arcade popups and not a prescribed mandatory sequence:

| Mechanic family | Accessible question the player answers | Inspired by, without reproducing real attacks |
| --- | --- | --- |
| Network mapping | Which fictional node, connection or trust boundary leads toward the objective? | Topology/reconnaissance |
| Packet-pattern reading | Which few synthetic transmissions share a meaningful signal? | Network traffic analysis |
| Log forensics | Which time, account or machine event contradicts the rest? | Digital forensics |
| Access and trust | Which role or service relationship permits a route, and at what cost? | Authorization concepts |
| Code/pattern interpretation | What small key, format or transformation fits the evidence? | Basic encoding and cryptanalytic reasoning |
| Social/OSINT reasoning | Which source is reliable and what should the player ask or verify? | Provenance and social engineering |
| Camera/timeline observation | Which movement/event coincides with another clue? | Surveillance review and event correlation |
| Defensive triage | What to isolate, verify or sacrifice before an attacker advances? | Incident response |

**Shared mini-game contract (for every implementation):**
1. Ground it in an in-world lead, plausible stakes and readable clues; require **active inference**, not a hidden die roll or a single button.
2. Offer multiple meaningful responses: at least two viable approaches to an operation; bypass/alternate evidence path when suitable; abort/retreat is real agency.
3. Keep a short novice learning ramp, clear language and optional contextual explanations. Technical familiarity may help, but *professional expertise is not assumed*.
4. Time/compute/equipment influence speed, information quality, safety or capacity — never substitute for thinking. **Rank never gates entry, outcomes, capabilities or contracts.**
5. Let mistakes consume world time, damage evidence, raise suspicion, invite NPC reaction or yield **partial success**; avoid arbitrary instant death and generic success screens.
6. Terminal and GUI invoke **one authoritative command/event model**, with equivalent capabilities and accessible inputs. UI is a view, not a separate rules engine.
7. Fixed seed + commands + clock must replay identically across saves. Knowledge/rumors/visuals come only from player-safe projections. All protocols, logs, packets, locations and identities are fictional and local to the game; no live-network attack interactions.
8. Instrument *choices and clarity*: how the player solved it, whether alternatives truly work, what went wrong and how the world reacted. Automated route tests are **not** substitutes for unassisted human playtests.

**Anti-patterns:** random Sudoku pasted into a terminal; a minigame mandatory on every contract; a strength check disguised as a puzzle; busywork isolation confirmations; non-interactive art masquerading as gameplay; perfectly truthful risk UI; real-world intrusion instructions; moral-choice buttons whose outcomes differ only in flavor text.

## Connected operation loop

**Lead (message, rumor, person, camera, opportunistic finding)** → **trust triage (inspect / isolate / refuse)** → **investigate (mini-games, visual and textual evidence)** → **form a hypothesis** → **choose routes and prepare rigs/tools/identities** → **act under the shared world clock** → **read defender response** → **extract partly/fully or retreat** → **live with the aftermath (contacts, victims, rivals, law, economy, housing and possible travel)**.

The loop is *not* required to execute linearly. Players can revisit intel, use different evidence sources, initiate defensive investigations or change plans when an NPC counters.

## Sequencing / non-goals

| Now — design and near-term G3/G6 increments | Later / only after proving gameplay |
| --- | --- |
| Agree on pillars; specify first mini-game in Nightshade with human-testable choices | Generate a huge disconnected minigame catalog |
| Define isolated-content handling as a tactical choice, then test its friction | Require clicking a sandbox prompt for every routine action |
| Add small identity/atmosphere artwork via swappable assets, respecting projected truth | Choose final art style, rebuild the whole OS or ship an empty visual facelift |
| Make one mini-game's NPC reaction and partial outcome causal and replayable | Full room movement/isometric apartment |
| Prototype one synthetic Phaser camera view only when tied to real investigation | Whole-city simulation or prerecorded looping surveillance wallpaper |
| Keep location/time hooks for travel | International travel system, airports and multiple cities |
| Player observation and feedback | Declare human gates passed because Chromium tests are green |

**Exit conditions for this document are design alignment only.** It creates **no implemented feature, test PASS, art asset, playable city, safe-VM mechanic or human-playtest evidence**. Future PRs must specify which pillar they advance, the player decision it adds and the measurable consequence. G0/G1/G2/G3 and #75 remain open subject to their actual acceptance evidence.
