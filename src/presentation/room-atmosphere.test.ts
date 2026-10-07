import { afterEach, describe, expect, it, vi } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { derivePresence } from "@/game/simulation/systems/location";
import { DISTRO_PROFILES } from "@/presentation/distros";
import { playDistroSound } from "@/presentation/distro-sound";
import {
  describePhysicalRoomSignal,
  latestKnownRoomSignal,
} from "@/presentation/room-atmosphere";

describe("room and audio presentation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses only current-location projected warning cues without mutating WorldState", () => {
    const world = createSliceWorldState();
    const before = structuredClone(world);
    const currentLocation = derivePresence(world.economy.housing).locationId;
    const projected = projectWorld({
      ...world,
      physicalThreats: [
        {
          id: "physical:visible",
          actorId: "hidden-actor",
          kind: "warning",
          signalKind: "knock",
          sourceProbeId: "hidden-probe",
          sourceInvestigationIds: ["hidden-case"],
          locationId: currentLocation,
          worldMinute: 240,
          affectedBuildIds: [],
          destroyedHardwareIds: [],
        },
        {
          id: "physical:old-place",
          actorId: "hidden-actor",
          kind: "warning",
          signalKind: "footsteps",
          sourceProbeId: "hidden-probe",
          sourceInvestigationIds: [],
          locationId: "somewhere-else",
          worldMinute: 360,
          affectedBuildIds: [],
          destroyedHardwareIds: [],
        },
      ],
    });
    const signal = latestKnownRoomSignal(projected.physicalSignals);

    expect(signal).toEqual({
      id: "physical:visible",
      kind: "knock",
      worldMinute: 240,
      atCurrentLocation: true,
    });
    expect(describePhysicalRoomSignal(signal!.kind)).toContain("knocked");
    expect(JSON.stringify(projected.physicalSignals)).not.toContain("hidden-");
    expect(world).toEqual(before);
  });

  it("plays optional warning audio without advancing or mutating WorldState", () => {
    const world = createSliceWorldState();
    const before = structuredClone(world);
    let notesStarted = 0;

    class FakeAudioParam {
      setValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }
    class FakeAudioContext {
      state = "closed";
      currentTime = 0;
      destination = {};
      resume() { return Promise.resolve(); }
      createOscillator() {
        return {
          type: "sine",
          frequency: new FakeAudioParam(),
          connect() {},
          start() { notesStarted += 1; },
          stop() {},
        };
      }
      createGain() {
        return {
          gain: new FakeAudioParam(),
          connect() {},
        };
      }
    }
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });

    playDistroSound(DISTRO_PROFILES["ghost-os"].sound, "warning", true);

    expect(notesStarted).toBe(1);
    expect(world).toEqual(before);
  });
});
