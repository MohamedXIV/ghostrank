import type { WorldState } from "@/game/simulation/state/world-state";

export interface VisibleTarget {
  id: string;
  handle: string;
  rank: number;
  known: boolean;
}

export interface WorldProjection {
  worldMinute: number;
  player: {
    handle: string;
    rank: number;
  };
  targets: VisibleTarget[];
}

export function projectWorld(state: WorldState): WorldProjection {
  const knownTargets = new Set(state.knownTargetIds);

  return {
    worldMinute: state.worldMinute,
    player: {
      handle: state.player.handle,
      rank: state.player.rank,
    },
    targets: state.targets.map((target) => ({
      id: target.id,
      handle: target.handle,
      rank: target.rank,
      known: knownTargets.has(target.id),
    })),
  };
}
