import { deriveInvestigationStage } from "@/game/simulation/systems/investigations";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  RunEndingCauseKind,
  RunEndingRecord,
  RunEndingStatus,
  WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 7 P0 — the one-way terminal transition shared by every future ending.
 *
 * Eligibility belongs to later slices. This primitive only records an ending
 * once and returns the event that persistence/UI can consume. Repeated attempts
 * are idempotent and can never rewrite the first final status.
 */
export function endRun(
  world: WorldState,
  input: {
    status: RunEndingStatus;
    causeKind: RunEndingCauseKind;
    causeId: string;
    worldMinute: number;
  },
): SimulationEvent[] {
  if (world.ending) {
    return [];
  }

  const ending: RunEndingRecord = {
    status: input.status,
    causeKind: input.causeKind,
    causeId: input.causeId,
    worldMinute: input.worldMinute,
  };

  world.ending = ending;

  return [
    {
      type: "RunEnded",
      status: ending.status,
      causeKind: ending.causeKind,
      causeId: ending.causeId,
      worldMinute: ending.worldMinute,
    },
  ];
}


/**
 * Phase 7 P1 — consume only compromise conditions created on this exact
 * ecosystem boundary. Historical Phase 6 saves are not retroactively terminal:
 * a run ends when a new causal condition crosses the boundary under Phase 7.
 *
 * Priority is intentional when one property hit produces several conditions:
 * identity exposure describes who reached the person; a true resource floor is
 * next; generic infrastructure compromise is last.
 */
export function forcedEndingTick(
  world: WorldState,
  worldMinute: number,
): SimulationEvent[] {
  if (world.ending) {
    return [];
  }

  const current = world.compromises.filter(
    (record) => record.worldMinute === worldMinute,
  );
  if (current.length === 0) {
    return [];
  }

  const identityExposure = current.find(
    (record) => record.kind === "identity-exposed",
  );

  if (identityExposure) {
    const citedInvestigations = identityExposure.sourceInvestigationIds
      .map((id) =>
        world.investigations.find((investigation) => investigation.id === id),
      )
      .filter((value): value is (typeof world.investigations)[number] =>
        Boolean(value),
      );

    const converging = citedInvestigations.find(
      (investigation) =>
        deriveInvestigationStage(investigation.signals) === "converging",
    );

    if (converging) {
      return endRun(world, {
        status: "arrested",
        causeKind: "investigation",
        causeId: converging.id,
        worldMinute,
      });
    }

    const threat = world.physicalThreats.find(
      (candidate) => candidate.id === identityExposure.sourceThreatId,
    );
    const sameActorUnmasking = threat
      ? [...world.underground.retaliations]
          .reverse()
          .find(
            (retaliation) =>
              retaliation.kind === "unmasking" &&
              retaliation.actorId === threat.actorId &&
              retaliation.worldMinute <= worldMinute,
          )
      : undefined;

    if (sameActorUnmasking) {
      return endRun(world, {
        status: "unmasked",
        causeKind: "compromise",
        causeId: identityExposure.id,
        worldMinute,
      });
    }

    return endRun(world, {
      status: "missing",
      causeKind: "physical-threat",
      causeId: threat?.id ?? identityExposure.sourceThreatId,
      worldMinute,
    });
  }

  const stranded = current.find((record) => record.kind === "stranded");
  if (stranded) {
    return endRun(world, {
      status: "stranded",
      causeKind: "compromise",
      causeId: stranded.id,
      worldMinute,
    });
  }

  const rigLost = current.some((record) => record.kind === "rig-lost");
  const dwellingLost = current.some((record) => record.kind === "dwelling-lost");
  if (rigLost && dwellingLost) {
    const cause = [...current]
      .reverse()
      .find(
        (record) =>
          record.kind === "rig-lost" || record.kind === "dwelling-lost",
      )!;

    return endRun(world, {
      status: "compromised",
      causeKind: "compromise",
      causeId: cause.id,
      worldMinute,
    });
  }

  return [];
}
