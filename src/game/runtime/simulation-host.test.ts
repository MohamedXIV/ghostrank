import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { createLocalSimulationHost, type SimulationHostRequest } from "@/game/runtime/simulation-host";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { worldStateSchema } from "@/persistence/world-state-schema";

describe("G9 P7 Worker-ready local host protocol (NO Worker)", () => {
  const origin = () => createSliceWorldState({ scenario: "fresh-scene", seed: 19, handle: "Local" });
  it("serializes concurrent requests in the same authority order, safely clonable", async () => {
    const source = origin();
    const host = createLocalSimulationHost(source);
    const bus = new CommandBus(source);
    const commands = [
      { type: "advanceTime" as const, minutes: 360 },
      { type: "advanceTime" as const, minutes: 360 },
      { type: "advanceTime" as const, minutes: 360 },
    ];
    const requests: SimulationHostRequest[] = commands.map((command, index) => ({
      requestId: "req:" + index, kind: "execute", command,
    }));
    const results = await Promise.all(requests.map(req => host.request(req)));
    for (const [i, response] of results.entries()) {
      const expected = bus.execute(commands[i]!);
      expect(response.requestId).toBe(requests[i]!.requestId);
      expect(response.result).toEqual(expected);
      expect(response.projection).toEqual(projectWorld(bus.snapshot()));
      expect(response.projection).not.toHaveProperty("underground.actors");
      expect(structuredClone(response)).toEqual(response);
    }
    expect(await host.snapshotForPersistence()).toEqual(bus.snapshot());
    expect(worldStateSchema.parse(await host.snapshotForPersistence()))
      .toEqual(bus.snapshot());
    expect(source.worldMinute).toBe(0); // original caller object stayed intact
  });

  it("sends only redacted projection to UI; saved snapshot is a separate privileged method", async () => {
    const state = origin();
    const host = createLocalSimulationHost(state);
    const before = await host.snapshotForPersistence();
    const response = await host.request({
      requestId: "read", kind: "execute",
      command: { type: "investigateLead", leadId: "not-visible" },
    });
    expect(response.result).toMatchObject({ok:false, error:"LEAD_NOT_FOUND"});
    expect(response.projection).toEqual(projectWorld(before));
    expect(response).not.toHaveProperty("world");
    expect(response).not.toHaveProperty("snapshot");
    expect(JSON.stringify(response)).not.toContain('"skill"');
    expect(JSON.stringify(response)).not.toContain('"discretion"');
    response.projection.worldMinute = 9999;
    response.result.events.push({
      type: "OpportunityExpired", leadId: "invented", worldMinute: 0,
    });
    expect((await host.snapshotForPersistence()).worldMinute).toBe(0);
  });

  it("does not accept empty or implausibly long transport IDs", async () => {
    const host = createLocalSimulationHost(origin());
    await expect(host.request({requestId:"",kind:"execute",
      command:{type:"advanceTime",minutes:360}})).rejects.toThrow("INVALID_HOST_REQUEST");
    await expect(host.request({requestId:"x".repeat(170),kind:"execute",
      command:{type:"advanceTime",minutes:360}})).rejects.toThrow("INVALID_HOST_REQUEST");
    expect((await host.snapshotForPersistence()).worldMinute).toBe(0);
  });
});
