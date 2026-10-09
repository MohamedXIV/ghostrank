import {
  GENERATED_SCENARIO_SPECS,
  MACHINE_TEMPLATES,
  NAME_PREFIXES,
  NAME_SUFFIXES,
  OWNER_PROFILES,
  SERVICE_TEMPLATES,
  type GeneratedRunScenario,
  type ScenarioSpec,
} from "@/content/world-scenarios";
import {
  validateWorldContentRoster,
  type WorldActorContent,
  type WorldContentRoster,
  type WorldTargetContent,
} from "@/content/world-content";
import { checkPlayerHandleShape } from "@/game/identity/player-handle";
import {
  organizationRuleFailure,
  planOrganizations,
  type OwnerRef,
} from "@/game/world-generation/organizations";
import { draw, percent, range } from "@/game/world-generation/draw";
import {
  PLAYER_ACTOR_ID,
  STARTING_NETWORK_TRUST,
  type MachineState,
  type TargetState,
  type UndergroundActor,
  type UndergroundOrganization,
  type UndergroundRelationship,
} from "@/game/simulation/state/world-state";

/**
 * Seeded scenario generation (Game-First G2, #78; GAME_FIRST_REBOOT §4).
 *
 * Pure: the same seed, scenario and reserved names always give the same roster.
 * Every random draw is a named stream salted by what it decides, so changing one
 * decision (a machine count, say) does not reshuffle unrelated people.
 *
 * Rank is never an input. The generator takes no rank, and display ranks are
 * written once here and read by nothing that decides an outcome.
 *
 * A candidate is accepted only when it passes the same structural validator the
 * authored roster passes, plus three generation rules: every handle has the
 * stored shape and is unique and unreserved; every target has at least one
 * online service, so a survey can find infrastructure; and every target has a
 * player-network actor other than its owner to offer it, so an opportunity can
 * reach the player. A failed candidate is retried with a new salt, a bounded
 * number of times, and never accepted partially.
 */

export const SCENARIO_ATTEMPTS = 8;

export interface GenerateScenarioInput {
  seed: number;
  scenario: GeneratedRunScenario;
  /** Names this run may not use: the player's handle and the authored roster. */
  reservedHandles: readonly string[];
}

export interface GeneratedScenarioContent {
  actors: UndergroundActor[];
  targets: TargetState[];
  /** The player's starting ties, plus any peer-to-peer ties the generator drew. */
  relationships: UndergroundRelationship[];
  /** The organizations the owners belong to, with their motives, agendas and rivalries. */
  organizations: UndergroundOrganization[];
}

const NAME_POOL: readonly string[] = NAME_PREFIXES.flatMap((prefix) =>
  NAME_SUFFIXES.map((suffix) => `${prefix}${suffix}`),
);

/**
 * Picks `count` distinct names. Each starts at a seeded point in the pool and
 * walks forward past anything already used or reserved, so a collision never
 * loops and the same inputs always pick the same names.
 */
function pickNames(
  seed: number,
  attempt: number,
  count: number,
  reserved: ReadonlySet<string>,
): string[] {
  const taken = new Set(reserved);
  const names: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const start = Math.floor(draw(seed, "name", attempt, index) * NAME_POOL.length);
    let chosen: string | undefined;

    for (let step = 0; step < NAME_POOL.length && chosen === undefined; step += 1) {
      const candidate = NAME_POOL[(start + step) % NAME_POOL.length]!;

      if (!taken.has(candidate.toLowerCase())) {
        chosen = candidate;
      }
    }

    if (chosen === undefined) {
      throw new Error("Scenario name pool is exhausted");
    }

    taken.add(chosen.toLowerCase());
    names.push(chosen);
  }

  return names;
}

