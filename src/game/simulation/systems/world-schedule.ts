import { findWorkflowSpec } from "@/content/workflow-spec-catalog";
import { resolveContentReaction } from "@/game/content/on-actions";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  compareQueuedJobs,
  completeJob,
  findQueuedJob,
  rescheduleJob,
  type JobQueueState,
  type QueuedJob,
} from "@/game/simulation/scheduler/job-queue";
import {
  UPKEEP_JOB_ID,
  cancelSystemJob,
  enqueueSystemJob,
  hasQueuedJob,
  isSystemJob,
  outageReleaseJobId,
  type SystemJobKind,
} from "@/game/simulation/scheduler/system-jobs";
import { settledBuildDueMinute } from "@/game/simulation/systems/builds";
import { advanceUpkeep } from "@/game/simulation/systems/upkeep";
import type { WorldState } from "@/game/simulation/state/world-state";

/**
 * The world's own scheduler (Game-First G1, #77; D057). Builds, the daily
 * upkeep charge and outage releases are queued jobs, dispatched in the queue's
 * `(dueWorldMinute, phasePriority, sequence)` order. The ecosystem tick is the
 * fixed cadence the command bus runs them around (D054): every job due before a
 * tick runs before the tick's NPC turns, and a job due on the tick runs at the
 * phase D057 gives it.
 *
 * Events are returned by subsystem, so the command bus can keep the chronology
 * contract of D056 (stable by minute, subsystem order breaking ties).
 */

const DAY_MINUTES = 24 * 60;

/** Events a dispatch produced, grouped by the subsystem that produced them. */
export interface ScheduleSink {
  upkeep: SimulationEvent[];
  builds: SimulationEvent[];
  content: SimulationEvent[];
}

export function createScheduleSink(): ScheduleSink {
  return { upkeep: [], builds: [], content: [] };
}

function nextDayBoundary(worldMinute: number): number {
  return (Math.floor(worldMinute / DAY_MINUTES) + 1) * DAY_MINUTES;
}

/**
 * Makes the queue agree with world truth. Save files from before D057 carry no
 * system jobs, so this derives them. It is idempotent, and a queue that already
 * agrees is returned unchanged.
 */
export function reconcileSchedule(world: WorldState): void {
  // Terminal snapshots are immutable. A restored completed run must not grow
  // fresh upkeep/build deadlines during construction (first-ending-wins).
  if (world.ending) {
    return;
  }

  let queue = world.jobQueue;

  if (!hasQueuedJob(queue, UPKEEP_JOB_ID)) {
    queue = enqueueSystemJob(queue, {
      id: UPKEEP_JOB_ID,
      kind: "upkeep",
      dueWorldMinute: nextDayBoundary(world.worldMinute),
      startedWorldMinute: world.worldMinute,
    });
  }

  const liveBuildIds = new Set(world.builds.map((build) => build.id));

  for (const job of [...queue.jobs]) {
    if (job.kind === "build" && !liveBuildIds.has(job.subjectId ?? job.id)) {
      queue = cancelSystemJob(queue, job.id);
    }
  }

  for (const build of world.builds) {
    if (build.pausedAtWorldMinute !== undefined) {
      queue = cancelSystemJob(queue, build.id);
      continue;
    }

    queue = queueBuildJob(queue, build.id, build.startedWorldMinute, settledBuildDueMinute(build));
  }

  for (const threat of world.physicalThreats) {
    if (threat.kind !== "outage" || threat.endsWorldMinute === undefined) {
      continue;
    }

    const jobId = outageReleaseJobId(threat.id);
    const stillPending =
      threat.endsWorldMinute > world.worldMinute ||
      world.builds.some((build) => build.pausedByThreatId === threat.id);

    if (!hasQueuedJob(queue, jobId) && stillPending) {
      queue = enqueueSystemJob(queue, {
        id: jobId,
        kind: "outage-release",
        dueWorldMinute: threat.endsWorldMinute,
        startedWorldMinute: threat.worldMinute,
        subjectId: threat.id,
      });
    }
  }

  // Only the world-owned ledger can authorize content deadlines. Resumes
  // maintain the same exact minute even when the job queue is reconstructed.
  const pendingIds = new Set(world.content?.pending.map((entry) => entry.id) ?? []);
  for (const job of [...queue.jobs]) {
    if (job.kind === "content-response" && !pendingIds.has(job.id)) {
      queue = cancelSystemJob(queue, job.id);
    }
  }
  for (const entry of world.content?.pending ?? []) {
    if (world.content?.resolvedIds.includes(entry.id) || hasQueuedJob(queue, entry.id)) continue;
    queue = enqueueSystemJob(queue, {
      id: entry.id,
      kind: "content-response",
      dueWorldMinute: entry.dueWorldMinute,
      startedWorldMinute: entry.sourceWorldMinute,
      subjectId: entry.id,
    });
  }

  world.jobQueue = queue;
}

