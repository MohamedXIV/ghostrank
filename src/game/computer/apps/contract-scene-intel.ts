/** G5 P2: contract-relevant intel read only from PLAYER-VISIBLE input. */
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
  incidents: readonly {
    id: string;
    actorHandle: string;
    counterpartHandle: string;
    outcome: "succeeded" | "repelled";
    worldMinute: number;
  }[];
  messages: readonly {
    id: string;
    fromHandle: string;
    claimActorHandle: string;
    claimCounterpartHandle: string;
    claimOutcome: "succeeded" | "repelled";
    worldMinute: number;
    read: boolean;
  }[];
}
export function deriveContractSceneIntel(_input: ContractSceneIntelInput): ContractSceneSignal[] {
  return [];
}
