import { beforeEach, describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";

describe("usePresentationStore", () => {
  beforeEach(() => {
    usePresentationStore.setState({
      distroId: "ghost-os",
      themeId: "ash",
      installedDistroIds: ["ghost-os"],
      soundEnabled: true,
      hydrated: false,
    });
  });

  it("refuses to activate a distro before its installer completes", () => {
    usePresentationStore.getState().activateInstalledDistro("petal");

    expect(usePresentationStore.getState().distroId).toBe("ghost-os");
    expect(usePresentationStore.getState().installedDistroIds).toEqual([
      "ghost-os",
    ]);
  });

  it("installer completion persists ownership and activates the distro", () => {
    usePresentationStore.getState().completeDistroInstall("petal");

    expect(usePresentationStore.getState().distroId).toBe("petal");
    expect(usePresentationStore.getState().themeId).toBe("light");
    expect(usePresentationStore.getState().installedDistroIds).toContain(
      "petal",
    );
  });

  it("boots an already installed distro without reinstalling it", () => {
    usePresentationStore.getState().completeDistroInstall("velvet");
    usePresentationStore.getState().completeDistroInstall("petal");
    usePresentationStore.getState().activateInstalledDistro("velvet");

    expect(usePresentationStore.getState().distroId).toBe("velvet");
    expect(usePresentationStore.getState().installedDistroIds).toEqual([
      "ghost-os",
      "velvet",
      "petal",
    ]);
  });

  it("accepts only themes belonging to the active distro", () => {
    usePresentationStore.getState().completeDistroInstall("petal");
    usePresentationStore.getState().setTheme("night");
    expect(usePresentationStore.getState().themeId).toBe("night");

    usePresentationStore.getState().setTheme("plum");
    expect(usePresentationStore.getState().themeId).toBe("night");
  });

  it("contains presentation state only, never simulation authority", () => {
    const state = usePresentationStore.getState();

    expect(state).not.toHaveProperty("worldMinute");
    expect(state).not.toHaveProperty("rank");
    expect(state).not.toHaveProperty("credits");
    expect(state).not.toHaveProperty("targets");
  });

  it("cannot mutate an authoritative run during install, boot or theme changes", () => {
    const world = createSliceWorldState();
    const before = JSON.stringify(world);

    usePresentationStore.getState().completeDistroInstall("velvet");
    usePresentationStore.getState().completeDistroInstall("petal");
    usePresentationStore.getState().activateInstalledDistro("velvet");
    usePresentationStore.getState().setSoundEnabled(false);

    expect(JSON.stringify(world)).toBe(before);
  });
});
