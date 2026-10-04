import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import type { ModelListing } from "@/content/model-catalog";

/**
 * NPC AI use is the Phase 5 P4 half of the promise that "AI is part of the
 * ecosystem, not a player-exclusive superpower" (`docs/AI_SYSTEMS.md`, "NPC
 * use"). The peers already act on their own each ecosystem tick; this module
 * gives the ones that *run a model* what the model gives them — and, because
 * every model here is fallible, what it costs them. It reads the same catalog
 * `properties` the player's assistant reads (reasoning, reliability) so a
 * peer's frontier class genuinely behaves better than a peer's cheap salvaged
 * core, and the design's "make AI-assisted mistakes" is not flavour but math.
 *
 * The whole thing is a pure function of state, keyed by the tick the way every
 * other ecosystem roll is: deterministic, split-invariant, save-replayable. And
 * it is a hidden-truth input to the NPC-vs-NPC roll only — it never touches the
 * player's standing, never gates anything, and an actor with no model returns
 * exactly the untouched pre-P4 deltas (0, 0), so every ecosystem world without
 * assisted peers re-runs byte-for-byte as before.
 *
 * Two effects, both honest to the failure modes `docs/AI_SYSTEMS.md` names:
 *
 * - **a lift that is only ever a lift** — a competent read adds to the actor's
 *   *offence* for the tick (never subtracts on the success branch), so an
 *   assisted peer is genuinely better at acting, mirroring how an assistant
 *   helps the player;
 * - **the mistake is the point** — the weaker the model's reliability, the more
 *   often that same tick goes wrong instead: the assistant misreads the target,
 *   so the actor is *worse* off that tick and sloppier about hiding it
 *   (`discretion` drops), which pushes the incident toward the public feed.
 *   This is the ecosystem's version of a defective build or an overconfident
 *   claim — AI-assisted action that backfires.
 */

export interface NpcAssistDeltas {
  /** Added to the actor's skill for this tick's roll. */
  skillDelta: number;
  /** Added to the actor's discretion for this tick (negative → more public). */
  discretionDelta: number;
}

const NO_ASSIST: NpcAssistDeltas = { skillDelta: 0, discretionDelta: 0 };

/**
 * How much a running model's `reasoning` band lifts an actor's offence. A
 * frontier (5) plans far better than a salvaged core (2); small enough that a
 * lift is a nudge, not an override of the actor's own skill.
 */
function assistSkill(reasoning: number): number {
  const band = Math.max(1, Math.min(5, Math.round(reasoning)));

  return band - 2;
}

/**
 * The odds that this tick's assist goes wrong, from `reliability`. Bounded away
 * from both certainties — a reliable model still slips sometimes (1/12 at band
 * 5), an unreliable one still works most of the time (5/12 at band 1) — the
 * same "fallible, never deterministic" rule the player's own assistant obeys.
 */
function mistakeOdds(reliability: number): number {
  const band = Math.max(1, Math.min(5, Math.round(reliability)));

  return (6 - band) / 12;
}

/**
 * The skill penalty and sloppiness an AI-assisted mistake costs the actor this
 * tick. Bounded so a mistake makes an incident likelier to fail and to surface,
 * never an impossible one — an assisted peer having a bad day is texture, not a
 * self-destruct switch.
 */
const MISTAKE_SKILL_PENALTY = -4;
const MISTAKE_DISCRETION_PENALTY = -18;

/**
 * The deltas a model running on an actor applies to one ecosystem tick. Returns
 * the untouched `{ 0, 0 }` when there is no model (or a stale id resolves to
 * nothing in the catalog), which is what keeps a pre-P4 world byte-identical.
 * The mistake branch is drawn from its own salted hash so a boosted, reliable
 * peer rarely stumbles while a salvaged, unreliable one does often — and both
 * stay a pure function of seed, tick, and actor.
 */
export function npcAssistDeltas(
  seed: number,
  tickIndex: number,
  actorId: string,
  model: ModelListing | undefined,
): NpcAssistDeltas {
  if (!model) {
    return NO_ASSIST;
  }

  const misses =
    hashUnit(seed, "npc-assist", tickIndex, actorId, model.id) <
    mistakeOdds(model.properties.reliability);

  if (misses) {
    return {
      skillDelta: MISTAKE_SKILL_PENALTY,
      discretionDelta: MISTAKE_DISCRETION_PENALTY,
    };
  }

  return {
    skillDelta: assistSkill(model.properties.reasoning),
    discretionDelta: 0,
  };
}
