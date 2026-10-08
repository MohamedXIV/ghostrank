import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import type { HardwareCapability } from "@/content/hardware-catalog";
import { BASELINE_CAPABILITY } from "@/game/simulation/systems/compute";
import type { ModelProperties } from "@/content/model-catalog";
import type { SoftwareEffect } from "@/content/software-catalog";
import {
  findWorkflowSpec,
  type WorkflowSpec,
} from "@/content/workflow-spec-catalog";
import type {
  InFlightBuild,
  OwnedWorkflow,
  WorkflowOutcome,
} from "@/game/simulation/state/world-state";

/**
 * The build system is the Phase 5 P3 consumer of the model properties P0
 * seeded and P1's promise that "the pool has a designed next tenant": the
 * software forge. A build is AI-assisted software development made playable —
 * the player hands the running assistant a spec (a safe workflow/IR, pure
 * fictional data), the rig works on it for world time, and the result is a
 * permanent, fee-free workflow whose *quality* depends on the assistant that
 * wrote it. `docs/AI_SYSTEMS.md` names the inputs (model quality, compute
 * contention, interruptions) and the outcomes (working software, defective
 * workflows); this module turns each into one number, and the command layer
 * into the only place state changes.
 *
 * Three decisions shape the math:
 *
 * - **Duration is frozen at start.** Like an operation action, the build
 *   minutes are computed once, when the job is commissioned, from the rig and
 *   the *delivered* model shortcut at that minute. `dueWorldMinute` is then
 *   plain clock arithmetic, so splitting a wait, restoring a save, or swapping
 *   models mid-build cannot re-roll or rewrite the job — the split-invariance
 *   every prior slice has held. Phase 6 P3 represents interruptions as separate
 *   pause intervals: the frozen due minute remains immutable while the derived
 *   completion boundary gains only time the world was actually out.
 * - **Quality is one frozen roll.** At start, `reasoning` sets the odds of a
 *   clean build (capped below certainty — the docs' "remains fallible"), and
 *   `reliability` splits a non-clean roll between warnings (cosmetic) and
 *   defects (real). The outcome is stored on the job, hidden until completion;
 *   a defective workflow still works, just less (see `deliverableEffect`),
 *   because software — like every capability layer in this game — is a lift,
 *   never a punishment or a gate.
 * - **The build taxes the pool, the pool taxes the model.** An in-flight build
 *   occupies VRAM and storage (the docs' worked example: "model occupies GPU
 *   while building — pause / quality / rent / slower"), and the *same* pool is
 *   what P1 contention measures a local model against. So the tenant math runs
 *   in one direction only: builds subtract from the pool, and the model's
 *   delivered factor is computed against what remains. A model+build rig is
 *   slower at both jobs than either alone, and neither ever drops below the
 *   no-lift baseline.
 */

/**
 * World minutes a build takes on a given rig with a given delivered shortcut.
 * The compute axis shortens base time with the same diminishing-returns curve
 * operation actions use (never below one minute), and the model's delivered
 * factor scales the accelerated minutes exactly like a license modifier — one
 * shared runtime, no new mechanics. `deliveredFactor` must be the *contended*
 * factor (catalog factor vs the pool after this build's own footprint and any
 * other tenants are subtracted), which is what makes "pause / quality / rent /
 * slower" a real four-way choice.
 */
export function buildMinutes(
  spec: WorkflowSpec,
  capability: HardwareCapability,
  deliveredFactor = 1,
): number {
  const compute = Math.max(BASELINE_CAPABILITY, capability.compute);
  const hardwareMinutes =
    compute <= BASELINE_CAPABILITY
      ? spec.complexityMinutes
      : Math.max(
          1,
          Math.ceil((spec.complexityMinutes * BASELINE_CAPABILITY) / compute),
        );

  if (deliveredFactor >= 1 || hardwareMinutes <= 1) {
    return hardwareMinutes;
  }

  return Math.max(1, Math.ceil(hardwareMinutes * deliveredFactor));
}

/**
 * How often a model of a given `reasoning` band (1–5) produces a clean build.
 * Capped at 0.7 — deliberately lower than analysis's accuracy cap, because
 * writing working software end-to-end is harder than labelling a host, and
 * #23's rule is that the AI "helps but can be wrong". Even the frontier class
 * ships defects some of the time.
 */
function cleanBuildOdds(reasoning: number): number {
  const band = Math.max(1, Math.min(5, Math.round(reasoning)));
  return 0.7 * (band / 5);
}

/**
 * The odds that a *not-clean* build is only warnings rather than defective,
 * from `reliability`. A reliable model's mistakes are cosmetic (lint noise,
 * odd naming); an unreliable one's mistakes bite. Reliability never fully
 * removes risk — band 5 means "when something goes wrong, it usually isn't
 * serious", not "nothing goes wrong".
 */
function warningOdds(reliability: number): number {
  const band = Math.max(1, Math.min(5, Math.round(reliability)));
  return 0.3 + 0.5 * (band / 5);
}

/**
 * Roll the build's frozen quality outcome. Deterministic: a pure function of
 * the world seed, the start minute, the model, and the spec — asking at the
 * same minute twice, or replaying a save, gives the same report card.
 */
export function rollBuildOutcome(
  seed: number,
  startWorldMinute: number,
  modelId: string,
  spec: WorkflowSpec,
  properties: ModelProperties,
): WorkflowOutcome {
  const clean =
    hashUnit(seed, "build-quality", startWorldMinute, modelId, spec.id) <
    cleanBuildOdds(properties.reasoning);

  if (clean) {
    return "clean";
  }

  const cosmetic =
    hashUnit(seed, "build-warn", startWorldMinute, modelId, spec.id) <
    warningOdds(properties.reliability);

  return cosmetic ? "warnings" : "defective";
}

