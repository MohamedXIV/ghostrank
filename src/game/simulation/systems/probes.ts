import { npcAssistDeltas } from "@/game/simulation/systems/npc-ai";
import { findModelItem } from "@/content/model-catalog";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { derivePresence } from "@/game/simulation/systems/location";
import { deriveLongRunPressure } from "@/game/simulation/systems/long-run-pressure";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  PLAYER_ACTOR_ID,
  type OperationTrace,
  type RivalProbe,
  type RivalProbeArtifactKind,
  type RivalProbeSubject,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 6 P2 — rival probes: automation aimed at the player. This is #23's
 * deferred handoff and the **third seat** of the assist math. Phase 5 P4 read
 * `npcAssistDeltas` twice — a peer acting (offence) and a peer guarding its own
 * logs (defence). `docs/AI_SYSTEMS.md` lists "use automation to watch the
 * player" under "NPC use"; that promise is not fulfilled until someone points
 * an assistant at *the player*, and that is this module. The same primitive,
 * the same salting, the same failure mode: an AI-assisted prober makes
 * AI-assisted mistakes, and here one of those mistakes lands on you as a read
 * that is confidently wrong.
 *
 * `docs/superpowers/plans/2026-10-04-phase-6-plan.md` describes the deliverable
 * precisely: a probe "lifts *the prober's* knowledge of the player's
 * infrastructure standing (hidden truth, persisted, unprojected)" and "leaks a
 * signal the player can observe", with counterplay named outright — "a player
 * who lays low, changes relays, or relocates raises the odds the read is
 * wrong." Every constant below exists to make that sentence mechanically true.
 *
 * Four things shape the math:
 *
 * - **Interest is social, never reputational.** A peer looks at you because of
 *   the *grudge* it holds (P1's provocation ladder, Phase 3's incidents) and
 *   because your work was distinctive enough to have a shape. `player.rank` is
 *   not an input to a candidate test, an attempt roll, an accuracy term, or an
 *   artifact: the same history at rank 1 and rank 999_999 is probed by the same
 *   peers at the same minutes with the same reads. Rank is what the scene
 *   *talks* about; footprint is what a rival can get their teeth into. This is
 *   the phase's central prohibition, tested as an equality.
 * - **Every accuracy term is derived from truth the player controls**, at the
 *   tick, and nothing else: how loud their footprint band is, the `anonymity`
 *   band of the dwelling they actually hold (D031 shipped that band with nothing
 *   consuming it — this is the consumer P0 promised), whether their exits have
 *   been quiet or escalatory (the sim's only vocabulary for "changes relays"),
 *   and whether an intrusive operation is open right now. A careful player is
 *   genuinely harder to read; a sloppy one is genuinely easier.
 * - **The read is a durable fact about a named rival's belief, not a hidden
 *   scalar.** There is no per-actor knowledge number to desync or to farm: the
 *   `RivalProbe` record *is* the lift — who looked, which seat of your
 *   infrastructure they aimed at, whether they got it right, and when. That is
 *   exactly what P3 needs to target you with a rival who has done their
 *   homework, and what a wrongly-informed rival looks like when they haven't
 *   (`correct: false` is stored as false, so P3 can be fooled for real).
 * - **What you can see is the tell, not the read.** You cannot observe someone
 *   else's belief, so the projection carries the leaked artifact instead — a
 *   ping on a port you were not listening on, or a contact who has gone quiet
 *   because a rival leaned on them. Never the prober's handle, never whether
 *   they were right: P1's doctrine again (evidence with a minute attached, no
 *   percentage, no countdown).
 *
 * Placement is a deliberate constraint, not a detail: `probeTick` is called from
 * inside `advanceUnderground`'s existing tick loop. A probe is an ecosystem
 * *action*, so it gets the tick index from the loop that already computes it,
 * runs in the same boundary order as every other ecosystem action, and needs no
 * second clock cursor on the save. Every boundary a wait crosses produces its
 * probe opportunity, so the record does not depend on how the player split the
 * wait (D054). Unlike P1's derived case material, a probe is an action rather
 * than a reading of the record, and the difference between the two is D032's point.
 */

/**
 * How much grudge makes a peer spend effort on you. Deliberately below the smear
 * ladder's 30: curiosity is cheap, retaliation is expensive, and the escalation
 * ladder stays P3's to own. Below this there are no candidates at all, which is
 * what makes an unprovoke-able world byte-identical to the pre-P2 baseline.
 */
export const PROBE_MIN_GRUDGE = 5;

/** Percent chance an interested peer tries on a given ecosystem tick. */
export const PROBE_TICK_PERCENT = 14;

/**
 * The base chance a read is right, before exposure, counterplay, and the
 * assistant. Under a coin flip on purpose: the scene is noisy, and a rival needs
 * something distinctive to work with before they learn anything about you.
 */
export const PROBE_BASE_PERCENT = 36;

