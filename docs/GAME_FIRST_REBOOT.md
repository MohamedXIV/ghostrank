# Ghostrank — Game-First Reboot (Gameplay Completion Initiative)

**Status:** design + execution roadmap, not implemented.  
**Parent:** #75, children #76–#84.  
**G0 audit and vertical-slice brief (#76):** see `docs/GAME_FIRST_VERTICAL_SLICE.md`. Its slice is unvalidated until a human playtest.  
**2026-10-08 decision:** Phase 9 Web Beta verified the technical web target, **not** that Ghostrank has shipped as a complete or engaging game. Desktop/Tauri #19 is deferred until game-ready validation (#84).  
**G1 (#77) status:** scheduler slice delivered (D054, D055). Every ecosystem boundary runs in order. Waits longer than 90 days queue on one shared clock and drain in bounded chunks. Sleep, fast-forward, halt, pause and playback speed are live in both the terminal and the GUI, and the clock shows its time, job progress and player-safe notices. Not yet: builds, upkeep, investigations and retirement still run on boundary hooks rather than queued jobs; short sleeps finish in one command; the G0 slice still needs a human playtest.

## 1. Player fantasy and north star

> You are one anonymous hacker among many autonomous hackers. The world continues to act. You do not win by clicking a ranked target; you win by noticing, understanding, preparing, choosing, improvising and knowing when to disappear.

The play loop is **lead -> investigate -> form hypothesis -> stage an operation -> interact with a fictional network -> extract or retreat -> deal with social/financial/physical consequences -> prepare the next risky choice**.

A strong 20–30-minute design proof (#76) should start with handle/scenario choice, open with an intriguing partial clue and 2+ possible paths to a real objective, require 3+ distinct non-obvious decisions, expose one NPC countermove and real passage of time, and allow a meaningful loss or retreat. **Playtest this before doing a large redesign.**

What we keep: strict deterministic authority, player-safe projections, distinct fictional distros, tiny physical room, contracts, social simulation, tool provenance, hardware/compute economy, varied outcomes and first-ending-wins. What we challenge: overreliance on text/card dashboards; operations as one-click commands; fixed roster; clock that advances only invisibly at selected actions; short-run fun inferred only from automated 30-day policies.

## 2. Verified October 2026 code gaps

1. `src/game/runtime/slice-world.ts`: default handle `CobaltXZ`; `createNewRunWorldState` varies seed but `instantiateWorldContent()` clones one static authored roster from `src/content/world-content.ts`.
2. `CommandBus.advanceWorldTime()`: some actions use authoritative time; no unified player-facing live/sleep/fast-forward/queued-job experience.
3. `src/game/simulation/systems/underground.ts`: `TICK_MINUTES=360` and `MAX_CATCHUP_TICKS=28`; long waits drop older NPC boundaries. Thus a 14-day wait is **not guaranteed equivalent** to fourteen 1-day waits. Existing 28-tick behavior was an intentional bounded cost safeguard; the new design must preserve frame safety without discarding events.
4. `observeTarget`/survey/inspect/contract actions exist, but current interaction needs a tactile mid-operation skill and risk layer.

These are implementation observations, **not** proof that every reported symptom reproduces in every browser session. Establish reproducible end-to-end tests before replacing code.

## 3. One authoritative time and event scheduler (#77)

**Policy proposal for first prototype** (to validate in human playtests): 
- Modes: PAUSED (tactical planning), LIVE (normal world time), 4x, controlled FAST-FORWARD TO, and SLEEP UNTIL (duration or known event). An active game clearly displays speed, pause and current day/time; important gameplay decisions have an explicit cost.
- LIVE should make time perceptibly move, but avoid forcing text readers into reflex gameplay. Initial tuning candidate: 1 game minute per 1–2 real seconds when active, and automatic pause for blocking orientation/recovery/modal interactions. **Not final balance**.
- Inactive tab/closed app defaults to paused world time. No hidden real-time offline losses. Real time provides *advance requests* only, never direct state mutation.
- All jobs share a deterministic priority queue ordered by `(dueWorldMinute, phasePriority, stableSequence)`. One authority advances the clock and dispatches deadlines, resource reservations, build finishes, actor turns, contract offers, investigations, upkeep, retaliation and endings at the appropriate boundaries.
- Atomic event delivery: simulation event commit -> player-safe projection -> persistence -> optional visual/audio notifications. Presentation subscribers **never** independently advance time or decide truth.
- The scheduler supports capacity-limited jobs (CPU/RAM/machine availability), dependencies, cancellation, conflicts, interrupted work and interrupted sleep. Work can execute concurrently if resources permit; a command's time cost cannot be double-charged.
- Explicit tie policy must be documented and tested. A due-time death/ending stops all unelapsed events. First-ending-wins. Equal-time event order is stable across replay and reload.
- Long fast-forward is **chunked processing**, not skipped processing: after a bounded number of boundaries per frame, yield to UI, persist a resumable checkpoint and resume. Stop or auto-pause on player-relevant new events, especially threats, depleted budget, jobs requiring decisions, forced endings.
- Invariants: (a) one 14-day wait = fourteen 1-day waits = equivalent event-queue playback for fixed seed/actions; (b) no event fires twice; (c) no missed daily costs/contract deadlines/NPC turns; (d) after terminality nothing else occurs; (e) tab suspend/reload does not introduce extra elapsed world time; (f) progress UI accurately reflects jobs without revealing future hidden events.

### Worked gameplay example

Day 2, 21:00. Player queues a 70-minute fictional decrypt analysis and a 150-minute passive network survey, limited by their hardware capacity. They decide to **sleep 6 hours**.
- During minute +70 analysis completes and is available on wake; if it reveals a time-critical clue, sleep may interrupt according to player-configured notification priority.
- During a 360-minute ecosystem boundary, a rival finishes another action, authority case material is updated, offers/deadlines progress, and billing occurs on actual day boundaries.
- A defender countermeasure may degrade the running survey if it occurs first; the task must not silently succeed.
- The player wakes at the earliest relevant interruption or scheduled wake, reads a chronological **morning brief**, then chooses how to respond. Processing the same six hours in smaller chunks must yield the same authoritative result.

## 4. Start-of-run: identity + meaningful seeded scenarios (#78)

**Operator setup:** chosen unique in-run handle (not real name) + preview of scenario fiction + optional copyable seed + start. The name persists through run/history and can be changed only through explicit future mechanics, not as a free character stat. No class/skill bonus from handle.

Three starting scenario modes:
- **Canonical Underground:** preserve NIGHTSHADE/VESPER and authored world identities while varying nonessential topology/opportunities if desired; exact legacy compatibility contract explicit.
- **Fresh Scene:** weighted generated NPCs/organizations/network infrastructure/opportunities with reproducible identity graph.
- **High Pressure:** intentionally volatile *world composition* (more aggressive actors/shorter intel windows, not artificially inflated rank or blocked content).

Generator steps: seed -> archetypes -> actors+org identities -> ownership graph -> hardware/network/service topology -> hidden competencies+plans -> contracts/leads -> validation/repair -> starting player-safe knowledge. Use named RNG streams/salted stable IDs to avoid unrelated content changes reshuffling everything. Every seed passes id uniqueness, bound, opportunity reachability and solvability invariants; rank is never an input to attack/capability results.

## 5. Make hacking feel like player skill (#79, #83)

Operations are *spaces to reason in*, not buttons to execute. Fictional systems may include:
- Layered network exploration: map segments, identify visible assumptions, decide where to probe or bypass, respond to defenses.
- Evidence puzzles: connect inconsistent timestamps, message fragments, service observations and organization patterns.
- Abstract permission and trust puzzles: derive a pathway from observed credentials/context/relationships, with multiple non-linear solutions.
- Automation and toolsmithing: constrained in-game scripts/agents with resource budgets, visible logs, simulation tests and fallible execution.
- Stealth and counterplay: exposure footprints, timing windows, counter-investigation, decoys and retreat. Failure is legible but not omniscient.
- Defense/forensics and social leverage as alternatives to illegal/violent fantasy objectives.

Everything is fictional and self-contained; no attacks on real sites, service scanning, or actual exploit instructions required.

Use gameplay verbs such as **inspect, correlate, connect, reroute, simulate, verify, deploy, abort, compartmentalize**. A smart plan should sometimes beat expensive tools. Rank never grants access or boosts skill. AI suggestions may be wrong and require verification.

## 6. Roguelike identity (#80)

A run has escalating uncertainty, finite resources and the possibility of terminal loss or a deliberate vanish/retirement. Aim for the previously intended **short/hard 4–10-world-day feel**, but confirm via real interactive runs rather than impose arbitrary day limits. Hard consequences must arise from understandable systems; no unexplained coin-flip deaths.

Replayability comes from procedural **situations and relationships**, contrasting play styles and high-leverage choices. Meta progression may preserve lore/journal, new scenario types, cosmetics or opt-in challenge mutators — **never** permanent hacking damage, immunity, rank-based perks or statistical upgrades that invalidate skill.

## 7. A living society (#81)

NPCs have schedule, budget, motives, professional habits, alliances, memory, risk perception and competing operations. They act on each other and the player; rumors are incomplete and potentially wrong. Factions and organizations are part of the simulation rather than fixed text descriptions. Contacts can recommend, pressure, betray, trade, disappear or become rivals according to provenance; white/gray/black emerge from actions, no global morality meter. Player-safe surface only shows events that could plausibly reach the player.

## 8. Game-first presentation (#82)

Keep the OS, but make it feel **like equipment you manipulate**:
- a working evidence board, draggable associations, live tasks and workload, interactive network topology, physical desk props, visual operation feedback and sensory cues;
- a small readable temporal HUD, pressure indicators with uncertainty and an optional morning brief;
- meaningful animation when *something happens*, not endless ambient motion;
- terminal commands that are useful alternate controls over the same underlying operations rather than disconnected text shortcuts.

Don't remove precise information for aesthetics. Accessible keyboard paths, touch considerations, distro identities and reduced motion remain mandatory. UI work follows the playable prototype instead of preceding it.

## 9. References and principles (inspiration, not clone mandate)

- [Grey Hack](https://store.steampowered.com/app/605230/Grey_Hack/): systemic procedural machines, tooling and player freedom; borrow depth, **not** multiplayer dependency.
- [EXAPUNKS](https://zachtronics.itch.io/exapunks): bounded programmable puzzles with multiple valid solutions; borrow the joy of constructing a solution rather than merely owning a tool.
- [NITE Team 4](https://store.steampowered.com/app/544390/NITE_Team_4/): investigation/intelligence techniques, training and authored scenarios; borrow clear player tasks without military theme dependency.
- [hackmud](https://hackmud.com/): scripts, unpredictable digital economy and identity role-play; avoid requiring that level of programming from every novice.
- [Shadows of Doubt](https://store.steampowered.com/app/986130/Shadows_of_Doubt/): believable procedural personas, routines and evidence chains; use this for emergent causality.
- [Bitburner](https://github.com/bitburner-official/bitburner-src): scripts, resource budgets and world progression; **do not** import offline passive-grind progression or permanent stat inflation into a skill-first roguelike.

## 10. Roadmap and acceptance gates

| Gate | Issue | Meaning |
|---|---|---|
| G0 | #76 | gameplay audit, benchmarks, playable vertical-slice contract |
| G1 | #77 | deterministic visible clock, shared scheduler/queue, sleep and fast-forward |
| G2 | #78 | player handle, scenario setup, seeded worldgen |
| G3 | #79 | hands-on operational hacking gameplay |
| G4 | #80 | roguelike stakes, endings, reruns and meta boundaries |
| G5 | #81 | NPC/organization agendas and emergent consequence chains |
| G6 | #82 | interactive, embodied UI/UX guided by the vertical slice |
| G7 | #83 | research-selected procedural mechanics/content breadth |
| G8 | #84 | observed playtest proof, balance, deterministic/stress and game-ready sign-off |

**Execution order:** G0 then G1/G2 foundation; prove a focused G3 slice early; G4/G5 deepen its world; G6 delivers game feel as proven by that slice; G7 expands only reusable systems; G8 evaluates actual players and may reopen earlier gates. Parallel work allowed only with non-overlapping ownership and dependency tests.

**Stop condition:** a passing test suite and pretty UX do **not** imply a fun completed game. Until G8, describe Ghostrank accurately as *technically web-beta-capable, gameplay under active development*. Desktop host #19 remains deferred even though Phase 9 is complete.

**Workflow:** use GitHub connector; no competing branches; make tests deterministic; preserve historical saves and public rank rule; do not spend GitHub Actions minutes unless strictly needed.
