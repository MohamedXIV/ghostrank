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

  it("never instructs players to observe a fabricated Nightshade lead", () => {
    const progress = evaluateDirectivesProgress({
      targetIds: [], machineIds: [], services: {}, contracts: {}, worldMinute: 0,
    });
    expect(progress.items[0].commandCue).toBe("Index (Alt+3)");
    expect(progress.items[0].description).toContain("No actionable public target");
    expect(progress.items.map(item => item.commandCue).join(" ")).not.toContain("nightshade");
  });

  it("offers a valid public commission and observed-target sequence", () => {
    const contracts = {
      "contract:gen": { status: "offered", targetId: "gen-8",
        targetHandle: "Duskline", expiresWorldMinute: 1440 },
    };
    const start = evaluateDirectivesProgress({
      targetIds: [], machineIds: [], services: {}, contracts, worldMinute: 0,
    });
    expect(start.items[0].commandCue).toBe("observe gen-8");
    expect(start.items[0].description).toContain("Duskline");
    expect(start.items[3].commandCue).toBe("contract accept contract:gen");
    const observed = evaluateDirectivesProgress({
      targetIds: ["gen-8"], machineIds: ["gen-8-m1"], services: {},
      contracts, worldMinute: 100,
    });
    expect(observed.items[1].commandCue).toBe("op open gen-8");
    expect(observed.items[2].commandCue).toBe("inspect gen-8-m1");
    const open = evaluateDirectivesProgress({
      targetIds: ["gen-8"], machineIds: [], services: {},
      contracts, worldMinute: 100, activeOperationTargetId: "gen-8",
    });
    expect(open.items[1].commandCue).toBe("survey gen-8");
    const expired = evaluateDirectivesProgress({
      targetIds: [], machineIds: [], services: {},
      contracts, worldMinute: 1441,
    });
    expect(expired.items[0].commandCue).toBe("Index (Alt+3)");
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
