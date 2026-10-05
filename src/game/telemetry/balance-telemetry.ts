import { CORE_WORLD_CONTENT } from "@/content/world-content";
import { HARDWARE_CATALOG } from "@/content/hardware-catalog";
import { HOUSING_CATALOG } from "@/content/housing-catalog";
import { MACHINE_CATALOG } from "@/content/machine-catalog";
import { MODEL_CATALOG } from "@/content/model-catalog";
import { PLAYER_TOOL_CATALOG } from "@/content/player-tool-catalog";
import { SOFTWARE_CATALOG } from "@/content/software-catalog";
import { WORKFLOW_SPEC_CATALOG } from "@/content/workflow-spec-catalog";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import {
  deriveLongRunPressure,
  type LongRunPressureBand,
} from "@/game/simulation/systems/long-run-pressure";
import { retirementStatus } from "@/game/simulation/systems/retirement";
import type {
  CompromiseKind,
  RunEndingCauseKind,
  RunEndingStatus,
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

export const BALANCE_TELEMETRY_SEEDS = 32;
export const BALANCE_TELEMETRY_HORIZON_DAYS = 30;

const DAY_MINUTES = 24 * 60;
const TICK_MINUTES = 360;
const EXIT_EARLIEST_MINUTE = 14 * DAY_MINUTES;
const POLICY_ACTION_GUARD_MINUTES = 60;

export type BalanceTelemetryScenario =
  | "idle"
  | "contractor"
  | "reckless"
  | "career-exit";

export const BALANCE_TELEMETRY_SCENARIOS: readonly BalanceTelemetryScenario[] = [
  "idle",
  "contractor",
  "reckless",
  "career-exit",
];

export interface AuthoredContentCounts {
  actors: number;
  targets: number;
  targetMachines: number;
  targetServices: number;
  hardwareListings: number;
  housingListings: number;
  machineListings: number;
  modelListings: number;
  playerToolListings: number;
  softwareListings: number;
  workflowSpecs: number;
}

export interface BalanceTelemetrySample {
  scenario: BalanceTelemetryScenario;
  seed: number;
  finalMinute: number;
  endingStatus: RunEndingStatus | null;
  endingCauseKind: RunEndingCauseKind | null;
  credits: number;
  rank: number;
  rankImprovement: number;
  ledgerValueMoved: number;
  contractCredits: number;
  contracts: {
    offered: number;
    accepted: number;
    completed: number;
    expired: number;
    declined: number;
  };
  escalations: number;
  compromises: number;
  compromiseKinds: Record<CompromiseKind, number>;
  probes: number;
  physicalThreats: number;
  investigationSignals: number;
  retaliations: number;
  pressureBand: LongRunPressureBand;
  exposure: {
    actorIds: string[];
    targetIds: string[];
    machineIds: string[];
    serviceIds: string[];
    contractIssuerIds: string[];
  };
}

export interface NumericSummary {
  min: number;
  median: number;
  max: number;
  mean: number;
}

export interface BalanceTelemetryScenarioSummary {
  sampleCount: number;
  runMinutes: NumericSummary;
  endings: Record<RunEndingStatus | "active", number>;
  endingCauses: Record<RunEndingCauseKind | "none", number>;
  economy: {
    finalCredits: NumericSummary;
    ledgerValueMoved: NumericSummary;
    contractCredits: NumericSummary;
  };
  ranking: {
    finalRank: NumericSummary;
    improvement: NumericSummary;
  };
  contracts: {
    offered: number;
    accepted: number;
    completed: number;
    expired: number;
    declined: number;
  };
  pressureBands: Record<LongRunPressureBand, number>;
  threat: {
    escalations: number;
    compromises: number;
    compromiseKinds: Record<CompromiseKind, number>;
    probes: number;
    physicalThreats: number;
    investigationSignals: number;
    retaliations: number;
  };
  exposure: {
    actorIds: string[];
    targetIds: string[];
    machineIds: string[];
    serviceIds: string[];
    contractIssuerIds: string[];
  };
}

export interface BalanceTelemetryReport {
  version: 1;
  seedCount: number;
  horizonDays: number;
  authoredContent: AuthoredContentCounts;
  scenarios: Record<BalanceTelemetryScenario, BalanceTelemetryScenarioSummary>;
}

function execute(bus: CommandBus, command: SimulationCommand): boolean {
  return bus.execute(command).ok;
}

function isLive(bus: CommandBus): boolean {
  return bus.snapshot().ending === null;
}

function evidenceHas(
  state: WorldState,
  kind: "target-profile" | "machine-presence" | "service-presence",
  subjectId: string,
): boolean {
  return state.evidence.some(
    (record) => record.kind === kind && record.subjectId === subjectId,
  );
}

function ensureTargetObserved(bus: CommandBus, targetId: string): boolean {
  const state = bus.snapshot();
  if (evidenceHas(state, "target-profile", targetId)) {
    return true;
  }

  return execute(bus, { type: "observeTarget", targetId }) && isLive(bus);
}

function ensureOperation(bus: CommandBus, targetId: string): boolean {
  let state = bus.snapshot();

  if (state.operation && state.operation.targetId !== targetId) {
    execute(bus, { type: "disengageOperation" });
    if (!isLive(bus)) return false;
    state = bus.snapshot();
  }

  if (state.operation?.targetId === targetId) {
    return true;
  }

  return execute(bus, { type: "openOperation", targetId }) && isLive(bus);
}

function knownServiceCount(state: WorldState, targetId: string): number {
  const target = state.targets.find((candidate) => candidate.id === targetId);
  if (!target) return 0;

  return target.machines.reduce(
    (sum, machine) =>
      sum +
      machine.services.filter((service) =>
        evidenceHas(state, "service-presence", service.id),
      ).length,
    0,
  );
}

/**
 * Build only the knowledge needed for a contract through ordinary recon verbs.
 * The policy never writes evidence directly and never treats hidden target data
 * as discovered until the corresponding evidence exists.
 */
function ensureKnownServices(
  bus: CommandBus,
  targetId: string,
  required: number,
): boolean {
  if (!ensureTargetObserved(bus, targetId)) return false;
  if (!ensureOperation(bus, targetId)) return false;

  for (let pass = 0; pass < 32 && isLive(bus); pass += 1) {
    const state = bus.snapshot();

    if (knownServiceCount(state, targetId) >= required) {
      return true;
    }

    const target = state.targets.find((candidate) => candidate.id === targetId);
    if (!target) return false;

    const inspectable = target.machines.find(
      (machine) =>
        evidenceHas(state, "machine-presence", machine.id) &&
        machine.services.some(
          (service) => !evidenceHas(state, "service-presence", service.id),
        ),
    );

    if (inspectable) {
      if (!execute(bus, { type: "inspectMachine", machineId: inspectable.id })) {
        return false;
      }
      continue;
    }

    if (!execute(bus, { type: "surveyTarget", targetId })) {
      return false;
    }
  }

  return knownServiceCount(bus.snapshot(), targetId) >= required;
}

function disengageIfOpen(bus: CommandBus): void {
  if (bus.snapshot().operation && isLive(bus)) {
    execute(bus, { type: "disengageOperation" });
  }
}

function performIntrusion(bus: CommandBus, targetId: string): boolean {
  if (!ensureKnownServices(bus, targetId, 1)) {
    disengageIfOpen(bus);
    return false;
  }

  if (!ensureOperation(bus, targetId)) return false;

  const escalated = execute(bus, { type: "escalateOperation" });
  if (!isLive(bus)) return escalated;

  disengageIfOpen(bus);
  return escalated;
}

function fulfillAcceptedContract(
  bus: CommandBus,
  contract: UndergroundContract,
): boolean {
  if (!isLive(bus)) return false;

  if (contract.objective === "intrusion") {
    if (!performIntrusion(bus, contract.targetId)) return false;
  } else {
    const required = contract.requiredServices ?? 1;
    if (!ensureKnownServices(bus, contract.targetId, required)) {
      disengageIfOpen(bus);
      return false;
    }
    disengageIfOpen(bus);
  }

  if (!isLive(bus)) return false;

  return execute(bus, {
    type: "deliverContract",
    contractId: contract.id,
  });
}

function processOneContract(bus: CommandBus): void {
  if (!isLive(bus)) return;

  let state = bus.snapshot();
  let contract = state.underground.contracts.find(
    (candidate) => candidate.status === "accepted",
  );

  if (!contract) {
    const offered = state.underground.contracts
      .filter((candidate) => candidate.status === "offered")
      .sort(
        (left, right) =>
          left.offeredWorldMinute - right.offeredWorldMinute ||
          left.id.localeCompare(right.id),
      )[0];

    if (!offered) return;

    if (!execute(bus, { type: "acceptContract", contractId: offered.id })) {
      return;
    }

    state = bus.snapshot();
    contract = state.underground.contracts.find(
      (candidate) => candidate.id === offered.id,
    );
  }

  if (contract?.status === "accepted") {
    fulfillAcceptedContract(bus, contract);
  }
}

function completedContracts(state: WorldState): number {
  return state.underground.contracts.filter(
    (contract) => contract.status === "completed",
  ).length;
}

function attemptRetirement(bus: CommandBus): void {
  if (!isLive(bus)) return;

  disengageIfOpen(bus);
  const before = bus.snapshot();

  if (
    before.underground.contracts.some(
      (contract) => contract.status === "accepted",
    )
  ) {
    return;
  }

  for (const offered of before.underground.contracts.filter(
    (contract) => contract.status === "offered",
  )) {
    execute(bus, { type: "declineContract", contractId: offered.id });
  }

  if (!execute(bus, { type: "startRetirement" })) return;
  if (!execute(bus, { type: "commitRetirement" }) || !isLive(bus)) return;

  while (isLive(bus) && retirementStatus(bus.snapshot()) === "cooling") {
    const state = bus.snapshot();
    const plan = state.retirement;
    if (!plan || plan.stage !== "cooling") break;

    const remaining = plan.coolingUntilWorldMinute - state.worldMinute;
    execute(bus, {
      type: "advanceTime",
      minutes: Math.min(TICK_MINUTES, Math.max(1, remaining)),
    });
  }

  if (isLive(bus) && retirementStatus(bus.snapshot()) === "ready") {
    execute(bus, { type: "finishRetirement" });
  }
}

function primeRecklessRun(bus: CommandBus): void {
  const targetId = bus.snapshot().targets[0]?.id;
  if (!targetId) return;

  for (let cycle = 0; cycle < 3 && isLive(bus); cycle += 1) {
    performIntrusion(bus, targetId);
  }
}

function runScenario(
  scenario: BalanceTelemetryScenario,
  seed: number,
  horizonDays: number,
): BalanceTelemetrySample {
  const initial = createSliceWorldState();
  initial.underground.seed = seed;
  const startingRank = initial.player.rank;
  const bus = new CommandBus(initial);
  const horizonMinute = horizonDays * DAY_MINUTES;

  if (scenario === "reckless") {
    primeRecklessRun(bus);
  }

  while (isLive(bus) && bus.snapshot().worldMinute < horizonMinute) {
    const state = bus.snapshot();
    const remaining = horizonMinute - state.worldMinute;

    if (remaining > POLICY_ACTION_GUARD_MINUTES) {
      if (scenario === "contractor" || scenario === "reckless") {
        processOneContract(bus);
      } else if (scenario === "career-exit") {
        if (
          state.worldMinute >= EXIT_EARLIEST_MINUTE &&
          completedContracts(state) >= 3 &&
          !state.underground.contracts.some(
            (contract) => contract.status === "accepted",
          )
        ) {
          attemptRetirement(bus);
        } else {
          processOneContract(bus);
        }
      }
    }

    if (!isLive(bus)) break;

    const now = bus.snapshot().worldMinute;
    if (now >= horizonMinute) break;

    execute(bus, {
      type: "advanceTime",
      minutes: Math.min(TICK_MINUTES, horizonMinute - now),
    });
  }

  return sampleFromWorld(scenario, seed, startingRank, bus.snapshot());
}

function sampleFromWorld(
  scenario: BalanceTelemetryScenario,
  seed: number,
  startingRank: number,
  world: WorldState,
): BalanceTelemetrySample {
  const contractCounts = {
    offered: 0,
    accepted: 0,
    completed: 0,
    expired: 0,
    declined: 0,
  };

  for (const contract of world.underground.contracts) {
    contractCounts[contract.status] += 1;
  }

  const compromiseKinds: Record<CompromiseKind, number> = {
    "rig-lost": 0,
    "dwelling-lost": 0,
    "identity-exposed": 0,
    stranded: 0,
  };
  for (const compromise of world.compromises) {
    compromiseKinds[compromise.kind] += 1;
  }

  const actorIds = new Set<string>();
  const targetIds = new Set<string>(world.knownTargetIds);
  const machineIds = new Set<string>();
  const serviceIds = new Set<string>();
  const contractIssuerIds = new Set<string>();

  for (const incident of world.underground.incidents) {
    if (!incident.public) continue;
    actorIds.add(incident.actorId);
    actorIds.add(incident.counterpartId);
  }
  for (const message of world.underground.messages) actorIds.add(message.fromId);
  for (const post of world.underground.forumPosts) actorIds.add(post.authorId);
  for (const retaliation of world.underground.retaliations) {
    actorIds.add(retaliation.actorId);
  }
  for (const probe of world.probes) actorIds.add(probe.actorId);
  for (const threat of world.physicalThreats) actorIds.add(threat.actorId);

  for (const contract of world.underground.contracts) {
    contractIssuerIds.add(contract.issuerId);
    actorIds.add(contract.issuerId);
    targetIds.add(contract.targetId);
  }

  for (const trace of world.traces) targetIds.add(trace.targetId);
  for (const investigation of world.investigations) {
    targetIds.add(investigation.targetId);
  }

  for (const evidence of world.evidence) {
    if (evidence.kind === "target-profile") targetIds.add(evidence.subjectId);
    if (evidence.kind === "machine-presence") machineIds.add(evidence.subjectId);
    if (evidence.kind === "service-presence") serviceIds.add(evidence.subjectId);
  }

  const ledgerValueMoved = world.economy.ledger.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );
  const contractCredits = world.economy.ledger
    .filter(
      (entry) =>
        entry.direction === "credit" && entry.cause.kind === "contract",
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  const investigationSignals = world.investigations.reduce(
    (sum, investigation) => sum + investigation.signals.length,
    0,
  );

  return {
    scenario,
    seed,
    finalMinute: world.worldMinute,
    endingStatus: world.ending?.status ?? null,
    endingCauseKind: world.ending?.causeKind ?? null,
    credits: world.economy.credits,
    rank: world.player.rank,
    rankImprovement: startingRank - world.player.rank,
    ledgerValueMoved,
    contractCredits,
    contracts: contractCounts,
    escalations: world.traces.filter(
      (trace) => trace.cause === "operation-escalation",
    ).length,
    compromises: world.compromises.length,
    compromiseKinds,
    probes: world.probes.length,
    physicalThreats: world.physicalThreats.length,
    investigationSignals,
    retaliations: world.underground.retaliations.length,
    pressureBand: deriveLongRunPressure(world).band,
    exposure: {
      actorIds: [...actorIds].sort(),
      targetIds: [...targetIds].sort(),
      machineIds: [...machineIds].sort(),
      serviceIds: [...serviceIds].sort(),
      contractIssuerIds: [...contractIssuerIds].sort(),
    },
  };
}

function numericSummary(values: readonly number[]): NumericSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    min: sorted[0] ?? 0,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    max: sorted.at(-1) ?? 0,
    mean: sorted.length === 0 ? 0 : Number((total / sorted.length).toFixed(2)),
  };
}

