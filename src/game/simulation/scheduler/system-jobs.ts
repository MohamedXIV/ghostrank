import {
  cancelJob,
  enqueueJob,
  findQueuedJob,
  startRunnableJobs,
  type JobQueueState,
  type JobResource,
  type QueuedJob,
} from "@/game/simulation/scheduler/job-queue";

/**
 * World-owned deadlines (Game-First G1, #77; D057). A system job is work the
 * world does on its own schedule, not on the player's clock: a build finishing,
 * the daily upkeep charge, an outage releasing the builds it paused. They live
 * in the same deterministic queue as time jobs, so one ordering rule decides
 * every deadline.
 *
 * Phase priority breaks ties at one world minute, and is the order the
 * dispatcher runs them in:
 *
 * - `upkeep` (0) charges the day before the ecosystem tick at that minute runs.
 * - `outage-release` (1) returns paused builds to the queue before the tick can
 *   pause them again.
 * - the ecosystem tick itself is not a queued job. It is the fixed cadence every
 *   deadline is measured against.
 * - `build` (3) completes after the tick, so an outage at the exact due minute
 *   still wins the tie (D034).
 */
export const SYSTEM_PHASE = {
  upkeep: 0,
  "outage-release": 1,
  "content-response": 2,
  build: 3,
} as const;

export type SystemJobKind = keyof typeof SYSTEM_PHASE;

export const UPKEEP_JOB_ID = "upkeep";

/** The one release job per outage, named by the threat it releases. */
export function outageReleaseJobId(threatId: string): string {
  return `release:${threatId}`;
}

/** Resource a system job holds: a build occupies the rig, the rest hold nothing. */
export function systemResourceFor(kind: SystemJobKind): JobResource {
  return kind === "build" ? "rig" : "system";
}

export function isSystemJob(job: QueuedJob): boolean {
  return job.resource !== "clock";
}

export interface SystemJobSpec {
  id: string;
  kind: SystemJobKind;
  dueWorldMinute: number;
  startedWorldMinute: number;
  subjectId?: string;
}

/**
 * Adds a system job in its deterministic position. System resources have no
 * capacity, so the job is runnable at once; the queue's status is recomputed
 * the same way the clock computes it.
 */
export function enqueueSystemJob(
  queue: JobQueueState,
  spec: SystemJobSpec,
): JobQueueState {
  const { queue: next } = enqueueJob(queue, {
    id: spec.id,
    kind: spec.kind,
    resource: systemResourceFor(spec.kind),
    phasePriority: SYSTEM_PHASE[spec.kind],
    startedWorldMinute: spec.startedWorldMinute,
    dueWorldMinute: spec.dueWorldMinute,
    ...(spec.subjectId !== undefined ? { subjectId: spec.subjectId } : {}),
  });

  return startRunnableJobs(next);
}

export function hasQueuedJob(queue: JobQueueState, jobId: string): boolean {
  return findQueuedJob(queue, jobId) !== null;
}

/** Cancels one system job by id. Nothing depends on system jobs, so only it goes. */
export function cancelSystemJob(queue: JobQueueState, jobId: string): JobQueueState {
  return cancelJob(queue, jobId).queue;
}
