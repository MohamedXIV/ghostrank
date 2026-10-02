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
  };
});
