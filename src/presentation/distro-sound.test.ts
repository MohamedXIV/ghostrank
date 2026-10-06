import { describe, expect, it } from "vitest";

import { DISTRO_IDS, DISTRO_PROFILES } from "@/presentation/distros";
import { cueNotes } from "@/presentation/distro-sound";

describe("distro sound identities", () => {
  it("gives every distro authored non-empty shell cues", () => {
    for (const distroId of DISTRO_IDS) {
      const sound = DISTRO_PROFILES[distroId].sound;

      expect(cueNotes(sound, "install").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "stage").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "complete").length).toBeGreaterThan(0);
      expect(cueNotes(sound, "boot").length).toBeGreaterThan(0);
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
});