/**
 * Puts a build in the queue at its settled due minute, or moves it there if it
 * is already queued. A paused build has no entry: its outage's release job adds
 * it back.
 */
function queueBuildJob(
  queue: JobQueueState,
  buildId: string,
  startedWorldMinute: number,
  dueWorldMinute: number,
): JobQueueState {
  const existing = findQueuedJob(queue, buildId);

  if (existing) {
    return existing.dueWorldMinute === dueWorldMinute
      ? queue
      : rescheduleJob(queue, buildId, dueWorldMinute);
  }

  return enqueueSystemJob(queue, {
    id: buildId,
    kind: "build",
    dueWorldMinute,
    startedWorldMinute,
    subjectId: buildId,
  });
}

/** The next system job, in queue order, that satisfies `pick`. */
function nextSystemJob(
  world: WorldState,
  pick: (job: QueuedJob) => boolean,
): QueuedJob | null {
  let best: QueuedJob | null = null;

  for (const job of world.jobQueue.jobs) {
    if (!isSystemJob(job) || !pick(job)) {
      continue;
    }

    if (best === null || compareQueuedJobs(job, best) < 0) {
      best = job;
    }
  }

  return best;
}

function completeBuildJob(
  world: WorldState,
  job: QueuedJob,
  sink: ScheduleSink,
): void {
  const build = world.builds.find((candidate) => candidate.id === job.subjectId);

  if (!build || build.pausedAtWorldMinute !== undefined) {
    world.jobQueue = completeJob(world.jobQueue, job.id);
    return;
  }

  const due = settledBuildDueMinute(build);

  // The record may have moved later since the job was queued (an outage that
  // released it). Re-queue at the true minute rather than finishing early.
  if (due > job.dueWorldMinute) {
    world.jobQueue = rescheduleJob(world.jobQueue, job.id, due);
    return;
  }

  world.jobQueue = completeJob(world.jobQueue, job.id);
  world.builds = world.builds.filter((candidate) => candidate.id !== build.id);

  const spec = findWorkflowSpec(build.specId);
  world.economy.ownedWorkflows.push({
    id: build.id,
    specId: build.specId,
    label: spec ? spec.label : build.specId,
    outcome: build.outcome,
    builtWithModelId: build.modelId,
    acquiredWorldMinute: due,
  });

  sink.builds.push({
    type: "BuildCompleted",
    buildId: build.id,
    specId: build.specId,
    modelId: build.modelId,
    outcome: build.outcome,
    worldMinute: due,
  });
}

/** Charges the single day boundary this recurring job names, then reschedules it. */
function runUpkeepJob(
  world: WorldState,
  job: QueuedJob,
  sink: ScheduleSink,
): void {
  const boundary = job.dueWorldMinute;
  sink.upkeep.push(...advanceUpkeep(world, boundary - DAY_MINUTES, boundary));
  world.jobQueue = rescheduleJob(world.jobQueue, job.id, boundary + DAY_MINUTES);
}

/**
 * Returns the builds an outage paused, at the exact minute it ends. The paused
 * span is added to each build's frozen due minute, so the completion minute is
 * the same whether or not the release was observed on a tick.
 */
