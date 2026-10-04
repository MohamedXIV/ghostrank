import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import type { ModelProperties } from "@/content/model-catalog";
import type {
  AnalysisClaim,
  AnalysisConfidence,
  MachineState,
} from "@/game/simulation/state/world-state";

/**
 * AI analysis is the Phase 5 P2 consumer of the model *properties* P0 seeded.
 * The assistant produces a fallible read of a target's infrastructure that the
 * player has **not yet verified through recon** — which is precisely the
 * valuable, interestingly-wrong thing it can do. Survey and inspect reveal the
 * *true* role of a machine and the *true* kind of a service once observed, so a
 * model that only restated observed facts would be a redundant second source;
 * the genuinely hidden ground truth is the not-yet-recon'd structure, and that
 * is what analysis predicts.
 *
 * Every rule here serves `docs/AI_SYSTEMS.md`, whose failure modes the design
 * names and this slice makes real — a model can **misclassify**, **hallucinate
 * a host** that is not there, and **overstate confidence**:
 *
 * - `context` decides how much of the target's (unseen) topology the assistant
 *   attempts to read at once — the frontier class sees more than a compact one;
 * - `reliability` decides how often each individual claim matches ground truth,
 *   capped well below 1 — even the best model is wrong some of the time,
 *   because #23's core rule is that AI "remains fallible";
 * - `reasoning` + `context` set the confidence *band*, and crucially confidence
 *   is computed **without looking at accuracy** — so an unreliable model states
 *   wrong things with the same polish as right ones, the "overstate confidence"
 *   failure, and why expert play is to verify important conclusions yourself.
 *
 * Deterministic: a pure function of the target's real topology, the sets the
 * player has already observed, the model's properties, the world seed, and the
 * world minute — the `hashUnit` primitive the ecosystem already rolls on. No
 * RNG, no clock, no order dependence: asking twice at the same minute returns
 * byte-for-byte the same read, and restoring a save cannot rewrite history.
 */

/** Fictional machine roles the assistant may predict (never real products). */
const ROLE_VOCABULARY = ["relay", "vault", "gateway", "bastion", "cache"];

/** Fictional service kinds the assistant may predict. */
const SERVICE_KIND_VOCABULARY = ["signal", "archive", "http", "ssh", "proxy"];

/**
 * How often a model of a given `reliability` band (1–5) matches ground truth.
 * Deliberately capped at 0.8: reliability raises the *odds* of being right but
 * never reaches certainty — no model is trustworthy enough to skip verification.
 */
function accuracyOdds(reliability: number): number {
  const band = Math.max(1, Math.min(5, Math.round(reliability)));
  return 0.8 * (band / 5);
}

/**
 * The confidence band a claim is *stated* with, from reasoning + context. It is
 * independent of whether the claim is actually accurate — a low-reliability,
 * high-reasoning model delivers confident nonsense, the overconfidence failure
 * `docs/AI_SYSTEMS.md` describes.
 */
function confidenceOf(properties: ModelProperties): AnalysisConfidence {
  const skill = properties.reasoning + properties.context;
  if (skill >= 8) {
    return "high";
  }
  if (skill >= 5) {
    return "medium";
  }
  return "low";
}

/** A deterministic vocabulary pick, used for misclassifications and fabrications. */
function pickFrom<T>(
  pool: readonly T[],
  seed: number,
  ...parts: (string | number)[]
): T {
  const index = Math.floor(hashUnit(seed, ...parts) * pool.length);
  return pool[Math.min(index, pool.length - 1)];
}

/** A wrong-but-plausible assertion: a vocabulary value distinct from the truth. */
function misclassification(
  pool: readonly string[],
  truth: string,
  seed: number,
  ...parts: (string | number)[]
): string {
  for (let shift = 1; shift <= pool.length; shift += 1) {
    const candidate = pickFrom(
      pool,
      seed,
      ...parts,
      "mis",
      shift,
    );
    if (candidate !== truth) {
      return candidate;
    }
  }
  // A degenerate one-value vocabulary: fall back to a clearly-fictional token.
  return `${truth}-unknown`;
}

function claimCount(properties: ModelProperties): number {
  return Math.max(1, Math.min(5, Math.round(properties.context)));
}

