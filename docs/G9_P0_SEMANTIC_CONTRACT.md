# G9 P0 — Current Content Seams & First Semantic Contract

**Status:** implementation-boundary decision and source inventory (no runtime implementation in this document). **Issue:** [#136](https://github.com/MohamedXIV/ghostrank/issues/136). **Parent:** [#135](https://github.com/MohamedXIV/ghostrank/issues/135). **Baseline:** main `17480e9d9efb93b070f066822f5b3d3833089f03` (after G9 design PR #144).

This is the concrete handoff to #137–#140, **not** a second semantic engine. Authoritative design: [GAME_DNA.md](GAME_DNA.md), [SEMANTIC_SANDBOX_ARCHITECTURE.md](SEMANTIC_SANDBOX_ARCHITECTURE.md), [SEMANTIC_CONTENT_AUTHORING.md](SEMANTIC_CONTENT_AUTHORING.md).

## 1. Verified implementation seams

| Domain | Existing data or authoritative producer | What is hardcoded / missing |
| --- | --- | --- |
| Canonical roster | `src/content/world-content.ts` defines actors, targets and their machines/services, with ID/range/reference validation and instantiation | Authoring is catalog/roster data, not general semantic rules |
| Fresh Scene / High Pressure | `src/content/world-scenarios.ts`, `src/game/world-generation/generate-scenario.ts` provide weighted actor/target profiles, organizations, motives, scenario weights and seeded identities | Variations generate world entities, not re-usable conditional operations |
| Actor/organization ownership | `UndergroundActor.targetId/organizationId`, `TargetState.organizationId`, `UndergroundOrganization.motive/agenda/rivalIds` in `src/game/simulation/state/world-state.ts`; offerability and agenda logic in `systems/organizations.ts` | Membership, agenda and motive are **hidden truth**; do not expose through content previews |
| Contracts | `systems/underground.ts` creates offers, deadlines, completion and rewards; `systems/opportunities.ts` adjusts scenario weights/windows | Objective choice, due windows, required counts and `isObjectiveMet` are specialized branches |
| Evidence and operations | `WorldState.evidence` (`machine-presence`, `service-presence`, `target-profile`), `traces`, `targets`; `systems/underground.ts:isObjectiveMet` | No bounded facts/conditions API reusable by operations or NPC projects |
| NPC incidents and rumor | `systems/underground.ts:runActorTick/leakIncident`; `UndergroundIncident`, `UndergroundRumor`, `UndergroundMessage`; `SimulationEvent` types | A rumor's claim can disagree with hidden `accurate`; no generalized observer-scoped reasoning |
| World time / reactive behavior | `systems/underground.ts:advanceUnderground` (360-minute tick), `systems/world-schedule.ts` (scheduled jobs), CommandBus and typed events | No content-specific on-action subscriptions or validated effect registry |
| Presentation boundary | `projection/project-world.ts:projectUnderground` emits public feed, delivered messages and actionable offers, while redacting org agendas and rumor accuracy | No semantic content preview; it must consume similarly scoped, earned observations |

**Important distinction:** `systems/opportunities.ts` currently weights *contract offers*, not player-discovered, broker-free world opportunities. Do not count it as #140 done. Nightshade is a small consumer, not the content runtime.

### Existing four objectives — exact current predicate

All are validated by `systems/underground.ts:isObjectiveMet`, subject to CommandBus's accepted-contract status/deadline checks.

| Objective | Current evidence test | Current acceptance/deadline |
| --- | --- | --- |
| `recon-report` | Count live `service-presence` evidence IDs whose services actually belong to machines on the contracted target; threshold `requiredServices ?? 1` | Recon due **2 days** after acceptance |
| `infrastructure-map` | Count live `machine-presence` evidence IDs matching machines on the contracted target; threshold `requiredMachines ?? 1` | Map due **3 days** after acceptance |
| `quiet-recon` | At least one live, known target machine **and** an `operation-disengagement` trace on that target with stage `recon`, strictly after contract acceptance | Quiet recon due **2 days** after acceptance |
| `intrusion` | `operation-escalation` trace for contracted target strictly after acceptance | Intrusion due **4 days** after acceptance |

For recon-report/infrastructure-map the existing code does **not** require discovery evidence to be newer than contract acceptance; it only requires a non-retired record still matching the real target. **Do not accidentally impose an after-acceptance restriction during migration.** Both trace-based objectives require strict `trace.worldMinute > acceptedWorldMinute` (not `>=`). Offer windows (standard 24h, High Pressure 12h) and per-issuer/total open caps are separate from objective verification. Scenario weights and greed modifiers stay where they currently belong in the first migration.

## 2. Freeze the minimum semantic vocabulary for P1

The initial consumer is **infrastructure-map**. Prefer a narrow, type-safe vocabulary that directly maps its existing evidence semantics. This is the **agreed contract to implement**, not a claim types already exist.

- **Scope identity:** `player` is a singleton; `actor`, `organization`, `target`, `source` use durable IDs. Every binding resolves against the current `WorldState`; missing or wrong-kind IDs are explicit invalid/unknown results, not dynamic property reads. No institution scope yet.
- **Knowledge lenses:** `authority`, `player-known`, `observer-report(actorId)`. Authority alone can inspect truth; player-known can use earned and non-retired evidence; observer-report can see only reports that **actually reached** that observer. A reported claim is not automatically a verified fact.
- **First registered fact:** `player.known-active-target-machines` with a bound **target** ID and integer `min` (positive, bounded by target's existing machines). Use live `machine-presence` evidence and match IDs to that target's current machines exactly as legacy `isObjectiveMet` does. Return a tri-state `true | false | unknown` **plus reason**; `false` means the observable known count does not reach threshold, not proof the target lacks machines. Authority can resolve target existence and validation without presenting hidden machine identities to the caller.
- **Next registered facts only when demanded:** `player.known-active-target-services` (recon-report); `operation.recon-disengaged-after` (quiet-recon); `operation.escalated-after` (intrusion). Do not add generic dotted-key access, arbitrary JavaScript callbacks, universal math expressions, `exists` or relationship operators until a tested consumer requires them.
- **Combination rules:** typed `all` / `any` / `not` over registered predicates; three-valued logic (unknown survives negation; `all` false if a child is false; `any` true if a child is true). Bound recursion depth/term count to prevent malformed or expensive authoring. Reject cross-scope, invalid values and dangling IDs at the content compilation boundary.
- **Evidence semantics:** a `world.evidence` entry may be observationally authoritative *as player-earned evidence* without implying an NPC knows it. `retiredWorldMinute` makes the record unusable for the selected predicate. Fake AI analysis claims or rumor text cannot silently become `machine-presence` proof.
- **No rank facts:** neither player rank nor NPC rank is an eligibility/skill gate. Actual rank can still be a displayed consequence of existing contract rewards.

Minimal **finite** v1 vocabulary and typed binding proposal (implementation may choose discriminant names, but not weaken semantics):

```ts
type ScopeRef =
  | { kind: "player"; id: "player" }
  | { kind: "target" | "actor" | "organization" | "source"; id: string };

type KnowledgeLens =
  | { kind: "authority" }
  | { kind: "player-known" }
  | { kind: "observer-report"; actorId: string };

type Fact = {
  kind: "player.known-active-target-machines";
  target: Extract<ScopeRef, { kind: "target" }>;
  min: number;
};
type Condition =
  | { op: "fact"; fact: Fact }
  | { op: "all" | "any"; terms: Condition[] }
  | { op: "not"; term: Condition };
// Result: { value: true | false | "unknown"; reason: finite reason code }.
// Runtime source of truth stays in WorldState; no mirrored rule-state database.
```

**Authority caveat:** the first `player.known-active-target-machines` fact is specifically *a player's earned knowledge*, evaluated by trusted simulation code. It is not a generalized ability for an Ink/player client to enumerate secret targets or query foreign actors. Later actor-belief facts must use explicitly scoped delivered knowledge, not raw `rumor.accurate`.

## 3. Knowledge correctness: actual counterexample in today's schema

For a real incident `I`, `UndergroundRumor` can carry `claim = { actorId, counterpartId, outcome }` but hidden `accurate = false`. `UndergroundMessage(fromId, rumorId, ...)` can deliver that claim to the player. `projectUnderground` emits the **claim text fields** and relay, **not** `accurate`; the public feed includes only `incident.public`.

| Evaluator / observer | May conclude |
| --- | --- |
| `authority`, resolving `I` against the incident record | The recorded actual outcome, whether the rumor is accurate, and its cause |
| Player who got the message, without corroboration | “Contact X **reported** Y” (report exists), **not** “Y is true”; the claim might be false |
| Uninformed NPC who never received that report | **Unknown**, not “Y is false,” and never an unearned ability to act on Y |
| NPC who received and believed the false report | The belief/report may drive a **mistaken action** if modeled; it must not overwrite incident truth |

Current messages are specifically player-facing; generalized NPC report delivery/belief **does not already exist**. P1 must not synthesize omniscient NPC knowledge from a rumor present in `underground.rumors`. A viewer's lack of a report is unknown; it is not a false report.

## 4. First concrete authored definition (design-only)

This is a versioned, **second configurable instance** of the exact current infrastructure-map objective; it must work on canonical or generated target IDs without a new switch case. The compiler validates the bound target, positive count and knowledge lens before evaluation.

```ts
const mappingObjective = {
  id: "contract.infrastructure-map.v1",
  version: 1,
  kind: "contract-objective",
  issuer: { binding: "existing-offer.issuerId", scope: "actor" },
  subject: { binding: "existing-offer.targetId", scope: "target" },
  condition: {
    op: "fact",
    fact: {
      kind: "player.known-active-target-machines",
      target: { binding: "subject" },
      min: { binding: "contract.requiredMachines", default: 1 },
    },
  },
  knowledge: "player-known",
  source: "accepted-contract",
  earnedBy: "observed machine-presence evidence from target",
  outcome: "existing validated deliverContract command",
} as const;
```

The example above uses **authoring bindings**, not the literal runtime `ScopeRef` syntax: the resolver binds real actor/target IDs first, then validates a typed `Fact`. P1 should represent this without `eval` or arbitrary JSON paths. An offered contract may reveal issuer handle, organization *public name*, target handle, type and required count. It must **not** preview undiscovered machines, hidden organization agenda/motive, the target's secret owner or any hint derived from a rumor's `accurate` flag. GUI and terminal must share the same command and authorized projection.

## 5. On-action and effect seam (deferred runtime to #138)

Use `SimulationEvent` as the source of committed occurrences: `UndergroundActivity`, `RumorSpread`, `MessageDelivered`, `ContractOffered/Accepted/Delivered/Expired`, relationship effects, and actual operation traces. Some traces are state records rather than current event variants: **do not invent a completed event producer** where none exists. #138 must verify dispatch entry points before subscribing.

First **allowed domain effect families**, subject to validation by existing trusted functions: `contract.deliver` (CommandBus resolves evidence/reward), `relationship.adjust` (existing trust/fear/grudge mutation with a source), `world.schedule` (one authoritative scheduled job), and `knowledge.record` (verified observed evidence only). They are planned allowlist targets, **not currently a registered effect executor**. No `set(world, path, value)`, unrestricted callback, direct wallet deposit or narrative-triggered truth edit.

Ordering contract for #138: committed source occurrence ID + world minute + stable content definition ID + scope bindings; resolve eligible hooks deterministically at existing boundaries; validate before effects; dedupe/idempotence must survive current-run reload; stable tie order must preserve scheduler chronology and first-ending-wins; never re-run effect selection from React render or Ink text. Avoid extra global periodic scans or random state. Prove split/bulk advancement parity before adding subscriptions.

## 6. Cohesive module ownership

| Module | Owns | Does not own |
| --- | --- | --- |
| `src/content/**` | Authored rosters, scenario weights, meaningful content definitions | Trust/wallet mutations, knowledge leaks |
| `src/game/content/definitions.ts` (P1) | Bounded scope/fact/condition types, compile-time and ingest validation | Raw persistence, universal plugins |
| `src/game/content/conditions.ts` (P1) | Pure scoped evaluation over authoritative/adapted read functions | Mutating WorldState, React state, dialogue |
| `src/game/content/effects.ts` (P2) | Whitelisted registered effects through trusted commands/systems | Generic object-path writes |
| `src/game/content/opportunities.ts` (P4) | Broker-free discovery, expiry/cooldowns, event-sourced lifecycle | Reimplementing contracts |
| Existing simulation systems | World truth, clock, events, effects and evidence | Author-specific hardcoded scenario text |
| Existing projection and future `src/game/narrative/` | Earned visible state; Ink-safe narrative requests and typed intents | Hidden truth or autonomous mutation |

These filenames are **responsibility guidance**, not a command to create empty tiny files. Split the 1,409-line `underground.ts` and large CommandBus *only along proven seams*, not during P0 just to reduce line count.

## 7. Red/green test and rollout contract

P0 is an inventory and contract freeze. The first executable slice is **#137**, using focused tests before a behavior-preserving migration in #139:

1. **RED:** bound target A with two current `machine-presence` observations and required count 2 returns `true`; only one returns `false`. Test different target B's machine, retired record, duplicate evidence and missing target as rejected/unknown. Test `min <= 0`, invalid actor-as-target scope, unknown fact name and deep nesting.
2. **RED:** a forged player-known query for an undiscovered target cannot reveal its underlying machines, owner or ID set. A false rumor delivered to the player remains only a **reported** claim. An NPC without the report evaluates that rumor as **unknown**. Uncorroborated AI analysis is not observed evidence.
3. **GREEN #137:** implement a narrow pure evaluator and validation, no new game command, no save schema migration, no ranking input, no changed offer RNG.
4. **RED #139:** replace the `infrastructure-map` branch with the compiled fact and compare same contracts/worlds to existing `isObjectiveMet`; preserve legacy preaccept evidence counting, three-day deadline, issuance weights, trust/ledger/rank rewards and failure codes. Test two different `requiredMachines` values, canonical and Fresh Scene worlds, different seeds and one Nightshade-independent target.
5. **GREEN #139:** make one path authoritative; remove replaced case, **do not keep a hidden fallback**. Record golden deterministic event/order digests for unaffected idle/quiet worlds; check current save/replay, split vs bulk clock, expired/declined contracts and post-ending commands. Keep GUI and terminal on CommandBus.
6. **#138 and #140 acceptance:** test duplicate event delivery idempotence and actual NPC-caused/world-caused discovery with no issuer; report cause/visibility without ever disclosing hidden truth. No invented "second producer" just to check a box.
7. **Verification:** Node 24 focused/full tests, typecheck/lint/build; targeted Chromium when gameplay/presentation changes. Historical save migration is not a mandatory gate. Human novice playtest remains **NOT RUN** without a real observation.

**Out of scope for P0:** gameplay edits, speculative large-scale political simulation, implementing Ink, Web Worker, Rust/WASM, G3 P2 Log Forensics approval, new universal content machinery, or rewriting all contract objectives.
