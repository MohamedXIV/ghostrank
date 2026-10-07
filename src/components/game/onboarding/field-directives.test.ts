import { describe, expect, it } from "vitest";

import {
  evaluateDirectivesProgress,
  type DirectivesProjectionSnapshot,
} from "@/components/game/onboarding/field-directives";

describe("Field Directives progressive guidance evaluation", () => {
  it("starts with 0/4 directives completed for fresh uninitialized run", () => {
    const emptySnapshot: DirectivesProjectionSnapshot = {
      targetIds: [],
      machineIds: [],
      services: {},
      contracts: {},
    };

    const progress = evaluateDirectivesProgress(emptySnapshot);
    expect(progress.completedCount).toBe(0);
    expect(progress.totalCount).toBe(4);
    expect(progress.allCompleted).toBe(false);

    expect(progress.items.map((i) => i.isComplete)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("marks directive 1 complete after observing a target", () => {
    const snapshot: DirectivesProjectionSnapshot = {
      targetIds: ["nightshade"],
      machineIds: [],
      services: {},
      contracts: {},
    };

    const progress = evaluateDirectivesProgress(snapshot);
    expect(progress.completedCount).toBe(1);
    expect(progress.items[0].isComplete).toBe(true);
    expect(progress.items[1].isComplete).toBe(false);
  });

  it("marks directive 2 and 3 complete after surveying machines and inspecting services", () => {
    const snapshot: DirectivesProjectionSnapshot = {
      targetIds: ["nightshade"],
      machineIds: ["ns-relay"],
      services: { "service:1": { targetId: "nightshade", name: "auth" } },
      contracts: {},
    };

    const progress = evaluateDirectivesProgress(snapshot);
    expect(progress.completedCount).toBe(3);
    expect(progress.items[0].isComplete).toBe(true);
    expect(progress.items[1].isComplete).toBe(true);
    expect(progress.items[2].isComplete).toBe(true);
    expect(progress.items[3].isComplete).toBe(false);
    expect(progress.allCompleted).toBe(false);
  });

  it("marks the final acceptance directive complete after accepting or completing a contract", () => {
    const snapshot: DirectivesProjectionSnapshot = {
      targetIds: ["nightshade"],
      machineIds: ["ns-relay"],
      services: { "service:1": { targetId: "nightshade", name: "auth" } },
      contracts: {
        "contract:1": { status: "accepted" },
      },
    };

    const progress = evaluateDirectivesProgress(snapshot);
    expect(progress.completedCount).toBe(4);
    expect(progress.totalCount).toBe(4);
    expect(progress.allCompleted).toBe(true);
    expect(progress.items.every((i) => i.isComplete)).toBe(true);
    expect(progress.items[3].title).toBe("4. Accept Syndicate Contract");
    expect(progress.items[3].commandCue).toBe("contract accept <id>");
  });
});
