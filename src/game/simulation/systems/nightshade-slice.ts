/**
 * The Nightshade briefing rules (G3, D071).
 *
 * Every function here is pure or mutates only the slice state it is given. The
 * command bus calls them from its own handlers, and the projection and the
 * terminal read the same previews and clue choices, so the surfaces cannot
 * disagree about what an action will cost. Nothing here reads rank, and nothing
 * here draws random numbers: the same actions always produce the same briefing.
 *
 * Canonical worlds never reach this module. Every entry point checks for a
 * `slice` on the world first.
 */

import { recordNetworkObservation, rotateNetworkRoute } from "@/game/simulation/systems/network-routes";
import {
  ARCHIVE_SERVICE_ID,
  BROKER_SERVICE_ID,
  NIGHTSHADE_TARGET_ID,
  RELAY_MACHINE_ID,
  SLICE_BURN_FOOTPRINT,
  SLICE_FAILURE_CLUES,
  SLICE_MAP_MACHINES,
  SLICE_WINDOW_END_MINUTE,
  VAULT_MACHINE_ID,
  type SliceClueId,
  type SliceOutcome,
} from "@/content/nightshade-slice";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { rigActionMinutesFor } from "@/game/simulation/systems/rig-minutes";
import {
  DEFENSIVE_WATCH_THRESHOLD,
  TICK_MINUTES,
} from "@/game/simulation/systems/underground";
import type {
  EvidenceKind,
  NightshadeSliceState,
  OperationStage,
  WorldState,
} from "@/game/simulation/state/world-state";

/** Scenario data, never a Nightshade-only path solver. */
function addV2Observation(
  world: WorldState,
  kind: "carrier" | "echo",
  value: "sealed" | "triangle" | "circle",
  sourceId: string,
  minute = world.worldMinute,
): void {
  if (world.slice?.rules !== "nightshade-v2") return;
  const challenge = world.networkChallenges?.find(c =>
    c.targetId === world.slice?.targetId && c.entryMachineId === RELAY_MACHINE_ID);
  if (!challenge) return;
  if (challenge.observations.some(o => o.epoch === challenge.epoch && o.kind === kind)) return;
  if (kind === "carrier") {
    if (value !== "sealed") throw new RangeError("Invalid carrier");
    recordNetworkObservation(challenge, {
      id: `nightshade-carrier:${challenge.epoch}`,
      kind, value, sourceId, epoch: challenge.epoch, worldMinute: minute,
    });
  } else {
    if (value === "sealed") throw new RangeError("Invalid echo");
    recordNetworkObservation(challenge, {
      id: `nightshade-echo:${challenge.epoch}`,
      kind, value, sourceId, epoch: challenge.epoch, worldMinute: minute,
    });
  }
}

export function nightshadeV2IntrusiveSignal(world: WorldState): void {
  addV2Observation(world, "echo", "triangle", BROKER_SERVICE_ID);
}

/**
 * Trace each action adds to the target's footprint while the briefing is live.
 * Escalation and disengagement match the canonical weights, so a preview of
 * either reads the same numbers the rest of the game records. Probes are the
 * briefing's own: canonical probes leave no trace at all.
 */
export const SLICE_TRACE = {
  probe: 1,
  escalate: 3,
  disengageRecon: 1,
  disengageIntrusive: 2,
} as const;

export const SLICE_WATCH_FOOTPRINT = DEFENSIVE_WATCH_THRESHOLD;

/** The next 360-minute boundary strictly after `minute`. */
export function nextBoundaryAfter(minute: number): number {
  return (Math.floor(minute / TICK_MINUTES) + 1) * TICK_MINUTES;
}

export function footprintOf(world: WorldState, targetId: string): number {
  return world.traces
    .filter((trace) => trace.targetId === targetId)
    .reduce((sum, trace) => sum + trace.weight, 0);
}

