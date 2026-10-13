import { beforeEach, describe, expect, it } from "vitest";

import { useUiStore } from "@/stores/ui/use-ui-store";

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      activeSurface: "computer",
      openWindows: ["terminal", "recon"],
      focusedWindow: "terminal",
    });
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

  it("reactivates an already-focused application on every launcher click", () => {
    const before = useUiStore.getState().activationSerial;
    useUiStore.getState().openWindow("terminal");
    expect(useUiStore.getState().activationSerial).toBe(before + 1);
    useUiStore.getState().openWindow("terminal");
    expect(useUiStore.getState().activationSerial).toBe(before + 2);
    expect(useUiStore.getState().focusedWindow).toBe("terminal");
  });

  it("cycles focused window forward and backward across open windows", () => {
    useUiStore.setState({
      openWindows: ["terminal", "recon", "market"],
      focusedWindow: "terminal",
    });

    useUiStore.getState().cycleFocusedWindow("forward");
    expect(useUiStore.getState().focusedWindow).toBe("recon");

    useUiStore.getState().cycleFocusedWindow("forward");
    expect(useUiStore.getState().focusedWindow).toBe("market");

    useUiStore.getState().cycleFocusedWindow("forward");
    expect(useUiStore.getState().focusedWindow).toBe("terminal");

    useUiStore.getState().cycleFocusedWindow("backward");
    expect(useUiStore.getState().focusedWindow).toBe("market");
  });
});
