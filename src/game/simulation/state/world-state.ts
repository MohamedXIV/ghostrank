export interface PlayerState {
  handle: string;
  rank: number;
}

export interface TargetState {
  id: string;
  handle: string;
  rank: number;
  hidden?: Record<string, unknown>;
}

export interface WorldState {
  worldMinute: number;
  player: PlayerState;
  targets: TargetState[];
  knownTargetIds: string[];
}

export interface InitialWorldState {
  worldMinute?: number;
  player?: PlayerState;
  targets?: TargetState[];
  knownTargetIds?: string[];
}

export function createInitialWorldState(
  initial: InitialWorldState = {},
): WorldState {
  return {
    worldMinute: initial.worldMinute ?? 0,
    player: initial.player ?? {
      handle: "unknown",
      rank: 100_000,
    },
    targets: initial.targets ? structuredClone(initial.targets) : [],
    knownTargetIds: initial.knownTargetIds
      ? [...initial.knownTargetIds]
      : [],
  };
}
