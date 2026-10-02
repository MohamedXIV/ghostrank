import { z } from "zod";

export const worldStateSchema = z.object({
  worldMinute: z.number().int().nonnegative(),
  player: z.object({
    handle: z.string().min(1),
    rank: z.number().int().positive(),
  }),
  targets: z.array(
    z.object({
      id: z.string().min(1),
      handle: z.string().min(1),
      rank: z.number().int().positive(),
      hidden: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  knownTargetIds: z.array(z.string().min(1)),
});
