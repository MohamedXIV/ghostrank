import type { SoftwareEffect } from "@/content/software-catalog";

/**
 * Workflow specs are the Phase 5 P3 substrate of self-authored software: the
 * *design* a player hands the assistant to build. `docs/HACKING_AND_TOOLS.md`
 * says a program "is stored as a safe workflow/IR", so a spec is exactly that —
 * a fictional intermediate representation: an ordered list of abstract steps
 * (`discover(target) → inspect(services) → …`) that describes what the program
 * will do, plus the metadata the build system needs. It is pure data: nothing
 * here executes, parses a shell, or touches the real machine, which is the
 * docs' "safe virtual data, not executable host code" rule made structural.
 *
 * The specs mirror the premium licenses one-for-one, on purpose: #23's
 * exit criterion is "the player can replace at least one premium workflow with
 * a self-built alternative", and the only way to *check* that is to build the
 * same effects the vendor rents. Core rule from the issue: software creation
 * must reuse the same capability system as purchased tools — so a spec's
 * payoff is a plain `SoftwareEffect`, the exact language licenses, tools, and
 * models already compose in. No new effect kinds, no parallel mechanics.
 *
 * The price shape differs on purpose. A license is rented with recurring
 * credits; a workflow is *built* with time and compute — no credits are ever
 * charged for building. That is the money-vs-time-vs-skill triangle: the
 * self-built path trades world time (and rig occupancy, and possible defects)
 * for a permanent, fee-free lift. Zero `complexityMinutes` would make that
 * decision weightless, so every spec carries a real build cost.
 */

export interface WorkflowBuildFootprint {
  /** VRAM units the build occupies on the rig while it runs. */
  vram: number;
  /** Storage units the working checkout/artifacts occupy while it runs. */
  storage: number;
}

export interface WorkflowSpec {
  id: string;
  label: string;
  /**
   * The IR: abstract pipeline steps in execution order. Displayed in the FORGE
   * panel as the plan the assistant follows; fiction-only, never executed.
   */
  steps: readonly string[];
  /**
   * What the finished workflow contributes — the same effect language as
   * licenses and player tools, so it folds into the existing derivation.
   */
  effect: SoftwareEffect;
  /**
   * Base build duration in world minutes at a compute-1 rig with no assistant
   * shortcut. The player's rig shortens it (compute axis) and the running model
   * shortens it further (delivered factor), exactly like an operation action.
   */
  complexityMinutes: number;
  /** What the in-flight build occupies on the rig while it runs. */
  footprint: WorkflowBuildFootprint;
  /**
   * The spec's own test report: what the finished workflow's tests cover, in
   * fictional one-line entries. Shown with the owned workflow so "generated
   * software has tests and defects" is visible, not just asserted.
   */
  tests: readonly string[];
  /**
   * The premium license id a finished, clean copy of this workflow replaces —
   * the exit criterion made checkable: build it, stop renting it, lose nothing.
   */
  replaces: string;
}

export const WORKFLOW_SPEC_CATALOG: readonly WorkflowSpec[] = [
  {
    id: "workflow-net-monitor",
    label: "Homegrown Monitoring Loop",
    // The cheap first project: a tight polling loop, little to go wrong.
    steps: [
      "discover(target) → enumerate hosts",
      "poll(host, port) → sample liveness",
      "diff(sample, previous) → emit change events",
      "watch(events) → surface on the desktop",
    ],
    effect: {
      kind: "capability",
      // The same lift Commercial Monitoring Suite rents at 40/day.
      capability: { compute: 0, memory: 0, vram: 0, storage: 0, network: 2 },
    },
    complexityMinutes: 120,
    // A polling loop is mostly I/O: it barely occupies the rig.
    footprint: { vram: 1, storage: 1 },
    tests: [
      "poll returns for every enumerated host",
      "unchanged sample emits no event",
      "loop restarts after a dropped connection",
    ],
    replaces: "software-net-monitor",
  },
  {
    id: "workflow-auto-recon",
    label: "Automated Recon Pipeline",
    // The mid-tier build: it automates the survey verbs themselves.
    steps: [
      "discover(target) → enumerate hosts",
      "inspect(host) → fingerprint services",
      "correlate(fingerprints) → infer topology map",
      "report(map) → write to evidence store",
    ],
    effect: {
      // The same lift Automated Recon Framework rents at 70/day.
      kind: "capability",
      capability: { compute: 0, memory: 2, vram: 0, storage: 0, network: 1 },
    },
    complexityMinutes: 300,
    // Fingerprinting and correlation actually work the rig.
    footprint: { vram: 2, storage: 2 },
    tests: [
      "topology map matches a hand-drawn survey",
      "report writes only to the evidence store",
      "pipeline idles when no operation is open",
    ],
    replaces: "software-auto-recon",
  },
  {
    id: "workflow-analysis-pipeline",
    label: "Self-Built Analysis Pipeline",
    // The ambitious build: an assistant-guided efficiency pass over actions.
    steps: [
      "instrument(actions) → profile durations",
      "optimize(plan) → reorder dependent steps",
      "verify(plan) → replay against traces",
      "apply(plan) → fold shortcut into the rig",
    ],
    effect: {
      // The same shortcut Optimized Analysis Pipeline rents at 100/day.
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.85 },
    },
    complexityMinutes: 600,
    // Replaying traces against plans is the heaviest job in the garage.
    footprint: { vram: 3, storage: 2 },
    tests: [
      "reordered plan preserves every dependency",
      "replay matches the original trace",
      "shortcut never drops below the one-minute floor",
    ],
    replaces: "software-analysis-pipeline",
  },
  {
    id: "workflow-storage-index",
    label: "Local Storage Index",
    steps: [
      "scan(artifacts) → enumerate records",
      "index(records) → build local map",
      "compact(map) → reduce duplicate entries",
      "serve(map) → expose lookup hints",
    ],
    effect: {
      kind: "capability",
      capability: { compute: 0, memory: 1, vram: 0, storage: 3, network: 0 },
    },
    complexityMinutes: 240,
    footprint: { vram: 1, storage: 2 },
    tests: [
      "index contains every scanned artifact",
      "compaction preserves lookup results",
      "empty store returns an empty map",
    ],
    replaces: "software-storage-index",
  },
  {
    id: "workflow-batch-scheduler",
    label: "Self-Built Batch Scheduler",
    steps: [
      "queue(actions) → group independent work",
      "schedule(groups) → order batches",
      "verify(order) → preserve dependencies",
      "dispatch(order) → apply execution shortcut",
    ],
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.9 },
    },
    complexityMinutes: 420,
    footprint: { vram: 2, storage: 2 },
    tests: [
      "dependent actions never cross batch boundaries",
      "independent work keeps stable ordering",
      "scheduler respects the one-minute floor",
    ],
    replaces: "software-batch-scheduler",
  },
];

/**
 * The raw spec for an id, or `undefined` for an unknown id. Content stays pure —
 * a stale save reference resolves to nothing rather than breaking a fold, the
 * model-catalog convention. The *delivered* effect (which depends on the
 * build's frozen outcome) is computed in the simulation layer, not here.
 */
export function findWorkflowSpec(
  specId: string,
): WorkflowSpec | undefined {
  return WORKFLOW_SPEC_CATALOG.find((item) => item.id === specId);
}
