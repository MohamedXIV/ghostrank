# G3 — Reusable Hacking Mechanics: Network Mapping Design

**Date:** 2026-10-10  
**Status:** Written design for human review; implementation design and code NOT approved.  
**Owner:** Game-First #75, G3 #79, initial work #105, PR #106.  
**Approved direction:** D072 gameplay pillars and D073 mission-agnostic hacking architecture.  
**Baseline:** D071 Nightshade (`nightshade-v1`) is an authored introductory/testing scenario, not an independent game or mechanic engine. No new gameplay or human-playtest PASS is claimed.

## 1. Product intent and scope

Players interact with real-feeling but completely fictional computing concepts by **observing, forming hypotheses, choosing risks, executing tests, and responding to consequences**. The player does not click a generic Hack button, pass a ranked skill check, or need professional cybersecurity knowledge. Mini-games are reusable **verbs inside the simulated world**, not menu-launched arcade games or mandatory stages of each mission.

**Crucial ownership decision:** Network Mapping, Packet Analysis, Log Forensics, Access/Trust, Untrusted Drop/Sandbox Triage and Camera Investigation belong to *shared systems*. Authored contracts, generated incidents, rival counter-hacks and personal defense supply different data and consequences. **Nightshade is the first consumer and teaching example only.**

**First deliverable:** one Network Mapping / Signal Path mechanic, tested against **two genuinely different target contexts**, with Nightshade as one. The other four candidate mini-games do not ship in P1. Full generalized puzzle infrastructure, Phaser camera feeds, room free roam, travel, Tauri and art-style selection are out of scope.

## 2. Alternatives and chosen architecture

**Rejected: mandatory five-step puzzle chain.** Forces players to repeat irrelevant mini-games and undermines alternative strategies.

**Rejected: isolated puzzle modal with mission-specific data and rules.** Cheap initially but becomes five parallel scripted games without causal world relationships.

**Chosen: a narrow reusable network/evidence capability** that operates on the existing authoritative `WorldState` and `CommandBus`. Network Explorer presents it visually; terminal commands control the **same** capability. Scenario adapters supply fictional topology, timed clue sources, objectives and optional narrative overlays, but no alternate route solver. Do not overbuild a universal challenge plugin framework in the first slice.

```text
Authoritative world: networks, machines, services, time, NPCs, evidence
                             |
           Reusable Network Mapping capability
              route reasoning + commit outcome
                             |
                     CommandBus / events
                             |
                     player-safe projection
                  /                            \
        Network Explorer GUI                Terminal
                  \                            /
           optional Nightshade / generated encounter context
```

**Four responsibility layers:**
1. **World domain** — existing target/machine/service identity, player-known evidence, scheduler, trace, contracts, aftermath, persistence and first-ending-wins.
2. **Mechanic** — validates a network-route challenge, possible player deductions, costs, refutations and results using generic target/challenge IDs. It must not import Nightshade.
3. **Provider / scenario adapter** — instantiates authored or seeded data, exposes clue provenance, chooses goals and NPC timing; can be removed without destroying the mechanic.
4. **Presentation** — reusable Recon/Network Explorer map, keyboard/touch controls and discoverable terminal commands; never independently decides truth.

## 3. Concrete generic route mechanic

A challenge describes an entry machine, an unknown objective machine, candidate logical links and two or more **fictional properties** that may constrain a route. Initial tutorial example: three candidate links with carrier `public`/`sealed` and echo `circle`/`triangle`. The solution is the link matching both **player-discovered** requirements; no universal correct label.

Logical route candidates are not extra machine/service inventory entries; they must not silently alter existing contract `requiredMachines`. A drawn candidate means **hypothesis**, not an observed vault. Unknown destinations remain unresolved in UI.

**Data contract (illustrative, precise names finalized in the reviewed plan):**

