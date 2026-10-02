import type {
  EvidenceKind,
  OperationState,
  OpponentReactionKind,
  OpponentReactionStatus,
  WorldState,
} from "@/game/simulation/state/world-state";

export interface VisibleTarget {
  id: string;
  handle: string;
  rank: number;
  known: boolean;
}

export interface VisibleMachine {
  id: string;
  targetId: string;
  label: string;
  role: string;
}

export interface VisibleService {
  id: string;
  targetId: string;
  machineId: string;
  label: string;
  kind: string;
  state: "online" | "offline" | "degraded";
}

export type FootprintLevel = "none" | "low" | "elevated" | "severe";

export interface VisibleFootprint {
  score: number;
  level: FootprintLevel;
  traceCount: number;
}

export interface VisibleReaction {
  id: string;
  targetId: string;
  kind: OpponentReactionKind;
  status: OpponentReactionStatus;
  sourceTraceIds: string[];
  footprintScore: number;
  triggeredWorldMinute: number;
}

export interface WorldProjection {
  worldMinute: number;
  player: {
    handle: string;
    rank: number;
  };
  targets: VisibleTarget[];
  machines: VisibleMachine[];
  services: VisibleService[];
  operation: OperationState | null;
  footprint: VisibleFootprint;
  reactions: VisibleReaction[];
}

function evidenceSubjects(
  state: WorldState,
  kind: EvidenceKind,
): Set<string> {
  return new Set(
    state.evidence
      .filter((record) => record.kind === kind)
      .map((record) => record.subjectId),
  );
}

function footprintLevel(score: number): FootprintLevel {
  if (score === 0) {
    return "none";
  }

  if (score <= 2) {
    return "low";
  }

  if (score <= 4) {
    return "elevated";
  }

  return "severe";
}

export function projectWorld(state: WorldState): WorldProjection {
  const knownTargets = evidenceSubjects(state, "target-profile");
  const knownMachines = evidenceSubjects(state, "machine-presence");
  const knownServices = evidenceSubjects(state, "service-presence");

  const targets: VisibleTarget[] = [];
  const machines: VisibleMachine[] = [];
  const services: VisibleService[] = [];

  for (const target of state.targets) {
    if (knownTargets.has(target.id)) {
      targets.push({
        id: target.id,
        handle: target.handle,
        rank: target.rank,
        known: true,
      });
    }

    for (const machine of target.machines) {
      const machineVisible = knownMachines.has(machine.id);

      if (machineVisible) {
        machines.push({
          id: machine.id,
          targetId: target.id,
          label: machine.label,
          role: machine.role,
        });
      }

      if (!machineVisible) {
        continue;
      }

      for (const service of machine.services) {
        if (!knownServices.has(service.id)) {
          continue;
        }

        services.push({
          id: service.id,
          targetId: target.id,
          machineId: machine.id,
          label: service.label,
          kind: service.kind,
          state: service.state,
        });
      }
    }
  }

  const footprintScore = state.traces.reduce(
    (sum, trace) => sum + trace.weight,
    0,
  );

  const reactions = state.reactions
    .filter((reaction) => reaction.playerVisible)
    .map((reaction) => ({
      id: reaction.id,
      targetId: reaction.targetId,
      kind: reaction.kind,
      status: reaction.status,
      sourceTraceIds: [...reaction.sourceTraceIds],
      footprintScore: reaction.footprintScore,
      triggeredWorldMinute: reaction.triggeredWorldMinute,
    }));

  return {
    worldMinute: state.worldMinute,
    player: {
      handle: state.player.handle,
      rank: state.player.rank,
    },
    targets,
    machines,
    services,
    operation: state.operation ? structuredClone(state.operation) : null,
    footprint: {
      score: footprintScore,
      level: footprintLevel(footprintScore),
      traceCount: state.traces.length,
    },
    reactions,
  };
}
