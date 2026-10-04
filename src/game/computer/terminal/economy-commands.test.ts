import { describe, expect, it } from "vitest";

import {
  breakLeaseFromGui,
  buyHardwareFromGui,
  buyPlayerToolFromGui,
  disableSoftwareFromGui,
  enableSoftwareFromGui,
  rentHousingFromGui,
  sellPlayerToolFromGui,
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

describe("use / stop software commands", () => {
  it("shares enableSoftware between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("use software-net-monitor");

    expect(terminal).toEqual({
      ok: true,
      command: {
        type: "enableSoftware",
        softwareId: "software-net-monitor",
      },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(enableSoftwareFromGui("software-net-monitor")).toEqual(
      terminal.command,
    );
  });

  it("shares disableSoftware between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("stop software-net-monitor");

    expect(terminal).toEqual({
      ok: true,
      command: {
        type: "disableSoftware",
        softwareId: "software-net-monitor",
      },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(disableSoftwareFromGui("software-net-monitor")).toEqual(
      terminal.command,
    );
  });

  it("rejects malformed software arguments", () => {
    for (const input of [
      "use",
      "use software-net-monitor software-auto-recon",
      "stop",
      "stop a b",
    ]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});

describe("buytool / selltool commands", () => {
  it("shares buyPlayerTool between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("buytool tool-ghost-loader");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "buyPlayerTool", toolId: "tool-ghost-loader" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(buyPlayerToolFromGui("tool-ghost-loader")).toEqual(terminal.command);
  });

  it("shares sellPlayerTool between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("selltool tool:1");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "sellPlayerTool", toolId: "tool:1" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(sellPlayerToolFromGui("tool:1")).toEqual(terminal.command);
  });

  it("keeps buytool distinct from the hardware buy verb", () => {
    expect(parseTerminalCommand("buytool cpu-overclock")).toEqual({
      ok: true,
      command: { type: "buyPlayerTool", toolId: "cpu-overclock" },
    });
    expect(parseTerminalCommand("buy cpu-overclock")).toEqual({
      ok: true,
      command: { type: "buyHardware", catalogId: "cpu-overclock" },
    });
  });

  it("rejects malformed tool arguments", () => {
    for (const input of [
      "buytool",
      "buytool tool-ghost-loader tool-paranoid-scraper",
      "selltool",
      "selltool a b",
    ]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});