/**
 * What an owned workflow actually contributes, given its frozen outcome.
 * `clean` and `warnings` deliver the spec in full — warnings are fiction for
 * the player to read, not a tax (cosmetic means cosmetic). `defective` pulls
 * toward the baseline without ever crossing it: a capability effect loses half
 * its axes (floor 1 on any nonzero axis, so it still helps a little), and a
 * modifier effect gets half its shortcut (factor moved halfway back toward 1).
 * A broken home-built tool is disappointing, never a trap.
 */
export function deliverableEffect(
  spec: WorkflowSpec,
  outcome: WorkflowOutcome,
): SoftwareEffect {
  if (outcome !== "defective") {
    return spec.effect;
  }

  if (spec.effect.kind === "capability") {
    const halve = (value: number): number =>
      value <= 0 ? 0 : Math.max(1, Math.floor(value / 2));
    const { capability } = spec.effect;

    return {
      kind: "capability" as const,
      capability: {
        compute: halve(capability.compute),
        memory: halve(capability.memory),
        vram: halve(capability.vram),
        storage: halve(capability.storage),
        network: halve(capability.network),
      },
    };
  }

  const factor = spec.effect.discount.factor;
  return {
    kind: "modifier" as const,
    discount: {
      kind: "action-duration" as const,
      // Half the shortcut survives a defect: 0.85 → 0.925, never past ×1.
      factor: Math.min(1, (1 + factor) / 2),
    },
  };
}

/**
 * Resolve what every owned workflow actually contributes, skipping specs the
 * catalog no longer carries. The result is a plain `SoftwareEffect[]`, so an
 * inventory of self-built workflows folds through the *same* capability and
 * factor combinators licenses and player tools already use — the core rule of
 * #23 that "software creation must reuse the same capability system as
 * purchased tools", enforced by there being no second system to reuse. An
 * empty inventory contributes nothing: the untouched pre-build baseline.
 */
export function workflowEffects(
  owned: readonly OwnedWorkflow[],
): SoftwareEffect[] {
  const effects: SoftwareEffect[] = [];

  for (const workflow of owned) {
    const spec = findWorkflowSpec(workflow.specId);

    if (spec) {
      effects.push(deliverableEffect(spec, workflow.outcome));
    }
  }

  return effects;
}

/**
 * Sum the footprint of every in-flight build. Pure arithmetic over the queue —
 * with an empty queue it is 0/0, the untouched baseline, so nothing about P0–P2
 * changes until a build actually occupies the rig.
 */
export function buildPoolPressure(
  builds: readonly InFlightBuild[],
  specOf: (specId: string) => WorkflowSpec | undefined,
): { vram: number; storage: number } {
  let vram = 0;
  let storage = 0;

  for (const build of builds) {
    const spec = specOf(build.specId);

    if (!spec) {
      // A stale save can name a spec the catalog dropped; it occupies nothing.
      continue;
    }

    vram += spec.footprint.vram;
    storage += spec.footprint.storage;
  }

  return { vram, storage };
}

/**
 * The pool a *new* build will actually run against: the rig minus the builds
 * already in flight minus its own footprint. Commissioning freezes the job's
 * clock against this, so a player who queues a second heavy job on a small rig
 * sees it take longer *before* committing, and the first job's frozen clock
 * never changes.
 */
export function poolForNewBuild(
  pool: HardwareCapability,
  builds: readonly InFlightBuild[],
  spec: WorkflowSpec,
): HardwareCapability {
  const pressure = buildPoolPressure(builds, findWorkflowSpec);

  return {
    compute: pool.compute,
    memory: pool.memory,
    network: pool.network,
    vram: Math.max(0, pool.vram - pressure.vram - spec.footprint.vram),
    storage: Math.max(0, pool.storage - pressure.storage - spec.footprint.storage),
  };
}

/**
 * The rig pool that remains after every *other* in-flight build takes its
 * share, clamped at zero per axis. Used twice: when commissioning a build (the
 * pool it will run against, minus its own footprint) and when a model reads its
 * shortcut (minus the whole queue). Axes the game never contends (compute,
 * memory, network) pass through untouched.
 */
export function availablePool(
  pool: HardwareCapability,
  builds: readonly InFlightBuild[],
  specOf: (specId: string) => WorkflowSpec | undefined,
): HardwareCapability {
  const pressure = buildPoolPressure(builds, specOf);

  return {
    compute: pool.compute,
    memory: pool.memory,
    network: pool.network,
    vram: Math.max(0, pool.vram - pressure.vram),
    storage: Math.max(0, pool.storage - pressure.storage),
  };
}

/**
 * The id scheme every instance layer uses: `kind:N` with the max existing
 * suffix, so ids never collide across save/restore and a rename never touches
 * identity. Owned and in-flight builds share the sequence so a completed job's
 * workflow id cannot clash with a new build id.
 */
export function nextBuildId(
  builds: readonly InFlightBuild[],
  owned: readonly OwnedWorkflow[],
): string {
  const taken = [...builds.map((b) => b.id), ...owned.map((w) => w.id)];
  let max = 0;

  for (const id of taken) {
    const match = /^workflow:(\d+)$/.exec(id);

    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `workflow:${max + 1}`;
}

/**
 * Derived completion boundary: frozen commissioning due + closed outage time.
 * An actively paused build has no finish boundary yet and cannot complete.
 */
export function settledBuildDueMinute(build: InFlightBuild): number {
  return build.dueWorldMinute + (build.accumulatedPausedMinutes ?? 0);
}
