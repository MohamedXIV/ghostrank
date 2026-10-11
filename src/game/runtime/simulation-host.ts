/**
 * G9 P7 — asynchronous, serial, structured-clone-safe execution port.
 *
 * A later Web Worker may implement this same shape. No Worker or Rust is
 * allocated here, and the single authoritative CommandBus remains unchanged.
 * Raw snapshots are deliberately NOT part of the UI request/response protocol.
 */
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { WorldState } from "@/game/simulation/state/world-state";
import type { CommandResult } from "@/game/simulation/command-bus";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld, type WorldProjection } from "@/game/simulation/projection/project-world";

export interface SimulationHostRequest {
  requestId: string;
  kind: "execute";
  command: SimulationCommand;
}
/** UI-safe acknowledgement, NEVER a raw event list. Events may contain hidden truth. */
export type SimulationHostOutcome = Pick<CommandResult, "ok" | "error">;
export interface SimulationHostResponse {
  requestId: string;
  kind: "result";
  result: SimulationHostOutcome;
  /** Player-safe projection; never the underlying authoritative WorldState. */
  projection: WorldProjection;
}
export interface SimulationHost {
  request(input: SimulationHostRequest): Promise<SimulationHostResponse>;
  /** Privileged run persistence ONLY; never serialize into a UI message. */
  snapshotForPersistence(): Promise<WorldState>;
}

/**
 * Queue ordering is observable: concurrent calls cannot overtake one another.
 * Payloads are cloned in both directions so callers cannot mutate bus state.
 */
export function createLocalSimulationHost(world: WorldState): SimulationHost {
  const bus = new CommandBus(structuredClone(world));
  let last: Promise<unknown> = Promise.resolve();
  function serial<T>(action: () => T): Promise<T> {
    const work = last.then(action);
    last = work.then(() => undefined, () => undefined);
    return work;
  }
  return {
    request(input) {
      return serial(() => {
        if (!input.requestId || input.requestId.length > 160 ||
            input.kind !== "execute") {
          throw new RangeError("INVALID_HOST_REQUEST");
        }
        const command = structuredClone(input.command);
        const result = bus.execute(command);
        return structuredClone({
          requestId: input.requestId,
          kind: "result" as const,
          result: { ok: result.ok, ...(result.error ? { error: result.error } : {}) },
          projection: projectWorld(bus.snapshot()),
        });
      });
    },
    snapshotForPersistence() {
      return serial(() => bus.snapshot());
    },
  };
}
