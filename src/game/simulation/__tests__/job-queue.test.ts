import { describe, expect, it } from "vitest";

import {
  cancelJob,
  completeJob,
  createJobQueue,
  enqueueJob,
  runningJobFor,
  startRunnableJobs,
  type JobSpec,
} from "@/game/simulation/scheduler/job-queue";

function spec(overrides: Partial<JobSpec> = {}): JobSpec {
  return {
    kind: "sleep",
    resource: "clock",
    phasePriority: 1,
    startedWorldMinute: 0,
    dueWorldMinute: 100,
    ...overrides,
  };
}

describe("job queue ordering (Game-First G1)", () => {
  it("orders by due minute before anything else", () => {
    let queue = createJobQueue();
    queue = enqueueJob(queue, spec({ dueWorldMinute: 300, phasePriority: 0 })).queue;
    queue = enqueueJob(queue, spec({ dueWorldMinute: 100, phasePriority: 9 })).queue;

    expect(queue.jobs.map((job) => job.dueWorldMinute)).toEqual([100, 300]);
  });

  it("breaks equal due minutes by phase priority, then by enqueue sequence", () => {
    let queue = createJobQueue();
    queue = enqueueJob(queue, spec({ dueWorldMinute: 50, phasePriority: 2, kind: "a" })).queue;
    queue = enqueueJob(queue, spec({ dueWorldMinute: 50, phasePriority: 1, kind: "b" })).queue;
    queue = enqueueJob(queue, spec({ dueWorldMinute: 50, phasePriority: 1, kind: "c" })).queue;

    expect(queue.jobs.map((job) => job.kind)).toEqual(["b", "c", "a"]);
    expect(queue.jobs.map((job) => job.sequence)).toEqual([1, 2, 0]);
  });

  it("assigns ids and sequences monotonically and never reuses them", () => {
    let queue = createJobQueue();
    const first = enqueueJob(queue, spec());
    queue = completeJob(first.queue, first.job.id);
    const second = enqueueJob(queue, spec());

    expect(first.job.id).toBe("job:1");
    expect(second.job.id).toBe("job:2");
    expect(second.queue.nextSequence).toBe(2);
  });
});

describe("job queue capacity and dependencies", () => {
  it("admits only one running job on the single-capacity clock", () => {
    let queue = createJobQueue();
    queue = enqueueJob(queue, spec({ dueWorldMinute: 200, kind: "later" })).queue;
    queue = enqueueJob(queue, spec({ dueWorldMinute: 100, kind: "earlier" })).queue;

    queue = startRunnableJobs(queue);

    expect(runningJobFor(queue, "clock")?.kind).toBe("earlier");
    expect(queue.jobs.filter((job) => job.status === "running")).toHaveLength(1);
  });

  it("promotes the next job once the running one completes", () => {
    let queue = createJobQueue();
    queue = enqueueJob(queue, spec({ dueWorldMinute: 100, kind: "first" })).queue;
    queue = enqueueJob(queue, spec({ dueWorldMinute: 200, kind: "second" })).queue;
    queue = startRunnableJobs(queue);

    const firstId = runningJobFor(queue, "clock")!.id;
    queue = startRunnableJobs(completeJob(queue, firstId));

    expect(runningJobFor(queue, "clock")?.kind).toBe("second");
  });

  it("holds a job until every dependency has left the queue", () => {
    let queue = createJobQueue();
    const parent = enqueueJob(queue, spec({ kind: "parent", dueWorldMinute: 500 }));
    queue = enqueueJob(parent.queue, spec({
      kind: "child",
      dueWorldMinute: 100,
      dependsOn: [parent.job.id],
    })).queue;

    queue = startRunnableJobs(queue);
    expect(runningJobFor(queue, "clock")?.kind).toBe("parent");

    // The child is due first but cannot run while its dependency is pending.
    queue = startRunnableJobs(completeJob(queue, parent.job.id));
    expect(runningJobFor(queue, "clock")?.kind).toBe("child");
  });

  it("cancelling a job cancels its dependents and reports them in queue order", () => {
    let queue = createJobQueue();
    const parent = enqueueJob(queue, spec({ kind: "parent", dueWorldMinute: 500 }));
    const child = enqueueJob(parent.queue, spec({
      kind: "child",
      dueWorldMinute: 600,
      dependsOn: [parent.job.id],
    }));
    const unrelated = enqueueJob(child.queue, spec({ kind: "other", dueWorldMinute: 50 }));
    queue = startRunnableJobs(unrelated.queue);

    const result = cancelJob(queue, parent.job.id);

    expect(result.cancelled.map((job) => job.kind)).toEqual(["parent", "child"]);
    expect(result.queue.jobs.map((job) => job.kind)).toEqual(["other"]);
  });

  it("treats a dependency that was never queued as satisfied only if absent", () => {
    // A job that names a missing dependency is runnable: that id left the queue.
    let queue = createJobQueue();
    queue = enqueueJob(queue, spec({ kind: "orphan", dependsOn: ["job:999"] })).queue;

    queue = startRunnableJobs(queue);

    expect(runningJobFor(queue, "clock")?.kind).toBe("orphan");
  });
});

describe("job queue purity", () => {
  it("never mutates the queue it was given", () => {
    let queue = createJobQueue();
    queue = enqueueJob(queue, spec({ kind: "a", dueWorldMinute: 10 })).queue;
    const before = structuredClone(queue);

    startRunnableJobs(queue);
    completeJob(queue, queue.jobs[0]!.id);
    cancelJob(queue, queue.jobs[0]!.id);

    expect(queue).toEqual(before);
  });
});
