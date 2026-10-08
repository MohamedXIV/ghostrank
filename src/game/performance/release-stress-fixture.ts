import { HARDWARE_CATALOG } from "@/content/hardware-catalog";
import { BASELINE_LOCATION_ID } from "@/content/housing-catalog";
import { MACHINE_CATALOG } from "@/content/machine-catalog";
import { MODEL_CATALOG } from "@/content/model-catalog";
import { PLAYER_TOOL_CATALOG } from "@/content/player-tool-catalog";
import { SOFTWARE_CATALOG } from "@/content/software-catalog";
import { WORKFLOW_SPEC_CATALOG } from "@/content/workflow-spec-catalog";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import type { WorldState } from "@/game/simulation/state/world-state";

export const RELEASE_STRESS_COUNTS = {
  traces: 1_200,
  reactions: 300,
  rumors: 1_800,
  messages: 1_800,
  incidents: 1_800,
  contracts: 900,
  forumPosts: 1_800,
  ledger: 2_000,
  observedMachines: 96,
  investigationSignals: 768,
  probes: 250,
  physicalThreats: 200,
  hardware: 320,
  tools: 140,
  ownedMachines: 120,
  ownedWorkflows: 60,
} as const;

const WORLD_MINUTE = 60 * 24 * 60;
const SEED = 20_261_008;

function minuteAt(index: number, count: number): number {
  return Math.floor(((index + 1) * (WORLD_MINUTE - 60)) / count);
}

