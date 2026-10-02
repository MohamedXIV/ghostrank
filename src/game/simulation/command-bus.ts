import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  EvidenceKind,
  EvidenceRecord,
  MachineState,
  TargetState,
  WorldState,
} from "@/game/simulation/state/world-state";

export interface CommandResult {
  ok: boolean;
  events: SimulationEvent[];
  error?: string;
}

const SURVEY_MINUTES = 12;
const INSPECTION_MINUTES = 8;

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

      case "surveyTarget":
        return this.surveyTarget(command.targetId);

      case "inspectMachine":
        return this.inspectMachine(command.machineId);

      case "advanceTime":
        return this.advanceTime(command.minutes);
    }
  }

  private observeTarget(targetId: string): CommandResult {
    const target = this.world.targets.find(
      (candidate) => candidate.id === targetId,
    );

    if (!target) {
      return this.failure("TARGET_NOT_FOUND");
    }

    if (!this.world.knownTargetIds.includes(target.id)) {
      this.world.knownTargetIds.push(target.id);
    }

    this.recordEvidence({
      id: `target-profile:${target.id}`,
      kind: "target-profile",
      subjectId: target.id,
      confidence: "observed",
      source: "direct-observation",
      worldMinute: this.world.worldMinute,
    });

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

  private surveyTarget(targetId: string): CommandResult {
    const target = this.world.targets.find(
      (candidate) => candidate.id === targetId,
    );

    if (!target) {
      return this.failure("TARGET_NOT_FOUND");
    }

    if (!this.hasEvidence("target-profile", target.id)) {
      return this.failure("TARGET_NOT_OBSERVED");
    }

    const machine = target.machines.find(
      (candidate) => !this.hasEvidence("machine-presence", candidate.id),
    );

    if (!machine) {
      return this.failure("NO_NEW_MACHINE_EVIDENCE");
    }

    const timeEvent = this.advanceWorldTime(SURVEY_MINUTES);

    this.recordEvidence({
      id: `machine-presence:${machine.id}`,
      kind: "machine-presence",
      subjectId: machine.id,
      confidence: "observed",
      source: "direct-observation",
      worldMinute: this.world.worldMinute,
    });

    return {
      ok: true,
      events: [
        timeEvent,
        {
          type: "MachineObserved",
          targetId: target.id,
          machineId: machine.id,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private inspectMachine(machineId: string): CommandResult {
    const located = this.findMachine(machineId);

    if (!located) {
      return this.failure("MACHINE_NOT_FOUND");
    }

    if (!this.hasEvidence("machine-presence", located.machine.id)) {
      return this.failure("MACHINE_NOT_OBSERVED");
    }

    const service = located.machine.services.find(
      (candidate) => !this.hasEvidence("service-presence", candidate.id),
    );

    if (!service) {
      return this.failure("NO_NEW_SERVICE_EVIDENCE");
    }

    const timeEvent = this.advanceWorldTime(INSPECTION_MINUTES);

    this.recordEvidence({
      id: `service-presence:${service.id}`,
      kind: "service-presence",
      subjectId: service.id,
      confidence: "observed",
      source: "direct-observation",
      worldMinute: this.world.worldMinute,
    });

    return {
      ok: true,
      events: [
        timeEvent,
        {
          type: "ServiceObserved",
          targetId: located.target.id,
          machineId: located.machine.id,
          serviceId: service.id,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private advanceTime(minutes: number): CommandResult {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return this.failure("INVALID_TIME_DELTA");
    }

    return {
      ok: true,
      events: [this.advanceWorldTime(minutes)],
    };
  }

  private advanceWorldTime(minutes: number): SimulationEvent {
    const fromMinute = this.world.worldMinute;
    this.world.worldMinute += minutes;

    return {
      type: "WorldTimeAdvanced",
      fromMinute,
      toMinute: this.world.worldMinute,
    };
  }

  private hasEvidence(kind: EvidenceKind, subjectId: string): boolean {
    return this.world.evidence.some(
      (record) => record.kind === kind && record.subjectId === subjectId,
    );
  }

  private recordEvidence(record: EvidenceRecord): void {
    const existing = this.world.evidence.find(
      (candidate) => candidate.id === record.id,
    );

    if (existing) {
      return;
    }

    this.world.evidence.push(record);
  }

  private findMachine(
    machineId: string,
  ): { target: TargetState; machine: MachineState } | null {
    for (const target of this.world.targets) {
      const machine = target.machines.find(
        (candidate) => candidate.id === machineId,
      );

      if (machine) {
        return { target, machine };
      }
    }

    return null;
  }

  private failure(error: string): CommandResult {
    return {
      ok: false,
      events: [],
      error,
    };
  }
}