function emptyEndingCounts(): Record<RunEndingStatus | "active", number> {
  return {
    active: 0,
    arrested: 0,
    unmasked: 0,
    missing: 0,
    compromised: 0,
    stranded: 0,
    retired: 0,
    vanished: 0,
  };
}

function emptyEndingCauseCounts(): Record<RunEndingCauseKind | "none", number> {
  return {
    none: 0,
    compromise: 0,
    investigation: 0,
    "physical-threat": 0,
    retirement: 0,
  };
}

function emptyPressureBands(): Record<LongRunPressureBand, number> {
  return {
    ordinary: 0,
    known: 0,
    entangled: 0,
    veteran: 0,
  };
}

function emptyCompromiseKinds(): Record<CompromiseKind, number> {
  return {
    "rig-lost": 0,
    "dwelling-lost": 0,
    "identity-exposed": 0,
    stranded: 0,
  };
}

function summarizeScenario(
  samples: readonly BalanceTelemetrySample[],
): BalanceTelemetryScenarioSummary {
  const endings = emptyEndingCounts();
  const endingCauses = emptyEndingCauseCounts();
  const pressureBands = emptyPressureBands();
  const compromiseKinds = emptyCompromiseKinds();
  const actorIds = new Set<string>();
  const targetIds = new Set<string>();
  const machineIds = new Set<string>();
  const serviceIds = new Set<string>();
  const contractIssuerIds = new Set<string>();

  const contractTotals = {
    offered: 0,
    accepted: 0,
    completed: 0,
    expired: 0,
    declined: 0,
  };
  const threat = {
    escalations: 0,
    compromises: 0,
    compromiseKinds,
    probes: 0,
    physicalThreats: 0,
    investigationSignals: 0,
    retaliations: 0,
  };

  for (const sample of samples) {
    endings[sample.endingStatus ?? "active"] += 1;
    endingCauses[sample.endingCauseKind ?? "none"] += 1;
    pressureBands[sample.pressureBand] += 1;

    for (const status of Object.keys(contractTotals) as Array<
      keyof typeof contractTotals
    >) {
      contractTotals[status] += sample.contracts[status];
    }

    threat.escalations += sample.escalations;
    threat.compromises += sample.compromises;
    threat.probes += sample.probes;
    threat.physicalThreats += sample.physicalThreats;
    threat.investigationSignals += sample.investigationSignals;
    threat.retaliations += sample.retaliations;

    for (const kind of Object.keys(compromiseKinds) as CompromiseKind[]) {
      compromiseKinds[kind] += sample.compromiseKinds[kind];
    }

    for (const id of sample.exposure.actorIds) actorIds.add(id);
    for (const id of sample.exposure.targetIds) targetIds.add(id);
    for (const id of sample.exposure.machineIds) machineIds.add(id);
    for (const id of sample.exposure.serviceIds) serviceIds.add(id);
    for (const id of sample.exposure.contractIssuerIds) {
      contractIssuerIds.add(id);
    }
  }

  return {
    sampleCount: samples.length,
    runMinutes: numericSummary(samples.map((sample) => sample.finalMinute)),
    endings,
    endingCauses,
    economy: {
      finalCredits: numericSummary(samples.map((sample) => sample.credits)),
      ledgerValueMoved: numericSummary(
        samples.map((sample) => sample.ledgerValueMoved),
      ),
      contractCredits: numericSummary(
        samples.map((sample) => sample.contractCredits),
      ),
    },
    ranking: {
      finalRank: numericSummary(samples.map((sample) => sample.rank)),
      improvement: numericSummary(
        samples.map((sample) => sample.rankImprovement),
      ),
    },
    contracts: contractTotals,
    pressureBands,
    threat,
    exposure: {
      actorIds: [...actorIds].sort(),
      targetIds: [...targetIds].sort(),
      machineIds: [...machineIds].sort(),
      serviceIds: [...serviceIds].sort(),
      contractIssuerIds: [...contractIssuerIds].sort(),
    },
  };
}

