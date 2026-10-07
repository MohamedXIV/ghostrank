import { CORE_WORLD_CONTENT } from "@/content/world-content";
import { HARDWARE_CATALOG, findCatalogItem } from "@/content/hardware-catalog";
import { HOUSING_CATALOG } from "@/content/housing-catalog";
import { MACHINE_CATALOG } from "@/content/machine-catalog";
import { MODEL_CATALOG, findModelItem } from "@/content/model-catalog";
import {
  PLAYER_TOOL_CATALOG,
  findPlayerToolItem,
} from "@/content/player-tool-catalog";
import { SOFTWARE_CATALOG } from "@/content/software-catalog";
import { WORKFLOW_SPEC_CATALOG } from "@/content/workflow-spec-catalog";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import {
  deriveLongRunPressure,
  type LongRunPressureBand,
} from "@/game/simulation/systems/long-run-pressure";
import {
  retirementStatus,
  RETIREMENT_COMMIT_MINUTES,
  RETIREMENT_COOLING_MINUTES,
} from "@/game/simulation/systems/retirement";
import type {
  CompromiseKind,
  RunEndingCauseKind,
  RunEndingStatus,
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

export const BALANCE_TELEMETRY_SEEDS = 32;
export const BALANCE_TELEMETRY_HORIZON_DAYS = 30;

/**
 * Standard varied 32-bit seeds drawn from diverse seeds to test real seed variation
 * from Phase 9 P5 while preserving reproducibility.
 */
export const CANONICAL_BETA_VARIED_SEEDS: readonly number[] = [
  104729, 224737, 357941, 499979, 638903, 783169, 929569, 107897,
  1241311, 1400057, 1561009, 1723469, 1888069, 2054231, 2221669, 2390141,
  2560067, 2731001, 2903261, 3076891, 3251419, 3427181, 3604099, 3782143,
  3961291, 4141609, 4323059, 4505629, 4689257, 4874009, 5059901, 5246897,
];

const DAY_MINUTES = 24 * 60;
const TICK_MINUTES = 360;
const EXIT_EARLIEST_MINUTE = 14 * DAY_MINUTES;
const POLICY_ACTION_GUARD_MINUTES = 60;
const CAUTIOUS_COOLDOWN_MINUTES = 36 * 60;

export type BalanceTelemetryScenario =
  | "idle"
  | "cautious-novice"
  | "contractor"
  | "reckless"
  | "rig-builder"
  | "career-exit";

export const BALANCE_TELEMETRY_SCENARIOS: readonly BalanceTelemetryScenario[] = [
  "idle",
  "cautious-novice",
  "contractor",
  "reckless",
  "rig-builder",
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

export interface PurchasingTelemetry {
  hardwareCount: number;
  hardwareCredits: number;
  housingUpkeep: number;
  softwareUpkeep: number;
  modelAcquisition: number;
  modelSubscription: number;
  toolCount: number;
  toolCredits: number;
  totalSpent: number;
  upkeepLapses: number;
  /**
   * First wallet-cost minute by domain. For housing/software this is the first
   * recurring upkeep/license debit, because activating those services is free.
   * For hardware/models/tools it is the one-time acquisition debit.
   */
  firstPurchaseMinutes: {
    hardware: number | null;
    housing: number | null;
    software: number | null;
    model: number | null;
    tool: number | null;
  };
  catalogCoverage: {
    hardwareIds: string[];
    housingIds: string[];
    softwareIds: string[];
    modelIds: string[];
    toolIds: string[];
  };
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
    created: number;
    everAccepted: number;
    completed: number;
    expired: number;
    declined: number;
    openOffered: number;
    openAccepted: number;
  };
  escalations: number;
  compromises: number;
  compromiseKinds: Record<CompromiseKind, number>;
  probes: number;
  physicalThreats: number;
  investigationSignals: number;
  retaliations: number;
  social: {
    publicIncidents: number;
    forumPosts: number;
    rumors: number;
    messages: number;
  };
  pressureBand: LongRunPressureBand;
  peakPressureBand: LongRunPressureBand;
  everReachedPressureBands: Record<LongRunPressureBand, boolean>;
  purchases: PurchasingTelemetry;
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

export interface PurchasingTelemetrySummary {
  hardwareCount: NumericSummary;
  hardwareCredits: NumericSummary;
  housingUpkeep: NumericSummary;
  softwareUpkeep: NumericSummary;
  modelAcquisition: NumericSummary;
  modelSubscription: NumericSummary;
  toolCount: NumericSummary;
  toolCredits: NumericSummary;
  totalSpent: NumericSummary;
  upkeepLapses: NumericSummary;
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
    purchasing: PurchasingTelemetrySummary;
  };
  ranking: {
    finalRank: NumericSummary;
    improvement: NumericSummary;
  };
  contracts: {
    created: number;
    everAccepted: number;
    completed: number;
    expired: number;
    declined: number;
    openOffered: number;
    openAccepted: number;
  };
  pressureBands: Record<LongRunPressureBand, number>;
  peakPressureBands: Record<LongRunPressureBand, number>;
  everReachedPressureBands: Record<LongRunPressureBand, number>;
  threat: {
    escalations: number;
    compromises: number;
    compromiseKinds: Record<CompromiseKind, number>;
    probes: number;
    physicalThreats: number;
    investigationSignals: number;
    retaliations: number;
  };
  social: {
    publicIncidents: number;
    forumPosts: number;
    rumors: number;
    messages: number;
  };
  exposure: {
    actorIds: string[];
    targetIds: string[];
    machineIds: string[];
    serviceIds: string[];
    contractIssuerIds: string[];
  };
  purchasedCoverage: {
    hardwareIds: string[];
    housingIds: string[];
    softwareIds: string[];
    modelIds: string[];
    toolIds: string[];
  };
}

export interface BalanceTelemetryReport {
  version: 3;
  seedCount: number;
  seeds: readonly number[];
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

function knownMachineCount(state: WorldState, targetId: string): number {
  const target = state.targets.find((candidate) => candidate.id === targetId);
  if (!target) return 0;

  return target.machines.filter((machine) =>
    evidenceHas(state, "machine-presence", machine.id),
  ).length;
}

function ensureKnownMachines(
  bus: CommandBus,
  targetId: string,
  required: number,
): boolean {
  if (!ensureTargetObserved(bus, targetId)) return false;
  if (!ensureOperation(bus, targetId)) return false;

  for (let pass = 0; pass < 32 && isLive(bus); pass += 1) {
    if (knownMachineCount(bus.snapshot(), targetId) >= required) {
      return true;
    }

    if (!execute(bus, { type: "surveyTarget", targetId })) {
      return false;
    }
  }

  return knownMachineCount(bus.snapshot(), targetId) >= required;
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

  switch (contract.objective) {
    case "intrusion":
      if (!performIntrusion(bus, contract.targetId)) return false;
      break;

    case "recon-report": {
      const required = contract.requiredServices ?? 1;
      if (!ensureKnownServices(bus, contract.targetId, required)) {
        disengageIfOpen(bus);
        return false;
      }
      disengageIfOpen(bus);
      break;
    }

    case "infrastructure-map": {
      const required = contract.requiredMachines ?? 1;
      if (!ensureKnownMachines(bus, contract.targetId, required)) {
        disengageIfOpen(bus);
        return false;
      }
      disengageIfOpen(bus);
      break;
    }

    case "quiet-recon": {
      if (!ensureKnownMachines(bus, contract.targetId, 1)) {
        disengageIfOpen(bus);
        return false;
      }

      const operation = bus.snapshot().operation;
      if (operation?.stage === "intrusive") {
        disengageIfOpen(bus);
        if (!isLive(bus) || !ensureOperation(bus, contract.targetId)) {
          return false;
        }
      } else if (!operation && !ensureOperation(bus, contract.targetId)) {
        return false;
      }

      disengageIfOpen(bus);
      break;
    }
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

function attemptRetirement(
  bus: CommandBus,
  horizonMinute: number,
): void {
  if (!isLive(bus)) return;

  disengageIfOpen(bus);
  const before = bus.snapshot();
  const retirementMinutes =
    RETIREMENT_COMMIT_MINUTES + RETIREMENT_COOLING_MINUTES;

  // Telemetry must never observe events after the requested reporting window.
  // If there is not enough horizon left for the complete voluntary-exit
  // sequence, this policy simply keeps the run live for the remaining sample.
  if (horizonMinute - before.worldMinute < retirementMinutes) {
    return;
  }

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

    const coolingRemaining =
      plan.coolingUntilWorldMinute - state.worldMinute;
    const horizonRemaining = horizonMinute - state.worldMinute;
    if (horizonRemaining <= 0) break;

    execute(bus, {
      type: "advanceTime",
      minutes: Math.min(
        TICK_MINUTES,
        Math.max(1, coolingRemaining),
        horizonRemaining,
      ),
    });
  }

  if (
    isLive(bus) &&
    bus.snapshot().worldMinute <= horizonMinute &&
    retirementStatus(bus.snapshot()) === "ready"
  ) {
    execute(bus, { type: "finishRetirement" });
  }
}

function primeRecklessRun(
  bus: CommandBus,
  horizonMinute: number,
): void {
  const targetId = bus.snapshot().targets[0]?.id;
  if (!targetId) return;

  for (let cycle = 0; cycle < 3 && isLive(bus); cycle += 1) {
    // Prime only when the complete intrusion sequence fits inside the requested
    // telemetry window. Dry-running from the authoritative snapshot keeps this
    // independent of hardcoded command-duration assumptions.
    const preview = new CommandBus(structuredClone(bus.snapshot()));
    performIntrusion(preview, targetId);

    if (preview.snapshot().worldMinute > horizonMinute) {
      break;
    }

    performIntrusion(bus, targetId);
  }
}

function normalizeHorizonMinute(horizonDays: number): number {
  if (!Number.isFinite(horizonDays) || horizonDays < 0) {
    throw new Error("Balance telemetry horizonDays must be a finite non-negative number");
  }

  // World time is integer minutes. Normalize the reporting window once at the
  // boundary so fractional-day callers cannot feed non-integer waits into the
  // simulation loop.
  return Math.floor(horizonDays * DAY_MINUTES);
}

function selectCautiousContract(bus: CommandBus): UndergroundContract | undefined {
  const state = bus.snapshot();
  const offered = state.underground.contracts.filter(
    (candidate) => candidate.status === "offered",
  );
  if (offered.length === 0) return undefined;

  const hasActiveTraces = state.traces.length > 0;

  const scoreObjective = (candidate: UndergroundContract): number => {
    switch (candidate.objective) {
      case "recon-report":
        return 1;
      case "infrastructure-map":
        return 2;
      case "quiet-recon":
        return 3;
      case "intrusion":
        return hasActiveTraces ? 99 : 10;
      default:
        return 20;
    }
  };

  const eligible = offered.filter(
    (candidate) => !(hasActiveTraces && candidate.objective === "intrusion"),
  );
  if (eligible.length === 0) return undefined;

  eligible.sort((a, b) => {
    const scoreDiff = scoreObjective(a) - scoreObjective(b);
    if (scoreDiff !== 0) return scoreDiff;
    return (
      a.offeredWorldMinute - b.offeredWorldMinute ||
      a.id.localeCompare(b.id)
    );
  });

  return eligible[0];
}

function evaluatePurchasingDecisions(bus: CommandBus): void {
  let state = bus.snapshot();
  const credits = state.economy.credits;

  // 1. Hardware components (order of progression)
  const hardwareProgression = [
    "storage-array", // 250 cr
    "ram-bank",      // 300 cr
    "net-card",      // 350 cr
    "cpu-overclock", // 400 cr
    "cpu-balanced",  // 550 cr
    "gpu-entry",     // 900 cr
    "gpu-memory",    // 1200 cr
  ];

  const ownedHwCatalogIds = new Set(
    state.economy.hardware.map((h) => h.catalogId),
  );
  for (const catalogId of hardwareProgression) {
    if (!ownedHwCatalogIds.has(catalogId)) {
      const item = findCatalogItem(catalogId);
      if (item && credits >= item.cost + 200) {
        execute(bus, { type: "buyHardware", catalogId: item.id });
        state = bus.snapshot();
        break;
      }
    }
  }

  // 2. Housing leases
  if (state.economy.housing === null) {
    if (state.economy.credits >= 350) {
      execute(bus, { type: "rentHousing", housingId: "housing-basement-cot" }); // 15 cr/day
      state = bus.snapshot();
    }
  } else if (
    state.economy.housing === "housing-basement-cot" &&
    state.economy.credits >= 800
  ) {
    execute(bus, { type: "rentHousing", housingId: "housing-cowork-loft" }); // 30 cr/day
    state = bus.snapshot();
  } else if (
    state.economy.housing === "housing-cowork-loft" &&
    state.economy.credits >= 1500
  ) {
    execute(bus, { type: "rentHousing", housingId: "housing-rented-lab" }); // 60 cr/day
    state = bus.snapshot();
  } else if (state.economy.credits < 60 && state.economy.housing !== null) {
    execute(bus, { type: "breakLease" });
    state = bus.snapshot();
  }

  // 3. Software licenses
  if (
    state.economy.credits >= 600 &&
    !state.economy.software.includes("software-net-monitor")
  ) {
    execute(bus, {
      type: "enableSoftware",
      softwareId: "software-net-monitor",
    }); // 40 cr/day
    state = bus.snapshot();
  }
  if (
    state.economy.credits >= 1000 &&
    !state.economy.software.includes("software-auto-recon")
  ) {
    execute(bus, {
      type: "enableSoftware",
      softwareId: "software-auto-recon",
    }); // 70 cr/day
    state = bus.snapshot();
  }
  if (state.economy.credits < 150 && state.economy.software.length > 0) {
    execute(bus, {
      type: "disableSoftware",
      softwareId: state.economy.software[0]!,
    });
    state = bus.snapshot();
  }

  // 4. Local AI models
  const localModelProgression = [
    "model-local-salvage",
    "model-local-reliable",
    "model-local-workhorse",
  ];
  for (const modelId of localModelProgression) {
    if (!state.economy.ownedModels.includes(modelId)) {
      const item = findModelItem(modelId);
      if (item && state.economy.credits >= item.cost + 300) {
        execute(bus, { type: "acquireModel", modelId });
        state = bus.snapshot();
        break;
      }
    }
  }
  if (state.economy.ownedModels.length > 0 && state.economy.activeModel === null) {
    execute(bus, { type: "runModel", modelId: state.economy.ownedModels[0]! });
    state = bus.snapshot();
  }

  // 5. Player tools
  const toolProgression = [
    "tool-paranoid-scraper",
    "tool-map-stitcher",
    "tool-silent-dedup",
  ];
  const ownedToolCatalogIds = new Set(
    state.economy.playerTools.map((t) => t.catalogId),
  );
  for (const toolId of toolProgression) {
    if (!ownedToolCatalogIds.has(toolId)) {
      const item = findPlayerToolItem(toolId);
      if (item && state.economy.credits >= item.cost + 300) {
        execute(bus, { type: "buyPlayerTool", toolId });
        state = bus.snapshot();
        break;
      }
    }
  }
}

function processRigBuilder(bus: CommandBus): void {
  if (!isLive(bus)) return;
  evaluatePurchasingDecisions(bus);
  if (!isLive(bus)) return;
  processOneContract(bus);
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
  const horizonMinute = normalizeHorizonMinute(horizonDays);

  const bandRanks: Record<LongRunPressureBand, number> = {
    ordinary: 0,
    known: 1,
    entangled: 2,
    veteran: 3,
  };
  let peakPressureBand: LongRunPressureBand = "ordinary";
  const everReachedPressureBands: Record<LongRunPressureBand, boolean> = {
    ordinary: true,
    known: false,
    entangled: false,
    veteran: false,
  };
  let upkeepLapses = 0;
  let lastCautiousDeliveredMinute = -Infinity;

  const recordPressure = () => {
    const current = deriveLongRunPressure(bus.snapshot()).band;
    everReachedPressureBands[current] = true;
    if (bandRanks[current] > bandRanks[peakPressureBand]) {
      peakPressureBand = current;
    }
  };

  recordPressure();

  if (scenario === "reckless") {
    primeRecklessRun(bus, horizonMinute);
    recordPressure();
  }

  while (isLive(bus) && bus.snapshot().worldMinute < horizonMinute) {
    const state = bus.snapshot();
    const remaining = horizonMinute - state.worldMinute;

    if (remaining > POLICY_ACTION_GUARD_MINUTES) {
      if (scenario === "contractor" || scenario === "reckless") {
        processOneContract(bus);
      } else if (scenario === "cautious-novice") {
        const accepted = state.underground.contracts.find(
          (c) => c.status === "accepted",
        );
        if (accepted) {
          fulfillAcceptedContract(bus, accepted);
          const after = bus
            .snapshot()
            .underground.contracts.find((c) => c.id === accepted.id);
          if (after && after.status !== "accepted") {
            lastCautiousDeliveredMinute = bus.snapshot().worldMinute;
          }
        } else if (
          state.worldMinute - lastCautiousDeliveredMinute >=
          CAUTIOUS_COOLDOWN_MINUTES
        ) {
          const offered = selectCautiousContract(bus);
          if (offered) {
            if (
              execute(bus, { type: "acceptContract", contractId: offered.id })
            ) {
              const freshState = bus.snapshot();
              const contract = freshState.underground.contracts.find(
                (c) => c.id === offered.id,
              );
              if (contract && contract.status === "accepted") {
                fulfillAcceptedContract(bus, contract);
                const after = bus
                  .snapshot()
                  .underground.contracts.find((c) => c.id === contract.id);
                if (after && after.status !== "accepted") {
                  lastCautiousDeliveredMinute = bus.snapshot().worldMinute;
                }
              }
            }
          }
        }
      } else if (scenario === "rig-builder") {
        processRigBuilder(bus);
      } else if (scenario === "career-exit") {
        if (
          state.worldMinute >= EXIT_EARLIEST_MINUTE &&
          completedContracts(state) >= 3 &&
          !state.underground.contracts.some(
            (contract) => contract.status === "accepted",
          )
        ) {
          attemptRetirement(bus, horizonMinute);
        } else {
          processOneContract(bus);
        }
      }
      recordPressure();
    }

    if (!isLive(bus)) break;

    const now = bus.snapshot().worldMinute;
    if (now >= horizonMinute) break;

    const delta = Math.min(TICK_MINUTES, horizonMinute - now);
    const advanceResult = bus.execute({
      type: "advanceTime",
      minutes: delta,
    });
    for (const ev of advanceResult.events) {
      if (
        ev.type === "HousingChanged" &&
        ev.housingId === null &&
        ev.worldMinute % DAY_MINUTES === 0
      ) {
        upkeepLapses += 1;
      } else if (
        ev.type === "SoftwareChanged" &&
        !ev.active &&
        ev.worldMinute % DAY_MINUTES === 0
      ) {
        upkeepLapses += 1;
      } else if (
        ev.type === "ModelChanged" &&
        !ev.active &&
        ev.worldMinute % DAY_MINUTES === 0
      ) {
        upkeepLapses += 1;
      }
    }
    recordPressure();
  }

  return sampleFromWorld(
    scenario,
    seed,
    startingRank,
    bus.snapshot(),
    peakPressureBand,
    everReachedPressureBands,
    upkeepLapses,
  );
}

function sampleFromWorld(
  scenario: BalanceTelemetryScenario,
  seed: number,
  startingRank: number,
  world: WorldState,
  peakPressureBand: LongRunPressureBand,
  everReachedPressureBands: Record<LongRunPressureBand, boolean>,
  upkeepLapses: number,
): BalanceTelemetrySample {
  const contractCounts = {
    created: world.underground.contracts.length,
    everAccepted: world.underground.contracts.filter(
      (contract) => contract.acceptedWorldMinute !== undefined,
    ).length,
    completed: world.underground.contracts.filter(
      (contract) => contract.status === "completed",
    ).length,
    expired: world.underground.contracts.filter(
      (contract) => contract.status === "expired",
    ).length,
    declined: world.underground.contracts.filter(
      (contract) => contract.status === "declined",
    ).length,
    openOffered: world.underground.contracts.filter(
      (contract) => contract.status === "offered",
    ).length,
    openAccepted: world.underground.contracts.filter(
      (contract) => contract.status === "accepted",
    ).length,
  };

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

  const hardwareDebits = world.economy.ledger.filter(
    (e) => e.direction === "debit" && e.cause.kind === "hardware",
  );
  const housingDebits = world.economy.ledger.filter(
    (e) => e.direction === "debit" && e.cause.kind === "upkeep",
  );
  const softwareDebits = world.economy.ledger.filter(
    (e) => e.direction === "debit" && e.cause.kind === "license",
  );
  const toolDebits = world.economy.ledger.filter(
    (e) => e.direction === "debit" && e.cause.kind === "tool",
  );
  const modelDebits = world.economy.ledger.filter(
    (e) => e.direction === "debit" && e.cause.kind === "model",
  );

  const hardwareCredits = hardwareDebits.reduce((sum, e) => sum + e.amount, 0);
  const housingUpkeep = housingDebits.reduce((sum, e) => sum + e.amount, 0);
  const softwareUpkeep = softwareDebits.reduce((sum, e) => sum + e.amount, 0);
  const toolCredits = toolDebits.reduce((sum, e) => sum + e.amount, 0);

  let modelAcquisition = 0;
  let modelSubscription = 0;
  for (const debit of modelDebits) {
    const item = findModelItem(debit.cause.id);
    if (item?.source === "local") {
      modelAcquisition += debit.amount;
    } else {
      modelSubscription += debit.amount;
    }
  }

  const totalSpent =
    hardwareCredits +
    housingUpkeep +
    softwareUpkeep +
    toolCredits +
    modelAcquisition +
    modelSubscription;

  const firstPurchaseMinutes = {
    hardware: hardwareDebits[0]?.worldMinute ?? null,
    housing: housingDebits[0]?.worldMinute ?? null,
    software: softwareDebits[0]?.worldMinute ?? null,
    model: modelDebits[0]?.worldMinute ?? null,
    tool: toolDebits[0]?.worldMinute ?? null,
  };

  const hardwareCatalogIds = [
    ...new Set(
      world.economy.hardware
        .map((h) => h.catalogId)
        .filter((id) => id !== "rig-starter"),
    ),
  ].sort();
  const housingCatalogIds = [
    ...new Set(housingDebits.map((e) => e.cause.id)),
  ].sort();
  const softwareCatalogIds = [
    ...new Set(softwareDebits.map((e) => e.cause.id)),
  ].sort();
  const modelCatalogIds = [
    ...new Set(modelDebits.map((e) => e.cause.id)),
  ].sort();
  const toolCatalogIds = [
    ...new Set(world.economy.playerTools.map((t) => t.catalogId)),
  ].sort();

  const purchases: PurchasingTelemetry = {
    hardwareCount: world.economy.hardware.filter(
      (h) => h.catalogId !== "rig-starter",
    ).length,
    hardwareCredits,
    housingUpkeep,
    softwareUpkeep,
    modelAcquisition,
    modelSubscription,
    toolCount: world.economy.playerTools.length,
    toolCredits,
    totalSpent,
    upkeepLapses,
    firstPurchaseMinutes,
    catalogCoverage: {
      hardwareIds: hardwareCatalogIds,
      housingIds: housingCatalogIds,
      softwareIds: softwareCatalogIds,
      modelIds: modelCatalogIds,
      toolIds: toolCatalogIds,
    },
  };

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
    social: {
      publicIncidents: world.underground.incidents.filter(
        (incident) => incident.public,
      ).length,
      forumPosts: world.underground.forumPosts.length,
      rumors: world.underground.rumors.length,
      messages: world.underground.messages.length,
    },
    pressureBand: deriveLongRunPressure(world).band,
    peakPressureBand,
    everReachedPressureBands,
    purchases,
    exposure: {
      actorIds: [...actorIds].sort(),
      targetIds: [...targetIds].sort(),
      machineIds: [...machineIds].sort(),
      serviceIds: [...serviceIds].sort(),
      contractIssuerIds: [...contractIssuerIds].sort(),
    },
  };
}

export function numericSummary(values: readonly number[]): NumericSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const midpoint = Math.floor(sorted.length / 2);
  const median =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 0
        ? ((sorted[midpoint - 1] ?? 0) + (sorted[midpoint] ?? 0)) / 2
        : (sorted[midpoint] ?? 0);

  return {
    min: sorted[0] ?? 0,
    median,
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
  const peakPressureBands = emptyPressureBands();
  const everReachedPressureBands = emptyPressureBands();
  const compromiseKinds = emptyCompromiseKinds();
  const actorIds = new Set<string>();
  const targetIds = new Set<string>();
  const machineIds = new Set<string>();
  const serviceIds = new Set<string>();
  const contractIssuerIds = new Set<string>();

  const purchasedHardwareIds = new Set<string>();
  const purchasedHousingIds = new Set<string>();
  const purchasedSoftwareIds = new Set<string>();
  const purchasedModelIds = new Set<string>();
  const purchasedToolIds = new Set<string>();

  const contractTotals = {
    created: 0,
    everAccepted: 0,
    completed: 0,
    expired: 0,
    declined: 0,
    openOffered: 0,
    openAccepted: 0,
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
  const social = {
    publicIncidents: 0,
    forumPosts: 0,
    rumors: 0,
    messages: 0,
  };

  for (const sample of samples) {
    endings[sample.endingStatus ?? "active"] += 1;
    endingCauses[sample.endingCauseKind ?? "none"] += 1;
    pressureBands[sample.pressureBand] += 1;
    peakPressureBands[sample.peakPressureBand] += 1;
    for (const [band, reached] of Object.entries(
      sample.everReachedPressureBands,
    )) {
      if (reached) {
        everReachedPressureBands[band as LongRunPressureBand] += 1;
      }
    }

    for (const id of sample.purchases.catalogCoverage.hardwareIds) {
      purchasedHardwareIds.add(id);
    }
    for (const id of sample.purchases.catalogCoverage.housingIds) {
      purchasedHousingIds.add(id);
    }
    for (const id of sample.purchases.catalogCoverage.softwareIds) {
      purchasedSoftwareIds.add(id);
    }
    for (const id of sample.purchases.catalogCoverage.modelIds) {
      purchasedModelIds.add(id);
    }
    for (const id of sample.purchases.catalogCoverage.toolIds) {
      purchasedToolIds.add(id);
    }

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
    social.publicIncidents += sample.social.publicIncidents;
    social.forumPosts += sample.social.forumPosts;
    social.rumors += sample.social.rumors;
    social.messages += sample.social.messages;

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
      purchasing: {
        hardwareCount: numericSummary(
          samples.map((s) => s.purchases.hardwareCount),
        ),
        hardwareCredits: numericSummary(
          samples.map((s) => s.purchases.hardwareCredits),
        ),
        housingUpkeep: numericSummary(
          samples.map((s) => s.purchases.housingUpkeep),
        ),
        softwareUpkeep: numericSummary(
          samples.map((s) => s.purchases.softwareUpkeep),
        ),
        modelAcquisition: numericSummary(
          samples.map((s) => s.purchases.modelAcquisition),
        ),
        modelSubscription: numericSummary(
          samples.map((s) => s.purchases.modelSubscription),
        ),
        toolCount: numericSummary(samples.map((s) => s.purchases.toolCount)),
        toolCredits: numericSummary(
          samples.map((s) => s.purchases.toolCredits),
        ),
        totalSpent: numericSummary(samples.map((s) => s.purchases.totalSpent)),
        upkeepLapses: numericSummary(
          samples.map((s) => s.purchases.upkeepLapses),
        ),
      },
    },
    ranking: {
      finalRank: numericSummary(samples.map((sample) => sample.rank)),
      improvement: numericSummary(
        samples.map((sample) => sample.rankImprovement),
      ),
    },
    contracts: contractTotals,
    pressureBands,
    peakPressureBands,
    everReachedPressureBands,
    threat,
    social,
    exposure: {
      actorIds: [...actorIds].sort(),
      targetIds: [...targetIds].sort(),
      machineIds: [...machineIds].sort(),
      serviceIds: [...serviceIds].sort(),
      contractIssuerIds: [...contractIssuerIds].sort(),
    },
    purchasedCoverage: {
      hardwareIds: [...purchasedHardwareIds].sort(),
      housingIds: [...purchasedHousingIds].sort(),
      softwareIds: [...purchasedSoftwareIds].sort(),
      modelIds: [...purchasedModelIds].sort(),
      toolIds: [...purchasedToolIds].sort(),
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
  const seeds = input.seeds ?? CANONICAL_BETA_VARIED_SEEDS;
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
    version: 3,
    seedCount: seeds.length,
    seeds,
    horizonDays,
    authoredContent: authoredContentCounts(),
    scenarios: summaries,
  };
}
