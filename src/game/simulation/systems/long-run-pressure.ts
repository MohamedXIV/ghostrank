import type { WorldState } from "@/game/simulation/state/world-state";

const DAY_MINUTES = 24 * 60;

/**
 * Phase 7 P5 is deliberately late-run pressure, not a hidden difficulty ramp.
 * Before two world weeks, this layer is a strict no-op regardless of activity.
 */
export const LONG_RUN_PRESSURE_START_MINUTES = 14 * DAY_MINUTES;

export type LongRunPressureBand =
  | "ordinary"
  | "known"
  | "entangled"
  | "veteran";

export type LongRunPressureReason =
  | "completed-work"
  | "intrusive-history"
  | "counterpressure"
  | "physical-history";

export interface LongRunPressure {
  band: LongRunPressureBand;
  reasons: LongRunPressureReason[];
  contractOfferBonusPercent: number;
  maxOpenContracts: number;
  probeAttemptBonusPercent: number;
  physicalThreatBonusPercent: number;
}

interface HistoryCounts {
  completedContracts: number;
  missedAcceptedContracts: number;
  escalations: number;
  investigationSignals: number;
  retaliations: number;
  probes: number;
  physicalThreats: number;
  compromises: number;
}

const BASE_MAX_OPEN_CONTRACTS = 3;

function countsAt(world: WorldState, atMinute: number): HistoryCounts {
  return {
    completedContracts: world.underground.contracts.filter(
      (contract) =>
        contract.status === "completed" &&
        (contract.resolvedWorldMinute ?? contract.offeredWorldMinute) <= atMinute,
    ).length,
    missedAcceptedContracts: world.underground.contracts.filter(
      (contract) =>
        contract.status === "expired" &&
        contract.acceptedWorldMinute !== undefined &&
        (contract.resolvedWorldMinute ?? contract.expiresWorldMinute) <= atMinute,
    ).length,
    escalations: world.traces.filter(
      (trace) =>
        trace.cause === "operation-escalation" &&
        trace.worldMinute <= atMinute,
    ).length,
    investigationSignals: world.investigations.reduce(
      (sum, investigation) =>
        sum +
        investigation.signals.filter(
          (signal) => signal.surfacedWorldMinute <= atMinute,
        ).length,
      0,
    ),
    retaliations: world.underground.retaliations.filter(
      (retaliation) => retaliation.worldMinute <= atMinute,
    ).length,
    probes: world.probes.filter((probe) => probe.worldMinute <= atMinute).length,
    physicalThreats: world.physicalThreats.filter(
      (threat) => threat.worldMinute <= atMinute,
    ).length,
    compromises: world.compromises.filter(
      (compromise) => compromise.worldMinute <= atMinute,
    ).length,
  };
}

function historyPressureScore(counts: HistoryCounts): number {
  return (
    counts.completedContracts +
    counts.missedAcceptedContracts * 2 +
    counts.escalations +
    counts.investigationSignals +
    counts.retaliations * 2 +
    counts.probes +
    counts.physicalThreats * 2 +
    counts.compromises * 4
  );
}

function pressureReasons(counts: HistoryCounts): LongRunPressureReason[] {
  const reasons: LongRunPressureReason[] = [];

  if (
    counts.completedContracts > 0 ||
    counts.missedAcceptedContracts > 0
  ) {
    reasons.push("completed-work");
  }

  if (counts.escalations > 0 || counts.investigationSignals > 0) {
    reasons.push("intrusive-history");
  }

  if (counts.retaliations > 0 || counts.probes > 0) {
    reasons.push("counterpressure");
  }

  if (counts.physicalThreats > 0 || counts.compromises > 0) {
    reasons.push("physical-history");
  }

  return reasons;
}

/**
 * Derive veteran pressure from history that already happened by `atMinute`.
 *
 * The explicit minute parameter matters inside a long wait: CommandBus may hold
 * the requested destination minute while ecosystem ticks are folded one by one.
 * Filtering all history to the current tick keeps one long wait and many split
 * waits behaviorally identical.
 *
 * Player rank and starting network are intentionally absent.
 */
export function deriveLongRunPressure(
  world: WorldState,
  atMinute = world.worldMinute,
): LongRunPressure {
  if (atMinute < LONG_RUN_PRESSURE_START_MINUTES) {
    return {
      band: "ordinary",
      reasons: [],
      contractOfferBonusPercent: 0,
      maxOpenContracts: BASE_MAX_OPEN_CONTRACTS,
      probeAttemptBonusPercent: 0,
      physicalThreatBonusPercent: 0,
    };
  }

  const counts = countsAt(world, atMinute);
  const score = historyPressureScore(counts);
  const reasons = pressureReasons(counts);

  if (score >= 20) {
    return {
      band: "veteran",
      reasons,
      contractOfferBonusPercent: 12,
      maxOpenContracts: 5,
      probeAttemptBonusPercent: 12,
      physicalThreatBonusPercent: 12,
    };
  }

  if (score >= 12) {
    return {
      band: "entangled",
      reasons,
      contractOfferBonusPercent: 8,
      maxOpenContracts: 4,
      probeAttemptBonusPercent: 8,
      physicalThreatBonusPercent: 8,
    };
  }

  if (score >= 6) {
    return {
      band: "known",
      reasons,
      contractOfferBonusPercent: 4,
      maxOpenContracts: BASE_MAX_OPEN_CONTRACTS,
      probeAttemptBonusPercent: 4,
      physicalThreatBonusPercent: 4,
    };
  }

  return {
    band: "ordinary",
    reasons,
    contractOfferBonusPercent: 0,
    maxOpenContracts: BASE_MAX_OPEN_CONTRACTS,
    probeAttemptBonusPercent: 0,
    physicalThreatBonusPercent: 0,
  };
}
