import type { WorldState } from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { type ParseSaveResult } from "@/persistence/save-diagnostics";
import { z } from "zod";

export const PORTABLE_RUN_FORMAT = "ghostrank-run" as const;
export const PORTABLE_RUN_VERSION = 1 as const;

const envelopeHeaderSchema = z.object({
  format: z.string(),
  version: z.number().int(),
  state: z.unknown(),
});

export const portableRunSaveSchema = z.object({
  format: z.literal(PORTABLE_RUN_FORMAT),
  version: z.literal(PORTABLE_RUN_VERSION),
  state: worldStateSchema,
});


export interface PortableRunSave {
  format: typeof PORTABLE_RUN_FORMAT;
  version: typeof PORTABLE_RUN_VERSION;
  state: WorldState;
}

export function serializePortableRunSave(state: WorldState): string {
  const validatedState = worldStateSchema.parse(state);

  return JSON.stringify({
    format: PORTABLE_RUN_FORMAT,
    version: PORTABLE_RUN_VERSION,
    state: validatedState,
  });
}

/**
 * Safely parses serialized text into a WorldState with rich diagnostics.
 * Differentiates malformed JSON, format envelope mismatch, unsupported
 * version, and schema field validation errors.
 */
export function safeParsePortableRunSave(
  serialized: string,
): ParseSaveResult<WorldState> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(serialized);
  } catch (error) {
    const rawSnippet =
      serialized.length > 120
        ? `${serialized.slice(0, 117)}...`
        : serialized;
    return {
      ok: false,
      error: {
        kind: "corrupt_json",
        message:
          error instanceof Error ? error.message : "Malformed JSON syntax",
        rawSnippet,
      },
    };
  }

  const envelopeResult = envelopeHeaderSchema.safeParse(parsedJson);
  if (!envelopeResult.success) {
    return {
      ok: false,
      error: {
        kind: "unsupported_format",
        message: "Missing or malformed Ghostrank save envelope header",
        details: envelopeResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
    };
  }

  const envelope = envelopeResult.data;
  if (envelope.format !== PORTABLE_RUN_FORMAT) {
    return {
      ok: false,
      error: {
        kind: "unsupported_format",
        message: `Expected '${PORTABLE_RUN_FORMAT}', got '${envelope.format}'`,
      },
    };
  }

  if (envelope.version !== PORTABLE_RUN_VERSION) {
    return {
      ok: false,
      error: {
        kind: "unsupported_version",
        message: `Expected version ${PORTABLE_RUN_VERSION}, got version ${envelope.version}`,
      },
    };
  }

  const stateResult = worldStateSchema.safeParse(envelope.state);
  if (!stateResult.success) {
    const issueSummaries = stateResult.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      ok: false,
      error: {
        kind: "schema_validation_error",
        message: "World state schema validation failed",
        details: issueSummaries,
      },
    };
  }

  return {
    ok: true,
    data: stateResult.data,
  };
}

export function parsePortableRunSave(serialized: string): WorldState {
  const result = safeParsePortableRunSave(serialized);
  if (!result.ok) {
    const details = result.error.details ? ` (${result.error.details})` : "";
    throw new Error(`${result.error.message}${details}`);
  }
  return result.data;
}

