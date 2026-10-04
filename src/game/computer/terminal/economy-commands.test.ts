import { describe, expect, it } from "vitest";

import {
  breakLeaseFromGui,
  buyHardwareFromGui,
  rentHousingFromGui,
} from "@/game/computer/apps/economy-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("buy command", () => {
  it("shares buyHardware between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("buy cpu-overclock");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "buyHardware", catalogId: "cpu-overclock" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(buyHardwareFromGui("cpu-overclock")).toEqual(terminal.command);
  });

  it("rejects malformed buy arguments", () => {
    for (const input of ["buy", "buy cpu-overclock ram-bank"]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});

describe("rent / lease commands", () => {
  it("shares rentHousing between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("rent housing-cowork-loft");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "rentHousing", housingId: "housing-cowork-loft" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(rentHousingFromGui("housing-cowork-loft")).toEqual(terminal.command);
  });

  it("shares breakLease between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("lease break");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "breakLease" },
    });
    expect(breakLeaseFromGui()).toEqual({ type: "breakLease" });
  });

  it("rejects malformed rent and lease arguments", () => {
    for (const input of [
      "rent",
      "rent housing-cowork-loft housing-rented-lab",
      "lease",
      "lease break now",
      "lease renew",
    ]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});
