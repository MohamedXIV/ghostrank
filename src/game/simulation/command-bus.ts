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
const ESCALATION_MINUTES = 5;
const DISENGAGE_MINUTES = 3;

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

      case "openOperation":
        return this.openOperation(command.targetId);

      case "surveyTarget":
        return this.surveyTarget(command.targetId);

      case "inspectMachine":
        return this.inspectMachine(command.machineId);

      case "escalateOperation":
        return this.escalateOperation();

      case "disengageOperation":
        return this.disengageOperation();

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

  private openOperation(targetId: string): CommandResult {
    if (this.world.operation) {
      return this.failure("OPERATION_ALREADY_ACTIVE");
    }

    const target = this.world.targets.find(
      (candidate) => candidate.id === targetId,
    );

    if (!target) {
      return this.failure("TARGET_NOT_FOUND");
    }

    if (!this.hasEvidence("target-profile", target.id)) {
      return this.failure("TARGET_NOT_OBSERVED");
    }

    this.world.operation = {
      targetId: target.id,
      stage: "recon",
      openedWorldMinute: this.world.worldMinute,
    };

    return {
      ok: true,
      events: [
        {
          type: "OperationOpened",
          targetId: target.id,
          stage: "recon",
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private surveyTarget(targetId: string): CommandResult {
    const operation = this.world.operation;

    if (!operation) {
      return this.failure("NO_ACTIVE_OPERATION");
    }

    if (operation.targetId !== targetId) {
      return this.failure("OPERATION_TARGET_MISMATCH");
    }

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
    const operation = this.world.operation;

    if (!operation) {
      return this.failure("NO_ACTIVE_OPERATION");
    }

    const located = this.findMachine(machineId);

    if (!located) {
      return this.failure("MACHINE_NOT_FOUND");
    }

    if (operation.targetId !== located.target.id) {
      return this.failure("OPERATION_TARGET_MISMATCH");
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

  private escalateOperation(): CommandResult {
    const operation = this.world.operation;

    if (!operation) {
      return this.failure("NO_ACTIVE_OPERATION");
    }

    if (operation.stage === "intrusive") {
      return this.failure("OPERATION_ALREADY_ESCALATED");
    }

    if (!this.hasKnownServiceForTarget(operation.targetId)) {
      return this.failure("SERVICE_EVIDENCE_REQUIRED");
    }

    const timeEvent = this.advanceWorldTime(ESCALATION_MINUTES);
    operation.stage = "intrusive";
    operation.escalatedWorldMinute = this.world.worldMinute;

    return {
      ok: true,
      events: [
        timeEvent,
        {
          type: "OperationEscalated",
          targetId: operation.targetId,
          fromStage: "recon",
          toStage: "intrusive",
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private disengageOperation(): CommandResult {
    const operation = this.world.operation;

    if (!operation) {
      return this.failure("NO_ACTIVE_OPERATION");
    }

    const timeEvent = this.advanceWorldTime(DISENGAGE_MINUTES);
    const event: SimulationEvent = {
      type: "OperationDisengaged",
      targetId: operation.targetId,
      stage: operation.stage,
      worldMinute: this.world.worldMinute,
    };

    this.world.operation = null;

    return {
      ok: true,
      events: [timeEvent, event],
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

  private hasKnownServiceForTarget(targetId: string): boolean {
    const target = this.world.targets.find(
      (candidate) => candidate.id === targetId,
    );

    if (!target) {
      return false;
    }

    return target.machines.some((machine) =>
      machine.services.some((service) =>
        this.hasEvidence("service-presence", service.id),
      ),
    );
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
