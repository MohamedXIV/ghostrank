import { beforeEach, describe, expect, it } from "vitest";

import {
  resetUiStore,
  useUiStore,
} from "@/stores/ui/use-ui-store";

describe("desktop window state", () => {
  beforeEach(() => {
    resetUiStore();
  });

  it("opens windows and raises the focused window without carrying world truth", () => {
    useUiStore.getState().openWindow("terminal");
    useUiStore.getState().openWindow("intel");

    const afterOpen = useUiStore.getState();
    expect(afterOpen.windows.terminal.isOpen).toBe(true);
    expect(afterOpen.windows.intel.isOpen).toBe(true);
    expect(afterOpen.windows.intel.zIndex).toBeGreaterThan(
      afterOpen.windows.terminal.zIndex,
    );

    useUiStore.getState().focusWindow("terminal");

    const afterFocus = useUiStore.getState();
    expect(afterFocus.windows.terminal.zIndex).toBeGreaterThan(
      afterFocus.windows.intel.zIndex,
    );
    expect(afterFocus).not.toHaveProperty("worldMinute");
    expect(afterFocus).not.toHaveProperty("targets");
  });

  it("closes windows without affecting the active computer surface", () => {
    useUiStore.getState().openWindow("terminal");
    useUiStore.getState().closeWindow("terminal");

    expect(useUiStore.getState().windows.terminal.isOpen).toBe(false);
    expect(useUiStore.getState().activeSurface).toBe("computer");
  });
});
