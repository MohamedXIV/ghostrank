/**
 * G5 P2: contract-scene intel, derived ONLY from already player-visible sources.
 *
 * This helper deliberately cannot access WorldState, hidden organizations,
 * rumor.accurate, private incidents, current security posture or player rank.
 * The caller supplies the public feed and the read contact inbox, both already
 * safe projections. Claims remain claims, not a truth oracle.
 */
export interface ContractSceneSignal {
  id: string;
  source: "public-incident" | "contact-claim";
  actorHandle: string;
  counterpartHandle: string;
  outcome: "succeeded" | "repelled";
  worldMinute: number;
  fromHandle?: string;
}

export interface ContractSceneIntelInput {
  targetHandle: string;
  currentWorldMinute: number;
  /** From projectWorld().underground.feed (PUBLIC incidents only). */
  incidents: readonly {
    id: string;
    actorHandle: string;
    counterpartHandle: string;
    outcome: string;
    worldMinute: number;
  }[];
  /** From projectWorld().underground.inbox (player-received contact claims). */
  messages: readonly {
    id: string;
    fromHandle: string;
    claimActorHandle: string;
    claimCounterpartHandle: string;
    claimOutcome: string;
    worldMinute: number;
    read: boolean;
  }[];
}

/** History window, NOT a live defender-stability or emergency-stance timer. */
export const SCENE_INTEL_HISTORY_MINUTES = 72 * 60;
export const MAX_CONTRACT_SCENE_SIGNALS = 3;

export function deriveContractSceneIntel(input: ContractSceneIntelInput): ContractSceneSignal[] {
  const { currentWorldMinute: now, targetHandle } = input;
  if (!targetHandle || !Number.isFinite(now)) return [];
  const relevant = (a: string, b: string) => a === targetHandle || b === targetHandle;
  const recent = (t: number) => Number.isInteger(t) &&
    t >= 0 && t <= now && now - t <= SCENE_INTEL_HISTORY_MINUTES;
  const validOutcome = (o: string): o is ContractSceneSignal["outcome"] =>
    o === "succeeded" || o === "repelled";
  const entries: ContractSceneSignal[] = [];

  for (const incident of input.incidents) {
    if (!recent(incident.worldMinute) ||
        !relevant(incident.actorHandle, incident.counterpartHandle) ||
        !validOutcome(incident.outcome)) continue;
    entries.push({
      id: incident.id, source: "public-incident",
      actorHandle: incident.actorHandle,
      counterpartHandle: incident.counterpartHandle,
      outcome: incident.outcome,
      worldMinute: incident.worldMinute,
    });
  }
  for (const message of input.messages) {
    // Reading is an actual player action; an unread message never grants intel
    // on a separate contract panel just because it exists in hidden authority.
    if (!message.read || !recent(message.worldMinute) ||
        !relevant(message.claimActorHandle, message.claimCounterpartHandle) ||
        !validOutcome(message.claimOutcome)) continue;
    entries.push({
      id: message.id, source: "contact-claim",
      fromHandle: message.fromHandle,
      actorHandle: message.claimActorHandle,
      counterpartHandle: message.claimCounterpartHandle,
      outcome: message.claimOutcome,
      worldMinute: message.worldMinute,
    });
  }
  return entries.sort((a, b) =>
    b.worldMinute - a.worldMinute ||
    (a.source === b.source ? 0 : a.source === "public-incident" ? -1 : 1) ||
    a.id.localeCompare(b.id, undefined, { numeric: true })
  ).slice(0, MAX_CONTRACT_SCENE_SIGNALS);
}
