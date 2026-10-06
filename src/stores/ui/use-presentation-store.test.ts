import { beforeEach, describe, expect, it } from "vitest";

import { usePresentationStore } from "@/stores/ui/use-presentation-store";

describe("usePresentationStore", () => {
  beforeEach(() => {
    usePresentationStore.setState({
      distroId: "ghost-os",
      themeId: "ash",
      hydrated: false,
    });
  });

  it("switches distro by resetting to that profile's default theme", () => {
    usePresentationStore.getState().setDistro("petal");

    expect(usePresentationStore.getState().distroId).toBe("petal");
    expect(usePresentationStore.getState().themeId).toBe("light");
  });

  it("accepts only themes belonging to the active distro", () => {
    usePresentationStore.getState().setDistro("petal");
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
});