/** Evidence the player can currently rely on. A retired record no longer counts. */
export function hasLiveEvidence(
  world: WorldState,
  kind: EvidenceKind,
  subjectId: string,
): boolean {
  return world.evidence.some(
    (record) =>
      record.kind === kind &&
      record.subjectId === subjectId &&
      record.retiredWorldMinute === undefined,
  );
}

export function watchActive(world: WorldState, targetId: string): boolean {
  return world.reactions.some(
    (reaction) =>
      reaction.targetId === targetId && reaction.status === "active",
  );
}

function reviewRan(slice: NightshadeSliceState): boolean {
  return slice.review?.status === "ran";
}

function hasClue(slice: NightshadeSliceState, clueId: SliceClueId): boolean {
  return slice.clues.includes(clueId);
}

function clueIsPending(slice: NightshadeSliceState, clueId: SliceClueId): boolean {
  return slice.pendingClues.some((pending) => pending.clueId === clueId);
}

/**
 * Whether a survey may discover the vault right now. Before the owner's review
 * the broker's routing is enough; after it, only the rotated routing is.
 */
export function vaultVisibleToSurvey(slice: NightshadeSliceState): boolean {
  return hasClue(slice, reviewRan(slice) ? "rotated-routing" : "broker-routing");
}

/** Whether survey may reveal this machine. Canonical worlds have no gate. */
export function machineVisibleToSurvey(world: WorldState, machineId: string): boolean {
  if (!world.slice) {
    return true;
  }

  if (machineId === VAULT_MACHINE_ID) {
    return world.slice.rules === "nightshade-v1" &&
      vaultVisibleToSurvey(world.slice);
  }

  return true;
}

/**
 * Why escalation would be refused right now, or null when it can go ahead. The
 * order matches the command bus, so a preview names the same first blocker.
 */
export function escalationBlockedBy(world: WorldState): string | null {
  if (!world.operation) {
    return "NO_ACTIVE_OPERATION";
  }

  if (world.operation.stage === "intrusive") {
    return "OPERATION_ALREADY_ESCALATED";
  }

  const knowsService = world.targets
    .find((target) => target.id === world.operation?.targetId)
    ?.machines.some((machine) =>
      machine.services.some((service) =>
        hasLiveEvidence(world, "service-presence", service.id),
      ),
    );

  if (!knowsService) {
    return "SERVICE_EVIDENCE_REQUIRED";
  }

  return null;
}

/**
 * What leaving the operation ends with, given the footprint it leaves behind and
 * whether the owner is watching. Burning comes first: a footprint at the line
 * ends the run's briefing regardless of anything else.
 */
export function disengageOutcome(
  footprintAfter: number,
  watched: boolean,
  reviewHasRun: boolean,
): SliceOutcome | null {
  if (footprintAfter >= SLICE_BURN_FOOTPRINT) {
    return "burned";
  }

  if (reviewHasRun) {
    return "locked-out";
  }

  if (watched || footprintAfter >= SLICE_WATCH_FOOTPRINT) {
    return "retreated";
  }

  return null;
}

export interface SlicePreview {
  escalate: {
    /** Null when escalation would go ahead now; otherwise the first blocker. */
    blockedBy: string | null;
    minutes: number;
    traceWeight: number;
    footprintAfter: number;
    /** The owner starts watching as a result of this escalation. */
    startsWatch: boolean;
    /** When the owner's review would land if the watch starts. */
    reviewDueWorldMinute: number | null;
  };
  disengage: {
    blockedBy: string | null;
    minutes: number;
    traceWeight: number;
    footprintAfter: number;
    /** What leaving now ends the briefing with, or null if it stays open. */
    endsWith: SliceOutcome | null;
  };
  burnFootprint: number;
  watchFootprint: number;
  windowEndWorldMinute: number;
}

/**
 * The trace preview the player reads before committing (D071). It uses the same
 * minutes, weights and outcome rules as the command bus. Returns null when the
 * world has no briefing.
 */