```ts
type NetworkRouteCandidate = {
  id: string;
  label: string;
  carrier: "public" | "sealed";
  echo: "circle" | "triangle";
};

type NetworkRouteChallenge = {
  id: string;
  targetId: string;
  entryMachineId: string;
  objectiveMachineId: string;
  candidates: NetworkRouteCandidate[];
  constraints: { carrier: string; echo: string }; // hidden until earned
  baseMinutes: number;
  traceWeight: number;
};

type TestNetworkRouteCommand = {
  type: "testNetworkRoute";
  targetId: string;
  challengeId: string;
  routeId: string;
};
```

The current `OperationState` has `targetId`, but no stable `operationId`. Consequently the first generic command uses target/challenge identity and verifies that the player's active operation targets the same network; adding fake operation IDs is unnecessary. More complex challenges later may have different properties, node counts and paths without changing the CommandBus authority.

**Player-visible actions:** inspect route/candidate/clue, zoom or switch textual view, select a tentative path and preview at no world-time cost. Commit a candidate through `testNetworkRoute`, with explicit confirmation and authoritative world-time/trace accounting.

**Initial balance example:** a valid executed test costs **four base world minutes plus one low trace**. It is a design-tuning value, not universal Network Mapping difficulty or a rule every target must inherit. The simulator and preview use the same computation. Correct hypothesis adds appropriately sourced, live machine-presence evidence; a wrong one records an epoch-scoped refutation and readable symptom, preserves partial knowledge, and pays its cost. Duplicate same-epoch attempts are rejected without charge. No guessed result from UI, no generic percent-success roll, no rank/level gate, no free revelation of the right answer.

An incomplete map stays useful after a failed test, retreat, save/reload or expiry; neither a failed hypothesis nor a pretty graph creates mission completion or a payout.

## 4. Scenario independence — two required consumers

**Consumer A: Nightshade teaching slice.** An authored Outer Relay (`ns-relay`) yields a manifest hint about the required carrier. The `ns-signal` broker offers a second clue at the existing 360-minute boundary (**quiet**) or the player gains a related clue from a confirmed intrusive probe (**fast but high trace**). The player combines them and chooses a route to `ns-vault`. Reading the broker or escalating **must not automatically grant the vault** in the new teaching variant. D071's owner review may rotate the route and retire stale evidence. This is an adapter from existing Nightshade fiction/timing to ordinary network-domain observations.

**Consumer B: separate genuine non-Nightshade context.** The SAME mechanic runs for a **different target** with distinct actual machine/service IDs, route labels, clue sources, ordering and correct path. Prefer an eligible G2 Fresh Scene/generated target where a solver-valid route can be derived without modifying NPC RNG. If the first generated topology cannot support a route challenge, it must not attach an impossible puzzle; a second independent authored target is acceptable only if its own data and consequences prove genuine reuse, with G2 integration explicitly deferred. Merely renaming the Nightshade IDs in a clone **fails** the reuse test.

**No universal gating:** targets and contracts without this challenge continue working normally. Network Mapping is a way to acquire valid evidence for applicable situations, not mandatory for every network or every contract. Players may complete other objectives through social intel, defense, logs or indirect paths. An optional challenge never retroactively locks previously accessible targets.

**Content flexibility:** one provider can be for defending the player's rig, another for a morally grey contract, a third for helping a victim. Their narrative, evidence provenance and NPC response differ; core route comparison rules do not.

## 5. Clock, defense, saves and trustworthy projections

**World-time ownership:** `CommandBus` advances the deterministic clock and resolves due events in existing priority order. Real-world thinking and accessible clue reading do not advance time while the player is in a blocking modal. No React, Phaser or terminal path modifies truth independently.

**Risk and response:** use ordinary trace/provenance and existing NPC reaction logic. Nightshade's watch threshold 5, burn 8 and owner rotation remain properties of that example, not numbers baked into generic Network Mapping. Another target's reaction follows its own standing/world rules.

**Boundary race:** a route test that crosses a network-rotation boundary cannot confirm an obsolete route. Apply authoritative timed defender events first; retain the spent minutes, do not invent an extra route trace if the attempt was invalidated before it executed, and give the player a causal message. First-ending-wins prevents post-terminal success.

