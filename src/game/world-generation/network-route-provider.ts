/**
 * Optional generated-scene content provider. It supplies the same fictional
 * Network Mapping world records consumed by the authored Nightshade adapter,
 * without owning route evaluation, payment or simulation time.
 */
import type { WorldState } from "@/game/simulation/state/world-state";
import type { NetworkRouteChallenge } from "@/game/simulation/systems/network-routes";
import { recordNetworkObservation, seededNetworkRouteOrder } from "@/game/simulation/systems/network-routes";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";

export function attachGeneratedRouteChallenge(world: WorldState, seed: number): void {
  if ((world.scenario !== "fresh-scene" && world.scenario !== "high-pressure") ||
      world.networkChallenges !== undefined) return;
  const target = world.targets.find(candidate =>
    candidate.machines.length >= 2 && candidate.machines[0]!.services.length > 0);
  if (!target) return;
  const entry = target.machines[0]!;
  const objective = target.machines[1]!;
  const echo = hashUnit(seed, "g3-generated-route-echo", target.id) < 0.5
    ? "triangle" : "circle";
  const route: NetworkRouteChallenge = {
    id: `route:${target.id}:recon`,
    targetId: target.id,
    entryMachineId: entry.id,
    objectiveMachineId: objective.id,
    candidates: [
      { id: `${target.id}:public`, label: "Beacon",
        carrier: "public", echo: "triangle" },
      { id: `${target.id}:sealed-a`, label: "Hollow",
        carrier: "sealed", echo: "triangle" },
      { id: `${target.id}:sealed-b`, label: "Cipher",
        carrier: "sealed", echo: "circle" },
    ],
    requiredCarrier: "sealed", requiredEcho: echo,
    epoch: 0, baseMinutes: 4, traceWeight: 1,
    observations: [], tests: [],
  };
  route.candidates = seededNetworkRouteOrder(seed, route);
  world.networkChallenges = [route];
}

/** Called only after an authoritative, charged entry-machine survey succeeds. */
export function generatedRouteSurveyObservation(
  world: WorldState,
  targetId: string,
  discoveredMachineIds: readonly string[],
): void {
  if (world.scenario !== "fresh-scene" && world.scenario !== "high-pressure") return;
  for (const challenge of world.networkChallenges ?? []) {
    if (challenge.targetId !== targetId ||
        !discoveredMachineIds.includes(challenge.entryMachineId) ||
        challenge.observations.some(o => o.kind === "carrier" && o.epoch === challenge.epoch)) continue;
    recordNetworkObservation(challenge, {
      id: `${challenge.id}:carrier:${challenge.epoch}`,
      kind: "carrier", value: challenge.requiredCarrier,
      sourceId: challenge.entryMachineId, epoch: challenge.epoch,
      worldMinute: world.worldMinute,
    });
  }
}

/** Called only when the entry machine's specific service was really inspected. */
export function generatedRouteInspectObservation(
  world: WorldState,
  machineId: string,
  discoveredServiceIds: readonly string[],
): void {
  if (world.scenario !== "fresh-scene" && world.scenario !== "high-pressure") return;
  for (const challenge of world.networkChallenges ?? []) {
    if (challenge.entryMachineId !== machineId ||
        challenge.observations.some(o => o.kind === "echo" && o.epoch === challenge.epoch)) continue;
    const target = world.targets.find(t => t.id === challenge.targetId);
    const serviceId = target?.machines.find(m => m.id === machineId)?.services[0]?.id;
    if (!serviceId || !discoveredServiceIds.includes(serviceId)) continue;
    recordNetworkObservation(challenge, {
      id: `${challenge.id}:echo:${challenge.epoch}`,
      kind: "echo", value: challenge.requiredEcho,
      sourceId: serviceId, epoch: challenge.epoch, worldMinute: world.worldMinute,
    });
  }
}
