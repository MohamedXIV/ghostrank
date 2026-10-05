import { describe, expect, it } from "vitest";

import {
  BALANCE_TELEMETRY_HORIZON_DAYS,
  BALANCE_TELEMETRY_SEEDS,
  authoredContentCounts,
  runBalanceTelemetry,
  sampleBalanceRun,
} from "@/game/telemetry/balance-telemetry";

describe("Phase 8 P1 — local balance telemetry baseline", () => {
  it("pins the authored-content breadth that P2–P6 will intentionally expand", () => {
    expect(authoredContentCounts()).toEqual({
      actors: 5,
      targets: 1,
      targetMachines: 2,
      targetServices: 2,
      hardwareListings: 6,
      housingListings: 4,
      machineListings: 5,
      modelListings: 5,
      playerToolListings: 3,
      softwareListings: 3,
      workflowSpecs: 3,
    });
  });

  it("is deterministic for the same seed, policy and horizon", () => {
    expect(sampleBalanceRun("contractor", 7, 12)).toEqual(
      sampleBalanceRun("contractor", 7, 12),
    );
    expect(sampleBalanceRun("reckless", 13, 12)).toEqual(
      sampleBalanceRun("reckless", 13, 12),
    );
  });

  it("reports the unchanged multi-seed baseline across distinct player policies", () => {
    const report = runBalanceTelemetry();

    console.info("PHASE8_P1_TELEMETRY", JSON.stringify(report));

    expect(report.version).toBe(1);
    expect(report.seedCount).toBe(BALANCE_TELEMETRY_SEEDS);
    expect(report.horizonDays).toBe(BALANCE_TELEMETRY_HORIZON_DAYS);

    const idle = report.scenarios.idle;
    expect(idle.sampleCount).toBe(BALANCE_TELEMETRY_SEEDS);
    expect(idle.endings.active).toBe(BALANCE_TELEMETRY_SEEDS);
    expect(idle.economy.finalCredits).toEqual({
      min: 0,
      median: 0,
      max: 0,
      mean: 0,
    });
    expect(idle.ranking.improvement).toEqual({
      min: 0,
      median: 0,
      max: 0,
      mean: 0,
    });
    expect(idle.contracts.completed).toBe(0);
    expect(idle.threat.escalations).toBe(0);
    expect(idle.pressureBands.ordinary).toBe(BALANCE_TELEMETRY_SEEDS);

    const contractor = report.scenarios.contractor;
    expect(contractor.sampleCount).toBe(BALANCE_TELEMETRY_SEEDS);
    expect(contractor.contracts.created).toBeGreaterThan(0);
    expect(contractor.contracts.everAccepted).toBeGreaterThan(0);
    expect(contractor.contracts.completed).toBeGreaterThan(0);
    expect(contractor.economy.contractCredits.max).toBeGreaterThan(0);
    expect(contractor.ranking.improvement.max).toBeGreaterThan(0);
    expect(contractor.exposure.targetIds).toContain("nightshade");
    expect(contractor.exposure.serviceIds.length).toBeGreaterThan(0);

    const reckless = report.scenarios.reckless;
    expect(reckless.sampleCount).toBe(BALANCE_TELEMETRY_SEEDS);
    expect(reckless.threat.escalations).toBeGreaterThan(0);
    expect(
      reckless.threat.probes +
        reckless.threat.physicalThreats +
        reckless.threat.compromises,
    ).toBeGreaterThan(0);

    const careerExit = report.scenarios["career-exit"];
    expect(careerExit.sampleCount).toBe(BALANCE_TELEMETRY_SEEDS);
    expect(
      careerExit.endings.retired + careerExit.endings.vanished,
    ).toBeGreaterThan(0);

    for (const summary of Object.values(report.scenarios)) {
      expect(summary.runMinutes.min).toBeGreaterThanOrEqual(0);
      expect(summary.runMinutes.max).toBeGreaterThanOrEqual(
        summary.runMinutes.min,
      );
      expect(summary.economy.ledgerValueMoved.min).toBeGreaterThanOrEqual(0);
    }
  }, 60_000);});
