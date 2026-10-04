import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  MARKET_COUNTERPARTY,
  findCatalogItem,
} from "@/content/hardware-catalog";
import { transferValue } from "@/game/simulation/systems/economy";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { advanceUpkeep } from "@/game/simulation/systems/upkeep";
import { findHousingItem } from "@/content/housing-catalog";
import {
  actionDuration,
  type ReconAction,
} from "@/game/simulation/systems/compute";
import { discoveryScope } from "@/game/simulation/systems/scale";
import { actionDurationFactor, findSoftwareItem } from "@/content/software-catalog";
import {
  advanceUnderground,
  applyProvocation,
  applyReactionRelationship,
  contractDueMinute,
  isObjectiveMet,
  rewardContract,
  spreadPlayerFootprint,
} from "@/game/simulation/systems/underground";
import type {
  EvidenceKind,
  EvidenceRecord,
  MachineState,
  OpponentReaction,
  OperationTrace,
  OwnedHardware,
  TargetState,
  WorldState,
} from "@/game/simulation/state/world-state";

export interface CommandResult {
  ok: boolean;
  events: SimulationEvent[];
  error?: string;
}

const DEFENSIVE_WATCH_THRESHOLD = 5;

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

      case "readMessage":
        return this.readMessage(command.messageId);

      case "acceptContract":
        return this.acceptContract(command.contractId);

      case "declineContract":
        return this.declineContract(command.contractId);

      case "deliverContract":
        return this.deliverContract(command.contractId);

      case "buyHardware":
        return this.buyHardware(command.catalogId);

      case "rentHousing":
        return this.rentHousing(command.housingId);

      case "breakLease":
        return this.breakLease();

      case "enableSoftware":
        return this.enableSoftware(command.softwareId);

      case "disableSoftware":
        return this.disableSoftware(command.softwareId);

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

    const scope = this.rigDiscoveryScope();
    const discovered = target.machines
      .filter((candidate) => !this.hasEvidence("machine-presence", candidate.id))
      .slice(0, scope);

    if (discovered.length === 0) {
      return this.failure("NO_NEW_MACHINE_EVIDENCE");
    }

    const timeEvents = this.advanceWorldTime(this.rigActionMinutes("survey"));

    const events: SimulationEvent[] = [...timeEvents];

    for (const machine of discovered) {
      this.recordEvidence({
        id: `machine-presence:${machine.id}`,
        kind: "machine-presence",
        subjectId: machine.id,
        confidence: "observed",
        source: "direct-observation",
        worldMinute: this.world.worldMinute,
      });

      events.push({
        type: "MachineObserved",
        targetId: target.id,
        machineId: machine.id,
        worldMinute: this.world.worldMinute,
      });
    }

    return {
      ok: true,
      events,
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

    const scope = this.rigDiscoveryScope();
    const discovered = located.machine.services
      .filter((candidate) => !this.hasEvidence("service-presence", candidate.id))
      .slice(0, scope);

    if (discovered.length === 0) {
      return this.failure("NO_NEW_SERVICE_EVIDENCE");
    }

    const timeEvents = this.advanceWorldTime(this.rigActionMinutes("inspect"));

    const events: SimulationEvent[] = [...timeEvents];

    for (const service of discovered) {
      this.recordEvidence({
        id: `service-presence:${service.id}`,
        kind: "service-presence",
        subjectId: service.id,
        confidence: "observed",
        source: "direct-observation",
        worldMinute: this.world.worldMinute,
      });

      events.push({
        type: "ServiceObserved",
        targetId: located.target.id,
        machineId: located.machine.id,
        serviceId: service.id,
        worldMinute: this.world.worldMinute,
      });
    }

    return {
      ok: true,
      events,
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

    const watched = this.world.reactions.some(
      (reaction) =>
        reaction.targetId === operation.targetId &&
        reaction.status === "active",
    );
    const timeEvents = this.advanceWorldTime(
      this.rigActionMinutes("escalate"),
    );
    operation.stage = "intrusive";
    operation.escalatedWorldMinute = this.world.worldMinute;

    const traceEvent = this.recordTrace({
      targetId: operation.targetId,
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: this.world.worldMinute,
    });
    const reactionEvents = this.evaluateOpponentReaction(operation.targetId);
    const provocationEvents = watched
      ? applyProvocation(
          this.world,
          operation.targetId,
          traceEvent.traceId,
          this.world.worldMinute,
        )
      : [];

    return {
      ok: true,
      events: [
        ...timeEvents,
        {
          type: "OperationEscalated",
          targetId: operation.targetId,
          fromStage: "recon",
          toStage: "intrusive",
          worldMinute: this.world.worldMinute,
        },
        traceEvent,
        ...reactionEvents,
        ...provocationEvents,
      ],
    };
  }

  private disengageOperation(): CommandResult {
    const operation = this.world.operation;

    if (!operation) {
      return this.failure("NO_ACTIVE_OPERATION");
    }

    const timeEvents = this.advanceWorldTime(
      this.rigActionMinutes("disengage"),
    );
    const stage = operation.stage;
    const event: SimulationEvent = {
      type: "OperationDisengaged",
      targetId: operation.targetId,
      stage,
      worldMinute: this.world.worldMinute,
    };

    const traceEvent = this.recordTrace({
      targetId: operation.targetId,
      cause: "operation-disengagement",
      stage,
      severity: stage === "intrusive" ? "elevated" : "low",
      weight: stage === "intrusive" ? 2 : 1,
      worldMinute: this.world.worldMinute,
    });
    const reactionEvents = this.evaluateOpponentReaction(operation.targetId);

    this.world.operation = null;

    return {
      ok: true,
      events: [
        ...timeEvents,
        event,
        traceEvent,
        ...reactionEvents,
      ],
    };
  }

  private readMessage(messageId: string): CommandResult {
    const message = this.world.underground.messages.find(
      (candidate) => candidate.id === messageId,
    );

    if (!message) {
      return this.failure("MESSAGE_NOT_FOUND");
    }

    if (message.read) {
      return this.failure("MESSAGE_ALREADY_READ");
    }

    message.read = true;

    return {
      ok: true,
      events: [
        {
          type: "MessageRead",
          messageId: message.id,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private acceptContract(contractId: string): CommandResult {
    const contract = this.world.underground.contracts.find(
      (candidate) => candidate.id === contractId,
    );

    if (!contract) {
      return this.failure("CONTRACT_NOT_FOUND");
    }

    const minute = this.world.worldMinute;

    if (
      contract.status === "expired" ||
      (contract.status === "offered" && minute > contract.expiresWorldMinute)
    ) {
      return this.failure("CONTRACT_EXPIRED");
    }

    if (contract.status !== "offered") {
      return this.failure("CONTRACT_NOT_OFFERED");
    }

    contract.status = "accepted";
    contract.acceptedWorldMinute = minute;
    contract.dueWorldMinute = contractDueMinute(contract, minute);

    return {
      ok: true,
      events: [
        {
          type: "ContractAccepted",
          contractId: contract.id,
          dueWorldMinute: contract.dueWorldMinute,
          worldMinute: minute,
        },
      ],
    };
  }

  private declineContract(contractId: string): CommandResult {
    const contract = this.world.underground.contracts.find(
      (candidate) => candidate.id === contractId,
    );

    if (!contract) {
      return this.failure("CONTRACT_NOT_FOUND");
    }

    if (contract.status !== "offered") {
      return this.failure("CONTRACT_NOT_OFFERED");
    }

    contract.status = "declined";
    contract.resolvedWorldMinute = this.world.worldMinute;

    return {
      ok: true,
      events: [
        {
          type: "ContractDeclined",
          contractId: contract.id,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private deliverContract(contractId: string): CommandResult {
    const contract = this.world.underground.contracts.find(
      (candidate) => candidate.id === contractId,
    );

    if (!contract) {
      return this.failure("CONTRACT_NOT_FOUND");
    }

    const minute = this.world.worldMinute;

    if (
      contract.status === "expired" ||
      (contract.status === "accepted" &&
        contract.dueWorldMinute !== undefined &&
        minute > contract.dueWorldMinute)
    ) {
      return this.failure("CONTRACT_EXPIRED");
    }

    if (contract.status !== "accepted") {
      return this.failure("CONTRACT_NOT_ACCEPTED");
    }

    if (!isObjectiveMet(this.world, contract)) {
      return this.failure("OBJECTIVE_NOT_MET");
    }

    contract.status = "completed";
    contract.resolvedWorldMinute = minute;

    return {
      ok: true,
      events: [
        {
          type: "ContractDelivered",
          contractId: contract.id,
          worldMinute: minute,
        },
        ...rewardContract(this.world, contract, minute),
      ],
    };
  }

  private advanceTime(minutes: number): CommandResult {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return this.failure("INVALID_TIME_DELTA");
    }

    return {
      ok: true,
      events: this.advanceWorldTime(minutes),
    };
  }

  private buyHardware(catalogId: string): CommandResult {
    const item = findCatalogItem(catalogId);

    if (!item) {
      return this.failure("HARDWARE_NOT_FOUND");
    }

    const minute = this.world.worldMinute;

    if (this.world.economy.credits < item.cost) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    const payment = transferValue(this.world, {
      direction: "debit",
      amount: item.cost,
      causeKind: "hardware",
      causeId: item.id,
      counterparty: MARKET_COUNTERPARTY,
      worldMinute: minute,
    });

    if (!payment) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    const owned: OwnedHardware = {
      id: `hw:${this.world.economy.hardware.length + 1}`,
      catalogId: item.id,
      acquiredWorldMinute: minute,
    };
    this.world.economy.hardware.push(owned);

    return {
      ok: true,
      events: [
        payment,
        {
          type: "HardwareAcquired",
          hardwareId: owned.id,
          catalogId: owned.catalogId,
          cost: item.cost,
          worldMinute: minute,
        },
      ],
    };
  }

  private rentHousing(housingId: string): CommandResult {
    const item = findHousingItem(housingId);

    if (!item) {
      return this.failure("HOUSING_NOT_FOUND");
    }

    if (this.world.economy.housing === housingId) {
      return this.failure("ALREADY_RENTED");
    }

    const minute = this.world.worldMinute;

    // Signing or switching a lease moves no credits in P3: the cost is levied
    // at the next whole-day boundary through advanceUpkeep. The choice is
    // therefore reversible, and switching never double-bills.
    this.world.economy.housing = item.id;

    return {
      ok: true,
      events: [
        {
          type: "HousingChanged",
          housingId: item.id,
          dailyCost: item.dailyCost,
          worldMinute: minute,
        },
      ],
    };
  }

  private breakLease(): CommandResult {
    if (!this.world.economy.housing) {
      return this.failure("NO_ACTIVE_LEASE");
    }

    this.world.economy.housing = null;

    return {
      ok: true,
      events: [
        {
          type: "HousingChanged",
          housingId: null,
          dailyCost: 0,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private enableSoftware(softwareId: string): CommandResult {
    const item = findSoftwareItem(softwareId);

    if (!item) {
      return this.failure("SOFTWARE_NOT_FOUND");
    }

    if (this.world.economy.software.includes(softwareId)) {
      return this.failure("ALREADY_ACTIVE");
    }

    // Activating a license moves no credits in P4: the daily fee is levied at
    // the next whole-day boundary through advanceUpkeep. The choice is free and
    // reversible, so stacking or swapping tools never double-bills.
    this.world.economy.software = [
      ...this.world.economy.software,
      item.id,
    ];

    return {
      ok: true,
      events: [
        {
          type: "SoftwareChanged",
          softwareId: item.id,
          active: true,
          dailyCost: item.dailyCost,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private disableSoftware(softwareId: string): CommandResult {
    const item = findSoftwareItem(softwareId);

    if (!item) {
      return this.failure("SOFTWARE_NOT_FOUND");
    }

    if (!this.world.economy.software.includes(softwareId)) {
      return this.failure("NOT_RUNNING");
    }

    this.world.economy.software = this.world.economy.software.filter(
      (candidate) => candidate !== item.id,
    );

    return {
      ok: true,
      events: [
        {
          type: "SoftwareChanged",
          softwareId: item.id,
          active: false,
          dailyCost: 0,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private rigActionMinutes(action: ReconAction): number {
    return actionDuration(
      action,
      effectiveCapability(this.world.economy),
      actionDurationFactor(this.world.economy.software),
    );
  }

  private rigDiscoveryScope(): number {
    return discoveryScope(effectiveCapability(this.world.economy).memory);
  }

  private advanceWorldTime(minutes: number): SimulationEvent[] {
    const fromMinute = this.world.worldMinute;
    this.world.worldMinute += minutes;

    return [
      {
        type: "WorldTimeAdvanced",
        fromMinute,
        toMinute: this.world.worldMinute,
      },
      ...advanceUpkeep(this.world, fromMinute, this.world.worldMinute),
      ...advanceUnderground(this.world, this.world.worldMinute),
    ];
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

  private recordTrace(
    input: Omit<OperationTrace, "id">,
  ): Extract<SimulationEvent, { type: "TraceRecorded" }> {
    const trace: OperationTrace = {
      id: `trace:${this.world.traces.length + 1}`,
      ...input,
    };

    this.world.traces.push(trace);

    return {
      type: "TraceRecorded",
      traceId: trace.id,
      targetId: trace.targetId,
      cause: trace.cause,
      severity: trace.severity,
      worldMinute: trace.worldMinute,
    };
  }

  private evaluateOpponentReaction(targetId: string): SimulationEvent[] {
    const alreadyActive = this.world.reactions.some(
      (reaction) =>
        reaction.targetId === targetId && reaction.status === "active",
    );

    if (alreadyActive) {
      return [];
    }

    const causalTraces = this.world.traces.filter(
      (trace) => trace.targetId === targetId,
    );
    const footprintScore = causalTraces.reduce(
      (sum, trace) => sum + trace.weight,
      0,
    );

    if (footprintScore < DEFENSIVE_WATCH_THRESHOLD) {
      return [];
    }

    const reaction: OpponentReaction = {
      id: `reaction:${this.world.reactions.length + 1}`,
      targetId,
      kind: "defensive-watch",
      status: "active",
      sourceTraceIds: causalTraces.map((trace) => trace.id),
      footprintScore,
      triggeredWorldMinute: this.world.worldMinute,
      playerVisible: true,
    };

    this.world.reactions.push(reaction);

    return [
      {
        type: "OpponentReactionTriggered",
        reactionId: reaction.id,
        targetId: reaction.targetId,
        kind: reaction.kind,
        sourceTraceIds: [...reaction.sourceTraceIds],
        footprintScore: reaction.footprintScore,
        worldMinute: reaction.triggeredWorldMinute,
      },
      ...applyReactionRelationship(
        this.world,
        targetId,
        reaction.id,
        reaction.triggeredWorldMinute,
      ),
      ...spreadPlayerFootprint(
        this.world,
        targetId,
        reaction.id,
        reaction.triggeredWorldMinute,
      ),
    ];
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