function makeStressState(): WorldState {
  const world = createSliceWorldState({ seed: SEED, handle: "BetaStress" });
  const knownTargetIds = world.targets.map((target) => target.id);
  const primaryTarget = world.targets[0];
  const machineTemplate = primaryTarget?.machines[0];

  if (!primaryTarget || !machineTemplate || world.underground.actors.length < 2) {
    throw new Error("Release stress fixture requires seeded targets and contacts");
  }

  world.worldMinute = WORLD_MINUTE;
  world.underground.lastTickMinute = WORLD_MINUTE;

  for (let index = 0; index < RELEASE_STRESS_COUNTS.observedMachines; index += 1) {
    const machineId = `p8-observed-machine-${index + 1}`;
    const machine = structuredClone(machineTemplate);
    machine.id = machineId;
    machine.label = `Observed relay ${index + 1}`;
    machine.services = machineTemplate.services.map((service, serviceIndex) => ({
      ...structuredClone(service),
      id: `p8-observed-service-${index + 1}-${serviceIndex + 1}`,
      label: `Observed service ${index + 1}.${serviceIndex + 1}`,
    }));
    primaryTarget.machines.push(machine);
  }

  world.evidence = [];
  for (const target of world.targets) {
    world.evidence.push({
      id: `p8-evidence-target-${target.id}`,
      kind: "target-profile",
      subjectId: target.id,
      confidence: "observed",
      source: "direct-observation",
      worldMinute: 1,
    });

    for (const machine of target.machines) {
      world.evidence.push({
        id: `p8-evidence-machine-${machine.id}`,
        kind: "machine-presence",
        subjectId: machine.id,
        confidence: "observed",
        source: "direct-observation",
        worldMinute: 2,
      });
      for (const service of machine.services) {
        world.evidence.push({
          id: `p8-evidence-service-${service.id}`,
          kind: "service-presence",
          subjectId: service.id,
          confidence: "observed",
          source: "direct-observation",
          worldMinute: 3,
        });
      }
    }
  }

  const actorIds = world.underground.actors.map((actor) => actor.id);
  const targetIds = knownTargetIds;
  const traceIds: string[] = [];

  world.traces = Array.from({ length: RELEASE_STRESS_COUNTS.traces }, (_, index) => {
    const id = `p8-stress-trace-${index + 1}`;
    traceIds.push(id);
    return {
      id,
      targetId: targetIds[index % targetIds.length]!,
      cause: index % 4 === 0 ? "operation-disengagement" : "operation-escalation",
      stage: index % 3 === 0 ? "recon" : "intrusive",
      severity: index % 5 === 0 ? "high" : index % 2 === 0 ? "elevated" : "low",
      weight: 1 + (index % 5),
      worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.traces),
    };
  });

  world.reactions = Array.from(
    { length: RELEASE_STRESS_COUNTS.reactions },
    (_, index) => ({
      id: `p8-stress-reaction-${index + 1}`,
      targetId: targetIds[index % targetIds.length]!,
      kind: "defensive-watch",
      status: "active",
      sourceTraceIds: [traceIds[(index * 3) % traceIds.length]!],
      footprintScore: 4 + (index % 41),
      triggeredWorldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.reactions),
      playerVisible: true,
    }),
  );

  const signalsPerInvestigation = 24;
  world.investigations = Array.from({ length: 32 }, (_, investigationIndex) => {
    const targetId = targetIds[investigationIndex % targetIds.length]!;
    return {
      id: `p8-stress-investigation-${investigationIndex + 1}`,
      targetId,
      openedWorldMinute: minuteAt(investigationIndex, 32),
      progress: 800 + investigationIndex,
      sourceIds: [traceIds[investigationIndex % traceIds.length]!],
      signals: Array.from({ length: signalsPerInvestigation }, (_, signalIndex) => ({
        id: `p8-stress-signal-${investigationIndex + 1}-${signalIndex + 1}`,
        kind:
          signalIndex % 3 === 0
            ? "unusual-login"
            : signalIndex % 3 === 1
              ? "marketplace-behavior"
              : "suspicious-message",
        surfacedWorldMinute: minuteAt(
          investigationIndex * signalsPerInvestigation + signalIndex,
          32 * signalsPerInvestigation,
        ),
      })),
    };
  });

  world.probes = Array.from({ length: RELEASE_STRESS_COUNTS.probes }, (_, index) => ({
    id: `p8-stress-probe-${index + 1}`,
    actorId: actorIds[index % actorIds.length]!,
    subject: index % 3 === 0 ? "rig" : index % 3 === 1 ? "dwelling" : "habits",
    correct: index % 2 === 0,
    worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.probes),
  }));

  const investigationIds = world.investigations.map((entry) => entry.id);
  world.physicalThreats = Array.from(
    { length: RELEASE_STRESS_COUNTS.physicalThreats },
    (_, index) => ({
      id: `p8-stress-physical-${index + 1}`,
      actorId: actorIds[index % actorIds.length]!,
      kind: index % 2 === 0 ? "warning" : "outage",
      signalKind:
        index % 9 === 0
          ? "strange-vehicle"
          : index % 9 === 1
            ? "footsteps"
            : index % 9 === 2
              ? "knock"
              : index % 9 === 3
                ? "unknown-call"
                : index % 9 === 4
                  ? "door-camera-motion"
                  : index % 9 === 5
                    ? "outage"
                    : index % 9 === 6
                      ? "unusual-connectivity"
                      : index % 9 === 7
                        ? "unexpected-delivery"
                        : "nearby-activity",
      sourceProbeId: `p8-stress-probe-${(index % RELEASE_STRESS_COUNTS.probes) + 1}`,
      sourceInvestigationIds: [investigationIds[index % investigationIds.length]!],
      locationId: BASELINE_LOCATION_ID,
      worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.physicalThreats),
      affectedBuildIds: [],
      destroyedHardwareIds: [],
    }),
  );

  world.underground.incidents = Array.from(
    { length: RELEASE_STRESS_COUNTS.incidents },
    (_, index) => ({
      id: `p8-stress-incident-${index + 1}`,
      kind: "npc-intrusion",
      actorId: actorIds[index % actorIds.length]!,
      counterpartId: actorIds[(index + 1) % actorIds.length]!,
      outcome: index % 2 === 0 ? "succeeded" : "repelled",
      public: true,
      worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.incidents),
    }),
  );

  world.underground.rumors = Array.from(
    { length: RELEASE_STRESS_COUNTS.rumors },
    (_, index) => ({
      id: `p8-stress-rumor-${index + 1}`,
      kind: "incident-leak",
      sourceId: `p8-stress-incident-${index + 1}`,
      relayId: actorIds[(index + 2) % actorIds.length]!,
      accurate: index % 2 === 0,
      claim: {
        actorId: actorIds[index % actorIds.length]!,
        counterpartId: actorIds[(index + 1) % actorIds.length]!,
        outcome: index % 2 === 0 ? "succeeded" : "repelled",
      },
      worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.rumors),
    }),
  );

  world.underground.messages = Array.from(
    { length: RELEASE_STRESS_COUNTS.messages },
    (_, index) => ({
      id: `p8-stress-message-${index + 1}`,
      fromId: actorIds[index % actorIds.length]!,
      rumorId: `p8-stress-rumor-${index + 1}`,
      worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.messages),
      read: index % 3 === 0,
    }),
  );

  world.underground.contracts = Array.from(
    { length: RELEASE_STRESS_COUNTS.contracts },
    (_, index) => {
      const status =
        index < 3
          ? "offered"
          : index % 3 === 0
            ? "completed"
            : index % 3 === 1
              ? "expired"
              : "declined";
      const worldMinute = minuteAt(index, RELEASE_STRESS_COUNTS.contracts);
      return {
        id: `p8-stress-contract-${index + 1}`,
        issuerId: actorIds[index % actorIds.length]!,
        targetId: targetIds[index % targetIds.length]!,
        objective:
          index % 4 === 0
            ? "recon-report"
            : index % 4 === 1
              ? "infrastructure-map"
              : index % 4 === 2
                ? "quiet-recon"
                : "intrusion",
        ...(index % 4 === 0 ? { requiredServices: 2 } : {}),
        ...(index % 4 === 1 ? { requiredMachines: 2 } : {}),
        status,
        offeredWorldMinute: worldMinute,
        expiresWorldMinute: worldMinute + 2_000,
        ...(status === "completed" || status === "expired"
          ? { resolvedWorldMinute: worldMinute + 1_000 }
          : {}),
      };
    },
  );

  world.underground.retaliations = Array.from(
    { length: 300 },
    (_, index) => ({
      id: `p8-stress-retaliation-${index + 1}`,
      actorId: actorIds[index % actorIds.length]!,
      kind: index % 5 === 0 ? "unmasking" : "smear",
      worldMinute: minuteAt(index, 300),
    }),
  );

  world.underground.forumPosts = Array.from(
    { length: RELEASE_STRESS_COUNTS.forumPosts },
    (_, index) => ({
      id: `p8-stress-forum-${index + 1}`,
      board: "white",
      authorId: actorIds[index % actorIds.length]!,
      subject: {
        kind: "incident",
        id: `p8-stress-incident-${index + 1}`,
      },
      worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.forumPosts),
    }),
  );

  let balance = 35_000;
  world.economy.ledger = Array.from(
    { length: RELEASE_STRESS_COUNTS.ledger },
    (_, index) => {
      const direction = index % 2 === 0 ? "credit" : "debit";
      const amount = 40 + (index % 240);
      balance = direction === "credit" ? balance + amount : balance - amount;
      return {
        id: `p8-stress-ledger-${index + 1}`,
        worldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.ledger),
        direction,
        amount,
        balanceAfter: balance,
        cause: {
          kind:
            index % 3 === 0
              ? "contract"
              : index % 3 === 1
                ? "hardware"
                : "license",
          id: `p8-stress-transaction-${index + 1}`,
        },
        counterparty: index % 4 === 0 ? "market" : actorIds[index % actorIds.length]!,
      };
    },
  );
  world.economy.credits = balance;

  world.economy.hardware = Array.from(
    { length: RELEASE_STRESS_COUNTS.hardware },
    (_, index) => ({
      id: `p8-stress-hardware-${index + 1}`,
      catalogId: HARDWARE_CATALOG[index % HARDWARE_CATALOG.length]!.id,
      acquiredWorldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.hardware),
    }),
  );
  world.economy.software = SOFTWARE_CATALOG.map((item) => item.id);
  world.economy.playerTools = Array.from(
    { length: RELEASE_STRESS_COUNTS.tools },
    (_, index) => ({
      id: `p8-stress-tool-${index + 1}`,
      catalogId: PLAYER_TOOL_CATALOG[index % PLAYER_TOOL_CATALOG.length]!.id,
      author: world.underground.actors[index % actorIds.length]!.handle,
      paidCost: 125 + (index % 850),
      acquiredWorldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.tools),
    }),
  );
  world.economy.ownedMachines = Array.from(
    { length: RELEASE_STRESS_COUNTS.ownedMachines },
    (_, index) => ({
      id: `p8-stress-owned-machine-${index + 1}`,
      catalogId: MACHINE_CATALOG[index % MACHINE_CATALOG.length]!.id,
      label: `Owned node ${index + 1}`,
      paidCost: 400 + (index % 3_000),
      acquiredWorldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.ownedMachines),
    }),
  );
  world.economy.ownedModels = MODEL_CATALOG.map((item) => item.id);
  world.economy.ownedWorkflows = Array.from(
    { length: RELEASE_STRESS_COUNTS.ownedWorkflows },
    (_, index) => ({
      id: `p8-stress-workflow-${index + 1}`,
      specId: WORKFLOW_SPEC_CATALOG[index % WORKFLOW_SPEC_CATALOG.length]!.id,
      label: `Stress workflow ${index + 1}`,
      outcome: index % 3 === 0 ? "warnings" : index % 3 === 1 ? "clean" : "defective",
      builtWithModelId: MODEL_CATALOG[index % MODEL_CATALOG.length]!.id,
      acquiredWorldMinute: minuteAt(index, RELEASE_STRESS_COUNTS.ownedWorkflows),
    }),
  );

  return world;
}

export function createReleaseStressFixtures(): {
  active: WorldState;
  completed: WorldState;
} {
  const active = makeStressState();
  const completed = structuredClone(active);
  completed.ending = {
    status: "arrested",
    causeKind: "investigation",
    causeId: "p8-stress-case",
    worldMinute: WORLD_MINUTE,
  };
  return { active, completed };
}
