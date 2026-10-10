import type {
  CompromiseKind,
  InvestigationSignalKind,
  PhysicalSignalKind,
  RunEndingStatus,
  WorldState,
} from "@/game/simulation/state/world-state";
import { probeArtifactOf } from "@/game/simulation/systems/probes";

export type RunTimelineBeatKind =
  | "action"
  | "consequence"
  | "escalation"
  | "retaliation"
  | "rival-probe"
  | "investigation"
  | "physical-threat"
  | "ending";

export interface RunTimelineBeat {
  id: string;
  kind: RunTimelineBeatKind;
  worldMinute: number;
  text: string;
}

const KIND_ORDER: Record<RunTimelineBeatKind, number> = {
  action: 0,
  escalation: 1,
  consequence: 2,
  retaliation: 3,
  "rival-probe": 4,
  investigation: 5,
  "physical-threat": 6,
  ending: 7,
};

function canNameTarget(world: WorldState, targetId: string): boolean {
  return world.evidence.some(
    (record) =>
      record.kind === "target-profile" && record.subjectId === targetId,
  );
}

function targetName(world: WorldState, targetId: string): string {
  return canNameTarget(world, targetId)
    ? world.targets.find((target) => target.id === targetId)?.handle ?? "a target"
    : "a target";
}

function endingText(status: RunEndingStatus): string {
  switch (status) {
    case "arrested":
      return "The run ended in custody.";
    case "unmasked":
      return "The player's identity was exposed.";
    case "missing":
      return "The player was recorded as missing.";
    case "compromised":
      return "The run ended after a named compromise.";
    case "stranded":
      return "The player was left stranded.";
    case "retired":
      return "The player closed the run voluntarily.";
    case "vanished":
      return "The player vanished without a confirmed account.";
  }
}

function investigationText(kind: InvestigationSignalKind, target: string): string {
  switch (kind) {
    case "unusual-login":
      return `An unfamiliar login touched ${target}.`;
    case "marketplace-behavior":
      return `The market started answering differently about ${target}.`;
    case "suspicious-message":
      return `A message with no sender asked about work on ${target}.`;
  }
}

function physicalText(kind: PhysicalSignalKind): string {
  switch (kind) {
    case "strange-vehicle":
      return "An unfamiliar vehicle watched the entrance.";
    case "footsteps":
      return "Footsteps stopped outside long enough to listen.";
    case "knock":
      return "Someone knocked once and left before the door opened.";
    case "unknown-call":
      return "An unknown caller rang and said nothing.";
    case "door-camera-motion":
      return "The door camera caught movement that did not reach the door.";
    case "outage":
      return "Power dropped while the rest of the block stayed lit.";
    case "unusual-connectivity":
      return "The local connection changed shape for a few minutes.";
    case "unexpected-delivery":
      return "An unrequested delivery appeared.";
    case "nearby-activity":
      return "Unusually quiet activity gathered nearby.";
  }
}

function compromiseText(kind: CompromiseKind): string {
  switch (kind) {
    case "rig-lost":
      return "A recorded condition: rig lost.";
    case "dwelling-lost":
      return "A recorded condition: dwelling lost.";
    case "identity-exposed":
      return "A recorded condition: identity exposed.";
    case "stranded":
      return "A recorded condition: stranded.";
  }
}

/**
 * Build a readable, time-ordered account from the archived records that were
 * visible to the player. The ids and hidden provenance are used only while
 * assembling stable order; generated display ids contain no source ids.
 * Adjacency is not a causal claim.
 */