function buildMachines(
  seed: number,
  attempt: number,
  targetId: string,
  ownerIndex: number,
): MachineState[] {
  const machineCount = range(seed, [2, 3], attempt, "machines", ownerIndex);

  return Array.from({ length: machineCount }, (_, machineIndex) => {
    const template =
      MACHINE_TEMPLATES[
        range(seed, [0, MACHINE_TEMPLATES.length - 1], attempt, "machine", ownerIndex, machineIndex)
      ]!;
    const machineId = `${targetId}-m${machineIndex + 1}`;
    const serviceCount = range(seed, [1, 2], attempt, "services", ownerIndex, machineIndex);

    const services = Array.from({ length: serviceCount }, (_, serviceIndex) => {
      const serviceTemplate =
        SERVICE_TEMPLATES[
          range(
            seed,
            [0, SERVICE_TEMPLATES.length - 1],
            attempt,
            "service",
            ownerIndex,
            machineIndex,
            serviceIndex,
          )
        ]!;
      // The first service on every machine is online, so a survey always finds
      // something to read. Later services may be degraded.
      const degraded =
        serviceIndex > 0 &&
        percent(seed, attempt, "degraded", ownerIndex, machineIndex, serviceIndex) < 25;

      return {
        id: `${machineId}-s${serviceIndex + 1}`,
        label: serviceTemplate.label,
        kind: serviceTemplate.kind,
        state: degraded ? ("degraded" as const) : ("online" as const),
      };
    });

    return {
      id: machineId,
      label: template.label,
      role: template.role,
      services,
    };
  });
}

function buildRelationships(
  seed: number,
  attempt: number,
  spec: ScenarioSpec,
  actors: readonly UndergroundActor[],
): UndergroundRelationship[] {
  // The player's ties mirror what the authored roster gets: white actors start
  // trusting the player, and black actors start with none.
  const relationships: UndergroundRelationship[] = actors.map((actor) => ({
    id: `rel:${actor.id}>${PLAYER_ACTOR_ID}`,
    fromId: actor.id,
    toId: PLAYER_ACTOR_ID,
    trust: actor.network === "white" ? STARTING_NETWORK_TRUST : 0,
    fear: 0,
    grudge: 0,
    updatedWorldMinute: 0,
  }));

  // Peer-to-peer ties. No system reads these yet; they are recorded so later
  // systems share one graph rather than inventing their own.
  for (const from of actors) {
    for (const to of actors) {
      if (from.id === to.id) {
        continue;
      }

      if (percent(seed, attempt, "link", from.id, to.id) >= spec.linkPercent) {
        continue;
      }

      relationships.push({
        id: `rel:${from.id}>${to.id}`,
        fromId: from.id,
        toId: to.id,
        trust: range(seed, [10, 50], attempt, "trust", from.id, to.id),
        fear: range(seed, [0, 20], attempt, "fear", from.id, to.id),
        grudge: range(seed, [0, 15], attempt, "grudge", from.id, to.id),
        updatedWorldMinute: 0,
      });
    }
  }

  return relationships;
}

function buildCandidate(
  input: GenerateScenarioInput,
  attempt: number,
): {
  actors: WorldActorContent[];
  targets: WorldTargetContent[];
  relationships: UndergroundRelationship[];
  organizations: UndergroundOrganization[];
} {
  const { seed, scenario, reservedHandles } = input;
  const spec = GENERATED_SCENARIO_SPECS[scenario];
  const reserved = new Set(reservedHandles.map((handle) => handle.toLowerCase()));
  const names = pickNames(seed, attempt, spec.owners + spec.brokers, reserved);

  const ownerRefs: OwnerRef[] = Array.from({ length: spec.owners }, (_, owner) => ({
    id: `gen-${owner + 1}`,
    targetId: `gen-${owner + 1}`,
  }));
  const organizations = planOrganizations(seed, attempt, spec, ownerRefs);
  const organizationOf = new Map<string, UndergroundOrganization>();

  for (const org of organizations) {
    for (const memberId of org.memberIds) {
      organizationOf.set(memberId, org);
    }
  }

  const actors: WorldActorContent[] = [];
  const targets: WorldTargetContent[] = [];

  for (let owner = 0; owner < spec.owners; owner += 1) {
    const id = ownerRefs[owner]!.id;
    const org = organizationOf.get(id)!;
    const profile = OWNER_PROFILES[owner % OWNER_PROFILES.length]!;
    const rank = range(seed, spec.rank, attempt, "rank", owner);
    const skill = range(seed, spec.skill, attempt, "skill", owner);

    const actor: UndergroundActor = {
      id,
      handle: names[owner]!,
      rank,
      // A member's network is its organization's: the organization is the
      // identity that decides which board its people post on.
      network: org.network,
      skill,
      defense: range(seed, spec.defense, attempt, "defense", owner),
      discretion: range(seed, spec.discretion, attempt, "discretion", owner),
      activity: range(seed, spec.activity, attempt, "activity", owner),
      targetId: id,
      organizationId: org.id,
    };

    const target: TargetState = {
      id,
      handle: actor.handle,
      rank,
      machines: buildMachines(seed, attempt, id, owner),
      hidden: {
        operationalSkill: skill,
        // The hidden sponsor is the owning organization (G2 #78 P2).
        sponsorId: org.id,
        note: "Generated authority truth; infrastructure stays hidden until supported by evidence.",
      },
    };

    actors.push({ archetype: profile.actor, actor });
    targets.push({ archetype: profile.target, target });
  }

  for (let broker = 0; broker < spec.brokers; broker += 1) {
    const index = spec.owners + broker;

    actors.push({
      archetype: "broker",
      actor: {
        id: `gen-broker-${broker + 1}`,
        handle: names[index]!,
        rank: range(seed, spec.rank, attempt, "rank", "broker", broker),
        network: "white",
        skill: range(seed, spec.skill, attempt, "skill", "broker", broker),
        defense: range(seed, spec.defense, attempt, "defense", "broker", broker),
        discretion: range(seed, spec.discretion, attempt, "discretion", "broker", broker),
        activity: range(seed, spec.activity, attempt, "activity", "broker", broker),
      },
    });
  }

  const actorList = actors.map((entry) => entry.actor);

  return {
    actors,
    targets,
    relationships: buildRelationships(seed, attempt, spec, actorList),
    organizations,
  };
}

