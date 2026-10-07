import { beforeEach, describe, expect, it } from "vitest";

import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";

describe("useOnboardingStore", () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetAllHints();
    useOnboardingStore.setState({
      orientationDismissed: false,
      orientationModalOpen: false,
      legendModalOpen: false,
    });
  });

  it("dismisses specific hints and adds them to dismissedHintIds", () => {
    const store = useOnboardingStore.getState();
    expect(store.dismissedHintIds).toEqual([]);

    store.dismissHint("hint:recon-lead");
    expect(useOnboardingStore.getState().dismissedHintIds).toContain(
      "hint:recon-lead",
    );

    // Idempotent
    store.dismissHint("hint:recon-lead");
    expect(useOnboardingStore.getState().dismissedHintIds).toHaveLength(1);
  });

  it("supports resetting all dismissed hints", () => {
    const store = useOnboardingStore.getState();
    store.dismissHint("hint:recon-lead");
    store.dismissHint("hint:market-capacity");
    expect(useOnboardingStore.getState().dismissedHintIds).toHaveLength(2);

    store.resetAllHints();
    expect(useOnboardingStore.getState().dismissedHintIds).toEqual([]);
    expect(useOnboardingStore.getState().hintsEnabled).toBe(true);
    expect(useOnboardingStore.getState().directivesEnabled).toBe(true);
  });

  it("toggles hints and directives enabled state", () => {
    const store = useOnboardingStore.getState();
    expect(store.hintsEnabled).toBe(true);

    store.setHintsEnabled(false);
    expect(useOnboardingStore.getState().hintsEnabled).toBe(false);

    store.setDirectivesEnabled(false);
    expect(useOnboardingStore.getState().directivesEnabled).toBe(false);
  });

  it("handles expert mode by silencing all hints and directives at once", () => {
    const store = useOnboardingStore.getState();
    store.setExpertMode();

    const state = useOnboardingStore.getState();
    expect(state.hintsEnabled).toBe(false);
    expect(state.directivesEnabled).toBe(false);
    expect(state.orientationDismissed).toBe(true);
    expect(state.orientationModalOpen).toBe(false);
  });

  it("opens and closes orientation and legend modals", () => {
    const store = useOnboardingStore.getState();

    store.openOrientationModal();
    expect(useOnboardingStore.getState().orientationModalOpen).toBe(true);

    store.closeOrientationModal();
    expect(useOnboardingStore.getState().orientationModalOpen).toBe(false);

    store.openLegendModal();
    expect(useOnboardingStore.getState().legendModalOpen).toBe(true);

    store.closeLegendModal();
    expect(useOnboardingStore.getState().legendModalOpen).toBe(false);
  });
});
