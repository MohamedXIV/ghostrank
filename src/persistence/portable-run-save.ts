import type { WorldState } from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { z } from "zod";

export const PORTABLE_RUN_FORMAT = "ghostrank-run" as const;
export const PORTABLE_RUN_VERSION = 1 as const;

const portableRunSaveSchema = z.object({
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

export function parsePortableRunSave(serialized: string): WorldState {
  const parsedJson: unknown = JSON.parse(serialized);
  return portableRunSaveSchema.parse(parsedJson).state;
}
