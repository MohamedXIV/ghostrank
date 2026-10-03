import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  LedgerCauseKind,
  LedgerDirection,
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

type ValueTransferredEvent = Extract<
  SimulationEvent,
  { type: "ValueTransferred" }
>;

const RECON_BASE_PAYOUT = 80;
const RECON_PER_SERVICE = 40;
const INTRUSION_PAYOUT = 260;

/**
 * A contract payout is a pure, deterministic function of the objective — never
 * random, never rank-dependent. This closes the payment Phase 3 deferred.
 */
export function contractPayout(contract: UndergroundContract): number {
  if (contract.objective === "intrusion") {
    return INTRUSION_PAYOUT;
  }

  return (
    RECON_BASE_PAYOUT + RECON_PER_SERVICE * (contract.requiredServices ?? 1)
  );
}

/**
 * Record a value transfer against the player's wallet and append it to the
 * ledger. Credits can never go negative; a transfer that would take the balance
 * below zero is rejected and mutates nothing, so callers must check affordability
 * first and treat this as a guard.
 */
export function transferValue(
  world: WorldState,
  input: {
    direction: LedgerDirection;
    amount: number;
    causeKind: LedgerCauseKind;
    causeId: string;
    counterparty: string;
    worldMinute: number;
  },
): ValueTransferredEvent | null {
  const { economy } = world;
  const signed = input.direction === "credit" ? input.amount : -input.amount;
  const balanceAfter = economy.credits + signed;

  if (balanceAfter < 0) {
    return null;
  }

  economy.credits = balanceAfter;

  const entry = {
    id: `value:${economy.ledger.length + 1}`,
    worldMinute: input.worldMinute,
    direction: input.direction,
    amount: input.amount,
    balanceAfter,
    cause: { kind: input.causeKind, id: input.causeId },
    counterparty: input.counterparty,
  };
  economy.ledger.push(entry);

  return {
    type: "ValueTransferred",
    entryId: entry.id,
    direction: entry.direction,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    causeKind: entry.cause.kind,
    causeId: entry.cause.id,
    counterparty: entry.counterparty,
    worldMinute: entry.worldMinute,
  };
}
