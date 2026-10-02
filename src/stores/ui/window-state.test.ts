import { beforeEach, describe, expect, it } from "vitest";

import { useUiStore } from "@/stores/ui/use-ui-store";

describe("computer window state", () => {
  beforeEach(() => {
    useUiStore.setState({
      activeSurface: "room",
      openWindows: [],
      focusedWindow: null,
    });
  });

  it("opens and focuses an app without duplicating it", () => {
    const ui = useUiStore.getState();

    ui.openWindow("terminal");
    ui.openWindow("terminal");
    ui.openWindow("recon");

    expect(useUiStore.getState().openWindows).toEqual([
      "terminal",
      "recon",
    ]);
    expect(useUiStore.getState().focusedWindow).toBe("recon");
  });

  it("moves between room and computer without touching simulation state", () => {
    useUiStore.getState().setActiveSurface("computer");

    expect(useUiStore.getState().activeSurface).toBe("computer");
    expect(useUiStore.getState()).not.toHaveProperty("worldMinute");
  });
});