**Persistence:** introduce small optional, validated generic challenge/observation/test records in world data, not a `NightshadeSliceState.routePuzzle` mechanic. Keep definition, current epoch, refuted candidates and confirmed evidence source unambiguous without duplicate truth. Seeded layout variation uses its own stable derivation: identical seed + commands + clock + save/reload means identical outcome. Strictly reject malformed new payloads.

**Legacy compatibility:** existing saved `nightshade-v1` plays exactly as before, including its direct survey/escalation discoveries, existing six outcomes and measured D071 trace. New Nightshade teaching runs may use versioned story-adapter rules, but store only scenario-specific storyline/clue timing there; **route evaluation and route history are generic**. Worlds without opt-in challenge records, canonical/quiet idle baselines and earlier saved G2 worlds remain unchanged.

**Projection:** candidate vs inferred vs observed vs confirmed vs stale must be distinguishable non-color ways. Only legitimately acquired route observations are projected; never expose hidden correct path, future rotated truth, an authoritative result boolean before commitment, unknown machines by revealing their IDs, or NPC internal intent.

**GUI and terminal:** same typed domain command, cost preview, result, rejection, evidence and world time. Recon Network Explorer is the home of the mechanic; Nightshade briefing may deep-link to it, never implement its own route solver. Terminal read-only map/inspect/preview and committing test commands are discoverable and functional without GUI.

## 6. Acceptance matrix

All below are **future implementation tests, NOT RUN by this doc-only PR**:

1. Generic route solver has zero Nightshade imports, target-name branches or slice-specific state dependencies; two distinct consumers use identical code.
2. Nightshade new variant: two legitimate clues plus committed inference required; quiet and intrusive sources differ meaningfully in time, trace and owner reaction; wrong answer remains recoverable; expired/partial map does not pay.
3. Second eligible non-Nightshade target has its own IDs, sources, layout and outcome; can be solved/retested using the same command and projection. If no generated scenario qualifies, fallback to independent authored example and record generated support as an unmet follow-up, not as PASS.
4. No opt-in challenge: unchanged freeform observe/survey/inspect/deliver paths. Existing `nightshade-v1` saves and D071 goldens maintain byte-identical behavior; all unrelated run digests are stable.
5. Wrong/repeated/outdated/unobserved route outcomes have specific bounded costs, explainable hints and no hidden truth leaks; save/reload and split-vs-bulk time advances agree.
6. NPC review invalidates appropriate evidence while preserving provenance; boundary race cannot grant stale evidence; ended runs cannot mutate.
7. Fixed-seed sweep 1–120 for eligible generated challenges proves validity, reproducibility and more than one layout; other generated worlds remain solvable without challenge.
8. Terminal vs GUI, desktop and 390px mobile, keyboard/touch, screen reader, reduced motion and modal hold test identical authoritative behavior, with no graphic revealing unknown links.
9. Player rank and target rank never enter correctness, eligibility or costs; no real network access or host commands.
10. **Human observation NOT RUN:** novice can explain a solved route in 1–3 active minutes, distinguish safe waiting vs intrusive risk, recover from a mistake and recognize the same Network Explorer mechanic against another target. One unaided 20–30-minute G3 playtest required; browser automation is not a substitute.

**A Nightshade-only playable puzzle with generic function names fails this spec.** A screenshot-only graph likewise fails.

## 7. Increment order, design gate and deferred systems

**Architecture direction approved by user:** mission-agnostic hacking mechanics, Nightshade as an example only (D073). **This rewritten written spec still needs the user's review**; its concrete interfaces, balance values and second-consumer wiring are proposals.

After written-spec approval, use Superpowers `writing-plans` to define exact files/interfaces and test-first tasks; have the plan reviewed separately; only then implement code. Start with generic network state/rules and two independent consumers; add GUI/terminal atop that authority. Node 24 local verification preferred, no unnecessary GitHub Actions. Do not close #79/#105 or mark human gates passed.

Later independent, reusable mechanics: Packet Analysis, Log Forensics, Access/Trust, Untrusted Drop/Sandbox Triage and Phaser-rendered Camera Investigation. Each needs a separate design/acceptance step; don't build all five together. Art style, full isometric room, city travel and Tauri remain deferred.