/** The first rule a candidate breaks, or null when it satisfies every rule. */
function firstFailure(
  candidate: {
    actors: WorldActorContent[];
    targets: WorldTargetContent[];
    organizations: UndergroundOrganization[];
  },
  reserved: ReadonlySet<string>,
  seed: number,
  scenario: GeneratedRunScenario,
): string | null {
  const roster: WorldContentRoster = {
    id: `generated-${scenario}-${seed}`,
    actors: candidate.actors,
    targets: candidate.targets,
  };

  try {
    validateWorldContentRoster(roster);
  } catch (error) {
    return error instanceof Error ? error.message : "structural validation failed";
  }

  const organizationFailure = organizationRuleFailure(
    candidate.organizations,
    candidate.actors.map((entry) => entry.actor),
    candidate.targets.map((entry) => entry.target),
  );

  if (organizationFailure !== null) {
    return organizationFailure;
  }

  // One name per person. An owner's target carries the owner's name (the
  // validator above requires it), so the actor list is the whole roster of names.
  const handles = candidate.actors.map((entry) => entry.actor.handle);
  const folded = new Set<string>();

  for (const handle of handles) {
    const key = handle.toLowerCase();

    if (checkPlayerHandleShape(handle) !== null) {
      return `handle ${handle} does not have the stored shape`;
    }

    if (reserved.has(key) || folded.has(key)) {
      return `handle ${handle} is reused or reserved`;
    }

    folded.add(key);
  }

  for (const { target } of candidate.targets) {
    const hasOnlineService = target.machines.some((machine) =>
      machine.services.some((service) => service.state === "online"),
    );

    if (!hasOnlineService) {
      return `target ${target.id} has nothing a survey can read`;
    }

    const reachable = candidate.actors.some(
      ({ actor }) => actor.network === "white" && actor.targetId !== target.id,
    );

    if (!reachable) {
      return `target ${target.id} has no player-network actor to offer it`;
    }
  }

  return null;
}

/**
 * Generates the people, networks, infrastructure and starting ties for a
 * generated scenario. Throws only if every bounded attempt fails, which the
 * tests exercise across many seeds and which would indicate a broken spec.
 */
export function generateScenarioContent(
  input: GenerateScenarioInput,
): GeneratedScenarioContent {
  const reserved = new Set(input.reservedHandles.map((handle) => handle.toLowerCase()));
  let lastFailure = "no attempt ran";

  for (let attempt = 0; attempt < SCENARIO_ATTEMPTS; attempt += 1) {
    const candidate = buildCandidate(input, attempt);
    const failure = firstFailure(candidate, reserved, input.seed, input.scenario);

    if (failure === null) {
      return {
        actors: candidate.actors.map((entry) => entry.actor),
        targets: candidate.targets.map((entry) => entry.target),
        relationships: candidate.relationships,
        organizations: candidate.organizations,
      };
    }

    lastFailure = failure;
  }

  throw new Error(
    `Could not generate a solvable ${input.scenario} scenario for seed ${input.seed}: ${lastFailure}`,
  );
}
