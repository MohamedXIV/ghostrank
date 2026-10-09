import {
  ARCHETYPE_TEMPERAMENT,
  GENERATED_SCENARIO_SPECS,
  HACKER_ARCHETYPE_WEIGHTS,
  MACHINE_TEMPLATES,
  MOTIVE_AGENDAS,
  TINKERER_MODELS,
  NAME_PREFIXES,
  NAME_SUFFIXES,
  ORGANIZATION_HEADS,
  ORGANIZATION_KIND_TAILS,
  ORGANIZATION_KINDS,
  ORGANIZATION_MOTIVES,
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
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { OFFER_WINDOW_MINUTES } from "@/game/simulation/systems/underground";
import {
  PLAYER_ACTOR_ID,
  STARTING_NETWORK_TRUST,
  type HackerArchetype,
  type UndergroundContract,
  type MachineState,
  type OrganizationKind,
  type Temperament,
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
  /** Organizations that hold infrastructure and employ owners (D066). */
  organizations: UndergroundOrganization[];
  /** Recon-report offers from white brokers, waiting at the start of the run (D069). */
  contracts: UndergroundContract[];
}

/** Chance that two organizations start as rivals; any organization left without one is given one. */
const RIVAL_PERCENT = 50;
/** Chance that a broker belongs to an organization rather than working alone. */
const BROKER_MEMBER_PERCENT = 50;

const NAME_POOL: readonly string[] = NAME_PREFIXES.flatMap((prefix) =>
  NAME_SUFFIXES.map((suffix) => `${prefix}${suffix}`),
);

function draw(seed: number, ...parts: Array<string | number>): number {
  return hashUnit(seed, ...parts);
}

/** An integer in the inclusive range `[low, high]`. */
function range(
  seed: number,
  [low, high]: readonly [number, number],
  ...parts: Array<string | number>
): number {
  return low + Math.floor(draw(seed, ...parts) * (high - low + 1));
}

/** A percentage in `[0, 100)`, compared against percent thresholds. */
function percent(seed: number, ...parts: Array<string | number>): number {
  return draw(seed, ...parts) * 100;
}

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

/** Picks a value with probability proportional to its weight, from one seeded draw. */
function pickWeighted<T>(
  seed: number,
  table: ReadonlyArray<{ value: T; weight: number }>,
  ...parts: Array<string | number>
): T {
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  let point = draw(seed, ...parts) * total;

  for (const entry of table) {
    if (point < entry.weight) {
      return entry.value;
    }

    point -= entry.weight;
  }

  return table[table.length - 1]!.value;
}

/**
 * Public identities for `count` organizations: a kind and a name made of a head
 * and that kind's tail. Each organization starts at a seeded point and walks
 * forward past any name already used, so the same inputs pick the same names.
 */
function pickOrganizationIdentities(
  seed: number,
  attempt: number,
  count: number,
): Array<{ name: string; kind: OrganizationKind }> {
  const taken = new Set<string>();
  const headCount = ORGANIZATION_HEADS.length;

  return Array.from({ length: count }, (_, index) => {
    const kind =
      ORGANIZATION_KINDS[
        range(seed, [0, ORGANIZATION_KINDS.length - 1], attempt, "org-kind", index)
      ]!;
    const tails = ORGANIZATION_KIND_TAILS[kind];
    const start = Math.floor(draw(seed, attempt, "org-name", index) * headCount * tails.length);

    for (let step = 0; step < headCount * tails.length; step += 1) {
      const combination = (start + step) % (headCount * tails.length);
      const head = ORGANIZATION_HEADS[combination % headCount]!;
      const tail = tails[Math.floor(combination / headCount) % tails.length]!;
      const name = `${head} ${tail}`;

      if (!taken.has(name.toLowerCase())) {
        taken.add(name.toLowerCase());
        return { name, kind };
      }
    }

    throw new Error("Organization name pool is exhausted");
  });
}

/** Organizations with a hidden motive and the agenda that motive presses for. Rivals come later. */
function buildOrganizations(
  seed: number,
  attempt: number,
  count: number,
): UndergroundOrganization[] {
  return pickOrganizationIdentities(seed, attempt, count).map((identity, index) => {
    const motive = pickWeighted(seed, ORGANIZATION_MOTIVES, attempt, "motive", index);
    const agenda = pickWeighted(seed, MOTIVE_AGENDAS[motive], attempt, "agenda", index);

    return {
      id: `org-${index + 1}`,
      name: identity.name,
      kind: identity.kind,
      motive,
      agenda,
      rivalIds: [],
    };
  });
}

/**
 * Symmetric rivalries. Each pair is a rivalry with a seeded chance, then any
 * organization with no rival is paired with the next one, so no organization
 * stands alone when there is another to fight.
 */
function assignRivalries(
  seed: number,
  attempt: number,
  organizations: UndergroundOrganization[],
): void {
  const link = (left: UndergroundOrganization, right: UndergroundOrganization) => {
    if (!left.rivalIds.includes(right.id)) {
      left.rivalIds.push(right.id);
    }

    if (!right.rivalIds.includes(left.id)) {
      right.rivalIds.push(left.id);
    }
  };

  for (let left = 0; left < organizations.length; left += 1) {
    for (let right = left + 1; right < organizations.length; right += 1) {
      if (percent(seed, attempt, "rival", left, right) < RIVAL_PERCENT) {
        link(organizations[left]!, organizations[right]!);
      }
    }
  }

  if (organizations.length >= 2) {
    organizations.forEach((organization, index) => {
      if (organization.rivalIds.length === 0) {
        link(organization, organizations[(index + 1) % organizations.length]!);
      }
    });
  }
}

/** A generated hacker's archetype, personality and, for a tinkerer, its assistant. */
interface HackerDraw {
  hackerArchetype: HackerArchetype;
  temperament: Temperament;
  modelId?: string;
}

/**
 * Draws a hacker's archetype with its scene's weights, then its temperament from
 * that archetype's ranges. Every draw is salted by its role, so the same person
 * keeps its archetype when another person's draws change (D068).
 */
function drawHacker(
  seed: number,
  scenario: GeneratedRunScenario,
  attempt: number,
  ...parts: Array<string | number>
): HackerDraw {
  const hackerArchetype = pickWeighted(
    seed,
    HACKER_ARCHETYPE_WEIGHTS[scenario],
    attempt,
    "hacker",
    ...parts,
  );
  const ranges = ARCHETYPE_TEMPERAMENT[hackerArchetype];
  const temperament: Temperament = {
    aggression: range(seed, ranges.aggression, attempt, "aggression", ...parts),
    caution: range(seed, ranges.caution, attempt, "caution", ...parts),
    greed: range(seed, ranges.greed, attempt, "greed", ...parts),
  };

  return {
    hackerArchetype,
    temperament,
    ...(hackerArchetype === "tinkerer"
      ? {
          modelId:
            TINKERER_MODELS[
              range(seed, [0, TINKERER_MODELS.length - 1], attempt, "model", ...parts)
            ],
        }
      : {}),
  };
}

function hackerFields(draw: HackerDraw) {
  return {
    hackerArchetype: draw.hackerArchetype,
    temperament: draw.temperament,
    ...(draw.modelId === undefined ? {} : { modelId: draw.modelId }),
  };
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

/**
 * Recon-report offers from white brokers that the player already holds at the
 * start (D069). A one-service report is solvable with the starting kit: one
 * survey and one inspection (the playthrough test proves it for every seed). A
 * broker never offers work against its own organization's infrastructure, and
 * an `undercut` broker's offer goes to a rival when one exists, as live offers do.
 */
function buildOpeningContracts(
  seed: number,
  attempt: number,
  count: number,
  actors: WorldActorContent[],
  targets: WorldTargetContent[],
  organizations: UndergroundOrganization[],
): UndergroundContract[] {
  const brokers = actors
    .map(({ actor }) => actor)
    .filter((actor) => actor.targetId === undefined && actor.network === "white");
  const contracts: UndergroundContract[] = [];
  const used = new Set<string>();

  for (let index = 0; index < count; index += 1) {
    const free = brokers.filter((actor) => !used.has(actor.id));

    if (free.length === 0) {
      break;
    }

    const broker = free[range(seed, [0, free.length - 1], attempt, "opening-broker", index)]!;
    used.add(broker.id);

    const eligible = targets
      .map(({ target }) => target)
      .filter((target) => target.organizationId !== broker.organizationId);

    if (eligible.length === 0) {
      break;
    }

    const organization = organizations.find((entry) => entry.id === broker.organizationId);
    const rivals =
      organization?.agenda === "undercut"
        ? eligible.filter(
            (target) =>
              target.organizationId !== undefined &&
              organization.rivalIds.includes(target.organizationId),
          )
        : [];
    const pool = rivals.length > 0 ? rivals : eligible;

    const target = pool[range(seed, [0, pool.length - 1], attempt, "opening-target", index)]!;

    contracts.push({
      id: `contract:${index + 1}`,
      issuerId: broker.id,
      targetId: target.id,
      objective: "recon-report",
      requiredServices: 1,
      status: "offered",
      offeredWorldMinute: 0,
      expiresWorldMinute: OFFER_WINDOW_MINUTES,
    });
  }

  return contracts;
}

function buildCandidate(
  input: GenerateScenarioInput,
  attempt: number,
): {
  actors: WorldActorContent[];
  targets: WorldTargetContent[];
  relationships: UndergroundRelationship[];
  organizations: UndergroundOrganization[];
  contracts: UndergroundContract[];
} {
  const { seed, scenario, reservedHandles } = input;
  const spec = GENERATED_SCENARIO_SPECS[scenario];
  const reserved = new Set(reservedHandles.map((handle) => handle.toLowerCase()));
  const names = pickNames(seed, attempt, spec.owners + spec.brokers, reserved);
  const organizations = buildOrganizations(seed, attempt, spec.organizations);
  assignRivalries(seed, attempt, organizations);

  const actors: WorldActorContent[] = [];
  const targets: WorldTargetContent[] = [];

  for (let owner = 0; owner < spec.owners; owner += 1) {
    const id = `gen-${owner + 1}`;
    const profile = OWNER_PROFILES[owner % OWNER_PROFILES.length]!;
    const network =
      percent(seed, attempt, "network", owner) < spec.blackSharePercent ? "black" : "white";
    const rank = range(seed, spec.rank, attempt, "rank", owner);
    const skill = range(seed, spec.skill, attempt, "skill", owner);

    // Each organization gets one owner first, so none is empty; the rest are drawn.
    const home =
      owner < organizations.length
        ? organizations[owner]!
        : organizations[range(seed, [0, organizations.length - 1], attempt, "member", owner)]!;
    const hacker = drawHacker(seed, scenario, attempt, "owner", owner);

    const actor: UndergroundActor = {
      id,
      handle: names[owner]!,
      rank,
      network,
      skill,
      defense: range(seed, spec.defense, attempt, "defense", owner),
      discretion: range(seed, spec.discretion, attempt, "discretion", owner),
      activity: range(seed, spec.activity, attempt, "activity", owner),
      targetId: id,
      organizationId: home.id,
      ...hackerFields(hacker),
    };

    const target: TargetState = {
      id,
      handle: actor.handle,
      rank,
      machines: buildMachines(seed, attempt, id, owner),
      organizationId: home.id,
      hidden: {
        operationalSkill: skill,
        note: "Generated authority truth; infrastructure stays hidden until supported by evidence.",
      },
    };

    actors.push({ archetype: profile.actor, actor });
    targets.push({ archetype: profile.target, target });
  }

  for (let broker = 0; broker < spec.brokers; broker += 1) {
    const index = spec.owners + broker;

    // A broker may belong to an organization, or work alone.
    const member =
      percent(seed, attempt, "broker-member", broker) < BROKER_MEMBER_PERCENT
        ? organizations[range(seed, [0, organizations.length - 1], attempt, "broker-org", broker)]
        : undefined;

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
        ...(member === undefined ? {} : { organizationId: member.id }),
        ...hackerFields(drawHacker(seed, scenario, attempt, "broker", broker)),
      },
    });
  }

  const actorList = actors.map((entry) => entry.actor);

  return {
    actors,
    targets,
    relationships: buildRelationships(seed, attempt, spec, actorList),
    organizations,
    contracts: buildOpeningContracts(
      seed,
      attempt,
      spec.openingContracts,
      actors,
      targets,
      organizations,
    ),
  };
}

