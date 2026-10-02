import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

export interface CommandResult {
  ok: boolean;
  events: SimulationEvent[];
  error?: string;
}

export class CommandBus {
  private readonly world: WorldState;

  constructor(initialState: WorldState) {
    this.world = structuredClone(initialState);
  }

  snapshot(): WorldState {
    return structuredClone(this.world);
  }

  execute(command: SimulationCommand): CommandResult {
    switch (command.type) {
      case "observeTarget":
        return this.observeTarget(command.targetId);

      case "advanceTime":
        return this.advanceTime(command.minutes);
    }
  }

  private observeTarget(targetId: string): CommandResult {
    const target = this.world.targets.find(
      (candidate) => candidate.id === targetId,
    );

    if (!target) {
      return {
        ok: false,
        events: [],
        error: "TARGET_NOT_FOUND",
      };
    }

    if (!this.world.knownTargetIds.includes(target.id)) {
      this.world.knownTargetIds.push(target.id);
    }

    const evidenceId = `target-profile:${target.id}`;

    if (!this.world.evidence.some((record) => record.id === evidenceId)) {
      this.world.evidence.push({
        id: evidenceId,
        kind: "target-profile",
        subjectId: target.id,
        confidence: "observed",
        source: "direct-observation",
        worldMinute: this.world.worldMinute,
      });
    }

    return {
      ok: true,
      events: [
        {
          type: "TargetObserved",
          targetId: target.id,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private advanceTime(minutes: number): CommandResult {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return {
        ok: false,
        events: [],
        error: "INVALID_TIME_DELTA",
      };
    }

    const fromMinute = this.world.worldMinute;
    this.world.worldMinute += minutes;

    return {
      ok: true,
      events: [
        {
          type: "WorldTimeAdvanced",
          fromMinute,
          toMinute: this.world.worldMinute,
        },
      ],
    };
  }
}
