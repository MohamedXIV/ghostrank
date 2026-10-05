import { derivePostmortems, type PostmortemRead } from "@/game/simulation/systems/postmortem";
import {
  deriveReputationDescriptors,
  type ReputationDescriptor,
} from "@/game/simulation/systems/reputation";
import {
  deriveRetirementOutcome,
  type RetirementVariant,
} from "@/game/simulation/systems/retirement";
import type {
  RunEndingStatus,
  WorldState,
} from "@/game/simulation/state/world-state";

const ENDING_LABELS: Record<RunEndingStatus, string> = {
  arrested: "ARRESTED",
  unmasked: "UNMASKED",
  missing: "MISSING",
  compromised: "COMPROMISED",
  stranded: "STRANDED",
  retired: "RETIRED",
  vanished: "VANISHED",
};

export interface CompletedRunSummary {
  handle: string;
  endingStatus: RunEndingStatus;
  endingLabel: string;
  endingWorldMinute: number;
  retirementVariant?: RetirementVariant;
  endingDetail?: string;
  finalRank: number;
  finalCredits: number;
  valueMoved: number;
  completedContracts: number;
  operationEscalations: number;
  authoredWorkflows: number;
  compromiseCount: number;
  descriptors: ReputationDescriptor[];
  postmortems: PostmortemRead[];
}

/**
 * Phase 7 P4 — player-safe history is derived from the archived final state.
 *
 * The archive stores the authoritative WorldState once. This function creates
 * the browse model on demand and deliberately omits hidden ending provenance,
 * relationship numbers, probe correctness, investigation progress and other
 * private simulation truth.
 */
export function deriveCompletedRunSummary(
  world: WorldState,
): CompletedRunSummary {
  if (!world.ending) {
    throw new Error("Cannot summarize a live Ghostrank run");
  }

  const retirement =
    world.ending.causeKind === "retirement"
      ? deriveRetirementOutcome(world)
      : null;

  return {
    handle: world.player.handle,
    endingStatus: world.ending.status,
    endingLabel: ENDING_LABELS[world.ending.status],
    endingWorldMinute: world.ending.worldMinute,
    ...(retirement
      ? {
          retirementVariant: retirement.variant,
          endingDetail: retirement.detail,
        }
      : {}),
    finalRank: world.player.rank,
    finalCredits: world.economy.credits,
    valueMoved: world.economy.ledger.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    ),
    completedContracts: world.underground.contracts.filter(
      (contract) => contract.status === "completed",
    ).length,
    operationEscalations: world.traces.filter(
      (trace) => trace.cause === "operation-escalation",
    ).length,
    authoredWorkflows: world.economy.ownedWorkflows.length,
    compromiseCount: world.compromises.length,
    descriptors: deriveReputationDescriptors(world),
    postmortems: derivePostmortems(world),
  };
}