/** The first rule a candidate breaks, or null when it satisfies every rule. */
function firstFailure(
  candidate: {
    actors: WorldActorContent[];
    targets: WorldTargetContent[];
    organizations: UndergroundOrganization[];
    contracts: UndergroundContract[];
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

  const organizationIds = new Set(candidate.organizations.map((entry) => entry.id));

  if (candidate.organizations.length !== GENERATED_SCENARIO_SPECS[scenario].organizations) {
    return "the organization count does not match its spec";
  }

  for (const { actor } of candidate.actors) {
    if (actor.organizationId !== undefined && !organizationIds.has(actor.organizationId)) {
      return `actor ${actor.id} belongs to a missing organization`;
    }
  }

  for (const { target } of candidate.targets) {
    const owner = candidate.actors.find(({ actor }) => actor.targetId === target.id)?.actor;

    if (owner === undefined || target.organizationId !== owner.organizationId) {
      return `target ${target.id} is not held by its owner's organization`;
    }
  }

  if (candidate.contracts.length !== GENERATED_SCENARIO_SPECS[scenario].openingContracts) {
    return "the opening offer count does not match its spec";
  }

  const issuers = new Set<string>();

  for (const contract of candidate.contracts) {
    const issuer = candidate.actors.find(({ actor }) => actor.id === contract.issuerId)?.actor;
    const target = candidate.targets.find(({ target }) => target.id === contract.targetId)?.target;

    if (issuer === undefined || issuer.targetId !== undefined || issuer.network !== "white") {
      return `opening offer ${contract.id} is not from a white broker`;
    }

    if (target === undefined || target.organizationId === issuer.organizationId) {
      return `opening offer ${contract.id} asks for its own organization's infrastructure`;
    }

    if (issuers.has(issuer.id)) {
      return `broker ${issuer.id} makes two opening offers`;
    }

    issuers.add(issuer.id);

    const services = target.machines.reduce(
      (sum, machine) => sum + machine.services.filter((service) => service.state === "online").length,
      0,
    );

    if ((contract.requiredServices ?? 0) < 1 || (contract.requiredServices ?? 0) > services) {
      return `opening offer ${contract.id} asks for more services than its target has online`;
    }
  }

  for (const organization of candidate.organizations) {
    const ownsInfrastructure = candidate.actors.some(
      ({ actor }) => actor.organizationId === organization.id && actor.targetId !== undefined,
    );

    if (!ownsInfrastructure) {
      return `organization ${organization.id} holds no infrastructure`;
    }

    if (candidate.organizations.length >= 2 && organization.rivalIds.length === 0) {
      return `organization ${organization.id} has no rival`;
    }

    for (const rivalId of organization.rivalIds) {
      const rival = candidate.organizations.find((entry) => entry.id === rivalId);

      if (rival === undefined || rival.id === organization.id) {
        return `organization ${organization.id} names an invalid rival`;
      }

      if (!rival.rivalIds.includes(organization.id)) {
        return `rivalry between ${organization.id} and ${rival.id} is not symmetric`;
      }
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
        contracts: candidate.contracts,
      };
    }

    lastFailure = failure;
  }

  throw new Error(
    `Could not generate a solvable ${input.scenario} scenario for seed ${input.seed}: ${lastFailure}`,
  );
}
