import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

export interface CommandResult {
  ok: boolean;
  events: SimulationEvent[];
  error?: string;
}

export class CommandBus {
  constructor(public readonly state: WorldState) {}

  execute(command: SimulationCommand): CommandResult {
    switch (command.type) {
      case "observeTarget":
        return this.observeTarget(command.targetId);

      case "advanceTime":
        return this.advanceTime(command.minutes);
    }
  }

  private observeTarget(targetId: string): CommandResult {
    const target = this.state.targets.find(
      (candidate) => candidate.id === targetId,
    );

    if (!target) {
      return {
        ok: false,
        events: [],
        error: "TARGET_NOT_FOUND",
      };
    }

    if (!this.state.knownTargetIds.includes(target.id)) {
      this.state.knownTargetIds.push(target.id);
    }

    return {
      ok: true,
      events: [
        {
          type: "TargetObserved",
          targetId: target.id,
          worldMinute: this.state.worldMinute,
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

    const fromMinute = this.state.worldMinute;
    this.state.worldMinute += minutes;

    return {
      ok: true,
      events: [
        {
          type: "WorldTimeAdvanced",
          fromMinute,
          toMinute: this.state.worldMinute,
        },
      ],
    };
  }
}
