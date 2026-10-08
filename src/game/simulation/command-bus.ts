import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  MARKET_COUNTERPARTY,
  findCatalogItem,
} from "@/content/hardware-catalog";
import { transferValue } from "@/game/simulation/systems/economy";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { advanceUpkeep } from "@/game/simulation/systems/upkeep";
import { advanceInvestigations } from "@/game/simulation/systems/investigations";
import { applyActiveOutageToBuild } from "@/game/simulation/systems/physical-retaliation";
import { compromiseTick } from "@/game/simulation/systems/compromise";
import {
  endRun,
  forcedEndingTick,
} from "@/game/simulation/systems/endings";
import {
  RETIREMENT_COMMIT_MINUTES,
  beginRetirementPlan,
  cancelRetirementPlan,
  commandAllowedDuringRetirementCooling,
  commitRetirementPlan,
  deriveRetirementOutcome,
  retirementBlockers,
  retirementReady,
} from "@/game/simulation/systems/retirement";
import { relocationMinutes } from "@/game/simulation/systems/location";
import { combinedActionDurationFactor } from "@/game/simulation/systems/tools";
import { findHousingItem } from "@/content/housing-catalog";
import {
  FENCE_COUNTERPARTY,
  findPlayerToolItem,
  resaleValue,
} from "@/content/player-tool-catalog";
import {
  MACHINE_LABEL_MAX_LENGTH,
  findMachineItem,
  machineResaleValue,
} from "@/content/machine-catalog";
import {
  exoticMachineAvailability,
} from "@/game/simulation/systems/exotic-capability";
import { findModelItem } from "@/content/model-catalog";
import { runAnalysis } from "@/game/simulation/systems/analysis";
import {
  advanceBuilds,
  buildMinutes,
  nextBuildId,
  poolForNewBuild,
  rollBuildOutcome,
} from "@/game/simulation/systems/builds";
import { contestedModelFactor } from "@/game/simulation/systems/contention";
import { findWorkflowSpec } from "@/content/workflow-spec-catalog";
import {
  actionDuration,
  type ReconAction,
} from "@/game/simulation/systems/compute";
import { discoveryScope } from "@/game/simulation/systems/scale";
import {
  findSoftwareItem,
} from "@/content/software-catalog";
import {
  advanceUnderground,
  TICK_MINUTES,
  applyProvocation,
  applyReactionRelationship,
  contractDueMinute,
  isObjectiveMet,
  rewardContract,
  spreadPlayerFootprint,
} from "@/game/simulation/systems/underground";
import {
  cancelJob,
  completeJob,
  enqueueJob,
  findQueuedJob,
  runningJobFor,
  startRunnableJobs,
} from "@/game/simulation/scheduler/job-queue";
import {
  TIME_JOB_PHASE,
  firstStopEvent,
  isInterruptibleKind,
  stopClassesFor,
  type TimeJobKind,
} from "@/game/simulation/systems/time-jobs";
import type {
  AnalysisRecord,
  EvidenceKind,
  EvidenceRecord,
  InFlightBuild,
  MachineState,
  OpponentReaction,
  OperationTrace,
  OwnedHardware,
  OwnedMachine,
  OwnedPlayerTool,
  TargetState,
  WorldState,
} from "@/game/simulation/state/world-state";

export interface CommandResult {
  ok: boolean;
  events: SimulationEvent[];
  error?: string;
}

const DEFENSIVE_WATCH_THRESHOLD = 5;

/**
 * Longest single `advanceTime` the authority accepts (D054). Every ecosystem
 * boundary inside the wait is simulated, so per-command work grows with the
 * horizon: in the authored slice a 90-day wait takes roughly 80 ms, while a
 * decade-long wait takes several seconds on one thread. Longer horizons are
 * rejected with `ADVANCE_TOO_LONG` and move nothing; the player chains waits
 * instead. Rejecting is the only alternative to truncating, and truncation is
 * the defect this bound replaces.
 */
export const MAX_ADVANCE_MINUTES = 90 * 24 * 60;

/** Boundaries one `pumpTime` may simulate, bounding one runtime frame of work. */
export const MAX_PUMP_BOUNDARIES = 28;

/** Most world minutes one `pumpTime` may advance. */
export const MAX_PUMP_MINUTES = MAX_PUMP_BOUNDARIES * TICK_MINUTES;

