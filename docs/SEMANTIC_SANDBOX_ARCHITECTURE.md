# Semantic Sandbox & Content Architecture — G9

**Status:** G9 P0–P4 merged; P5 PR #150 adds bounded versioned Ink narrative for NPC conversations and brokerless lead decisions. Institutional-scale story arcs are not yet shipped. **Epic:** #135; slices #136–#143. Inspired by Paradox/Clausewitz/Jomini *design patterns*, not a claim of cloning their internal engine.

## 0. Current baseline versus new work

**Exists today:** deterministic WorldState, CommandBus, SimulationEvent union, world-time and 360-minute ecosystem ticks, generated G2 scene presets, actors/organizations/relationships, evidence/traces/probes, authored catalog rosters validated at ingest, four existing contract objective kinds (one now evaluated through a compiled G9 content condition), player-safe projections, G3 reusable Network Mapping with Nightshade and a generated scene.

**Implemented to date:** bounded typed fact/scopes and three-valued knowledge lenses (G9 P1 #137); a finite, explicitly activated `ContractAccepted` → world-owned delayed effect proof (G9 P2 #138 / PR #147), with source revalidation, resource checks, save receipts and deterministic scheduler phase. P3 uses the P1 engine for the real `infrastructure-map` objective, removing its legacy objective-specific branch without touching the other three.

**Still not implemented:** a general reusable authored event library or universal rule engine; self-initiated world opportunity lifecycle; institutional/national consequence domain; Ink/inkjs runtime. The design here must not be cited as shipped code or as approval for G3 P2.

## 1. Ownership and layering

~~~text
Authored packs (TS data now; external validated manifests later, optional)
    -> schema validation, versioned IDs and reference checks
    -> compiled content definitions / bounded rule index
    -> selector over authoritative world facts, scoped actor beliefs
          and earned/player-known observations
    -> authoritative trigger/effect execution via simulation/CommandBus
    -> events + stable causality, world clock, durable current-run state
    -> redacted player-safe projection
    -> OS/terminal/Ink/Phaser (read and request typed commands only)
~~~

Content definitions are **data**, not unrestricted executable functions. Keep current catalogs where they work; do not migrate hardware, UI content or every existing system just to make a universal registry. Move one *real* gameplay consumer first.

## 2. Bounded semantic primitives (illustrative shapes)

~~~ts
type ScopeRef =
  | { kind: "actor"; id: string }
  | { kind: "organization"; id: string }
  | { kind: "target"; id: string }
  | { kind: "source"; id: string }
  | { kind: "player"; id: "player" };
// Extend to "institution" only after a real modeled use case.

type KnowledgeLens =
  | { kind: "authority" }
  | { kind: "belief"; observer: ScopeRef }  // potentially false or unknown
  | { kind: "player-known" };               // verified + reported metadata only

type Condition =
  | { op: "all" | "any"; terms: Condition[] }
  | { op: "not"; term: Condition }
  | { op: "fact"; scope: ScopeRef; key: string; value?: unknown }
  | { op: "relation"; subject: ScopeRef; predicate: string; object: ScopeRef }
  | { op: "compare"; fact: string; operator: "gte" | "lte" | "eq"; value: number };
// Extend exists, count and time windows only with an implementation consumer.

type AuthoredOutcome = {
  type: string;            // registered, finite domain effect
  arguments: unknown;      // validated discriminated schema
};
// These are DISCUSSION SHAPES, not checked-in types or an approved wire API.
~~~

In actual implementation, eliminate free-form key lookup: use discriminated types and registered validated fact/effect names. The evaluator distinguishes **true / false / unknown** for a knowledge lens; unknown is never treated as authoritative false. Prevent evaluation of secret actor attribution from a player-safe caller. Missing targets, stale sources, invalid references and future facts are explicit rejection/unknown outcomes, not silent success.

## 3. Provenance and epistemic rules

Source-of-truth WorldState retains events with actor, affected entities, minute, causal source/incident IDs, visibility/expiry where applicable. An NPC may act on a mistaken report; a player's panel may show that a report exists without confirming its claim. Publication/rumor distribution gates which NPC could hear of the event. New events do not retroactively make earlier uninformed decisions omniscient.

**Three assertions are separate:**
1. What actually happened in simulation.
2. What an observer believes, and from which report/experience.
3. What the player has legitimately earned or read.

Never persist a parallel truth flag if the existing authoritative record suffices. Never expose a secret through Ink globals, a content preview, terminal output or GUI markup. Include contradictory-source and delayed-publication tests.

## 4. World-scope content and lifecycle

Definitions should be able to describe:
- Contract template (issuer, offer window, objective, payout/response).
- Operation opportunity (discovery path, start/ignore/exit, no issuer required).
- Autonomous NPC project (initiator, goal, budget, schedule, target choice).
- Event/reaction hook (eligible event kind, scoped binding, conditions, cooldown, effects).
- Story arc (event-driven state and narrative milestones, not a global quest-state machine).

**Lifecycle:** stable content id/version -> event or due pulse -> bind scope references to real IDs -> validate eligibility and source visibility -> choose deterministic weighted candidates -> dispatch typed authorized command/effect -> emit provenance -> schedule any follow-up against the same clock -> retire/expire/cooldown -> expose player-known consequences only.

Content discovery does not automatically accept a contract. Story success derives from evidence and recorded operations, not the Ink line or designer's chosen outcome. Rate control must include de-duplication, bounded open opportunities, occurrence limits, expiry/cooldowns, and repeat variations that do more than rename an actor.

## 5. Authoritative commands, scheduling and effects

Reuse existing domain functions for outcomes: relationship adjustments, transfers, trace/incident records, NPC agendas and actual system consequences. Register narrow effect handlers and domain commands rather than mapping arbitrary JSON into mutable WorldState. No untrusted JS eval, Function, arbitrary object paths, writable Ink globals into truth, or hidden host/network access.

Content selection reacts to **specific committed events or existing fixed world-time boundaries**; no per-frame all-content scan, no extra independent clock. If a long action crosses a 360-minute ecosystem boundary, existing chronology wins; check resource/final-state constraints and apply exactly once. Namespaced stable IDs and deterministic salts prevent unrelated content packs from perturbing NPC random streams. Ordering and tie breaking are explicit; save/resume and split/bulk time must converge.

Use an explicit mutation/effect execution ledger only where it carries irreversible state not derivable from events; do not create competing authoritative copies. First-ending-wins and forbidden-after-ending behaviors apply to every sourced reaction.

## 6. Ink/inkjs integration boundary

- Ink **may** render characters, chat, briefings, conflicting witness accounts, rumors, documents, negotiations and branching reactions.
- Narrative adapter receives an explicitly **player-safe snapshot** and opaque story/choice IDs. Never hand it raw WorldState.
- An Ink choice yields a typed, versioned **intent**, NOT a mutation. A command handler rechecks authority, deadline, evidence/cost and current NPC/world facts at commitment time.
- Rejection gives honest player-readable feedback; any displayed price/risk uses an authoritative preview contract.
- Persist the minimum narrative cursor/visited choices/version needed for current-run deterministic replay. Freeze/resolution policy if a story pack changes during an active run; no historical migration treadmill.
- UI and terminal use shared choice outcomes where a choice is actionable; dialogue alone remains presentation and cannot make the world stop.
- Injected Ink variables, story tags and files must never expose hidden actor identities, upcoming actions, secret solution truth, or arbitrary host APIs.

## 7. Scale and source layout

**No complete Clausewitz rewrite.** An actor only needs full detailed simulation if its behavior meaningfully affects the run; anonymous background activity can be aggregated by a domain system if/when demanded by measured load. Weighted agendas remain legible. Re-evaluate affected opportunity families on relevant events/pulses; add dependency indexes, caches and finer simulation LOD only after profiling and proving determinism.

**Cohesive modular monolith:**
~~~text
src/game/content/
  definitions.ts       # contracts and validated scope/effect vocabulary
  conditions.ts        # pure scoped evaluator
  effects.ts           # authorized dispatch / handler composition
  opportunities.ts     # lifecycle over existing world facts
  content.test.ts      # first focused consumer + negative tests
src/game/narrative/
  ink-adapter.ts        # context + guarded intent bridge
  narrative-context.ts
src/content/operations/  # content grouped by domain/story, not file per string
src/content/narrative/   # Ink assets + versioned metadata
~~~
This tree is an **illustrative starting point**, not a mandated file count. Co-locate cohesive code, split when responsibilities or test ownership diverge, and avoid a 1,000+ line catch-all. No new plugin registry or ECS is required to author a small leak.

**Worker boundary:** keep pure simulation and runtime adapter independent from React/DOM/storage. Permit async message-based command/projection interfaces; optionally move authority to a **single TypeScript Web Worker** after correctness and UI benefit are clear. Serialized command order, save handoff and event projection must remain atomic and deterministic. **No Rust/WASM** by default.

## 8. Incremental migration and gates

- **#136 P0:** complete — concrete code seam audit, first migration contract.
- **#137 P1:** complete — bounded typed fact/condition evaluator and epistemic lenses.
- **#138 P2:** first executable opt-in on-action/effect response through authoritative clock, source identity, and current-run receipt (PR #147); not a playable standalone mechanic.
- **#139 P3:** first real `infrastructure-map` objective migrated from specialized branch to validated definition + shared evaluator (PR #148); current rewards, issuance and timing unchanged.
- **#140 P4:** first broker-free lead from public NPC activity OR an actually read NPC rumor; earned host mapping, divergent disclosure/trade/exploit/ignore, cooldown/expiry and player-safe projection (PR #149).
- **#141 P5:** Ink adapter used by real content, not a mock GUI.
- **#142 P6:** meaningful multi-party fictional institutional leak arc; add only necessary domains.
- **#143 P7:** developer why/why-not diagnostics, seeded variation, speed, Worker-ready interface; performance work only when measured.

**Per slice:** failing focused tests first; fixed-seed determinism, forged reference/secret denial, rank independence, replay/save/current-run schema, chronology on system ticks, no actions after ending, GUI/terminal parity where applicable. Node24 full tests/typecheck/lint/build and targeted real Chromium where UI changes. An automated smoke is never a human playtest. Existing G3 P2 #110 and draft PR #116 are NOT approved by this initiative.

See GAME_DNA.md for gameplay aims and SEMANTIC_CONTENT_AUTHORING.md for authored examples.
