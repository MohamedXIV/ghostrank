import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { projectWorld } from "@/game/simulation/projection/project-world";

/** 128 independent generated scenario-seed pairs, *not* one world repeated. */
describe("G9 P7 seeded determinism + measured baseline", () => {
  it("128 seeds: bulk vs split vs save/reload, autonomous actors, receipts, termination invariants", () => {
    const times: number[] = [];
    let npcEvents = 0, leadEvents = 0, civicEvents = 0;
    let seededLeaks = 0;
    let simulatedTicks = 0;
    const heapAtStart = process.memoryUsage().heapUsed;
    for (let index = 0; index < 128; index++) {
      const seed = 1001 + index * 37;
      const scenario = index % 2 === 0 ? "fresh-scene" : "high-pressure";
      const start = performance.now();
      const initial = createSliceWorldState({ seed, scenario, handle: "Auditor" });
      const bulk = new CommandBus(initial);
      const split = new CommandBus(initial);
      const full = bulk.execute({ type: "advanceTime", minutes: 1080 });
      expect(full.ok, "bulk "+seed).toBe(true);
      const a = split.execute({ type: "advanceTime", minutes: 360 });
      expect(a.ok, "split "+seed).toBe(true);
      const midway = worldStateSchema.parse(JSON.parse(JSON.stringify(split.snapshot())));
      const revived = new CommandBus(midway);
      const b = revived.execute({ type: "advanceTime", minutes: 360 });
      const c = revived.execute({ type: "advanceTime", minutes: 360 });
      expect(b.ok && c.ok, "reload "+seed).toBe(true);
      const result = revived.snapshot();
      expect(result, "seed "+seed+" world").toEqual(bulk.snapshot());
      expect([...a.events, ...b.events, ...c.events], "seed "+seed+" event timeline")
        .toEqual(full.events);
      // No duplicate domain receipts or open-ended issuance after terminality.
      const leadIds = result.opportunities?.map(x => x.id) ?? [];
      const civicIds = result.institutionalCases?.map(x => x.id) ?? [];
      expect(new Set(leadIds).size).toBe(leadIds.length);
      expect(new Set(civicIds).size).toBe(civicIds.length);
      if (result.ending) {
        expect(revived.execute({type:"investigateLead",leadId:"x"}).error)
          .toBe("RUN_ENDED");
      }
      npcEvents += full.events.filter(e => e.type === "UndergroundActivity").length;
      leadEvents += full.events.filter(e => e.type === "OpportunityDiscovered").length;
      civicEvents += full.events.filter(e => e.type === "InstitutionalCaseOpened").length;
      seededLeaks += result.underground.rumors.filter(r => r.kind === "incident-leak").length;
      simulatedTicks += 3;
      expect(projectWorld(result)).not.toHaveProperty("underground.actors");
      times.push(performance.now() - start);
    }
    const heapDelta = process.memoryUsage().heapUsed - heapAtStart;
    const sorted = [...times].sort((a,b) => a-b);
    const median = sorted[Math.floor(sorted.length * 0.5)]!;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    console.info(
      "[G9 P7 PERF BASELINE node="+process.version+"] "+
      JSON.stringify({scenarios:128,simulatedTicks,npcEvents,leadEvents,
        civicEvents,seededLeaks,medianMsPerSeed:Math.round(median*100)/100,
        p95MsPerSeed:Math.round(p95*100)/100,
        maxMsPerSeed:Math.round(sorted[sorted.length-1]!*100)/100,
        heapDeltaBytes:heapDelta})+
      " // measurements are noisy under CI, not performance gates",
    );
    expect(npcEvents).toBeGreaterThan(0);
    expect(leadEvents).toBeGreaterThan(0);
    expect(simulatedTicks).toBe(384);
  }, 120_000);
});
