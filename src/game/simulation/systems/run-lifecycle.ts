import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  RunEndingCauseKind,
  RunEndingKind,
  WorldState,
} from "@/game/simulation/state/world-state";

export interface EndRunInput {
  kind: RunEndingKind;
  causeKind: RunEndingCauseKind;
  causeId: string;
  worldMinute: number;
}

const RUN_ENDING_LABELS: Record<RunEndingKind, string> = {
  arrested: "ARRESTED",
  unmasked: "UNMASKED",
  captured: "CAPTURED",
  killed: "KILLED",
  missing: "MISSING",
  compromised: "COMPROMISED",
  stranded: "STRANDED",
  "forced-disappearance": "FORCED DISAPPEARANCE",
  retired: "RETIRED",
  vanished: "VANISHED",
};

export function runEndingLabel(kind: RunEndingKind): string {
  return RUN_ENDING_LABELS[kind];
}

/**
 * Phase 7 P0 terminal boundary.
 *
 * Eligibility belongs to later Phase 7 slices. This primitive only makes one
 * already-decided ending authoritative, exactly once. Repeated calls are a
 * no-op so a tick that observes the same terminal condition twice cannot replace
 * the first ending or emit duplicate RunEnded events.
 */
export function endRun(
  world: WorldState,
  input: EndRunInput,
): SimulationEvent[] {
  if (world.run.status === "ended") {
    return [];
  }

  const ending = {
    id: "run-ending:1",
    kind: input.kind,
    causeKind: input.causeKind,
    causeId: input.causeId,
    worldMinute: input.worldMinute,
  } as const;

  world.run = {
    status: "ended",
    ending,
  };

  return [
    {
      type: "RunEnded",
      endingId: ending.id,
      kind: ending.kind,
      causeKind: ending.causeKind,
      causeId: ending.causeId,
      worldMinute: ending.worldMinute,
    },
  ];
}
