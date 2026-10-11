import { z } from "zod";

/**
 * G9 P1: finite, validated vocabulary. A ScopeRef is an identity, NOT a
 * permission to read arbitrary fields on an entity. Only registered facts
 * can interpret one, inside trusted simulation code.
 */
const playerScopeSchema = z.strictObject({
  kind: z.literal("player"),
  id: z.literal("player"),
});
const actorScopeSchema = z.strictObject({
  kind: z.literal("actor"),
  id: z.string().min(1).max(160),
});
const organizationScopeSchema = z.strictObject({
  kind: z.literal("organization"),
  id: z.string().min(1).max(160),
});
const targetScopeSchema = z.strictObject({
  kind: z.literal("target"),
  id: z.string().min(1).max(160),
});
const sourceScopeSchema = z.strictObject({
  kind: z.literal("source"),
  id: z.string().min(1).max(160),
});

export const scopeRefSchema = z.discriminatedUnion("kind", [
  playerScopeSchema,
  actorScopeSchema,
  organizationScopeSchema,
  targetScopeSchema,
  sourceScopeSchema,
]);

export type ScopeRef = z.infer<typeof scopeRefSchema>;

export const knowledgeLensSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("authority") }),
  z.strictObject({ kind: z.literal("player-known") }),
  z.strictObject({
    kind: z.literal("observer-report"),
    observer: actorScopeSchema,
  }),
]);
export type KnowledgeLens = z.infer<typeof knowledgeLensSchema>;

const incidentOutcomeSchema = z.enum(["succeeded", "repelled"]);

/**
 * The first fact counts *player-earned evidence*, not world machine count.
 * The two incident facts intentionally have different meanings:
 * actual-outcome is truth, reported-outcome is only a claim someone sent.
 */
export const contentFactSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("player.known-active-target-machines"),
    target: targetScopeSchema,
    min: z.number().int().min(1).max(256),
  }),
  z.strictObject({
    kind: z.literal("incident.actual-outcome"),
    source: sourceScopeSchema,
    equals: incidentOutcomeSchema,
  }),
  z.strictObject({
    kind: z.literal("incident.reported-outcome"),
    source: sourceScopeSchema,
    equals: incidentOutcomeSchema,
  }),
]);

export type ContentFact = z.infer<typeof contentFactSchema>;

export type ContentCondition =
  | { op: "fact"; fact: ContentFact }
  | { op: "all" | "any"; terms: ContentCondition[] }
  | { op: "not"; term: ContentCondition };

const conditionSchema: z.ZodType<ContentCondition> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.strictObject({ op: z.literal("fact"), fact: contentFactSchema }),
    z.strictObject({
      op: z.literal("all"),
      terms: z.array(conditionSchema).min(1).max(16),
    }),
    z.strictObject({
      op: z.literal("any"),
      terms: z.array(conditionSchema).min(1).max(16),
    }),
    z.strictObject({ op: z.literal("not"), term: conditionSchema }),
  ]),
);

/** Hard caps make malformed or cyclic authored packs safe to reject. */
const MAX_CONDITION_DEPTH = 8;
const MAX_CONDITION_NODES = 64;
const MAX_INPUT_DEPTH = 24;
const MAX_INPUT_NODES = 256;

function boundedInput(value: unknown): boolean {
  const active = new WeakSet<object>();
  let count = 0;

  function visit(item: unknown, depth: number): boolean {
    count += 1;
    if (count > MAX_INPUT_NODES || depth > MAX_INPUT_DEPTH) return false;
    if (item === null || typeof item !== "object") return true;
    if (active.has(item)) return false;
    active.add(item);
    for (const child of Object.values(item)) {
      if (!visit(child, depth + 1)) return false;
    }
    active.delete(item);
    return true;
  }

  return visit(value, 0);
}

function boundedCondition(
  condition: ContentCondition,
  depth: number,
  nodes: { count: number },
): boolean {
  nodes.count += 1;
  if (depth > MAX_CONDITION_DEPTH || nodes.count > MAX_CONDITION_NODES) {
    return false;
  }
  if (condition.op === "fact") return true;
  if (condition.op === "not") {
    return boundedCondition(condition.term, depth + 1, nodes);
  }
  return condition.terms.every((term) =>
    boundedCondition(term, depth + 1, nodes),
  );
}

export interface CompiledContentCondition {
  readonly definition: ContentCondition;
}

export type CompileContentResult =
  | { ok: true; compiled: CompiledContentCondition }
  | { ok: false; error: "INVALID_CONTENT" | "CONTENT_TOO_COMPLEX" };

/**
 * Ingest only bounded, strictly validated data. No eval, arbitrary
 * JavaScript, user-supplied selectors, or writeable dotted paths.
 */
export function compileContentCondition(input: unknown): CompileContentResult {
  if (!boundedInput(input)) {
    return { ok: false, error: "CONTENT_TOO_COMPLEX" };
  }
  const parsed = conditionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_CONTENT" };
  }
  if (!boundedCondition(parsed.data, 0, { count: 0 })) {
    return { ok: false, error: "CONTENT_TOO_COMPLEX" };
  }
  return { ok: true, compiled: { definition: parsed.data } };
}
