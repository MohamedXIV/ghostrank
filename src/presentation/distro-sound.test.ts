import { afterEach, describe, expect, it, vi } from "vitest";

import { DISTRO_IDS, DISTRO_PROFILES } from "@/presentation/distros";
import { cueNotes, playDistroSound } from "@/presentation/distro-sound";

describe("distro sound identities", () => {
  it("gives every distro authored non-empty shell cues", () => {
    for (const distroId of DISTRO_IDS) {
      const sound = DISTRO_PROFILES[distroId].sound;

      expect(cueNotes(sound, "install").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "stage").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "complete").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "boot").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "ending").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "warning").length).toBeGreaterThan(0);
      expect(sound.gain).toBeGreaterThan(0);
      expect(sound.gain).toBeLessThanOrEqual(0.08);
    }
  });

  it("keeps the five boot identities distinct", () => {
    const signatures = DISTRO_IDS.map((id) =>
      DISTRO_PROFILES[id].sound.boot.join(","),
    );

    expect(new Set(signatures).size).toBe(DISTRO_IDS.length);
  });

  it("keeps the new ending and warning cues authored per distro", () => {
    for (const cue of ["ending", "warning"] as const) {
      const signatures = DISTRO_IDS.map((id) =>
        cueNotes(DISTRO_PROFILES[id].sound, cue).join(","),
      );

      expect(new Set(signatures).size).toBe(DISTRO_IDS.length);
    }
  });

  it("does not construct optional audio output while muted", () => {
    let constructions = 0;
    vi.stubGlobal("window", {
      AudioContext: class {
        constructor() {
          constructions += 1;
        }
      },
    });

    playDistroSound(DISTRO_PROFILES["ghost-os"].sound, "warning", false);

    expect(constructions).toBe(0);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