export function deriveRunTimeline(world: WorldState): RunTimelineBeat[] {
  if (!world.ending) {
    return [];
  }

  const endingMinute = world.ending.worldMinute;
  const pending: Array<
    Omit<RunTimelineBeat, "id"> & { orderKey: string }
  > = [];

  for (const trace of world.traces) {
    if (trace.worldMinute > endingMinute) continue;
    const target = targetName(world, trace.targetId);
    // A trace is a footprint, not an implicit disengagement. Narrating a
    // paid probe or Network Mapping test as an exit falsifies the run history.
    // The trace records no route verdict: never infer confirmation/refutation.
    switch (trace.cause) {
      case "operation-escalation":
        pending.push({
          kind: "escalation",
          worldMinute: trace.worldMinute,
          text: `You escalated an operation against ${target}.`,
          orderKey: trace.id,
        });
        break;
      case "operation-disengagement":
        pending.push({
          kind: "action",
          worldMinute: trace.worldMinute,
          text: `You disengaged from ${target} after a ${trace.stage} operation.`,
          orderKey: trace.id,
        });
        break;
      case "operation-probe":
        pending.push({
          kind: "action",
          worldMinute: trace.worldMinute,
          text: `You ran a probe against ${target} during a ${trace.stage} operation.`,
          orderKey: trace.id,
        });
        break;
      case "network-route-test":
        pending.push({
          kind: "action",
          worldMinute: trace.worldMinute,
          text: `You tested a network route toward ${target}.`,
          orderKey: trace.id,
        });
        break;
    }
  }

  for (const reaction of world.reactions) {
    if (!reaction.playerVisible || reaction.triggeredWorldMinute > endingMinute) {
      continue;
    }
    pending.push({
      kind: "consequence",
      worldMinute: reaction.triggeredWorldMinute,
      text: `You saw ${targetName(world, reaction.targetId)} shift into a defensive watch.`,
      orderKey: reaction.id,
    });
  }

  for (const investigation of world.investigations) {
    if (!canNameTarget(world, investigation.targetId)) continue;
    const target = targetName(world, investigation.targetId);
    for (const signal of investigation.signals) {
      if (signal.surfacedWorldMinute > endingMinute) continue;
      pending.push({
        kind: "investigation",
        worldMinute: signal.surfacedWorldMinute,
        text: investigationText(signal.kind, target),
        orderKey: signal.id,
      });
    }
  }

  for (const retaliation of world.underground.retaliations) {
    if (retaliation.worldMinute > endingMinute) continue;
    pending.push({
      kind: "retaliation",
      worldMinute: retaliation.worldMinute,
      text:
        retaliation.kind === "unmasking"
          ? "A public retaliation exposed an identity."
          : "A public smear appeared in the underground record.",
      orderKey: retaliation.id,
    });
  }

  for (const probe of world.probes) {
    if (probe.worldMinute > endingMinute) continue;
    const artifactKind = probeArtifactOf(probe.subject);
    const text =
      artifactKind === "probe-ping"
        ? "A probe touched a port you were not listening on."
        : artifactKind === "caller-question"
          ? "An unknown number asked for you by name."
          : "A contact went quiet after someone leaned on them.";
    pending.push({
      kind: "rival-probe",
      worldMinute: probe.worldMinute,
      text,
      orderKey: probe.id,
    });
  }

  for (const threat of world.physicalThreats) {
    if (threat.worldMinute > endingMinute) continue;
    pending.push({
      kind: "physical-threat",
      worldMinute: threat.worldMinute,
      text: physicalText(threat.signalKind),
      orderKey: threat.id,
    });
  }

  for (const compromise of world.compromises) {
    if (compromise.worldMinute > endingMinute) continue;
    pending.push({
      kind: "consequence",
      worldMinute: compromise.worldMinute,
      text: compromiseText(compromise.kind),
      orderKey: compromise.id,
    });
  }

  pending.push({
    kind: "ending",
    worldMinute: endingMinute,
    text: endingText(world.ending.status),
    orderKey: "terminal-ending",
  });

  return pending
    .sort(
      (a, b) =>
        a.worldMinute - b.worldMinute ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.orderKey.localeCompare(b.orderKey, undefined, { numeric: true }),
    )
    .map((beat, index) => ({
      id: `run-beat-${index + 1}`,
      kind: beat.kind,
      worldMinute: beat.worldMinute,
      text: beat.text,
    }));
}
