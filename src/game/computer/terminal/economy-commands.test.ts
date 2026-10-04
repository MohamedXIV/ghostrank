import { describe, expect, it } from "vitest";

import {
  acquireModelFromGui,
  abortBuildFromGui,
  breakLeaseFromGui,
  buyHardwareFromGui,
  buyMachineFromGui,
  buyPlayerToolFromGui,
  disableSoftwareFromGui,
  enableSoftwareFromGui,
  renameMachineFromGui,
  rentHousingFromGui,
  runModelFromGui,
  sellMachineFromGui,
  sellPlayerToolFromGui,
  startBuildFromGui,
  stopModelFromGui,
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

describe("box commands", () => {
  it("shares buyMachine between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("box buy box-analysis-node");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "buyMachine", catalogId: "box-analysis-node" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(buyMachineFromGui("box-analysis-node")).toEqual(terminal.command);
  });

  it("shares sellMachine between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("box sell machine:1");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "sellMachine", machineId: "machine:1" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(sellMachineFromGui("machine:1")).toEqual(terminal.command);
  });

  it("shares renameMachine between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("box name machine:2 vault-cracker");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "renameMachine", machineId: "machine:2", label: "vault-cracker" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(renameMachineFromGui("machine:2", "vault-cracker")).toEqual(
      terminal.command,
    );
  });

  it("rejoins a free-text machine label from the remaining arguments", () => {
    // The simulation trims and validates the label, so the parser passes the
    // multi-word name through as one string.
    expect(parseTerminalCommand("box name machine:1 big blue box")).toEqual({
      ok: true,
      command: { type: "renameMachine", machineId: "machine:1", label: "big blue box" },
    });
  });

  it("keeps the box verb distinct from hardware and tool verbs", () => {
    expect(parseTerminalCommand("buy box-analysis-node")).toEqual({
      ok: true,
      command: { type: "buyHardware", catalogId: "box-analysis-node" },
    });
    expect(parseTerminalCommand("box buy cpu-overclock")).toEqual({
      ok: true,
      command: { type: "buyMachine", catalogId: "cpu-overclock" },
    });
  });

  it("rejects malformed box arguments", () => {
    for (const input of [
      "box",
      "box rent",
      "box buy",
      "box buy box-burner box-analysis-node",
      "box sell",
      "box sell machine:1 machine:2",
      // `box name` needs both an instance id and at least one label word.
      "box name",
      "box name machine:1",
    ]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});

describe("model commands", () => {
  it("shares acquireModel between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("model buy model-local-workhorse");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "acquireModel", modelId: "model-local-workhorse" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(acquireModelFromGui("model-local-workhorse")).toEqual(
      terminal.command,
    );
  });

  it("shares runModel between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("model run model-cloud-frontier");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "runModel", modelId: "model-cloud-frontier" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(runModelFromGui("model-cloud-frontier")).toEqual(terminal.command);
  });

  it("shares stopModel between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("model stop");

    expect(terminal).toEqual({ ok: true, command: { type: "stopModel" } });
    expect(stopModelFromGui()).toEqual({ type: "stopModel" });
  });

  it("keeps the model verb distinct from the software use/stop verbs", () => {
    // `stop <id>` disables a license; `model stop` has no argument and halts
    // whatever assistant is running. Both must stay on their own paths.
    expect(parseTerminalCommand("stop software-net-monitor")).toEqual({
      ok: true,
      command: { type: "disableSoftware", softwareId: "software-net-monitor" },
    });
    expect(parseTerminalCommand("model run software-net-monitor")).toEqual({
      ok: true,
      command: { type: "runModel", modelId: "software-net-monitor" },
    });
  });

  it("rejects malformed model arguments", () => {
    for (const input of [
      "model",
      "model buy",
      "model buy model-local-workhorse model-local-tuned",
      "model run",
      // `model stop` takes no argument — the slot holds exactly one model.
      "model stop now",
      "model rent model-cloud-frontier",
    ]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});

describe("build commands", () => {
  it("shares startBuild between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("build workflow-net-monitor");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "startBuild", specId: "workflow-net-monitor" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(startBuildFromGui("workflow-net-monitor")).toEqual(terminal.command);
  });

  it("shares abortBuild between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("build abort workflow:1");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "abortBuild", buildId: "workflow:1" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(abortBuildFromGui("workflow:1")).toEqual(terminal.command);
  });

  it("rejects malformed build arguments", () => {
    for (const input of [
      "build",
      "build workflow-net-monitor workflow-auto-recon",
      "build abort",
      "build abort workflow:1 workflow:2",
      // A bare sub-word is only a spec id when it stands alone.
      "build abort now extra",
    ]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});
