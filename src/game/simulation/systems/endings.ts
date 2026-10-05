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