/**
 * Read-difficulty by footprint band. The bands are `FootprintLevel`'s own names
 * — the coarse judgement the player can already reason about, not the raw score,
 * so a rival cannot see a number you cannot infer. Loud work is distinctive
 * work; quiet work blends into a scene where everyone is up to something.
 */
export const PROBE_EXPOSURE_ADJUST: Record<string, number> = {
  none: -24,
  low: -12,
  elevated: 0,
  severe: 10,
};

/**
 * The counterplay terms. Each one is a thing the player *did* or *bought*, so
 * the docs' counterplay line is a mechanic rather than flavour:
 *
 * - a quieter dwelling is harder to find, and the ladder is monotone
 *   (public → quiet → hidden), which a test pins as an inequality;
 * - quiet exits outnumbering escalations means your habits have no signature for
 *   a model to fit — the sim's only vocabulary for the design's "changes relays";
 * - an intrusively open operation is the loudest thing you can be doing.
 */
export const PROBE_ANONYMITY_ADJUST: Record<string, number> = {
  public: 0,
  quiet: -10,
  hidden: -18,
};
export const PROBE_QUIET_HABIT_ADJUST = -8;
export const PROBE_ACTIVE_INTRUSION_ADJUST = 10;

/**
 * How strongly the assistant moves a read, and the reason the handoff is real
 * math. `skillDelta` is positive for a good planning read (which raises
 * accuracy) and negative for an AI-assisted mistake (which lowers it) — so the
 * single `npcAssistDeltas` primitive decides both directions, and a frontier
 * class helps more than a salvaged core, exactly as it does for the offence and
 * defence seats. The extra penalty on the mistake branch is the interesting
 * side: a model that misreads a pattern does so *with confidence*, so an
 * AI-assisted miss is worse than no assistant at all, which is the failure mode
 * `docs/AI_SYSTEMS.md` names and the one a player can exploit.
 */
export const PROBE_ASSIST_QUALITY_PER_POINT = 3;
export const PROBE_MISTAKE_PENALTY = 12;

/**
 * Bounded away from both certainties, like every other assist in the game: a
 * rival with a great model watching your loud, public rig still misses
 * sometimes, and a careless one reading your hidden outskirts still lands
 * sometimes. "Fallible, never deterministic" (D030's own words) binds the
 * threat systems exactly as hard as it binds the player's own assistant (D028).
 */
export const PROBE_MIN_CORRECT_PERCENT = 8;
export const PROBE_MAX_CORRECT_PERCENT = 78;

/**
 * The infrastructure seats a rival can point an assistant at. Three names, and
 * each one has exactly one observable consequence (see `probeArtifactOf`), which
 * is why the seat is the stored fact and the tell is derived: a second field
 * would be a second source of truth for the same event (D031's rule).
 *
 * - `rig` — your compute and its footprint on the network;
 * - `dwelling` — where you physically are, which is P0's subject finally being
 *   looked at from the outside;
 * - `habits` — how you work: relays, timings, who you talk to.
 */
export const RIVAL_PROBE_SUBJECTS: readonly RivalProbeSubject[] = [
  "rig",
  "dwelling",
  "habits",
];

/**
 * The observable tell that follows from a seat, drawn from the three lines of
 * `docs/GAME_DESIGN.md`'s evidence list that belong to *peers*: "strange probes",
 * "calls", and "missing contacts". Deliberately disjoint from P1's authority
 * vocabulary (a login, a market quote, an unsent message) and from P3's physical
 * one (vehicles, knocks, door cameras, outages) so the three threat sources never
 * blur together in the log.
 *
 * Nothing is rolled here, and that is the design: you cannot see a rival's
 * intent, but you can see what it touched, and the *inference* from tell back to
 * seat is the reasoning the game is asking you to do.
 */
export function probeArtifactOf(subject: RivalProbeSubject): RivalProbeArtifactKind {
  switch (subject) {
    case "rig":
      return "probe-ping";
    case "dwelling":
      return "caller-question";
    case "habits":
      return "missing-contact";
  }
}

/**
 * The footprint band a rival perceives, derived from the trace weights the
 * player emitted. Recomputed per tick rather than stored, so a rival's impression
 * of you cannot desync from what you actually did — the same reason P1 derives
 * its case material.
 */
export function perceivedExposureBand(
  traces: readonly OperationTrace[],
): "none" | "low" | "elevated" | "severe" {
  const score = traces.reduce((sum, trace) => sum + trace.weight, 0);

  if (score === 0) {
    return "none";
  }

  if (score <= 2) {
    return "low";
  }

  if (score <= 4) {
    return "elevated";
  }

  return "severe";
}

/**
 * The percentage chance that `actor`'s read of the player is *right* on this
 * tick. A pure function of the world plus the tick, with no rank anywhere in the
 * arithmetic and no hidden difficulty score to tune against — the whole term is
 * assembled from exposure and counterplay the player can reason about, plus the
 * one assist seat this slice adds.
 */
