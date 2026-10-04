import { describe, expect, it } from "vitest";

import { physicalIntentToCommand, presentRoom } from "@/game/phaser/bridge";
import { derivePresence } from "@/game/simulation/systems/location";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import {
  breakLeaseFromGui,
  rentHousingFromGui,
} from "@/game/computer/apps/economy-actions";

describe("physicalIntentToCommand", () => {
  it("translates a physical wait intent into the normal simulation command layer", () => {
    expect(
      physicalIntentToCommand({
        type: "wait",
        minutes: 10,
      }),
    ).toEqual({
      type: "advanceTime",
      minutes: 10,
    });
  });

  // Phase 6 P0: parity is the contract. The room does not get a private
  // relocation implementation — an intent becomes the same command the Terminal
  // and the Market already emit, so travel cost, billing, and events are one
  // path no matter which surface a player is standing in.
  it("translates moveTo onto the lease command the other surfaces emit", () => {
    const intent = physicalIntentToCommand({
      type: "moveTo",
      housingId: "housing-sleeper-unit",
    });

    expect(intent).toEqual(rentHousingFromGui("housing-sleeper-unit"));
    expect(parseTerminalCommand("rent housing-sleeper-unit")).toEqual({
      ok: true,
      command: intent,
    });
  });

  it("translates leave onto breakLease, so packing up is one rule everywhere", () => {
    expect(physicalIntentToCommand({ type: "leave" })).toEqual(
      breakLeaseFromGui(),
    );
    expect(parseTerminalCommand("lease break")).toEqual({
      ok: true,
      command: physicalIntentToCommand({ type: "leave" }),
    });
  });
});

describe("presentRoom", () => {
  it("renders the baseline room from a derived presence with no lease", () => {
    const presentation = presentRoom(derivePresence(null), 0);

    expect(presentation.locationId).toBe("location-baseline-room");
    expect(presentation.leased).toBe(false);
    expect(presentation.distant).toBe(false);
    expect(presentation.avatarPosition).toBe("stand");
  });

  it("carries a safehouse's band and distance into the scene, as names and one flag", () => {
    const presentation = presentRoom(derivePresence("housing-sleeper-unit"), 180);

    expect(presentation.label).toBe("Sleeper Unit (Outskirts)");
    expect(presentation.anonymity).toBe("hidden");
    expect(presentation.leased).toBe(true);
    expect(presentation.distant).toBe(true);
    expect(presentation.worldMinute).toBe(180);
    // The scene gets no numbers to optimise: no dailyCost, no capability.
    expect(Object.keys(presentation).sort()).toEqual(
      [
        "anonymity",
        "avatarPosition",
        "distant",
        "leased",
        "locationId",
        "label",
        "worldMinute",
      ].sort(),
    );
  });
});
