import { INVESTIGATION_SIGNAL_THRESHOLDS } from "@/game/simulation/systems/investigations";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  CompromiseKind,
  CompromiseRecord,
  PhysicalThreat,
  RivalProbe,
  WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 6 P4 — catastrophic compromise is a durable condition, never an ending.
 *
 * There is no second difficulty roll here. P4 consumes facts P1–P3 already
 * established: a physical consequence that actually landed, the probe that led
 * to it, investigation material that already exists, and property the player
 * really lost. Phase 7 decides what ends a run; this fold only records the
 * irreversible/severe condition and performs the concrete world mutation the
 * cause implies (event-driven eviction).
 */

export const IDENTITY_EXPOSURE_PROGRESS =
  INVESTIGATION_SIGNAL_THRESHOLDS[
    INVESTIGATION_SIGNAL_THRESHOLDS.length - 1
  ]!;

function sourceProbeOf(
  world: WorldState,
  threat: PhysicalThreat,
): RivalProbe | undefined {
  return world.probes.find((probe) => probe.id === threat.sourceProbeId);
}

function hasConvergingSource(
  world: WorldState,
  threat: PhysicalThreat,
): boolean {
  const sourceIds = new Set(threat.sourceInvestigationIds);

  return world.investigations.some(
    (investigation) =>
      sourceIds.has(investigation.id) &&
      investigation.progress >= IDENTITY_EXPOSURE_PROGRESS,
  );
}

function alreadyRecorded(
  world: WorldState,
  kind: CompromiseKind,
  sourceThreatId: string,
): boolean {
  return world.compromises.some(
    (record) =>
      record.kind === kind && record.sourceThreatId === sourceThreatId,
  );
}

function appendCompromise(
  world: WorldState,
  threat: PhysicalThreat,
  kind: CompromiseKind,
  worldMinute: number,
): Extract<SimulationEvent, { type: "CompromiseRecorded" }> | null {
  if (alreadyRecorded(world, kind, threat.id)) {
    return null;
  }

  // Identity exposure is irreversible in this phase. One durable record is
  // enough; repeated threats can still produce other concrete losses.
  if (
    kind === "identity-exposed" &&
    world.compromises.some((record) => record.kind === kind)
  ) {
    return null;
  }

  // "Stranded" is a named history beat, not a meter that fires every tick.
  if (
    kind === "stranded" &&
    world.compromises.some((record) => record.kind === kind)
  ) {
    return null;
  }

  const record: CompromiseRecord = {
    id: `compromise:${world.compromises.length + 1}`,
    kind,
    sourceThreatId: threat.id,
    sourceProbeId: threat.sourceProbeId,
    sourceInvestigationIds: [...threat.sourceInvestigationIds],
    locationId: threat.locationId,
    worldMinute,
  };
  world.compromises.push(record);

  return {
    type: "CompromiseRecorded",
    compromiseId: record.id,
    kind: record.kind,
    sourceThreatId: record.sourceThreatId,
    sourceProbeId: record.sourceProbeId,
    sourceInvestigationIds: [...record.sourceInvestigationIds],
    worldMinute,
  };
}

/**
 * Fold only the P3 threats that happened on this ecosystem boundary. Loading an
 * old save must not retroactively manufacture a compromise from historical P3
 * records; legacy worlds start with an empty P4 array and move forward.
 */
export function compromiseTick(
  world: WorldState,
  worldMinute: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const threats = world.physicalThreats.filter(
    (threat) => threat.worldMinute === worldMinute,
  );
  // P3 applies every actor's destruction before P4 folds the boundary, so the
  // live inventory is already the *final* one. Reconstruct the component count
  // that existed at the start of this boundary, then replay only the recorded
  // destructive ids in threat order. This gives rig-loss/stranded provenance to
  // the threat that actually crossed the floor instead of whichever row P4 saw
  // first after the globally-mutated inventory was already empty.
  let remainingComponentCount =
    world.economy.hardware.length +
    threats.reduce(
      (sum, threat) => sum + threat.destroyedHardwareIds.length,
      0,
    );

  for (const threat of threats) {
    if (threat.kind !== "property-hit") {
      continue;
    }

    const beforeComponents = remainingComponentCount;
    remainingComponentCount = Math.max(
      0,
      remainingComponentCount - threat.destroyedHardwareIds.length,
    );
    const removedFinalComponent =
      beforeComponents > 0 &&
      remainingComponentCount === 0 &&
      threat.destroyedHardwareIds.length > 0;

    // The P3 property hit already performed the destruction. P4 names the
    // catastrophic state only when this threat crossed the reconstructed
    // component count to zero and no complete owned machine survives.
    if (
      removedFinalComponent &&
      world.economy.ownedMachines.length === 0
    ) {
      const recorded = appendCompromise(world, threat, "rig-lost", worldMinute);
      if (recorded) {
        events.push(recorded);
      }
    }

    // D021's deferred scripted lease-loss path. A property hit burns the lease
    // only when it landed at the dwelling the player still holds at this exact
    // tick. Upkeep has already folded to this boundary before P3/P4 run, so the
    // just-finished boundary bills the old lease and future boundaries do not.
    if (
      world.economy.housing !== null &&
      world.economy.housing === threat.locationId
    ) {
      const recorded = appendCompromise(
        world,
        threat,
        "dwelling-lost",
        worldMinute,
      );
      if (recorded) {
        events.push(recorded);
      }

      world.economy.housing = null;
      events.push({
        type: "HousingChanged",
        housingId: null,
        dailyCost: 0,
        worldMinute,
      });
    }

    // Identity exposure is a chain, not a die roll: a genuinely correct current
    // dwelling read plus already-converging authority material and a physical hit.
    const probe = sourceProbeOf(world, threat);
    if (
      probe?.subject === "dwelling" &&
      probe.correct &&
      probe.locationId === threat.locationId &&
      hasConvergingSource(world, threat)
    ) {
      const recorded = appendCompromise(
        world,
        threat,
        "identity-exposed",
        worldMinute,
      );
      if (recorded) {
        events.push(recorded);
      }
    }

    // The endings doc names "Broke / Stranded". P4 records it only at the
    // concrete floor — no money, no lease, no hardware — and only as a condition.
    // The command bus remains live, so contracts/relocation can still recover.
    if (
      world.economy.credits === 0 &&
      world.economy.housing === null &&
      remainingComponentCount === 0 &&
      world.economy.ownedMachines.length === 0 &&
      world.economy.playerTools.length === 0
    ) {
      const recorded = appendCompromise(world, threat, "stranded", worldMinute);
      if (recorded) {
        events.push(recorded);
      }
    }
  }

  return events;
}