export function previewSliceActions(world: WorldState): SlicePreview | null {
  const slice = world.slice;

  if (!slice) {
    return null;
  }

  const footprint = footprintOf(world, slice.targetId);
  const watched = watchActive(world, slice.targetId);
  const escalateBlocked = escalationBlockedBy(world);
  const escalateAfter = footprint + SLICE_TRACE.escalate;
  const startsWatch = !watched && escalateAfter >= SLICE_WATCH_FOOTPRINT;
  const stage: OperationStage = world.operation?.stage ?? "recon";
  const disengageWeight =
    stage === "intrusive" ? SLICE_TRACE.disengageIntrusive : SLICE_TRACE.disengageRecon;
  const disengageAfter = footprint + disengageWeight;
  const disengageBlocked = world.operation ? null : "NO_ACTIVE_OPERATION";

  return {
    escalate: {
      blockedBy: escalateBlocked,
      minutes: rigActionMinutesFor(world, "escalate"),
      traceWeight: SLICE_TRACE.escalate,
      footprintAfter: escalateAfter,
      startsWatch,
      reviewDueWorldMinute:
        startsWatch && !slice.review
          ? nextBoundaryAfter(
              world.worldMinute + rigActionMinutesFor(world, "escalate"),
            )
          : null,
    },
    disengage: {
      blockedBy: disengageBlocked,
      minutes: rigActionMinutesFor(world, "disengage"),
      traceWeight: disengageWeight,
      footprintAfter: disengageAfter,
      endsWith: disengageBlocked
        ? null
        : disengageOutcome(disengageAfter, watched, reviewRan(slice)),
    },
    burnFootprint: SLICE_BURN_FOOTPRINT,
    watchFootprint: SLICE_WATCH_FOOTPRINT,
    windowEndWorldMinute: SLICE_WINDOW_END_MINUTE,
  };
}

/** Adds a line to the player's record of what happened, in order. */
export function logSliceStep(
  slice: NightshadeSliceState,
  key: string,
  worldMinute: number,
  footprint: number,
): void {
  slice.log.push({ worldMinute, key, footprint });
}

export function createNightshadeSliceState(input: {
  contractId: string;
  rules?: "nightshade-v1" | "nightshade-v2";
}): NightshadeSliceState {
  const slice: NightshadeSliceState = {
    rules: input.rules ?? "nightshade-v1",
    targetId: NIGHTSHADE_TARGET_ID,
    contractId: input.contractId,
    clues: ["opening-broker-note"],
    pendingClues: [],
    review: null,
    outcome: null,
    endedWorldMinute: null,
    log: [],
  };

  logSliceStep(slice, "opening-received", 0, 0);
  logSliceStep(slice, "contract-offered", 0, 0);

  return slice;
}

/**
 * The clue a probe promises. The broker answers on the owner's schedule, so the
 * routing arrives at the next boundary, not at once.
 */
function promiseClue(
  slice: NightshadeSliceState,
  clueId: SliceClueId,
  worldMinute: number,
): void {
  if (hasClue(slice, clueId) || clueIsPending(slice, clueId)) {
    return;
  }

  slice.pendingClues.push({
    clueId,
    dueWorldMinute: nextBoundaryAfter(worldMinute),
  });
}

/**
 * Records the clue a probe promises. The caller has already checked that the
 * probe is legal and charged its time; this only says what the probe unlocks.
 * Reading the broker promises the routing. Re-reading it after the owner's
 * review promises the rotated routing.
 */
export function promiseClueFromProbe(
  world: WorldState,
  probe: "read" | "reread",
  serviceId: string,
): void {
  const slice = world.slice;

  if (!slice) {
    return;
  }

  if (probe === "reread") {
    addV2Observation(world, "carrier", "sealed", RELAY_MACHINE_ID);
    promiseClue(slice, "rotated-routing", world.worldMinute);
    return;
  }

  if (serviceId === BROKER_SERVICE_ID) {
    addV2Observation(world, "carrier", "sealed", RELAY_MACHINE_ID);
    promiseClue(slice, "broker-routing", world.worldMinute);
  }
}

/**
 * Whether reading the relay again is the way to ask for the rotated routing. It
 * is allowed only after the owner's review, and only once per review.
 */
