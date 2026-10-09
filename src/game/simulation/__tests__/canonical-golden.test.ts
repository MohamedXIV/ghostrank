import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";

const DAY = 24 * 60;

/**
 * Canonical Underground must play exactly as it did before the G2 living-world
 * slices (D066 onward). This fingerprints a scripted fortnight: the full final
 * state and every event it produced. Any change to canonical outcomes changes
 * the hash and fails here, so a deliberate change must update it knowingly.
 */
function canonicalFortnight(): { hash: string; events: number } {
  const bus = new CommandBus(
    createSliceWorldState({ seed: 42, handle: "BetaStress", scenario: "canonical" }),
  );
  const events: unknown[] = [];

  for (const command of [
    { type: "observeTarget", targetId: "nightshade" } as const,
    { type: "openOperation", targetId: "nightshade" } as const,
    { type: "surveyTarget", targetId: "nightshade" } as const,
    { type: "disengageOperation" } as const,
    { type: "advanceTime", minutes: 14 * DAY } as const,
  ]) {
    events.push(bus.execute(command));
  }

  const payload = JSON.stringify({ state: bus.snapshot(), events });
  return {
    hash: createHash("sha256").update(payload).digest("hex"),
    events: events.length,
  };
}

describe("canonical scenario fingerprint (D066 onward)", () => {
  it("plays a fortnight of Canonical Underground exactly as before", () => {
    const { hash } = canonicalFortnight();
    // Recorded on main before the living-world slices. See the test comment.
    expect(hash).toBe(
      "ff13f3797347716f3215baa6c40f82fa060a697a99bbf3ef33bc0eee0a755302",
    );
  });
});
