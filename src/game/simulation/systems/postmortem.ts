import { probeArtifactOf } from "@/game/simulation/systems/probes";
import type {
  CompromiseKind,
  CompromiseRecord,
  InvestigationSignalKind,
  OpponentReaction,
  OperationTrace,
  PhysicalSignalKind,
  RivalProbeArtifactKind,
  WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 6 P5 — postmortem causal chain.
 *
 * This module is deliberately a pure read. It may use hidden provenance to pick
 * the correct records, but every emitted step is phrased only from facts the
 * player could already know: their own actions, player-visible defensive
 * reactions, surfaced authority evidence, probe tells, physical evidence, and
 * the compromise condition itself. Hidden actors, probe correctness, raw
 * investigation progress, locations, seeds, and raw source ids never leave.
 */

export type PostmortemAttribution = "complete" | "incomplete";

export type PostmortemStepKind =
  | "player-action"
  | "defensive-reaction"
  | "authority-evidence"
  | "probe-tell"
  | "physical-evidence"
  | "compromise";

export interface PostmortemStep {
  id: string;
  kind: PostmortemStepKind;
  worldMinute: number;
  text: string;
}

export interface PostmortemRead {
  compromiseId: string;
  compromiseKind: CompromiseKind;
  compromiseLabel: string;
  worldMinute: number;
  attribution: PostmortemAttribution;
  note: string;
  steps: PostmortemStep[];
}

const COMPROMISE_LABELS: Record<CompromiseKind, string> = {
  "rig-lost": "RIG LOST",
  "dwelling-lost": "DWELLING LOST",
  "identity-exposed": "IDENTITY EXPOSED",
  stranded: "STRANDED",
};

const STEP_ORDER: Record<PostmortemStepKind, number> = {
  "player-action": 0,
  "defensive-reaction": 1,
  "authority-evidence": 2,
  "probe-tell": 3,
  "physical-evidence": 4,
  compromise: 5,
};

interface PendingStep {
  /** Internal-only provenance key used to dedupe before projection. */
  sourceKey: string;
  kind: PostmortemStepKind;
  worldMinute: number;
  text: string;
}

export function compromiseLabel(kind: CompromiseKind): string {
  return COMPROMISE_LABELS[kind];
}

function targetHandle(world: WorldState, targetId: string): string {
  if (!world.knownTargetIds.includes(targetId)) {
    return "a target";
  }

  return (
    world.targets.find((target) => target.id === targetId)?.handle ?? "a target"
  );
}

function describeTrace(world: WorldState, trace: OperationTrace): string {
  const handle = targetHandle(world, trace.targetId);

  switch (trace.cause) {
    case "operation-escalation":
      return `you escalated an operation against ${handle}`;
    case "operation-disengagement":
      return `you disengaged from ${handle} after an intrusive operation`;
  }
}

function describeReaction(world: WorldState, reaction: OpponentReaction): string {
  const handle = targetHandle(world, reaction.targetId);
  return `you saw ${handle} shift into a defensive watch`;
}

function describeAuthoritySignal(
  kind: InvestigationSignalKind,
  handle: string,
): string {
  switch (kind) {
    case "unusual-login":
      return `an unfamiliar login touched ${handle}`;
    case "marketplace-behavior":
      return `the market started answering you differently about ${handle}`;
    case "suspicious-message":
      return `a message with no sender asked about your work on ${handle}`;
  }
}

function describeProbeTell(kind: RivalProbeArtifactKind): string {
  switch (kind) {
    case "probe-ping":
      return "a probe touched a port you were not listening on";
    case "caller-question":
      return "an unknown number asked for you by name";
    case "missing-contact":
      return "a contact went quiet after someone leaned on them";
  }
}

function describePhysicalSignal(kind: PhysicalSignalKind): string {
  switch (kind) {
    case "strange-vehicle":
      return "the same unfamiliar vehicle watched the entrance";
    case "footsteps":
      return "footsteps stopped outside long enough to listen";
    case "knock":
      return "someone knocked once and left before you reached the door";
    case "unknown-call":
      return "an unknown caller rang and said nothing";
    case "door-camera-motion":
      return "the door camera caught movement that never reached the door";
    case "outage":
      return "power dropped while the rest of the block stayed lit";
    case "unusual-connectivity":
      return "your local connection changed shape for a few minutes";
    case "unexpected-delivery":
      return "a delivery appeared that nobody there ordered";
    case "nearby-activity":
      return "too much quiet activity gathered close to the room";
  }
}

function sourceRecords(
  world: WorldState,
  compromise: CompromiseRecord,
): {
  traceIds: Set<string>;
  reactionIds: Set<string>;
  investigations: typeof world.investigations;
} {
  const investigations = compromise.sourceInvestigationIds
    .map((id) =>
      world.investigations.find((investigation) => investigation.id === id),
    )
    .filter((value): value is (typeof world.investigations)[number] =>
      Boolean(value),
    );
  const traceIds = new Set<string>();
  const reactionIds = new Set<string>();

  for (const investigation of investigations) {
    for (const sourceId of investigation.sourceIds) {
      if (world.traces.some((trace) => trace.id === sourceId)) {
        traceIds.add(sourceId);
      }
      if (world.reactions.some((reaction) => reaction.id === sourceId)) {
        reactionIds.add(sourceId);
      }
    }
  }

  return { traceIds, reactionIds, investigations };
}

export function derivePostmortem(
  world: WorldState,
  compromise: CompromiseRecord,
): PostmortemRead {
  const pending: PendingStep[] = [];
  const { traceIds, reactionIds, investigations } = sourceRecords(
    world,
    compromise,
  );

  for (const trace of world.traces) {
    if (
      !traceIds.has(trace.id) ||
      trace.worldMinute > compromise.worldMinute
    ) {
      continue;
    }

    pending.push({
      sourceKey: `trace:${trace.id}`,
      kind: "player-action",
      worldMinute: trace.worldMinute,
      text: describeTrace(world, trace),
    });
  }

  for (const reaction of world.reactions) {
    if (
      !reactionIds.has(reaction.id) ||
      !reaction.playerVisible ||
      reaction.triggeredWorldMinute > compromise.worldMinute
    ) {
      continue;
    }

    pending.push({
      sourceKey: `reaction:${reaction.id}`,
      kind: "defensive-reaction",
      worldMinute: reaction.triggeredWorldMinute,
      text: describeReaction(world, reaction),
    });
  }

  for (const investigation of investigations) {
    if (!world.knownTargetIds.includes(investigation.targetId)) {
      continue;
    }

    const handle = targetHandle(world, investigation.targetId);

    for (const signal of investigation.signals) {
      if (signal.surfacedWorldMinute > compromise.worldMinute) {
        continue;
      }

      pending.push({
        sourceKey: `signal:${signal.id}`,
        kind: "authority-evidence",
        worldMinute: signal.surfacedWorldMinute,
        text: describeAuthoritySignal(signal.kind, handle),
      });
    }
  }

  const threat = world.physicalThreats.find(
    (candidate) => candidate.id === compromise.sourceThreatId,
  );
  const probe = world.probes.find(
    (candidate) =>
      candidate.id === compromise.sourceProbeId &&
      candidate.id === threat?.sourceProbeId,
  );

  if (probe && probe.worldMinute <= compromise.worldMinute) {
    pending.push({
      sourceKey: `probe:${probe.id}`,
      kind: "probe-tell",
      worldMinute: probe.worldMinute,
      text: describeProbeTell(probeArtifactOf(probe.subject)),
    });
  }

  if (threat && threat.worldMinute <= compromise.worldMinute) {
    pending.push({
      sourceKey: `physical:${threat.id}`,
      kind: "physical-evidence",
      worldMinute: threat.worldMinute,
      text: describePhysicalSignal(threat.signalKind),
    });
  }

  pending.push({
    sourceKey: `compromise:${compromise.id}`,
    kind: "compromise",
    worldMinute: compromise.worldMinute,
    text: compromiseLabel(compromise.kind),
  });

  const seen = new Set<string>();
  const ordered = pending
    .filter((step) => {
      if (seen.has(step.sourceKey)) {
        return false;
      }
      seen.add(step.sourceKey);
      return true;
    })
    .sort(
      (a, b) =>
        a.worldMinute - b.worldMinute ||
        STEP_ORDER[a.kind] - STEP_ORDER[b.kind] ||
        a.sourceKey.localeCompare(b.sourceKey, undefined, { numeric: true }),
    );

  const hasPlayerTrace = ordered.some((step) => step.kind === "player-action");
  const complete = hasPlayerTrace && Boolean(threat) && Boolean(probe);

  return {
    compromiseId: compromise.id,
    compromiseKind: compromise.kind,
    compromiseLabel: compromiseLabel(compromise.kind),
    worldMinute: compromise.worldMinute,
    attribution: complete ? "complete" : "incomplete",
    note: complete
      ? "The links below are supported by stored provenance; hidden identities and hidden correctness remain withheld."
      : "Incomplete attribution: the surviving record does not contain a citable player-caused trace for the whole chain, so no missing blame is invented.",
    steps: ordered.map((step, index) => ({
      id: `${compromise.id}:step:${index + 1}`,
      kind: step.kind,
      worldMinute: step.worldMinute,
      text: step.text,
    })),
  };
}

export function derivePostmortems(world: WorldState): PostmortemRead[] {
  return [...world.compromises]
    .reverse()
    .map((compromise) => derivePostmortem(world, compromise));
}