export function canRereadBroker(world: WorldState): boolean {
  const slice = world.slice;

  if (!slice || !reviewRan(slice)) {
    return false;
  }

  return (
    !hasClue(slice, "rotated-routing") &&
    !clueIsPending(slice, "rotated-routing")
  );
}

/** Pick the failure clue that matches what the player has actually learned. */
export function sliceFailureClue(world: WorldState, code: string): string | null {
  const slice = world.slice;

  if (!slice) {
    return null;
  }

  let key: string = code;

  if (code === "NO_NEW_MACHINE_EVIDENCE") {
    if (reviewRan(slice) && !vaultVisibleToSurvey(slice)) {
      key = `${code}.locked`;
    } else if (!hasClue(slice, "broker-routing")) {
      key = clueIsPending(slice, "broker-routing")
        ? `${code}.pending`
        : `${code}.unread`;
    } else {
      key = `${code}.known`;
    }
  }

  if (code === "OBJECTIVE_NOT_MET") {
    const vaultOnMap = hasLiveEvidence(world, "machine-presence", VAULT_MACHINE_ID);
    key = reviewRan(slice) && !vaultOnMap ? `${code}.locked` : `${code}.unfinished`;
  }

  return SLICE_FAILURE_CLUES[key] ?? SLICE_FAILURE_CLUES[code] ?? null;
}

/** How many of the map's machines the player can currently show on the file. */
export function sliceMapStatus(world: WorldState): {
  known: number;
  needed: number;
  vaultOnMap: boolean;
  relayOnMap: boolean;
} {
  const relayOnMap = hasLiveEvidence(world, "machine-presence", RELAY_MACHINE_ID);
  const vaultOnMap = hasLiveEvidence(world, "machine-presence", VAULT_MACHINE_ID);

  return {
    known: Number(relayOnMap) + Number(vaultOnMap),
    needed: SLICE_MAP_MACHINES,
    vaultOnMap,
    relayOnMap,
  };
}

/** Ends the briefing. Ends the operation too, and makes every later gameplay command refuse. */
export function endSlice(
  world: WorldState,
  outcome: SliceOutcome,
  worldMinute: number,
): SimulationEvent[] {
  const slice = world.slice;

  if (!slice || slice.outcome !== null) {
    return [];
  }

  slice.outcome = outcome;
  slice.endedWorldMinute = worldMinute;
  world.operation = null;
  logSliceStep(slice, outcome, worldMinute, footprintOf(world, slice.targetId));

  return [
    {
      type: "SliceEnded",
      targetId: slice.targetId,
      outcome,
      worldMinute,
    },
  ];
}

/**
 * The owner's scheduled review, and the broker's promised answers, at a
 * 360-minute boundary. Runs once per boundary the world crosses. It can rotate
 * the vault off the map, but it never ends the briefing on its own: the player
 * still has to decide what to do next.
 */
