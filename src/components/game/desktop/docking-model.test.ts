import { describe, expect, it } from "vitest";
import { Actions, Model } from "flexlayout-react";
import { DISTRO_IDS } from "@/presentation/distros";
import {
  buildDistroDockModel, safeRestoredDockModel, validateDockLayout,
  WORKSPACE_APP_IDS, tabIdsInDock,
} from "@/components/game/desktop/docking-model";

describe("real FlexLayout desktop model (without world authority)", () => {
  it("maps only six actual GUI apps into layout nodes", () => {
    expect(WORKSPACE_APP_IDS).toEqual(["terminal", "recon", "underground", "market", "history", "settings"]);
    for (const distro of DISTRO_IDS) {
      const m = buildDistroDockModel(distro, ["terminal", "recon"], "recon");
      expect(m).toBeInstanceOf(Model);
      expect(tabIdsInDock(m)).toEqual(["terminal", "recon"]);
      expect(m.getNodeById("recon")).toBeDefined();
    }
  });
  it("supports library-native dock, close/reopen and floating in-page actions", () => {
    const m = buildDistroDockModel("lattice", ["terminal", "recon", "market"], "market");
    m.doAction(Actions.popoutTab("market", "float"));
    expect(m.toJson().popouts).toBeDefined();
    const roundTrip = Model.fromJson(m.toJson());
    expect(roundTrip.getNodeById("terminal")).toBeDefined();
  });
  it("rejects invalid persisted layouts and unknown app IDs, never leaking them", () => {
    const m = buildDistroDockModel("ghost-os", ["terminal", "market"], "market");
    const valid = m.toJson();
    expect(validateDockLayout(valid)).toBe(true);
    const corrupted = JSON.parse(JSON.stringify(valid));
    corrupted.layout.children[0].children[0].component = "private-debug-panel";
    expect(validateDockLayout(corrupted)).toBe(false);
    const restored = safeRestoredDockModel("ghost-os", ["terminal"], "terminal", JSON.stringify(corrupted));
    expect(tabIdsInDock(restored)).toEqual(["terminal"]);
    expect(validateDockLayout({ layout: "bad" })).toBe(false);
  });
});
