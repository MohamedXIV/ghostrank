import type { WorldState } from "@/game/simulation/state/world-state";

export type DescriptorId =
  | "professional"
  | "opportunist"
  | "hunter"
  | "predator";

export type DescriptorContext = "contracts" | "intrusions";

export interface ReputationDescriptor {
  id: DescriptorId;
  label: string;
  context: DescriptorContext;
  /** The count of observed events the descriptor rests on. */
  basis: number;
}

const PROFESSIONAL_DELIVERIES = 2;
const PREDATOR_ESCALATIONS = 3;

/**
 * Descriptors are observations derived from history. They are never stored,
 * never chosen, and rank is never an input.
 */
export function deriveReputationDescriptors(
  world: WorldState,
): ReputationDescriptor[] {
  const { contracts } = world.underground;
  const delivered = contracts.filter((entry) => entry.status === "completed");
  const missed = contracts.filter(
    (entry) =>
      entry.status === "expired" && entry.acceptedWorldMinute !== undefined,
  );
  const intrusionsDelivered = delivered.filter(
    (entry) => entry.objective === "intrusion",
  );
  const escalations = world.traces.filter(
    (trace) => trace.cause === "operation-escalation",
  );

  const descriptors: ReputationDescriptor[] = [];

  if (delivered.length >= PROFESSIONAL_DELIVERIES && missed.length === 0) {
    descriptors.push({
      id: "professional",
      label: "Professional",
      context: "contracts",
      basis: delivered.length,
    });
  }

  if (missed.length > 0) {
    descriptors.push({
      id: "opportunist",
      label: "Opportunist",
      context: "contracts",
      basis: missed.length,
    });
  }

  if (intrusionsDelivered.length > 0) {
    descriptors.push({
      id: "hunter",
      label: "Hunter",
      context: "intrusions",
      basis: intrusionsDelivered.length,
    });
  }

  if (escalations.length >= PREDATOR_ESCALATIONS) {
    descriptors.push({
      id: "predator",
      label: "Predator",
      context: "intrusions",
      basis: escalations.length,
    });
  }

  return descriptors;
}
