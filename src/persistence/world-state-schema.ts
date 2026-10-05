import { z } from "zod";

const evidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "target-profile",
    "machine-presence",
    "service-presence",
  ]),
  subjectId: z.string().min(1),
  confidence: z.literal("observed"),
  source: z.enum(["direct-observation", "legacy-discovery"]),
  worldMinute: z.number().int().nonnegative(),
});

const serviceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.string().min(1),
  state: z.enum(["online", "offline", "degraded"]),
});

const machineSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  role: z.string().min(1),
  services: z.array(serviceSchema).default([]),
});

const targetSchema = z.object({
  id: z.string().min(1),
  handle: z.string().min(1),
  rank: z.number().int().positive(),
  machines: z.array(machineSchema).default([]),
  hidden: z.record(z.string(), z.unknown()).optional(),
});

const operationSchema = z.object({
  targetId: z.string().min(1),
  stage: z.enum(["recon", "intrusive"]),
  openedWorldMinute: z.number().int().nonnegative(),
  escalatedWorldMinute: z.number().int().nonnegative().optional(),
});

const traceSchema = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  cause: z.enum([
    "operation-escalation",
    "operation-disengagement",
  ]),
  stage: z.enum(["recon", "intrusive"]),
  severity: z.enum(["low", "elevated", "high"]),
  weight: z.number().int().positive(),
  worldMinute: z.number().int().nonnegative(),
});

const reactionSchema = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  kind: z.literal("defensive-watch"),
  status: z.literal("active"),
  sourceTraceIds: z.array(z.string().min(1)),
  footprintScore: z.number().int().nonnegative(),
  triggeredWorldMinute: z.number().int().nonnegative(),
  playerVisible: z.boolean(),
});

const networkSchema = z.enum(["white", "black"]);
const percentSchema = z.number().int().min(0).max(100);

const undergroundActorSchema = z.object({
  id: z.string().min(1),
  handle: z.string().min(1),
  rank: z.number().int().positive(),
  network: networkSchema,
  skill: percentSchema,
  defense: percentSchema,
  discretion: percentSchema,
  activity: percentSchema,
  // Phase 5 P4: the model id this peer runs as an assistant, or absent when the
  // actor works without AI. Optional so legacy saves load as unassisted.
  modelId: z.string().min(1).optional(),
  targetId: z.string().min(1).optional(),
});

const undergroundRelationshipSchema = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  trust: z.number().int().min(-100).max(100),
  fear: z.number().int().min(-100).max(100),
  grudge: z.number().int().min(0).max(100),
  updatedWorldMinute: z.number().int().nonnegative(),
});

const undergroundIncidentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("npc-intrusion"),
  actorId: z.string().min(1),
  counterpartId: z.string().min(1),
  outcome: z.enum(["succeeded", "repelled"]),
  public: z.boolean(),
  worldMinute: z.number().int().nonnegative(),
});

const undergroundRumorSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["incident-leak", "player-footprint"]),
  sourceId: z.string().min(1),
  relayId: z.string().min(1),
  accurate: z.boolean(),
  claim: z
    .object({
      actorId: z.string().min(1),
      counterpartId: z.string().min(1),
      outcome: z.enum(["succeeded", "repelled"]),
    })
    .nullable(),
  worldMinute: z.number().int().nonnegative(),
});

const undergroundMessageSchema = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  rumorId: z.string().min(1),
  worldMinute: z.number().int().nonnegative(),
  read: z.boolean(),
});

const undergroundContractSchema = z.object({
  id: z.string().min(1),
  issuerId: z.string().min(1),
  targetId: z.string().min(1),
  objective: z.enum(["recon-report", "intrusion"]),
  requiredServices: z.number().int().positive().optional(),
  status: z.enum(["offered", "accepted", "completed", "expired", "declined"]),
  offeredWorldMinute: z.number().int().nonnegative(),
  expiresWorldMinute: z.number().int().nonnegative(),
  acceptedWorldMinute: z.number().int().nonnegative().optional(),
  dueWorldMinute: z.number().int().nonnegative().optional(),
  resolvedWorldMinute: z.number().int().nonnegative().optional(),
});

const undergroundRetaliationSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  kind: z.enum(["smear", "unmasking"]),
  worldMinute: z.number().int().nonnegative(),
});

