import { z } from "zod";

const identitySchema = z.string().min(1);
const schemaVersion = z.number().int().positive();
const worldMinute = z.number().int().nonnegative();

export const persistedEventSchema = z.object({
  id: identitySchema,
  runId: identitySchema,
  worldMinute,
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  schemaVersion,
});

export const runSnapshotSchema = z.object({
  id: identitySchema,
  runId: identitySchema,
  worldMinute,
  state: z.record(z.string(), z.unknown()),
  schemaVersion,
});

export type PersistedEvent = z.infer<typeof persistedEventSchema>;
export type RunSnapshot = z.infer<typeof runSnapshotSchema>;