export function sliceBoundaryTick(
  world: WorldState,
  tickMinute: number,
): SimulationEvent[] {
  const slice = world.slice;

  if (!slice || slice.outcome !== null) {
    return [];
  }

  const events: SimulationEvent[] = [];

  for (const pending of [...slice.pendingClues]) {
    if (pending.dueWorldMinute > tickMinute) {
      continue;
    }

    slice.pendingClues = slice.pendingClues.filter(
      (candidate) => candidate !== pending,
    );

    if (!hasClue(slice, pending.clueId)) {
      slice.clues.push(pending.clueId);
      logSliceStep(
        slice,
        pending.clueId === "rotated-routing"
          ? "clue-rotated-routing"
          : "clue-broker-routing",
        tickMinute,
        footprintOf(world, slice.targetId),
      );
      if (slice.rules === "nightshade-v2") {
        if (pending.clueId === "broker-routing" && !reviewRan(slice)) {
          addV2Observation(world, "echo", "triangle", BROKER_SERVICE_ID, tickMinute);
        } else if (pending.clueId === "rotated-routing") {
          addV2Observation(world, "echo", "circle", BROKER_SERVICE_ID, tickMinute);
        }
      }
      events.push({
        type: "SliceClueGranted",
        clueId: pending.clueId,
        targetId: slice.targetId,
        worldMinute: tickMinute,
      });
    }
  }

  if (
    slice.review?.status === "scheduled" &&
    tickMinute >= slice.review.dueWorldMinute
  ) {
    slice.review.status = "ran";
    if (slice.rules === "nightshade-v2") {
      const challenge = world.networkChallenges?.find(c =>
        c.targetId === slice.targetId && c.entryMachineId === RELAY_MACHINE_ID);
      if (challenge) rotateNetworkRoute(challenge, "circle");
    }

    for (const record of world.evidence) {
      if (
        record.retiredWorldMinute === undefined &&
        ((record.kind === "machine-presence" &&
          record.subjectId === VAULT_MACHINE_ID) ||
          (record.kind === "service-presence" &&
            record.subjectId === ARCHIVE_SERVICE_ID))
      ) {
        record.retiredWorldMinute = tickMinute;
      }
    }

    logSliceStep(
      slice,
      "review-ran",
      tickMinute,
      footprintOf(world, slice.targetId),
    );
    events.push({
      type: "SliceReviewRan",
      targetId: slice.targetId,
      retiredMachineIds: [VAULT_MACHINE_ID],
      worldMinute: tickMinute,
    });
  }

  if (tickMinute >= SLICE_WINDOW_END_MINUTE) {
    events.push(...endSlice(world, "expired", tickMinute));
  }

  return events;
}

/**
 * Called when a trace has been recorded on the briefing's target. Starts the
 * owner's watch and schedules the review. Burning is checked by the caller,
 * because it ends the operation with its own event.
 */
export function sliceReviewScheduled(
  world: WorldState,
  reactionId: string,
): SimulationEvent[] {
  const slice = world.slice;

  if (!slice || slice.review) {
    return [];
  }

  const dueWorldMinute = nextBoundaryAfter(world.worldMinute);
  slice.review = {
    dueWorldMinute,
    reactionId,
    status: "scheduled",
  };
  logSliceStep(
    slice,
    "watch-started",
    world.worldMinute,
    footprintOf(world, slice.targetId),
  );
  logSliceStep(
    slice,
    "review-scheduled",
    world.worldMinute,
    footprintOf(world, slice.targetId),
  );

  return [
    {
      type: "SliceReviewScheduled",
      targetId: slice.targetId,
      dueWorldMinute,
      worldMinute: world.worldMinute,
    },
  ];
}

/**
 * What any trace on the briefing's target sets in motion, once the trace is
 * recorded: the owner starts a review if the reaction just began, and the
 * briefing burns if the footprint reached the line.
 */
export function sliceTraceFollowUp(
  world: WorldState,
  targetId: string,
  reactionEvents: SimulationEvent[],
): SimulationEvent[] {
  if (!world.slice || world.slice.outcome !== null) {
    return [];
  }

  const events: SimulationEvent[] = [];
  const started = reactionEvents.find(
    (event): event is Extract<SimulationEvent, { type: "OpponentReactionTriggered" }> =>
      event.type === "OpponentReactionTriggered",
  );

  if (started) {
    events.push(...sliceReviewScheduled(world, started.reactionId));
  }

  if (footprintOf(world, targetId) >= SLICE_BURN_FOOTPRINT) {
    events.push(...endSlice(world, "burned", world.worldMinute));
  }

  return events;
}

/** Leaving the operation ends the briefing when the footprint or the watch says so. */
export function closeSliceOnDisengage(
  world: WorldState,
  targetId: string,
): SimulationEvent[] {
  const slice = world.slice;

  if (!slice || slice.outcome !== null) {
    return [];
  }

  const outcome = disengageOutcome(
    footprintOf(world, targetId),
    watchActive(world, targetId),
    reviewRan(slice),
  );

  return outcome ? endSlice(world, outcome, world.worldMinute) : [];
}
