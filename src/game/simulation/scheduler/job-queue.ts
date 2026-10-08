/**
 * Deterministic world job queue (Game-First G1, #77).
 *
 * Pure data and functions only: no clock, no randomness, no persistence. The
 * command bus owns the state; this module decides ordering, capacity and
 * dependencies so every consumer agrees on them.
 *
 * Ordering is the total order `(dueWorldMinute, phasePriority, sequence)`.
 * `sequence` is assigned monotonically at enqueue time, so two jobs with the
 * same due minute and priority always run in the order they were queued, across
 * replay and reload.
 *
 * A job holds one or more resources while running. A resource with capacity 1
 * (the player's `clock`) admits one running job at a time. A job may depend on
 * other jobs; it is runnable only when none of them remain in the queue. Jobs
 * leave the queue when they finish, so "not in the queue" means "done". To keep
 * that meaning exact, cancelling a job also cancels everything that depends on
 * it, and returns those cancellations to the caller.
 */

/**
 * `clock` is the player's time (one job at a time). `rig` and `system` hold no
 * capacity: a build's footprint is contention, which slows work rather than
 * blocking it (AI_SYSTEMS "Compute contention"), and system jobs are
 * authoritative deadlines the world always runs.
 */
export type JobResource = "clock" | "rig" | "system";

export type JobStatus = "queued" | "running";

export interface QueuedJob {
  id: string;
  sequence: number;
  kind: string;
  resource: JobResource;
  phasePriority: number;
  startedWorldMinute: number;
  dueWorldMinute: number;
  dependsOn: string[];
  status: JobStatus;
  /** The world record a system job acts on (a build id, an outage id). */
  subjectId?: string;
}

export interface JobQueueState {
  nextSequence: number;
  jobs: QueuedJob[];
}

export interface JobSpec {
  kind: string;
  resource: JobResource;
  phasePriority: number;
  startedWorldMinute: number;
  dueWorldMinute: number;
  dependsOn?: string[];
  /** A stable id for jobs the world names itself; otherwise `job:N`. */
  id?: string;
  subjectId?: string;
}

/** Capacity per resource. A resource absent here is unlimited. */
export const RESOURCE_CAPACITY: Partial<Record<JobResource, number>> = {
  clock: 1,
};

export function createJobQueue(): JobQueueState {
  return { nextSequence: 0, jobs: [] };
}

export function compareQueuedJobs(a: QueuedJob, b: QueuedJob): number {
  if (a.dueWorldMinute !== b.dueWorldMinute) {
    return a.dueWorldMinute - b.dueWorldMinute;
  }

  if (a.phasePriority !== b.phasePriority) {
    return a.phasePriority - b.phasePriority;
  }

  return a.sequence - b.sequence;
}

export function findQueuedJob(
  queue: JobQueueState,
  jobId: string,
): QueuedJob | null {
  return queue.jobs.find((job) => job.id === jobId) ?? null;
}

/** Returns a new queue with the job appended in its deterministic position. */
export function enqueueJob(
  queue: JobQueueState,
  spec: JobSpec,
): { queue: JobQueueState; job: QueuedJob } {
  const sequence = queue.nextSequence;
  const id = spec.id ?? `job:${sequence + 1}`;

  if (queue.jobs.some((existing) => existing.id === id)) {
    throw new Error(`duplicate job id ${id}`);
  }

  const job: QueuedJob = {
    id,
    sequence,
    kind: spec.kind,
    resource: spec.resource,
    phasePriority: spec.phasePriority,
    startedWorldMinute: spec.startedWorldMinute,
    dueWorldMinute: spec.dueWorldMinute,
    dependsOn: [...(spec.dependsOn ?? [])],
    status: "queued",
    ...(spec.subjectId !== undefined ? { subjectId: spec.subjectId } : {}),
  };

  return {
    queue: {
      nextSequence: sequence + 1,
      jobs: [...queue.jobs, job].sort(compareQueuedJobs),
    },
    job,
  };
}

/**
 * Promotes queued jobs to running in deterministic order, as far as their
 * dependencies and resource capacity allow. Running jobs keep their resources.
 */
export function startRunnableJobs(queue: JobQueueState): JobQueueState {
  const jobs = queue.jobs
    .map((job) => ({ ...job, dependsOn: [...job.dependsOn] }))
    .sort(compareQueuedJobs);
  const inUse = new Map<JobResource, number>();

  for (const job of jobs) {
    if (job.status === "running") {
      inUse.set(job.resource, (inUse.get(job.resource) ?? 0) + 1);
    }
  }

  const queuedIds = new Set(jobs.map((job) => job.id));

  for (const job of jobs) {
    if (job.status !== "queued") {
      continue;
    }

    const dependenciesPending = job.dependsOn.some((id) => queuedIds.has(id));
    const used = inUse.get(job.resource) ?? 0;
    const capacity = RESOURCE_CAPACITY[job.resource] ?? Infinity;

    if (dependenciesPending || used >= capacity) {
      continue;
    }

    job.status = "running";
    inUse.set(job.resource, used + 1);
  }

  return { nextSequence: queue.nextSequence, jobs };
}

/**
 * Moves a queued job to a new due minute and restores queue order. Used when a
 * deadline is re-derived, such as a build whose outage has just ended.
 */
export function rescheduleJob(
  queue: JobQueueState,
  jobId: string,
  dueWorldMinute: number,
): JobQueueState {
  return {
    nextSequence: queue.nextSequence,
    jobs: queue.jobs
      .map((job) => (job.id === jobId ? { ...job, dueWorldMinute } : job))
      .sort(compareQueuedJobs),
  };
}

/** Removes a finished job. Returns the queue without it. */
export function completeJob(queue: JobQueueState, jobId: string): JobQueueState {
  return {
    nextSequence: queue.nextSequence,
    jobs: queue.jobs.filter((job) => job.id !== jobId),
  };
}

/**
 * Removes a job and every job that transitively depends on it. Returns the
 * removed jobs in queue order so the caller can record each cancellation.
 */
export function cancelJob(
  queue: JobQueueState,
  jobId: string,
): { queue: JobQueueState; cancelled: QueuedJob[] } {
  const removed = new Set<string>([jobId]);
  let grew = true;

  while (grew) {
    grew = false;

    for (const job of queue.jobs) {
      if (
        !removed.has(job.id) &&
        job.dependsOn.some((dependency) => removed.has(dependency))
      ) {
        removed.add(job.id);
        grew = true;
      }
    }
  }

  const cancelled = queue.jobs
    .filter((job) => removed.has(job.id))
    .sort(compareQueuedJobs);

  return {
    queue: {
      nextSequence: queue.nextSequence,
      jobs: queue.jobs.filter((job) => !removed.has(job.id)),
    },
    cancelled,
  };
}

/** The running job holding a resource, if any. */
export function runningJobFor(
  queue: JobQueueState,
  resource: JobResource,
): QueuedJob | null {
  return (
    queue.jobs
      .filter((job) => job.status === "running" && job.resource === resource)
      .sort(compareQueuedJobs)[0] ?? null
  );
}