function analyzeMachines(
  machines: readonly MachineState[],
  observedMachineIds: ReadonlySet<string>,
  properties: ModelProperties,
  seed: number,
  worldMinute: number,
  modelId: string,
): AnalysisClaim[] {
  const unseen = machines.filter((m) => !observedMachineIds.has(m.id));
  const limit = claimCount(properties);
  const confidence = confidenceOf(properties);
  const claims: AnalysisClaim[] = [];

  for (let index = 0; index < Math.min(limit, unseen.length); index += 1) {
    const machine = unseen[index];
    const accurate =
      hashUnit(seed, "analysis-acc", worldMinute, modelId, "m", index) <
      accuracyOdds(properties.reliability);

    if (accurate) {
      claims.push({
        subjectId: machine.id,
        kind: "machine-role",
        assertion: machine.role,
        confidence,
        accurate: true,
      });
      continue;
    }

    // A wrong read is either a mislabelled real host or an invented one; a
    // model that hallucinates whole hosts is worse, so it is the rarer branch.
    const hallucinate =
      hashUnit(seed, "analysis-halluc", worldMinute, modelId, "m", index) <
      0.34;

    if (hallucinate) {
      claims.push({
        subjectId: null,
        kind: "machine-role",
        assertion: pickFrom(ROLE_VOCABULARY, seed, "analysis", worldMinute, modelId, "m", index),
        confidence,
        accurate: false,
      });
    } else {
      claims.push({
        subjectId: machine.id,
        kind: "machine-role",
        assertion: misclassification(
          ROLE_VOCABULARY,
          machine.role,
          seed,
          "analysis",
          worldMinute,
          modelId,
          "m",
          index,
        ),
        confidence,
        accurate: false,
      });
    }
  }

  return claims;
}

function analyzeServices(
  machines: readonly MachineState[],
  observedMachineIds: ReadonlySet<string>,
  observedServiceIds: ReadonlySet<string>,
  properties: ModelProperties,
  seed: number,
  worldMinute: number,
  modelId: string,
): AnalysisClaim[] {
  // Only services of a host the player has *already surveyed* are candidates:
  // the assistant reasons from the topology it can currently see outward, never
  // naming a machine the recon has not revealed yet. The hidden ground truth it
  // predicts is the services of a known host the player has not yet inspected.
  const unseen = machines
    .filter((machine) => observedMachineIds.has(machine.id))
    .flatMap((machine) =>
      machine.services
        .filter((service) => !observedServiceIds.has(service.id))
        .map((service) => service),
    );

  const limit = claimCount(properties);
  const confidence = confidenceOf(properties);
  const claims: AnalysisClaim[] = [];

  for (let index = 0; index < Math.min(limit, unseen.length); index += 1) {
    const service = unseen[index];

    const accurate =
      hashUnit(seed, "analysis-acc", worldMinute, modelId, "s", index) <
      accuracyOdds(properties.reliability);

    if (accurate) {
      claims.push({
        subjectId: service.id,
        kind: "service-kind",
        assertion: service.kind,
        confidence,
        accurate: true,
      });
      continue;
    }

    const hallucinate =
      hashUnit(seed, "analysis-halluc", worldMinute, modelId, "s", index) <
      0.34;

    if (hallucinate) {
      claims.push({
        subjectId: null,
        kind: "service-kind",
        assertion: pickFrom(SERVICE_KIND_VOCABULARY, seed, "analysis", worldMinute, modelId, "s", index),
        confidence,
        accurate: false,
      });
    } else {
      claims.push({
        subjectId: service.id,
        kind: "service-kind",
        assertion: misclassification(
          SERVICE_KIND_VOCABULARY,
          service.kind,
          seed,
          "analysis",
          worldMinute,
          modelId,
          "s",
          index,
        ),
        confidence,
        accurate: false,
      });
    }
  }

  return claims;
}

export interface AnalysisInput {
  modelId: string;
  properties: ModelProperties;
  machines: readonly MachineState[];
  observedMachineIds: ReadonlySet<string>;
  observedServiceIds: ReadonlySet<string>;
  seed: number;
  worldMinute: number;
}

/**
 * Produce the assistant's current read of a target. The returned claims are
 * ordered machine-role first, then service-kind, each in topology order, so the
 * record is stable regardless of how the caller iterates. A target with nothing
 * unseen (fully recon'd) yields no claims — the assistant adds no verified facts.
 */
export function runAnalysis(input: AnalysisInput): AnalysisClaim[] {
  return [
    ...analyzeMachines(
      input.machines,
      input.observedMachineIds,
      input.properties,
      input.seed,
      input.worldMinute,
      input.modelId,
    ),
    ...analyzeServices(
      input.machines,
      input.observedMachineIds,
      input.observedServiceIds,
      input.properties,
      input.seed,
      input.worldMinute,
      input.modelId,
    ),
  ];
}