/** Commands that may run while a time job owns the clock. */
function commandAllowedDuringTimeJob(type: string): boolean {
  return type === "cancelAdvance" || type === "pumpTime";
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
    if (this.world.ending) {
      return this.failure("RUN_ENDED");
    }

    if (
      runningJobFor(this.world.jobQueue, "clock") &&
      !commandAllowedDuringTimeJob(command.type)
    ) {
      return this.failure("TIME_JOB_ACTIVE");
    }

    if (
      this.world.retirement?.stage === "cooling" &&
      !commandAllowedDuringRetirementCooling(command.type)
    ) {
      return this.failure("RETIREMENT_COOLING_ACTIVE");
    }

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

      case "buyPlayerTool":
        return this.buyPlayerTool(command.toolId);

      case "sellPlayerTool":
        return this.sellPlayerTool(command.toolId);

      case "buyMachine":
        return this.buyMachine(command.catalogId);

      case "sellMachine":
        return this.sellMachine(command.machineId);

      case "renameMachine":
        return this.renameMachine(command.machineId, command.label);

      case "acquireModel":
        return this.acquireModel(command.modelId);

      case "runModel":
        return this.runModel(command.modelId);

      case "stopModel":
        return this.stopModel();

      case "analyzeTarget":
        return this.analyzeTarget(command.targetId);
      case "startBuild":
        return this.startBuild(command.specId);
      case "abortBuild":
        return this.abortBuild(command.buildId);

      case "advanceTime":
        return this.advanceTime(command.minutes);

      case "sleep":
        return this.startTimeJob("sleep", command.minutes);

      case "fastForward":
        return this.startTimeJob("fast-forward", command.minutes);

      case "cancelAdvance":
        return this.cancelAdvance();

      case "pumpTime":
        return this.pumpTime(command.minutes);

      case "advanceLive":
        return this.advanceLive(command.minutes);

      case "startRetirement":
        return this.startRetirement();

      case "commitRetirement":
        return this.commitRetirement();

      case "cancelRetirement":
        return this.cancelRetirement();

      case "finishRetirement":
        return this.finishRetirement();
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
    if (this.world.ending) {
      return { ok: true, events: timeEvents };
    }

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
    if (this.world.ending) {
      return { ok: true, events: timeEvents };
    }

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
    if (this.world.ending) {
      return { ok: true, events: timeEvents };
    }

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
    if (this.world.ending) {
      return { ok: true, events: timeEvents };
    }

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

  private startRetirement(): CommandResult {
    if (this.world.retirement) {
      return this.failure("RETIREMENT_ALREADY_ACTIVE");
    }

    beginRetirementPlan(this.world);

    return {
      ok: true,
      events: [
        {
          type: "RetirementPlanned",
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private commitRetirement(): CommandResult {
    const plan = this.world.retirement;
    if (!plan) {
      return this.failure("NO_RETIREMENT_PLAN");
    }
    if (plan.stage !== "planning") {
      return this.failure("RETIREMENT_ALREADY_COMMITTED");
    }
    if (retirementBlockers(this.world).length > 0) {
      return this.failure("RETIREMENT_BLOCKED");
    }

    const timeEvents = this.advanceWorldTime(RETIREMENT_COMMIT_MINUTES);
    if (this.world.ending) {
      return { ok: true, events: timeEvents };
    }

    // The world is live during the commit hour. Re-check the same visible
    // obligations at the arrival minute before freezing the cooling deadline.
    // A newly-active obligation keeps the plan in PLANNING, but the hour was
    // still spent and its world events remain authoritative.
    if (retirementBlockers(this.world).length > 0) {
      return {
        ok: false,
        events: timeEvents,
        error: "RETIREMENT_BLOCKED",
      };
    }

    commitRetirementPlan(this.world);
    const committed = this.world.retirement;
    if (!committed || committed.stage !== "cooling") {
      return this.failure("RETIREMENT_COMMIT_FAILED");
    }
    const readyWorldMinute = committed.coolingUntilWorldMinute;

    return {
      ok: true,
      events: [
        ...timeEvents,
        {
          type: "RetirementCoolingStarted",
          readyWorldMinute,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private finishRetirement(): CommandResult {
    const plan = this.world.retirement;
    if (!plan || plan.stage !== "cooling" || !retirementReady(this.world)) {
      return this.failure("RETIREMENT_NOT_READY");
    }

    const outcome = deriveRetirementOutcome(this.world);
    if (!outcome) {
      return this.failure("RETIREMENT_NOT_READY");
    }

    const causeId =
      `retirement:${plan.startedWorldMinute}:${plan.committedWorldMinute}`;

    return {
      ok: true,
      events: endRun(this.world, {
        status: outcome.status,
        causeKind: "retirement",
        causeId,
        worldMinute: this.world.worldMinute,
      }),
    };
  }

  private cancelRetirement(): CommandResult {
    const plan = this.world.retirement;
    if (!plan) {
      return this.failure("NO_RETIREMENT_PLAN");
    }

    const stage = plan.stage;
    cancelRetirementPlan(this.world);

    return {
      ok: true,
      events: [
        {
          type: "RetirementCancelled",
          stage,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private advanceTime(minutes: number): CommandResult {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return this.failure("INVALID_TIME_DELTA");
    }

    // A wait within the synchronous budget is one plain advance, exactly as
    // before the job queue existed. A longer one becomes a non-interruptible
    // wait job that the runtime clock finishes in bounded chunks (D055).
    if (minutes <= MAX_ADVANCE_MINUTES) {
      return {
        ok: true,
        events: this.advanceWorldTime(minutes),
      };
    }

    return this.startTimeJob("wait", minutes);
  }

  /**
   * Queues a time job due `minutes` from now on the clock. A long wait runs its
   * first slice now; anything left is pumped later (D055). Sleep and
   * fast-forward run nothing in their command: the runtime clock paces them, so
   * the player sees the time pass and can interrupt it (D056).
   */
  private startTimeJob(kind: TimeJobKind, minutes: number): CommandResult {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return this.failure("INVALID_TIME_DELTA");
    }

    const startedWorldMinute = this.world.worldMinute;
    const { queue, job } = enqueueJob(this.world.jobQueue, {
      kind,
      resource: "clock",
      phasePriority: TIME_JOB_PHASE[kind],
      startedWorldMinute,
      dueWorldMinute: startedWorldMinute + minutes,
    });
    this.world.jobQueue = startRunnableJobs(queue);

    const events: SimulationEvent[] = [
      {
        type: "TimeJobStarted",
        jobId: job.id,
        kind,
        startedWorldMinute,
        targetWorldMinute: job.dueWorldMinute,
      },
    ];
    if (kind === "wait") {
      events.push(...this.stepTimeJob(job.id, MAX_ADVANCE_MINUTES));
    }

    return { ok: true, events };
  }

  /**
   * Advances one running time job by at most `maxMinutes` of world time, and
   * records how it ended if it did.
   *
   * A job that can be stopped (sleep, fast-forward) is simulated one minute at
   * a time and judged after each minute. A stop therefore lands on the minute
   * of the event that caused it, and that minute is the same however the time
   * was paced into `pumpTime` commands (D056). Judging whole ecosystem
   * boundaries instead would make the stop depend on which minutes a pump
   * happened to end inside, and would hold unjudged events across commands.
   *
   * A job that cannot be stopped (wait) has nothing to judge, so it runs in as
   * few windows as its budget allows.
   */
  private stepTimeJob(jobId: string, maxMinutes: number): SimulationEvent[] {
    const job = findQueuedJob(this.world.jobQueue, jobId);

    if (!job || job.status !== "running") {
      return [];
    }

    const kind = job.kind as TimeJobKind;
    const fromMinute = this.world.worldMinute;
    const stoppable = stopClassesFor(kind).length > 0;
    const events: SimulationEvent[] = [];
    let budget = maxMinutes;
    let stop: SimulationEvent | null = null;

    while (
      budget > 0 &&
      this.world.worldMinute < job.dueWorldMinute &&
      !this.world.ending
    ) {
      const now = this.world.worldMinute;
      const windowEnd = Math.min(
        job.dueWorldMinute,
        now + (stoppable ? 1 : budget),
      );
      const windowEvents = this.simulateWindow(windowEnd - now);

      budget -= windowEnd - now;
      events.push(...windowEvents);
      stop = firstStopEvent(kind, windowEvents);

      if (stop) {
        break;
      }
    }

    if (this.world.worldMinute > fromMinute) {
      events.unshift({
        type: "WorldTimeAdvanced",
        fromMinute,
        toMinute: this.world.worldMinute,
      });
    }

    // A run ending freezes the tail: the job is discarded, and RunEnded is the
    // record. It takes precedence over any interruption in the same window.
    if (this.world.ending) {
      this.world.jobQueue = cancelJob(this.world.jobQueue, job.id).queue;
      return events;
    }

    if (stop) {
      this.world.jobQueue = startRunnableJobs(
        cancelJob(this.world.jobQueue, job.id).queue,
      );
      events.push({
        type: "TimeJobInterrupted",
        jobId: job.id,
        kind,
        worldMinute: this.world.worldMinute,
        targetWorldMinute: job.dueWorldMinute,
        cause: stop.type,
      });
      return events;
    }

    if (this.world.worldMinute >= job.dueWorldMinute) {
      this.world.jobQueue = startRunnableJobs(
        completeJob(this.world.jobQueue, job.id),
      );
      events.push({
        type: "TimeJobCompleted",
        jobId: job.id,
        kind,
        worldMinute: this.world.worldMinute,
      });
      return events;
    }

    events.push({
      type: "TimeJobProgressed",
      jobId: job.id,
      kind,
      worldMinute: this.world.worldMinute,
      targetWorldMinute: job.dueWorldMinute,
    });
    return events;
  }

  private cancelAdvance(): CommandResult {
    const job = runningJobFor(this.world.jobQueue, "clock");

    if (!job) {
      return this.failure("NO_ACTIVE_TIME_JOB");
    }

    const kind = job.kind as TimeJobKind;

    if (!isInterruptibleKind(kind)) {
      return this.failure("ADVANCE_NOT_CANCELLABLE");
    }

    const { queue, cancelled } = cancelJob(this.world.jobQueue, job.id);
    this.world.jobQueue = startRunnableJobs(queue);

    return {
      ok: true,
      events: cancelled.map((removed) => ({
        type: "TimeJobCancelled" as const,
        jobId: removed.id,
        kind: removed.kind as TimeJobKind,
        worldMinute: this.world.worldMinute,
        targetWorldMinute: removed.dueWorldMinute,
      })),
    };
  }

  /**
   * One bounded step of live time while no job holds the clock (D056). The
   * clock gate refuses it during a job; this check keeps each command's work
   * to a single boundary so a step never simulates an unbounded stretch.
   */
  private advanceLive(minutes: number): CommandResult {
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > TICK_MINUTES) {
      return this.failure("INVALID_TIME_DELTA");
    }

    return {
      ok: true,
      events: this.advanceWorldTime(minutes),
    };
  }

  private pumpTime(minutes: number): CommandResult {
    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > MAX_PUMP_MINUTES
    ) {
      return this.failure("INVALID_TIME_DELTA");
    }

    const job = runningJobFor(this.world.jobQueue, "clock");

    if (!job) {
      return { ok: true, events: [] };
    }

    return {
      ok: true,
      events: this.stepTimeJob(job.id, minutes),
    };
  }

  /**
   * Hardware can now be destroyed by P3. Length-based ids would reuse a
   * destroyed suffix and can collide with a surviving row (or with provenance).
   * Scan both owned and destroyed instance ids so identity stays monotonic for
   * the whole run, just like sold tools/machines.
   */
  private nextHardwareId(): string {
    let max = 0;
    const consider = (id: string) => {
      const suffix = Number(id.slice(id.lastIndexOf(":") + 1));
      if (Number.isInteger(suffix) && suffix > max) {
        max = suffix;
      }
    };

    for (const owned of this.world.economy.hardware) {
      consider(owned.id);
    }
    for (const threat of this.world.physicalThreats) {
      for (const destroyedId of threat.destroyedHardwareIds) {
        consider(destroyedId);
      }
    }

    return `hw:${max + 1}`;
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
      id: this.nextHardwareId(),
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

    // Signing or switching a lease moves no credits in P3: the cost is levied
    // at the next whole-day boundary through advanceUpkeep. The choice is
    // therefore reversible, and switching never double-bills.
    //
    // Phase 6 P0 adds the one thing money was never the constraint on: *time*.
    // Relocating to a dwelling in another district costs the difference in
    // travel distance and is paid by advancing the world clock, so the world
    // keeps acting while the player moves — relocation as a decision rather
    // than a menu switch. A same-district lease declares no `travelMinutes`, so
    // it resolves to 0 and emits no time events at all, which is what keeps
    // every pre-Phase-6 lease test byte-identical.
    //
    // Ordering is deliberate: the journey happens *before* the new lease
    // exists, so the player keeps paying wherever they actually slept during
    // the travel, and presence — derived from the lease, not stored — flips on
    // arrival. `HousingChanged` therefore carries the arrival minute.
    const travel = relocationMinutes(this.world.economy.housing, item.id);
    const events: SimulationEvent[] = [];

    if (travel > 0) {
      events.push(...this.advanceWorldTime(travel));
      if (this.world.ending) {
        return { ok: true, events };
      }
    }

    this.world.economy.housing = item.id;

    events.push({
      type: "HousingChanged",
      housingId: item.id,
      dailyCost: item.dailyCost,
      worldMinute: this.world.worldMinute,
    });

    return {
      ok: true,
      events,
    };
  }

  private breakLease(): CommandResult {
    if (!this.world.economy.housing) {
      return this.failure("NO_ACTIVE_LEASE");
    }

    // Phase 6 P0: moving out is a journey too. Symmetric with signing so
    // relocation stays a decision rather than a free one-way button — a player
    // who fled to the outskirts pays the same trip to come back. Involuntary
    // eviction (`advanceUpkeep`) deliberately keeps no travel cost: the world
    // is acting on the player there, not the player choosing to move.
    //
    // Same-district travel is 0 minutes and emits no time events at all, which
    // is what keeps every pre-Phase-6 lease test byte-identical.
    const travel = relocationMinutes(this.world.economy.housing, null);
    const events: SimulationEvent[] = [];

    if (travel > 0) {
      events.push(...this.advanceWorldTime(travel));
      if (this.world.ending) {
        return { ok: true, events };
      }
    }

    this.world.economy.housing = null;

    events.push({
      type: "HousingChanged",
      housingId: null,
      dailyCost: 0,
      worldMinute: this.world.worldMinute,
    });

    return {
      ok: true,
      events,
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

  private buyPlayerTool(toolId: string): CommandResult {
    const item = findPlayerToolItem(toolId);

    if (!item) {
      return this.failure("TOOL_NOT_FOUND");
    }

    const minute = this.world.worldMinute;

    if (this.world.economy.credits < item.cost) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    const payment = transferValue(this.world, {
      direction: "debit",
      amount: item.cost,
      causeKind: "tool",
      causeId: item.id,
      counterparty: item.author,
      worldMinute: minute,
    });

    if (!payment) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    const owned: OwnedPlayerTool = {
      id: this.nextToolId(),
      catalogId: item.id,
      author: item.author,
      paidCost: item.cost,
      acquiredWorldMinute: minute,
    };
    this.world.economy.playerTools.push(owned);

    return {
      ok: true,
      events: [
        payment,
        {
          type: "PlayerToolAcquired",
          toolId: owned.id,
          catalogId: owned.catalogId,
          author: owned.author,
          cost: item.cost,
          worldMinute: minute,
        },
      ],
    };
  }

  private sellPlayerTool(toolId: string): CommandResult {
    const owned = this.world.economy.playerTools.find(
      (candidate) => candidate.id === toolId,
    );

    if (!owned) {
      return this.failure("TOOL_NOT_OWNED");
    }

    const minute = this.world.worldMinute;
    const proceeds = resaleValue(owned.paidCost);

    // Resale credits the player and records a named edge back to the author,
    // then the copy leaves the inventory. transferValue cannot push credits
    // negative and a credit only ever grows the balance, so this always moves.
    const payout = transferValue(this.world, {
      direction: "credit",
      amount: proceeds,
      causeKind: "tool",
      causeId: owned.catalogId,
      counterparty: FENCE_COUNTERPARTY,
      worldMinute: minute,
    });

    this.world.economy.playerTools = this.world.economy.playerTools.filter(
      (candidate) => candidate.id !== owned.id,
    );

    return {
      ok: true,
      events: [
        ...(payout ? [payout] : []),
        {
          type: "PlayerToolSold",
          toolId: owned.id,
          catalogId: owned.catalogId,
          author: owned.author,
          proceeds,
          worldMinute: minute,
        },
      ],
    };
  }

  /**
   * Next owned-tool id. Tools can be sold back, so a plain length counter would
   * reuse the id of an already-sold copy; take the highest existing suffix and
   * step past it so ids stay unique for the run, even after resales.
   */
  private nextToolId(): string {
    let max = 0;

    for (const owned of this.world.economy.playerTools) {
      const suffix = Number(owned.id.slice(owned.id.lastIndexOf(":") + 1));

      if (Number.isInteger(suffix) && suffix > max) {
        max = suffix;
      }
    }

    return `tool:${max + 1}`;
  }

  /**
   * Next owned-machine id. Machines can be sold back, so — like tools — a plain
   * length counter would reuse a sold copy's id; step past the highest existing
   * numeric suffix so ids stay unique for the run, even after resales.
   */
  private nextMachineId(): string {
    let max = 0;

    for (const owned of this.world.economy.ownedMachines) {
      const suffix = Number(owned.id.slice(owned.id.lastIndexOf(":") + 1));

      if (Number.isInteger(suffix) && suffix > max) {
        max = suffix;
      }
    }

    return `machine:${max + 1}`;
  }

  private buyMachine(catalogId: string): CommandResult {
    const item = findMachineItem(catalogId);

    if (!item) {
      return this.failure("MACHINE_NOT_FOUND");
    }

    if (item.exotic) {
      const availability = exoticMachineAvailability(this.world);

      if (availability === "already-claimed") {
        return this.failure("EXOTIC_ALREADY_CLAIMED");
      }

      if (availability !== "available") {
        return this.failure("EXOTIC_NOT_AVAILABLE");
      }
    }

    const minute = this.world.worldMinute;

    if (this.world.economy.credits < item.cost) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    const payment = transferValue(this.world, {
      direction: "debit",
      amount: item.cost,
      causeKind: "machine",
      causeId: item.id,
      counterparty: MARKET_COUNTERPARTY,
      worldMinute: minute,
    });

    if (!payment) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    const owned: OwnedMachine = {
      id: this.nextMachineId(),
      catalogId: item.id,
      label: item.label,
      paidCost: item.cost,
      acquiredWorldMinute: minute,
    };
    this.world.economy.ownedMachines.push(owned);

    return {
      ok: true,
      events: [
        payment,
        {
          type: "MachineAcquired",
          machineId: owned.id,
          catalogId: owned.catalogId,
          label: owned.label,
          cost: item.cost,
          worldMinute: minute,
        },
      ],
    };
  }

  private sellMachine(machineId: string): CommandResult {
    const owned = this.world.economy.ownedMachines.find(
      (candidate) => candidate.id === machineId,
    );

    if (!owned) {
      return this.failure("MACHINE_NOT_OWNED");
    }

    const minute = this.world.worldMinute;
    const proceeds = machineResaleValue(owned.paidCost);

    // Resale credits the player through the same offline fence as tools, valued
    // against the stored paidCost, then the box leaves the rack. transferValue
    // never pushes credits negative and a credit only grows the balance.
    const payout = transferValue(this.world, {
      direction: "credit",
      amount: proceeds,
      causeKind: "machine",
      causeId: owned.catalogId,
      counterparty: FENCE_COUNTERPARTY,
      worldMinute: minute,
    });

    this.world.economy.ownedMachines =
      this.world.economy.ownedMachines.filter(
        (candidate) => candidate.id !== owned.id,
      );

    return {
      ok: true,
      events: [
        ...(payout ? [payout] : []),
        {
          type: "MachineSold",
          machineId: owned.id,
          catalogId: owned.catalogId,
          label: owned.label,
          proceeds,
          worldMinute: minute,
        },
      ],
    };
  }

  private renameMachine(machineId: string, label: string): CommandResult {
    const owned = this.world.economy.ownedMachines.find(
      (candidate) => candidate.id === machineId,
    );

    if (!owned) {
      return this.failure("MACHINE_NOT_OWNED");
    }

    const trimmed = label.trim();

    if (trimmed.length === 0 || trimmed.length > MACHINE_LABEL_MAX_LENGTH) {
      return this.failure("INVALID_MACHINE_LABEL");
    }

    const minute = this.world.worldMinute;
    owned.label = trimmed;

    return {
      ok: true,
      events: [
        {
          type: "MachineRenamed",
          machineId: owned.id,
          label: owned.label,
          worldMinute: minute,
        },
      ],
    };
  }

  /**
   * Acquire a *local* model: a one-time purchase of owned property, the P5/P7
   * template again. Cloud models have no acquisition step — renting is done by
   * running them — so a cloud id here is a category error, not a price check.
   * Acquiring never starts the model: owning and running are separate choices,
   * so a purchase cannot silently swap out a running subscription.
   *
   * Phase 5 P4 marketplace provenance: when the catalog names an author (an
   * in-fiction peer who wrote and sells the copy), the debit goes to *that*
   * handle and seeds a named edge in the value graph, the same shape a P5 tool
   * purchase has. Otherwise it goes to the anonymous market, as the house-brand
   * models always did. Nothing else changes; the ownership and running rules
   * are the same, so this is purely counterparty routing.
   */
  private acquireModel(modelId: string): CommandResult {
    const item = findModelItem(modelId);

    if (!item) {
      return this.failure("MODEL_NOT_FOUND");
    }

    if (item.source !== "local") {
      return this.failure("MODEL_NOT_LOCAL");
    }

    if (this.world.economy.ownedModels.includes(item.id)) {
      return this.failure("MODEL_ALREADY_OWNED");
    }

    if (this.world.economy.credits < item.cost) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    const payment = transferValue(this.world, {
      direction: "debit",
      amount: item.cost,
      causeKind: "model",
      causeId: item.id,
      counterparty: item.author ?? MARKET_COUNTERPARTY,
      worldMinute: this.world.worldMinute,
    });

    if (!payment) {
      return this.failure("INSUFFICIENT_CREDITS");
    }

    this.world.economy.ownedModels = [
      ...this.world.economy.ownedModels,
      item.id,
    ];

    return {
      ok: true,
      events: [
        payment,
        {
          type: "ModelAcquired",
          modelId: item.id,
          label: item.label,
          cost: item.cost,
          worldMinute: payment.worldMinute,
        },
      ],
    };
  }

  /**
   * Start a model running — exactly one at a time, the rig's single AI
   * assistant. Cloud models need no purchase: running *is* renting, and the
   * subscription starts billing at the next whole-day boundary. Local models
   * must be owned first. Starting, stopping, or switching mid-day moves no
   * credits, so swapping assistants never double-bills (the license rule,
   * unchanged). Switching implicitly stops whatever was running.
   */
  private runModel(modelId: string): CommandResult {
    const item = findModelItem(modelId);

    if (!item) {
      return this.failure("MODEL_NOT_FOUND");
    }

    if (
      item.source === "local" &&
      !this.world.economy.ownedModels.includes(item.id)
    ) {
      return this.failure("LOCAL_MODEL_NOT_OWNED");
    }

    if (this.world.economy.activeModel === item.id) {
      return this.failure("MODEL_ALREADY_ACTIVE");
    }

    this.world.economy.activeModel = item.id;

    return {
      ok: true,
      events: [
        {
          type: "ModelChanged",
          modelId: item.id,
          active: true,
          source: item.source,
          dailyCost: item.dailyCost,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  /** Stop the running model. No debt, no penalty — the lift simply ends. */
  private stopModel(): CommandResult {
    const modelId = this.world.economy.activeModel;

    if (!modelId) {
      return this.failure("NO_MODEL_ACTIVE");
    }

    const item = findModelItem(modelId);
    this.world.economy.activeModel = null;

    return {
      ok: true,
      events: [
        {
          type: "ModelChanged",
          modelId,
          active: false,
          // An unknown id can only come from a stale save; report it as the
          // rental shape it behaved like, with no cost.
          source: item?.source ?? "cloud",
          dailyCost: 0,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  /**
   * Ask the running assistant for its read of a target (Phase 5 P2). The gate is
   * the assistant itself — an active model — plus the same operation and profile
   * prerequisites survey needs; no target or action is ever gated by hardware or
   * software. It costs no world time and adds no trace: the player is asking a
   * question, not touching the network. Each pass replaces the target's single
   * stored record, so the projection always shows the *current* read.
   */
  private analyzeTarget(targetId: string): CommandResult {
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

    const modelId = this.world.economy.activeModel;

    if (!modelId) {
      return this.failure("NO_ACTIVE_MODEL");
    }

    const item = findModelItem(modelId);

    if (!item) {
      // Only a stale save can name a model the catalog no longer carries; there
      // are no properties to read from it, so the assistant has no voice.
      return this.failure("MODEL_NOT_FOUND");
    }

    const observedMachineIds = new Set(
      this.world.evidence
        .filter((record) => record.kind === "machine-presence")
        .map((record) => record.subjectId),
    );
    const observedServiceIds = new Set(
      this.world.evidence
        .filter((record) => record.kind === "service-presence")
        .map((record) => record.subjectId),
    );

    const claims = runAnalysis({
      modelId: item.id,
      properties: item.properties,
      machines: target.machines,
      observedMachineIds,
      observedServiceIds,
      seed: this.world.underground.seed,
      worldMinute: this.world.worldMinute,
    });

    const record: AnalysisRecord = {
      id: `analysis:${target.id}`,
      targetId: target.id,
      modelId: item.id,
      worldMinute: this.world.worldMinute,
      claims,
    };

    const existing = this.world.analysis.findIndex(
      (candidate) => candidate.targetId === target.id,
    );

    if (existing >= 0) {
      this.world.analysis[existing] = record;
    } else {
      this.world.analysis.push(record);
    }

    return {
      ok: true,
      events: [
        {
          type: "AnalysisCompleted",
          targetId: target.id,
          modelId: item.id,
          claimCount: claims.length,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  /**
   * Commission the running assistant to build a workflow spec (Phase 5 P3). The
   * gate is the assistant itself — an active model — the same prerequisite as
   * analysis; a spec is a design, and only an AI can write the code. It costs no
   * credits and no immediate world time: the job enters the queue, occupies its
   * footprint, and lands on its frozen due minute. The delivered model shortcut
   * and the quality roll are both computed *at start*, against the pool the job
   * will actually run against (minus builds already in flight and its own
   * footprint), so a split wait cannot re-time or re-roll it.
   */
  private startBuild(specId: string): CommandResult {
    const spec = findWorkflowSpec(specId);

    if (!spec) {
      return this.failure("WORKFLOW_SPEC_NOT_FOUND");
    }

    const modelId = this.world.economy.activeModel;

    if (!modelId) {
      return this.failure("NO_ACTIVE_MODEL");
    }

    const model = findModelItem(modelId);

    if (!model) {
      // Only a stale save can name a dropped model; there is no assistant to
      // write the code, exactly like the analysis gate.
      return this.failure("MODEL_NOT_FOUND");
    }

    const capability = effectiveCapability(this.world.economy);
    // The build's clock is frozen against the pool left after the jobs already
    // queued (and its own footprint) take their share. With no model running,
    // or a cloud model that contends nothing, the factor is 1: the build pays
    // pure hardware time, and every pre-P3 duration path is untouched.
    const buildPool = poolForNewBuild(capability, this.world.builds, spec);
    const deliveredFactor =
      model.effect.kind === "modifier"
        ? contestedModelFactor(
            model.effect.discount.factor,
            model.footprint,
            buildPool,
          )
        : 1;

    const minutes = buildMinutes(spec, capability, deliveredFactor);
    const startWorldMinute = this.world.worldMinute;
    const build: InFlightBuild = {
      id: nextBuildId(this.world.builds, this.world.economy.ownedWorkflows),
      specId: spec.id,
      modelId: model.id,
      startedWorldMinute: startWorldMinute,
      dueWorldMinute: startWorldMinute + minutes,
      outcome: rollBuildOutcome(
        this.world.underground.seed,
        startWorldMinute,
        model.id,
        spec,
        model.properties,
      ),
    };

    // A job commissioned while power is already out joins that pause. The
    // commissioning due minute and frozen outcome above are never rewritten.
    applyActiveOutageToBuild(this.world, build);
    this.world.builds.push(build);

    return {
      ok: true,
      events: [
        {
          type: "BuildStarted",
          buildId: build.id,
          specId: build.specId,
          modelId: build.modelId,
          minutes,
          worldMinute: startWorldMinute,
        },
      ],
    };
  }

  /** Cancel an in-flight build. No debt, no penalty — the queue slot frees up. */
  private abortBuild(buildId: string): CommandResult {
    const index = this.world.builds.findIndex(
      (candidate) => candidate.id === buildId,
    );

    if (index < 0) {
      return this.failure("BUILD_NOT_FOUND");
    }

    const [build] = this.world.builds.splice(index, 1);

    return {
      ok: true,
      events: [
        {
          type: "BuildAborted",
          buildId: build.id,
          specId: build.specId,
          worldMinute: this.world.worldMinute,
        },
      ],
    };
  }

  private rigActionMinutes(action: ReconAction): number {
    // Phase 5 P1: the rig's vram/storage pool contends a running local model,
    // so the duration factor is read against the same derived pool. Phase 5
    // P3: in-flight builds are tenants of that pool too, and their footprint
    // taxes the model's delivered shortcut while they run.
    const capability = effectiveCapability(this.world.economy);

    return actionDuration(
      action,
      capability,
      combinedActionDurationFactor(
        this.world.economy,
        capability,
        this.world.builds,
      ),
    );
  }

  private rigDiscoveryScope(): number {
    return discoveryScope(effectiveCapability(this.world.economy).memory);
  }

  /**
   * Advances the world by `minutes` and returns one marker followed by the
   * simulation events in the order they happened.
   */
  private advanceWorldTime(minutes: number): SimulationEvent[] {
    const fromMinute = this.world.worldMinute;
    const events = this.simulateWindow(minutes);

    return [
      {
        type: "WorldTimeAdvanced",
        fromMinute,
        toMinute: this.world.worldMinute,
      },
      ...events,
    ];
  }

  /**
   * The simulation itself, without a `WorldTimeAdvanced` marker, so a paced job
   * can run many windows under one marker. Every window runs every ecosystem
   * boundary and deadline it covers, in order (D054, D055).
   */
  private simulateWindow(minutes: number): SimulationEvent[] {
    const fromMinute = this.world.worldMinute;
    const toMinute = fromMinute + minutes;
    this.world.worldMinute = toMinute;

    const upkeepEvents: SimulationEvent[] = [];
    const buildEvents: SimulationEvent[] = [];
    const investigationEvents: SimulationEvent[] = [];
    let cursor = fromMinute;

    // P3 makes chronology observable: a lease can lapse before a later tick,
    // an investigation can warm before a rival acts, and an outage can beat a
    // build due at the exact same boundary. The underground loop owns tick
    // selection and runs every boundary in order (D054); hooks only fold deadline
    // systems around the ticks it runs.
    const undergroundEvents = advanceUnderground(this.world, toMinute, {
      beforeTick: (tickMinute) => {
        upkeepEvents.push(...advanceUpkeep(this.world, cursor, tickMinute));

        // Strictly earlier jobs have already landed. An exact tie waits until
        // after the NPC tick so a physical outage can pause it (D034).
        if (tickMinute > 0) {
          buildEvents.push(...advanceBuilds(this.world, tickMinute - 1));
        }

        investigationEvents.push(
          ...advanceInvestigations(this.world, tickMinute),
        );
        cursor = tickMinute;
      },
      afterPhysicalTick: (tickMinute) => {
        const compromiseEvents = compromiseTick(this.world, tickMinute);
        const endingEvents = forcedEndingTick(this.world, tickMinute);
        return [...compromiseEvents, ...endingEvents];
      },
      afterTick: (tickMinute) => {
        buildEvents.push(...advanceBuilds(this.world, tickMinute));
      },
    });

    const actualToMinute = this.world.ending?.worldMinute ?? toMinute;
    this.world.worldMinute = actualToMinute;

    // A terminal event inside an ecosystem boundary freezes the command at that
    // exact minute. Nothing in the unelapsed tail may bill, finish, or advance.
    if (!this.world.ending) {
      // A final partial tick still pays bills, completes work, and advances
      // derived case material even though no ecosystem action was scheduled.
      if (cursor < toMinute) {
        upkeepEvents.push(...advanceUpkeep(this.world, cursor, toMinute));
        investigationEvents.push(...advanceInvestigations(this.world, toMinute));
        buildEvents.push(...advanceBuilds(this.world, toMinute));
      } else if (cursor === fromMinute) {
        // No ecosystem boundary crossed.
        upkeepEvents.push(...advanceUpkeep(this.world, fromMinute, toMinute));
        investigationEvents.push(...advanceInvestigations(this.world, toMinute));
        buildEvents.push(...advanceBuilds(this.world, toMinute));
      }
    }

    // Events are returned in the order they happened (D056). Each subsystem
    // collects its own events, so a stable sort by world minute restores
    // chronology. Events that share a minute keep the subsystem order below,
    // which is the same whether the wait was split or not.
    const ordered = [
      ...upkeepEvents,
      ...buildEvents,
      ...investigationEvents,
      ...undergroundEvents,
    ]
      .map((event, index) => ({
        event,
        index,
        minute: (event as { worldMinute?: number }).worldMinute ?? fromMinute,
      }))
      .sort((a, b) => a.minute - b.minute || a.index - b.index)
      .map((entry) => entry.event);

    return ordered;
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
