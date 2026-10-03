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

const undergroundSchema = z.object({
  seed: z.number().int(),
  lastTickMinute: z.number().int().nonnegative(),
  playerNetwork: networkSchema.nullable().default(null),
  actors: z.array(undergroundActorSchema).default([]),
  relationships: z.array(undergroundRelationshipSchema).default([]),
  incidents: z.array(undergroundIncidentSchema).default([]),
  rumors: z.array(undergroundRumorSchema).default([]),
  messages: z.array(undergroundMessageSchema).default([]),
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
    },
  };
});
