import { describe, expect, it } from "vitest";

import { physicalIntentToCommand } from "@/game/phaser/bridge";

describe("physicalIntentToCommand", () => {
  it("translates a physical wait intent into the normal simulation command layer", () => {
    expect(
      physicalIntentToCommand({
        type: "wait",
        minutes: 10,
      }),
    ).toEqual({
      type: "advanceTime",
      minutes: 10,
    });
  });
});
