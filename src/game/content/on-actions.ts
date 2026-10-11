import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  ContentReactionRecord,
  WorldState,
} from "@/game/simulation/state/world-state";
import { enqueueSystemJob, hasQueuedJob } from "@/game/simulation/scheduler/system-jobs";
import {
  BROKER_RECONCILIATION_RULE,
  BROKER_RECONCILIATION_RULE_ID,
  executeContentEffect,
} from "@/game/content/effects";

type AcceptedEvent = Extract<SimulationEvent, { type: "ContractAccepted" }>;

/**
 * Only called from *committed* authority events. The finite rule list
 * intentionally has no dynamic callbacks; new triggers register here after
 * there is a genuine gameplay consumer and explicit provenance.
 */
export function scheduleContentOnAction(world: WorldState, event: AcceptedEvent): void {
  const state = world.content;
  if (!state || world.ending || !state.activeRuleIds.includes(BROKER_RECONCILIATION_RULE_ID)) {
    return;
  }

  const contract = world.underground.contracts.find(
    (entry) => entry.id === event.contractId,
  );
  if (
    !contract ||
    contract.status !== "accepted" ||
    contract.acceptedWorldMinute !== event.worldMinute ||
    event.worldMinute !== world.worldMinute ||
    contract.dueWorldMinute !== event.dueWorldMinute ||
    !world.underground.actors.some((actor) => actor.id === contract.issuerId)
  ) return;

  const id = `content:${BROKER_RECONCILIATION_RULE_ID}:${contract.id}:${event.worldMinute}`;
  if (
    state.resolvedIds.includes(id) ||
    state.pending.some((entry) => entry.id === id) ||
    hasQueuedJob(world.jobQueue, id)
  ) return;

  const pending: ContentReactionRecord = {
    id,
    ruleId: BROKER_RECONCILIATION_RULE_ID,
    sourceContractId: contract.id,
    issuerId: contract.issuerId,
    sourceWorldMinute: event.worldMinute,
    dueWorldMinute: event.worldMinute + BROKER_RECONCILIATION_RULE.delayMinutes,
  };
  state.pending.push(pending);
  world.jobQueue = enqueueSystemJob(world.jobQueue, {
    id,
    kind: "content-response",
    startedWorldMinute: event.worldMinute,
    dueWorldMinute: pending.dueWorldMinute,
    subjectId: id,
  });
}

/** Called by the world scheduler at the job's own minute, not at render time. */
export function resolveContentReaction(
  world: WorldState,
  id: string,
  worldMinute: number,
): SimulationEvent[] {
  const state = world.content;
  if (!state || state.resolvedIds.includes(id) || world.ending) return [];
  const index = state.pending.findIndex((entry) => entry.id === id);
  if (index < 0) return [];
  const pending = state.pending[index];
  // Jobs cannot be replayed with a forged earlier due minute.
  if (pending.dueWorldMinute !== worldMinute) return [];

  const result = executeContentEffect(world, pending, worldMinute);
  state.pending.splice(index, 1);
  state.resolvedIds.push(id);
  return [
    ...result.events,
    {
      type: "ContentReactionResolved",
      reactionId: id,
      ruleId: pending.ruleId,
      sourceContractId: pending.sourceContractId,
      result: result.reason === "applied" ? "applied" : "blocked",
      reason: result.reason,
      worldMinute,
    },
  ];
}
