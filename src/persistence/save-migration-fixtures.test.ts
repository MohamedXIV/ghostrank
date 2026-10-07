import { describe, expect, it } from "vitest";

import {
  safeParsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { endRun } from "@/game/simulation/systems/endings";

describe("save migration & recovery hardening fixtures", () => {
  it("migrates a minimal Phase 2 / early Phase 3 save with legacy defaults", () => {
    const phase2Payload = {
      format: "ghostrank-run",
      version: 1,
      state: {
        worldMinute: 120,
        player: {
          handle: "PhantomZero",
          rank: 95400,
        },
        targets: [
          {
            id: "target-alpha",
            handle: "ALPHA",
            rank: 8000,
            machines: [
              {
                id: "m-1",
                label: "Edge Gateway",
                role: "gateway",
                services: [
                  {
                    id: "s-1",
                    label: "Public DNS",
                    kind: "dns",
                    state: "online",
                  },
                ],
              },
            ],
          },
        ],
        knownTargetIds: ["target-alpha"],
        operation: null,
        traces: [],
        reactions: [],
      },
    };

    const result = safeParsePortableRunSave(JSON.stringify(phase2Payload));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = result.data;
    expect(state.worldMinute).toBe(120);
    expect(state.player.handle).toBe("PhantomZero");
    // Synthesizes legacy evidence
    expect(state.evidence).toEqual([
      expect.objectContaining({
        id: "target-profile:target-alpha",
        kind: "target-profile",
        source: "legacy-discovery",
      }),
    ]);
    // Defaults economy
    expect(state.economy.credits).toBe(0);
    expect(state.economy.hardware).toEqual([]);
    // Defaults underground
    expect(state.underground.seed).toBe(0);
    expect(state.underground.actors).toEqual([]);
    // Defaults Phase 6 threat/investigation/probe fields
    expect(state.investigations).toEqual([]);
    expect(state.probes).toEqual([]);
    expect(state.physicalThreats).toEqual([]);
    expect(state.compromises).toEqual([]);
    // Defaults Phase 7 ending & retirement
    expect(state.ending).toBeNull();
    expect(state.retirement).toBeNull();
  });

  it("migrates a Phase 4/5 economy save without Phase 6 presence or Phase 7 endings", () => {
    const phase5Payload = {
      format: "ghostrank-run",
      version: 1,
      state: {
        worldMinute: 720,
        player: {
          handle: "GridRunner",
          rank: 82000,
        },
        targets: [],
        knownTargetIds: [],
        operation: null,
        traces: [],
        reactions: [],
        economy: {
          credits: 1540,
          ledger: [],
          hardware: [{ id: "hw:1", catalogId: "rig-baseline", acquiredWorldMinute: 0 }],
          housing: "housing-loft",
          software: ["software-scanner"],
          playerTools: [],
          ownedMachines: [],
          ownedModels: ["model-cloud-frontier"],
          ownedWorkflows: [],
          activeModel: "model-cloud-frontier",
        },
        underground: {
          seed: 42,
          lastTickMinute: 720,
          playerNetwork: "white",
          actors: [],
          relationships: [],
          incidents: [],
          rumors: [],
          messages: [],
          contracts: [],
          retaliations: [],
          forumPosts: [],
        },
        analysis: [],
        builds: [],
      },
    };

    const result = safeParsePortableRunSave(JSON.stringify(phase5Payload));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = result.data;
    expect(state.economy.credits).toBe(1540);
    expect(state.economy.housing).toBe("housing-loft");
    expect(state.underground.seed).toBe(42);
    expect(state.investigations).toEqual([]);
    expect(state.probes).toEqual([]);
    expect(state.physicalThreats).toEqual([]);
    expect(state.compromises).toEqual([]);
    expect(state.ending).toBeNull();
  });

  it("migrates a Phase 6 presence/threat save into Phase 7 without retroactive ending", () => {
    const phase6Payload = {
      format: "ghostrank-run",
      version: 1,
      state: {
        worldMinute: 1440,
        player: {
          handle: "ZeroTrace",
          rank: 75000,
        },
        targets: [],
        knownTargetIds: [],
        operation: null,
        traces: [],
        reactions: [],
        investigations: [
          {
            id: "case:1",
            targetId: "nightshade",
            openedWorldMinute: 600,
            progress: 45,
            sourceIds: ["trace:1"],
            signals: [],
          },
        ],
        probes: [
          {
            id: "probe:1",
            actorId: "vesper",
            subject: "rig",
            correct: true,
            locationId: "loc:safehouse",
            worldMinute: 800,
          },
        ],
        physicalThreats: [],
        compromises: [
          {
            id: "comp:1",
            kind: "rig-lost",
            sourceThreatId: "threat:1",
            sourceProbeId: "probe:1",
            sourceInvestigationIds: ["case:1"],
            locationId: "loc:safehouse",
            worldMinute: 1200,
          },
        ],
      },
    };

    const result = safeParsePortableRunSave(JSON.stringify(phase6Payload));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = result.data;
    expect(state.investigations).toHaveLength(1);
    expect(state.compromises).toHaveLength(1);
    // Historical Phase 6 compromise must NOT retroactively make the run ended
    expect(state.ending).toBeNull();
  });

  it("migrates a Phase 7 ended run correctly and preserves ending integrity", () => {
    const live = createSliceWorldState();
    live.worldMinute = 2880;
    endRun(live, {
      status: "unmasked",
      causeKind: "investigation",
      causeId: "case:apex",
      worldMinute: 2880,
    });

    const serialized = serializePortableRunSave(live);
    const result = safeParsePortableRunSave(serialized);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.ending).toEqual({
      status: "unmasked",
      causeKind: "investigation",
      causeId: "case:apex",
      worldMinute: 2880,
    });
  });

  it("provides rich diagnostic on corrupt JSON syntax without throwing", () => {
    const malformed = "{ invalid json content ...";
    const result = safeParsePortableRunSave(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("corrupt_json");
    expect(result.error.message).toBeDefined();
    expect(result.error.rawSnippet).toContain("{ invalid");
  });

  it("provides rich diagnostic on unsupported format envelope", () => {
    const invalidEnvelope = JSON.stringify({
      format: "different-game-save",
      version: 1,
      state: {},
    });
    const result = safeParsePortableRunSave(invalidEnvelope);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("unsupported_format");
    expect(result.error.message).toContain("different-game-save");
  });

  it("provides rich diagnostic on future / unsupported schema version", () => {
    const futureVersion = JSON.stringify({
      format: "ghostrank-run",
      version: 999,
      state: {},
    });
    const result = safeParsePortableRunSave(futureVersion);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("unsupported_version");
    expect(result.error.message).toContain("999");
  });

  it("provides rich diagnostic on schema validation violation without losing details", () => {
    const invalidState = JSON.stringify({
      format: "ghostrank-run",
      version: 1,
      state: {
        worldMinute: -50, // Negative worldMinute is invalid
        player: { handle: "", rank: -1 }, // Empty handle and negative rank
      },
    });
    const result = safeParsePortableRunSave(invalidState);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("schema_validation_error");
    expect(result.error.details).toBeDefined();
  });
});