export function authoredContentCounts(): AuthoredContentCounts {
  return {
    actors: CORE_WORLD_CONTENT.actors.length,
    targets: CORE_WORLD_CONTENT.targets.length,
    targetMachines: CORE_WORLD_CONTENT.targets.reduce(
      (sum, entry) => sum + entry.target.machines.length,
      0,
    ),
    targetServices: CORE_WORLD_CONTENT.targets.reduce(
      (sum, entry) =>
        sum +
        entry.target.machines.reduce(
          (machineSum, machine) => machineSum + machine.services.length,
          0,
        ),
      0,
    ),
    hardwareListings: HARDWARE_CATALOG.length,
    housingListings: HOUSING_CATALOG.length,
    machineListings: MACHINE_CATALOG.length,
    modelListings: MODEL_CATALOG.length,
    playerToolListings: PLAYER_TOOL_CATALOG.length,
    softwareListings: SOFTWARE_CATALOG.length,
    workflowSpecs: WORKFLOW_SPEC_CATALOG.length,
  };
}

export function sampleBalanceRun(
  scenario: BalanceTelemetryScenario,
  seed: number,
  horizonDays = BALANCE_TELEMETRY_HORIZON_DAYS,
): BalanceTelemetrySample {
  return runScenario(scenario, seed, horizonDays);
}

export function runBalanceTelemetry(
  input: {
    seeds?: readonly number[];
    horizonDays?: number;
    scenarios?: readonly BalanceTelemetryScenario[];
  } = {},
): BalanceTelemetryReport {
  const seeds =
    input.seeds ??
    Array.from({ length: BALANCE_TELEMETRY_SEEDS }, (_, index) => index + 1);
  const horizonDays =
    input.horizonDays ?? BALANCE_TELEMETRY_HORIZON_DAYS;
  const scenarios = input.scenarios ?? BALANCE_TELEMETRY_SCENARIOS;

  const summaries = {} as Record<
    BalanceTelemetryScenario,
    BalanceTelemetryScenarioSummary
  >;

  for (const scenario of BALANCE_TELEMETRY_SCENARIOS) {
    const samples = scenarios.includes(scenario)
      ? seeds.map((seed) => runScenario(scenario, seed, horizonDays))
      : [];

    summaries[scenario] = summarizeScenario(samples);
  }

  return {
    version: 1,
    seedCount: seeds.length,
    horizonDays,
    authoredContent: authoredContentCounts(),
    scenarios: summaries,
  };
}