export function probeCorrectPercent(
  world: WorldState,
  actor: UndergroundActor,
  tickIndex: number,
): number {
  const { traces } = world;
  const escalations = traces.filter(
    (trace) => trace.cause === "operation-escalation",
  ).length;
  const quietExits = traces.filter(
    (trace) => trace.cause === "operation-disengagement",
  ).length;
  const presence = derivePresence(world.economy.housing);

  let percent =
    PROBE_BASE_PERCENT +
    (PROBE_EXPOSURE_ADJUST[perceivedExposureBand(traces)] ?? 0) +
    (PROBE_ANONYMITY_ADJUST[presence.anonymity] ?? 0);

  if (quietExits > escalations) {
    percent += PROBE_QUIET_HABIT_ADJUST;
  }

  if (world.operation?.stage === "intrusive") {
    percent += PROBE_ACTIVE_INTRUSION_ADJUST;
  }

  // The handoff seat. `tickIndex` is a parameter, never ambient state, so the
  // function stays pure and a probe shares its prober's read for the tick.
  const assist = npcAssistDeltas(
    world.underground.seed,
    tickIndex,
    actor.id,
    actor.modelId ? findModelItem(actor.modelId) : undefined,
  );

  // A good planning read lifts the judgement by the same delta that would lift
  // the prober's offence; a miss arrives as a *negative* delta, so it pushes
  // accuracy down twice over — once from the delta itself and once from the
  // extra penalty below, because a model that misreads a pattern does so with
  // confidence and a rival trusts it.
  percent += assist.skillDelta * PROBE_ASSIST_QUALITY_PER_POINT;

  if (assist.skillDelta < 0) {
    percent -= PROBE_MISTAKE_PENALTY;
  }

  return Math.min(
    PROBE_MAX_CORRECT_PERCENT,
    Math.max(PROBE_MIN_CORRECT_PERCENT, percent),
  );
}

/**
 * Who has reason to look at you: peers holding grudge toward the player, in
 * world order. Grudge only — rank is not consulted, and a world where nobody
 * holds anything against you returns no candidates, so the whole fold is a no-op
 * and the ecosystem replays byte-for-byte as it did before P2 existed.
 */
export function probeAttemptPercent(
  world: WorldState,
  atMinute = world.worldMinute,
): number {
  return Math.min(
    100,
    PROBE_TICK_PERCENT +
      deriveLongRunPressure(world, atMinute).probeAttemptBonusPercent,
  );
}

export function probeCandidates(world: WorldState): UndergroundActor[] {
  return world.underground.actors.filter(
    (actor) =>
      (world.underground.relationships.find(
        (entry) =>
          entry.fromId === actor.id && entry.toId === PLAYER_ACTOR_ID,
      )?.grudge ?? 0) >= PROBE_MIN_GRUDGE,
  );
}

/**
 * One ecosystem tick of rival probing. Each peer with standing against you gets
 * one attempt; an attempt aims at one seat, learns a read (hidden truth, stored
 * on the record), and leaks one artifact you can actually see. It writes only
 * `world.probes` and emits only `RivalProbe` events — it touches no
 * relationship, no rank, no credit, no incident, and no other system's roll, so
 * a tick that produces no attempt is indistinguishable from a tick this module
 * never saw.
 */
export function probeTick(
  world: WorldState,
  tickIndex: number,
  worldMinute: number,
  candidates: readonly UndergroundActor[],
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const { underground } = world;
  const attemptPercent = probeAttemptPercent(world, worldMinute);

  for (const actor of candidates) {
    if (
      hashUnit(underground.seed, "probe-try", tickIndex, actor.id) * 100 >=
      attemptPercent
    ) {
      continue;
    }

    const subject =
      RIVAL_PROBE_SUBJECTS[
        Math.floor(
          hashUnit(underground.seed, "probe-subject", tickIndex, actor.id) *
            RIVAL_PROBE_SUBJECTS.length,
        )
      ];
    const correct =
      hashUnit(underground.seed, "probe-read", tickIndex, actor.id) * 100 <
      probeCorrectPercent(world, actor, tickIndex);
    // Derived, not rolled: the tell is the seat's observable face.
    const artifactKind = probeArtifactOf(subject);

    const probe: RivalProbe = {
      id: `probe:${world.probes.length + 1}`,
      actorId: actor.id,
      subject,
      correct,
      // A dwelling read is an address, not a homing beacon. Persist the place
      // the rival actually read so P3 can degrade it after the player relocates.
      ...(subject === "dwelling"
        ? { locationId: derivePresence(world.economy.housing).locationId }
        : {}),
      worldMinute,
    };
    world.probes.push(probe);

    events.push({
      type: "RivalProbe",
      probeId: probe.id,
      actorId: actor.id,
      subject,
      artifactKind,
      worldMinute,
    });
  }

  return events;
}

