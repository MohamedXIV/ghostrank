import { z } from "zod";
import { PLAYER_ACTOR_ID, type WorldState } from "@/game/simulation/state/world-state";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { applyContentRelationshipResponse } from "@/game/simulation/systems/underground";

/**
 * P2's first real effect: an issuer can *spend its existing grudge*
 * to repair trust after an accepted job. No invented NPC currency, free
 * relationship mutation, script callbacks, player debit or rank checks.
 * This demonstrator is dormant in regular worlds until an authored pack
 * explicitly activates its ID. P4 will supply the first gameplay pack.
 */
export const BROKER_RECONCILIATION_RULE_ID = "g9.broker-reconciliation.v1";

const ruleSchema = z.strictObject({
  id: z.literal(BROKER_RECONCILIATION_RULE_ID),
  on: z.literal("ContractAccepted"),
  delayMinutes: z.number().int().min(1).max(7 * 24 * 60),
  effect: z.strictObject({
    type: z.literal("issuer.spend-grudge-for-trust"),
    grudgeCost: z.number().int().min(1).max(20),
    trustGain: z.number().int().min(1).max(10),
  }),
});

export const BROKER_RECONCILIATION_RULE = ruleSchema.parse({
  id: BROKER_RECONCILIATION_RULE_ID,
  on: "ContractAccepted",
  delayMinutes: 420,
  effect: { type: "issuer.spend-grudge-for-trust", grudgeCost: 5, trustGain: 2 },
});

export type ContentReactionReason =
  | "applied"
  | "missing-actor"
  | "invalid-source"
  | "insufficient-resource";

export function executeContentEffect(
  world: WorldState,
  input: {
    id: string;
    ruleId: string;
    sourceContractId: string;
    issuerId: string;
    sourceWorldMinute: number;
  },
  minute: number,
): { reason: ContentReactionReason; events: SimulationEvent[] } {
  if (world.ending) return { reason: "invalid-source", events: [] };
  if (input.ruleId !== BROKER_RECONCILIATION_RULE_ID) {
    return { reason: "invalid-source", events: [] };
  }
  // Bind to the *real* accepted contract. No arbitrary actor in content can
  // claim to be the issuer of another person's event.
  const contract = world.underground.contracts.find(
    (entry) => entry.id === input.sourceContractId,
  );
  if (
    !contract ||
    contract.issuerId !== input.issuerId ||
    contract.acceptedWorldMinute !== input.sourceWorldMinute ||
    (contract.status !== "accepted" && contract.status !== "completed" && contract.status !== "expired")
  ) {
    return { reason: "invalid-source", events: [] };
  }
  const actor = world.underground.actors.find((entry) => entry.id === input.issuerId);
  if (!actor) return { reason: "missing-actor", events: [] };
  const relationship = world.underground.relationships.find(
    (entry) => entry.fromId === actor.id && entry.toId === PLAYER_ACTOR_ID,
  );
  if (!relationship || relationship.grudge < BROKER_RECONCILIATION_RULE.effect.grudgeCost) {
    return { reason: "insufficient-resource", events: [] };
  }

  return {
    reason: "applied",
    events: [
      applyContentRelationshipResponse(
        world,
        actor.id,
        input.id,
        BROKER_RECONCILIATION_RULE.effect.grudgeCost,
        BROKER_RECONCILIATION_RULE.effect.trustGain,
        minute,
      ),
    ],
  };
}
