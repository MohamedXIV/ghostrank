import { derivePresence } from "@/game/simulation/systems/location";
import { settledBuildDueMinute } from "@/game/simulation/systems/builds";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { deriveLongRunPressure } from "@/game/simulation/systems/long-run-pressure";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  PLAYER_ACTOR_ID,
  type InFlightBuild,
  type PhysicalSignalKind,
  type PhysicalThreat,
  type PhysicalThreatKind,
  type RivalProbe,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 6 P3 — retaliation crosses the online/physical boundary.
 *
 * A peer can only act on a prior P2 probe: the probe is the durable belief,
 * including whether it was wrong. The black-network seat is the current coarse
 * "physical backing" fact — no rank and no hidden power scalar are introduced.
 * Grudge decides willingness, player-created case pressure raises exposure, and
 * P0 anonymity is real counterplay. The roll is stateless and salted by the
 * probe itself, so retrying a tick never gives a rival a fresh die.
 *
 * D034 is enforced here, not by rewriting build clocks. An outage adds a pause
 * interval to an in-flight build; started/due/outcome remain frozen. The outage
 * end is hidden truth and the surface receives only ambiguous evidence.
 */

export const PHYSICAL_MIN_GRUDGE = 40;
export const PHYSICAL_BASE_PERCENT = 24;
export const PHYSICAL_MAX_PERCENT = 72;
export const PHYSICAL_MIN_PERCENT = 4;
export const PHYSICAL_OUTAGE_MINUTES = 360;
export const PHYSICAL_ASSISTANT_ADOPTION_PERCENT = 35;

const ANONYMITY_ADJUST: Record<string, number> = {
  public: 0,
  quiet: -12,
  hidden: -24,
};

function grudgeOf(world: WorldState, actorId: string): number {
  return (
    world.underground.relationships.find(
      (relationship) =>
        relationship.fromId === actorId &&
        relationship.toId === PLAYER_ACTOR_ID,
    )?.grudge ?? 0
  );
}

function ambientInvestigationPressure(world: WorldState): number {
  const progress = world.investigations.reduce(
    (max, investigation) => Math.max(max, investigation.progress),
    0,
  );
  return Math.min(18, Math.floor(progress / 2));
}

export function physicalThreatPercent(
  world: WorldState,
  actor: UndergroundActor,
  atMinute = world.worldMinute,
): number {
  const grudge = grudgeOf(world, actor.id);
  const presence = derivePresence(world.economy.housing);
  const grudgePressure = Math.min(20, Math.max(0, grudge - PHYSICAL_MIN_GRUDGE));
  const longRunPressure =
    deriveLongRunPressure(world, atMinute).physicalThreatBonusPercent;

  return Math.max(
    PHYSICAL_MIN_PERCENT,
    Math.min(
      PHYSICAL_MAX_PERCENT,
      PHYSICAL_BASE_PERCENT +
        grudgePressure +
        ambientInvestigationPressure(world) +
        longRunPressure +
        (ANONYMITY_ADJUST[presence.anonymity] ?? 0),
    ),
  );
}

function activeOutageAt(
  world: WorldState,
  worldMinute: number,
): PhysicalThreat | undefined {
  return [...world.physicalThreats]
    .reverse()
    .find(
      (threat) =>
        threat.kind === "outage" &&
        threat.endsWorldMinute !== undefined &&
        threat.worldMinute <= worldMinute &&
        threat.endsWorldMinute > worldMinute,
    );
}

/**
 * A build created while an outage is already active joins that pause. This is
 * called before the build enters the queue so the threat can cite its id without
 * depending on array order.
 */
export function applyActiveOutageToBuild(
  world: WorldState,
  build: InFlightBuild,
): void {
  const outage = activeOutageAt(world, world.worldMinute);

  if (!outage || build.pausedAtWorldMinute !== undefined) {
    return;
  }

  build.pausedAtWorldMinute = world.worldMinute;
  build.pausedByThreatId = outage.id;
  if (!outage.affectedBuildIds.includes(build.id)) {
    outage.affectedBuildIds.push(build.id);
  }
}

function settleExpiredOutages(world: WorldState, worldMinute: number): void {
  for (const outage of world.physicalThreats) {
    if (
      outage.kind !== "outage" ||
      outage.endsWorldMinute === undefined ||
      outage.endsWorldMinute > worldMinute
    ) {
      continue;
    }

    for (const buildId of outage.affectedBuildIds) {
      const build = world.builds.find((candidate) => candidate.id === buildId);

      if (
        !build ||
        build.pausedAtWorldMinute === undefined ||
        build.pausedByThreatId !== outage.id
      ) {
        continue;
      }

      const pausedMinutes = Math.max(
        0,
        outage.endsWorldMinute - build.pausedAtWorldMinute,
      );
      build.accumulatedPausedMinutes =
        (build.accumulatedPausedMinutes ?? 0) + pausedMinutes;
      delete build.pausedAtWorldMinute;
      delete build.pausedByThreatId;
    }
  }
}

function pauseBuilds(
  world: WorldState,
  threat: PhysicalThreat,
  worldMinute: number,
): void {
  for (const build of world.builds) {
    // A job strictly due before this tick has already finished in world time,
    // even if the command bus has not folded it out of the queue yet. Exact ties
    // deliberately lose to the outage.
    if (
      build.pausedAtWorldMinute !== undefined ||
      settledBuildDueMinute(build) < worldMinute
    ) {
      continue;
    }

    build.pausedAtWorldMinute = worldMinute;
    build.pausedByThreatId = threat.id;
    threat.affectedBuildIds.push(build.id);
  }
}

