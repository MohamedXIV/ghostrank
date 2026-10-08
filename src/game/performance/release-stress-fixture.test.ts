import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { describe, expect, it } from "vitest";

import { deriveCompletedRunSummary } from "@/game/simulation/systems/run-history";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { parsePortableRunSave, serializePortableRunSave } from "@/persistence/portable-run-save";
import {
  createReleaseStressFixtures,
  RELEASE_STRESS_COUNTS,
} from "./release-stress-fixture";

describe("release stress fixture", () => {
  it("covers long-run surfaces with a deterministic archived timeline", () => {
    const first = createReleaseStressFixtures();
    const second = createReleaseStressFixtures();

    expect(first.active.traces).toHaveLength(RELEASE_STRESS_COUNTS.traces);
    expect(first.active.underground.messages).toHaveLength(
      RELEASE_STRESS_COUNTS.messages,
    );
    expect(first.active.underground.rumors).toHaveLength(
      RELEASE_STRESS_COUNTS.rumors,
    );
    expect(first.active.underground.forumPosts).toHaveLength(
      RELEASE_STRESS_COUNTS.forumPosts,
    );
    expect(first.active.economy.ledger).toHaveLength(
      RELEASE_STRESS_COUNTS.ledger,
    );
    expect(first.active.economy.hardware.length).toBeGreaterThan(250);

    const summary = deriveCompletedRunSummary(first.completed);
    expect(summary.timeline.length).toBeGreaterThan(2_500);
    expect(summary.timeline).toEqual(
      deriveCompletedRunSummary(second.completed).timeline,
    );
    expect(summary.timeline.at(-1)?.kind).toBe("ending");

    const restored = parsePortableRunSave(serializePortableRunSave(first.active));
    expect(restored.traces).toHaveLength(RELEASE_STRESS_COUNTS.traces);
    expect(restored.underground.messages).toHaveLength(
      RELEASE_STRESS_COUNTS.messages,
    );
    expect(restored.economy.ledger).toHaveLength(RELEASE_STRESS_COUNTS.ledger);
  });

  it("keeps generated hidden truth out of player-facing stress projections", () => {
    const { completed } = createReleaseStressFixtures();
    const projection = projectWorld(completed);
    const playerFacing = JSON.stringify({
      projection,
      summary: deriveCompletedRunSummary(completed),
    });

    const hiddenFields = [
      '"skill"',
      '"defense"',
      '"discretion"',
      '"activity"',
      '"accurate"',
      '"correct"',
      '"progress"',
      '"sourceIds"',
      '"sourceProbeId"',
      '"sourceInvestigationIds"',
    ].filter((hiddenField) => playerFacing.includes(hiddenField));

    expect(hiddenFields).toEqual([]);
    expect(projection.ending).not.toHaveProperty("causeId");
    expect(projection.probes.every((probe) => !("actorId" in probe))).toBe(true);
  });

  const fixturePath = process.env.GHOSTRANK_P8_FIXTURE_PATH;
  if (fixturePath) {
    it("exports deterministic browser-only fixture saves", () => {
      const { active, completed } = createReleaseStressFixtures();
      const payload = {
        activeSave: serializePortableRunSave(active),
        completedSave: serializePortableRunSave(completed),
        counts: RELEASE_STRESS_COUNTS,
      };
      mkdirSync(dirname(fixturePath), { recursive: true });
      writeFileSync(fixturePath, JSON.stringify(payload));
      const exported = JSON.parse(readFileSync(fixturePath, "utf8")) as {
        activeSave: string;
        completedSave: string;
        counts: typeof RELEASE_STRESS_COUNTS;
      };
      expect(exported.counts).toEqual(RELEASE_STRESS_COUNTS);
      expect(exported.activeSave).toContain('"format":"ghostrank-run"');
      expect(exported.completedSave).toContain('"status":"arrested"');
    });
  }
});