function runOutageReleaseJob(world: WorldState, job: QueuedJob): void {
  world.jobQueue = completeJob(world.jobQueue, job.id);

  const outage = world.physicalThreats.find(
    (threat) => threat.id === job.subjectId,
  );

  if (
    !outage ||
    outage.kind !== "outage" ||
    outage.endsWorldMinute === undefined
  ) {
    return;
  }

  const releasedAt = outage.endsWorldMinute;

  for (const buildId of outage.affectedBuildIds) {
    const build = world.builds.find((candidate) => candidate.id === buildId);

    if (
      !build ||
      build.pausedByThreatId !== outage.id ||
      build.pausedAtWorldMinute === undefined
    ) {
      continue;
    }

    build.accumulatedPausedMinutes =
      (build.accumulatedPausedMinutes ?? 0) +
      Math.max(0, releasedAt - build.pausedAtWorldMinute);
    delete build.pausedAtWorldMinute;
    delete build.pausedByThreatId;

    world.jobQueue = queueBuildJob(
      world.jobQueue,
      build.id,
      build.startedWorldMinute,
      settledBuildDueMinute(build),
    );
  }
}

function runSystemJob(
  world: WorldState,
  job: QueuedJob,
  sink: ScheduleSink,
): void {
  switch (job.kind as SystemJobKind) {
    case "build":
      completeBuildJob(world, job, sink);
      return;
    case "upkeep":
      runUpkeepJob(world, job, sink);
      return;
    case "outage-release":
      runOutageReleaseJob(world, job);
      return;
    case "content-response":
      world.jobQueue = completeJob(world.jobQueue, job.id);
      sink.content.push(...resolveContentReaction(world, job.id, job.dueWorldMinute));
      return;
    default:
      throw new Error(`unknown system job kind ${job.kind}`);
  }
}

/**
 * Runs every system job that `pick` selects, earliest first, until none
 * remain. A handler must finish its job or move it later, so the loop always
 * makes progress.
 */
export function dispatchSystemJobs(
  world: WorldState,
  pick: (job: QueuedJob) => boolean,
  sink: ScheduleSink,
): void {
  for (;;) {
    const job = nextSystemJob(world, pick);

    if (!job) {
      return;
    }

    runSystemJob(world, job, sink);

    const after = findQueuedJob(world.jobQueue, job.id);

    if (after && after.dueWorldMinute <= job.dueWorldMinute) {
      throw new Error(`system job ${job.id} did not advance past its due minute`);
    }
  }
}

/** Every system job due strictly before `minute`. */
export function dispatchBefore(
  world: WorldState,
  minute: number,
  sink: ScheduleSink,
): void {
  dispatchSystemJobs(world, (job) => job.dueWorldMinute < minute, sink);
}

/**
 * Every system job due at `minute` whose phase is at most `maxPhase`. The
 * command bus calls this before a tick (upkeep and release, phases 0 and 1)
 * and after it (builds, phase 3).
 */
export function dispatchAt(
  world: WorldState,
  minute: number,
  maxPhase: number,
  sink: ScheduleSink,
): void {
  dispatchSystemJobs(
    world,
    (job) => job.dueWorldMinute === minute && job.phasePriority <= maxPhase,
    sink,
  );
}

/** Every system job due at or before `minute`, for a window that ends between ticks. */
export function dispatchThrough(
  world: WorldState,
  minute: number,
  sink: ScheduleSink,
): void {
  dispatchSystemJobs(world, (job) => job.dueWorldMinute <= minute, sink);
}

/**
 * Settles the deadlines that decide build truth by `minute`: builds that finish
 * and outages that release them, in queue order. Upkeep is a money event and
 * stays with the command bus. For a test or tool that holds a world record
 * without a queue; it derives the queue first and runs the same dispatch the
 * simulation does.
 */
export function settleBuildDeadlines(
  world: WorldState,
  minute: number,
): SimulationEvent[] {
  reconcileSchedule(world);
  const sink = createScheduleSink();

  dispatchSystemJobs(
    world,
    (job) => job.kind !== "upkeep" && job.dueWorldMinute <= minute,
    sink,
  );

  return sink.builds;
}