function destroyOneHardware(
  world: WorldState,
  threat: PhysicalThreat,
): void {
  if (world.economy.hardware.length === 0) {
    return;
  }

  const index = Math.min(
    world.economy.hardware.length - 1,
    Math.floor(
      hashUnit(
        world.underground.seed,
        "physical-hardware",
        threat.id,
        threat.actorId,
      ) * world.economy.hardware.length,
    ),
  );
  const [destroyed] = world.economy.hardware.splice(index, 1);
  threat.destroyedHardwareIds.push(destroyed.id);
}

function latestUnusedProbe(
  world: WorldState,
  actorId: string,
  beforeWorldMinute: number,
): RivalProbe | undefined {
  const used = new Set(
    world.physicalThreats.map((threat) => threat.sourceProbeId),
  );

  return [...world.probes]
    .reverse()
    .find(
      (probe) =>
        probe.actorId === actorId &&
        probe.worldMinute < beforeWorldMinute &&
        !used.has(probe.id),
    );
}

function consequenceOf(
  world: WorldState,
  probe: RivalProbe,
  worldMinute: number,
): { kind: PhysicalThreatKind; signalKind: PhysicalSignalKind } {
  switch (probe.subject) {
    case "rig":
      if (probe.correct && !activeOutageAt(world, worldMinute)) {
        return { kind: "outage", signalKind: "outage" };
      }
      return { kind: "warning", signalKind: "unusual-connectivity" };
    case "dwelling": {
      // A correct address can become stale. Relocation is real counterplay: a
      // probe of the old room cannot follow the player into the new safehouse.
      const currentLocationId = derivePresence(world.economy.housing).locationId;
      const stillAtProbedDwelling =
        probe.correct &&
        probe.locationId !== undefined &&
        probe.locationId === currentLocationId;

      return stillAtProbedDwelling
        ? { kind: "property-hit", signalKind: "strange-vehicle" }
        : { kind: "warning", signalKind: "door-camera-motion" };
    }
    case "habits":
      return { kind: "warning", signalKind: "nearby-activity" };
  }
}

/**
 * One ecosystem tick of physical escalation. Called before social retaliation
 * and before this tick's new probe, so one big wait and many small waits consume
 * the same prior beliefs in the same order.
 */
export function physicalRetaliationTick(
  world: WorldState,
  tickIndex: number,
  worldMinute: number,
): SimulationEvent[] {
  settleExpiredOutages(world, worldMinute);
  const events: SimulationEvent[] = [];

  for (const actor of world.underground.actors) {
    // Black-network access is the phase's existing coarse physical-backing fact.
    // A second power scalar here would only recreate rank-as-power under a new
    // name; white-network peers can probe/smear, but cannot reach the room.
    if (actor.network !== "black") {
      continue;
    }

    const grudge = grudgeOf(world, actor.id);
    if (grudge < PHYSICAL_MIN_GRUDGE) {
      continue;
    }

    const probe = latestUnusedProbe(world, actor.id, worldMinute);
    if (!probe) {
      continue;
    }

    const percent = physicalThreatPercent(world, actor, worldMinute);
    const roll =
      hashUnit(
        world.underground.seed,
        "physical-retaliation",
        probe.id,
        actor.id,
      ) * 100;

    if (roll >= percent) {
      continue;
    }

    const consequence = consequenceOf(world, probe, worldMinute);
    const threat: PhysicalThreat = {
      id: `physical:${world.physicalThreats.length + 1}`,
      actorId: actor.id,
      kind: consequence.kind,
      signalKind: consequence.signalKind,
      sourceProbeId: probe.id,
      sourceInvestigationIds: world.investigations
        .filter((investigation) => investigation.progress > 0)
        .map((investigation) => investigation.id),
      locationId: derivePresence(world.economy.housing).locationId,
      worldMinute,
      ...(consequence.kind === "outage"
        ? { endsWorldMinute: worldMinute + PHYSICAL_OUTAGE_MINUTES }
        : {}),
      affectedBuildIds: [],
      destroyedHardwareIds: [],
    };

    if (threat.kind === "outage") {
      pauseBuilds(world, threat, worldMinute);
    } else if (threat.kind === "property-hit") {
      destroyOneHardware(world, threat);
    }

    const adoptsAssistant =
      threat.kind !== "warning" &&
      !actor.modelId &&
      hashUnit(
        world.underground.seed,
        "physical-assistant-adoption",
        tickIndex,
        actor.id,
        threat.id,
      ) *
        100 <
        PHYSICAL_ASSISTANT_ADOPTION_PERCENT;

    if (adoptsAssistant) {
      actor.modelId = "model-local-salvage";
      threat.assistantAdoptedModelId = actor.modelId;
    }

    world.physicalThreats.push(threat);
    events.push({
      type: "PhysicalThreat",
      threatId: threat.id,
      actorId: threat.actorId,
      kind: threat.kind,
      signalKind: threat.signalKind,
      sourceProbeId: threat.sourceProbeId,
      affectedBuildIds: [...threat.affectedBuildIds],
      destroyedHardwareIds: [...threat.destroyedHardwareIds],
      worldMinute,
    });

    if (threat.assistantAdoptedModelId) {
      events.push({
        type: "NpcAssistantAdopted",
        actorId: actor.id,
        modelId: threat.assistantAdoptedModelId,
        causeThreatId: threat.id,
        worldMinute,
      });
    }
  }

  return events;
}