const forumPostSchema = z.object({
  id: z.string().min(1),
  board: networkSchema,
  authorId: z.string().min(1),
  subject: z.object({
    kind: z.enum(["incident", "unmasking", "contract"]),
    id: z.string().min(1),
  }),
  worldMinute: z.number().int().nonnegative(),
});

const undergroundSchema = z.object({
  seed: z.number().int(),
  lastTickMinute: z.number().int().nonnegative(),
  playerNetwork: networkSchema.nullable().default(null),
  actors: z.array(undergroundActorSchema).default([]),
  relationships: z.array(undergroundRelationshipSchema).default([]),
  incidents: z.array(undergroundIncidentSchema).default([]),
  rumors: z.array(undergroundRumorSchema).default([]),
  messages: z.array(undergroundMessageSchema).default([]),
  contracts: z.array(undergroundContractSchema).default([]),
  retaliations: z.array(undergroundRetaliationSchema).default([]),
  forumPosts: z.array(forumPostSchema).default([]),
});

const ledgerCauseSchema = z.object({
  kind: z.enum([
    "contract",
    "hardware",
    "housing",
    "upkeep",
    "license",
    "tool",
    "machine",
    "model",
  ]),
  id: z.string().min(1),
});

const valueLedgerEntrySchema = z.object({
  id: z.string().min(1),
  worldMinute: z.number().int().nonnegative(),
  direction: z.enum(["credit", "debit"]),
  amount: z.number().int().nonnegative(),
  balanceAfter: z.number().int().nonnegative(),
  cause: ledgerCauseSchema,
  counterparty: z.string().min(1),
});

const ownedHardwareSchema = z.object({
  id: z.string().min(1),
  catalogId: z.string().min(1),
  acquiredWorldMinute: z.number().int().nonnegative(),
});

const ownedPlayerToolSchema = z.object({
  id: z.string().min(1),
  catalogId: z.string().min(1),
  author: z.string().min(1),
  paidCost: z.number().int().nonnegative(),
  acquiredWorldMinute: z.number().int().nonnegative(),
});

const ownedMachineSchema = z.object({
  id: z.string().min(1),
  catalogId: z.string().min(1),
  label: z.string().min(1),
  paidCost: z.number().int().nonnegative(),
  acquiredWorldMinute: z.number().int().nonnegative(),
});

const ownedWorkflowSchema = z.object({
  id: z.string().min(1),
  specId: z.string().min(1),
  label: z.string().min(1),
  outcome: z.enum(["clean", "warnings", "defective"]),
  builtWithModelId: z.string().min(1),
  acquiredWorldMinute: z.number().int().nonnegative(),
});

const economySchema = z.object({
  credits: z.number().int().nonnegative(),
  ledger: z.array(valueLedgerEntrySchema).default([]),
  hardware: z.array(ownedHardwareSchema).default([]),
  housing: z.string().min(1).nullable().default(null),
  software: z.array(z.string().min(1)).default([]),
  playerTools: z.array(ownedPlayerToolSchema).default([]),
  ownedMachines: z.array(ownedMachineSchema).default([]),
  ownedModels: z.array(z.string().min(1)).default([]),
  ownedWorkflows: z.array(ownedWorkflowSchema).default([]),
  activeModel: z.string().min(1).nullable().default(null),
});

const analysisClaimSchema = z.object({
  subjectId: z.string().min(1).nullable(),
  kind: z.enum(["machine-role", "service-kind"]),
  assertion: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  accurate: z.boolean(),
});

const analysisRecordSchema = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  modelId: z.string().min(1),
  worldMinute: z.number().int().nonnegative(),
  claims: z.array(analysisClaimSchema).default([]),
});

const inFlightBuildSchema = z.object({
  id: z.string().min(1),
  specId: z.string().min(1),
  modelId: z.string().min(1),
  startedWorldMinute: z.number().int().nonnegative(),
  dueWorldMinute: z.number().int().nonnegative(),
  pausedAtWorldMinute: z.number().int().nonnegative().optional(),
  pausedByThreatId: z.string().min(1).optional(),
  accumulatedPausedMinutes: z.number().int().nonnegative().optional(),
  outcome: z.enum(["clean", "warnings", "defective"]),
});

const investigationSignalSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "unusual-login",
    "marketplace-behavior",
    "suspicious-message",
  ]),
  surfacedWorldMinute: z.number().int().nonnegative(),
});

const rivalProbeSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  subject: z.enum(["rig", "dwelling", "habits"]),
  // Hidden truth that must survive a restore: a rival that was fooled stays
  // fooled, so `correct` persists even though it never projects.
  correct: z.boolean(),
  locationId: z.string().min(1).optional(),
  worldMinute: z.number().int().nonnegative(),
});

const physicalThreatSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  kind: z.enum(["warning", "outage", "property-hit"]),
  signalKind: z.enum([
    "strange-vehicle",
    "footsteps",
    "knock",
    "unknown-call",
    "door-camera-motion",
    "outage",
    "unusual-connectivity",
    "unexpected-delivery",
    "nearby-activity",
  ]),
  sourceProbeId: z.string().min(1),
  sourceInvestigationIds: z.array(z.string().min(1)).default([]),
  locationId: z.string().min(1),
  worldMinute: z.number().int().nonnegative(),
  endsWorldMinute: z.number().int().nonnegative().optional(),
  affectedBuildIds: z.array(z.string().min(1)).default([]),
  destroyedHardwareIds: z.array(z.string().min(1)).default([]),
  assistantAdoptedModelId: z.string().min(1).optional(),
});

const compromiseSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "rig-lost",
    "dwelling-lost",
    "identity-exposed",
    "stranded",
  ]),
  sourceThreatId: z.string().min(1),
  sourceProbeId: z.string().min(1),
  sourceInvestigationIds: z.array(z.string().min(1)).default([]),
  locationId: z.string().min(1),
  worldMinute: z.number().int().nonnegative(),
});

const investigationSchema = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  openedWorldMinute: z.number().int().nonnegative(),
  progress: z.number().int().nonnegative(),
  sourceIds: z.array(z.string().min(1)).default([]),
  signals: z.array(investigationSignalSchema).default([]),
});

const storedWorldStateSchema = z.object({
  worldMinute: z.number().int().nonnegative(),
  player: z.object({
    handle: z.string().min(1),
    rank: z.number().int().positive(),
  }),
  targets: z.array(targetSchema),
  knownTargetIds: z.array(z.string().min(1)).default([]),
  evidence: z.array(evidenceSchema).optional(),
  operation: operationSchema.nullable().optional().default(null),
  traces: z.array(traceSchema).default([]),
  reactions: z.array(reactionSchema).default([]),
  underground: undergroundSchema.optional(),
  economy: economySchema.optional(),
  analysis: z.array(analysisRecordSchema).default([]),
  builds: z.array(inFlightBuildSchema).default([]),
  // Phase 6 P1: a legacy save simply has no open case files.
  investigations: z.array(investigationSchema).default([]),
  // Phase 6 P2: and no rival has looked at them yet.
  probes: z.array(rivalProbeSchema).default([]),
  // Phase 6 P3: and no physical escalation has happened yet.
  physicalThreats: z.array(physicalThreatSchema).default([]),
  // Phase 6 P4: and no catastrophic condition has been recorded yet.
  compromises: z.array(compromiseSchema).default([]),
});

export const worldStateSchema = storedWorldStateSchema.transform((state) => {
  const evidence = state.evidence ? [...state.evidence] : [];

  for (const targetId of state.knownTargetIds) {
    const evidenceId = `target-profile:${targetId}`;

    if (!evidence.some((record) => record.id === evidenceId)) {
      evidence.push({
        id: evidenceId,
        kind: "target-profile" as const,
        subjectId: targetId,
        confidence: "observed" as const,
        source: "legacy-discovery" as const,
        worldMinute: state.worldMinute,
      });
    }
  }

  return {
    ...state,
    evidence,
    operation: state.operation ?? null,
    traces: state.traces ?? [],
    reactions: state.reactions ?? [],
    underground: state.underground ?? {
      seed: 0,
      lastTickMinute: state.worldMinute,
      playerNetwork: null,
      actors: [],
      relationships: [],
      incidents: [],
      rumors: [],
      messages: [],
      contracts: [],
      retaliations: [],
      forumPosts: [],
    },
    economy: state.economy ?? {
      credits: 0,
      ledger: [],
      hardware: [],
      housing: null,
      software: [],
      playerTools: [],
      ownedMachines: [],
      ownedModels: [],
      ownedWorkflows: [],
      activeModel: null,
    },
  };
});
