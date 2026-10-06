import { beforeEach, describe, expect, it } from "vitest";

import { useUiStore } from "@/stores/ui/use-ui-store";

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.setState({ activeSurface: "computer" });
  });

  it("tracks presentation state without carrying world simulation data", () => {
    useUiStore.getState().setActiveSurface("room");

    expect(useUiStore.getState().activeSurface).toBe("room");
    expect(useUiStore.getState()).not.toHaveProperty("worldMinute");
    expect(useUiStore.getState()).not.toHaveProperty("targets");
  });

  it("opens the appearance window as ordinary ephemeral UI", () => {
    useUiStore.getState().openWindow("settings");

    expect(useUiStore.getState().openWindows).toContain("settings");
    expect(useUiStore.getState().focusedWindow).toBe("settings");
  });
});
