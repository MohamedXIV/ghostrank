import type {
  PhysicalSignalKind,
  UndergroundIncidentOutcome,
} from "@/game/simulation/state/world-state";

export type IncidentCopySurface = "feed" | "message" | "forum";

type IncidentTemplate = (actor: string, counterpart: string) => string;

function stableVariantIndex(key: string, count: number): number {
  if (count <= 1) {
    return 0;
  }

  // Presentation-only stable hash. This is deliberately not simulation RNG:
  // it cannot change world truth, event order, or save/replay behavior.
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0) % count;
}

function pick<T>(key: string, variants: readonly T[]): T {
  return variants[stableVariantIndex(key, variants.length)] ?? variants[0];
}

const INCIDENT_COPY: Record<
  IncidentCopySurface,
  Record<UndergroundIncidentOutcome, readonly IncidentTemplate[]>
> = {
  feed: {
    succeeded: [
      (actor, counterpart) => `${actor} got through ${counterpart}'s defenses`,
      (actor, counterpart) => `${counterpart}'s perimeter gave way to ${actor}`,
      (actor, counterpart) => `${actor} slipped past ${counterpart}'s outer line`,
      (actor, counterpart) => `${actor} found a way through ${counterpart}`,
    ],
    repelled: [
      (actor, counterpart) => `${counterpart} turned ${actor} away`,
      (actor, counterpart) => `${actor} hit ${counterpart}'s defenses and bounced`,
      (actor, counterpart) => `${counterpart} shut the door on ${actor}`,
      (actor, counterpart) => `${actor} came up empty against ${counterpart}`,
    ],
  },
  message: {
    succeeded: [
      (actor, counterpart) => `word is ${actor} got through ${counterpart}`,
      (actor, counterpart) => `someone says ${counterpart} let ${actor} slip through`,
      (actor, counterpart) => `heard ${actor} found a hole around ${counterpart}`,
      (actor, counterpart) => `the whisper is ${actor} beat ${counterpart}'s outer line`,
    ],
    repelled: [
      (actor, counterpart) => `word is ${counterpart} stopped ${actor}`,
      (actor, counterpart) => `someone says ${actor} got nowhere with ${counterpart}`,
      (actor, counterpart) => `heard ${counterpart} pushed ${actor} back`,
      (actor, counterpart) => `the whisper is ${actor} bounced off ${counterpart}`,
    ],
  },
  forum: {
    succeeded: [
      (actor, counterpart) => `${actor} got through ${counterpart}; that will travel`,
      (actor, counterpart) => `${counterpart} just gave ${actor} a story to tell`,
      (actor, counterpart) => `call it for ${actor}: ${counterpart} was breached`,
      (actor, counterpart) => `${actor} found daylight through ${counterpart}`,
    ],
    repelled: [
      (actor, counterpart) => `${counterpart} held; ${actor} did not`,
      (actor, counterpart) => `${actor} tested ${counterpart} and got sent home`,
      (actor, counterpart) => `${counterpart} kept ${actor} outside`,
      (actor, counterpart) => `call it for ${counterpart}: ${actor} was stopped`,
    ],
  },
};

const FORUM_CONTRACT_COPY = [
  (target: string) => `clean work on the ${target} job gets a vouch`,
  (target: string) => `the ${target} job landed; credit where it is due`,
  (target: string) => `someone delivered on ${target}; that counts`,
  (target: string) => `the ${target} work closed without excuses`,
] as const;

const FORUM_UNMASKING_COPY = [
  (unmasker: string) => `unmasking is a line nobody crosses — ${unmasker} did`,
  (unmasker: string) => `${unmasker} burned a real identity; the board noticed`,
  (unmasker: string) => `nobody forgets an unmasking — especially ${unmasker}'s`,
  (unmasker: string) => `${unmasker} dragged a handle into daylight; bad precedent`,
] as const;

const PHYSICAL_COPY: Record<PhysicalSignalKind, readonly string[]> = {
  "strange-vehicle": [
    "the same unfamiliar vehicle has been sitting where it can see the entrance",
    "a vehicle you do not recognise keeps finding a view of the building",
  ],
  footsteps: [
    "footsteps stopped outside long enough to listen",
    "someone paused outside, then moved on without knocking",
  ],
  knock: [
    "someone knocked once and left before you reached the door",
    "a single knock came from the door; whoever made it did not wait",
  ],
  "unknown-call": [
    "an unknown caller rang and said nothing",
    "a number you do not know called, listened, and disconnected",
  ],
  "door-camera-motion": [
    "the door camera caught movement that never reached the door",
    "the camera saw someone cross the landing twice without approaching",
  ],
  outage: [
    "power dropped without the rest of the block going dark",
    "your room lost power while the nearby windows stayed lit",
  ],
  "unusual-connectivity": [
    "your local connection changed shape for a few minutes",
    "the local link took an unfamiliar route and then returned to normal",
  ],
  "unexpected-delivery": [
    "a delivery appeared that nobody here ordered",
    "a package showed up with no order you recognise behind it",
  ],
  "nearby-activity": [
    "there is too much quiet activity close to the room",
    "people keep lingering nearby without an obvious reason to be there",
  ],
};

export function describeIncidentCopy(
  surface: IncidentCopySurface,
  recordId: string,
  actorHandle: string,
  counterpartHandle: string,
  outcome: string,
): string {
  const normalizedOutcome: UndergroundIncidentOutcome =
    outcome === "succeeded" ? "succeeded" : "repelled";
  const variants = INCIDENT_COPY[surface][normalizedOutcome];
  const template = pick(
    `${surface}:${recordId}:${normalizedOutcome}`,
    variants,
  );

  return template(actorHandle, counterpartHandle);
}

export function describeForumContractCopy(
  postId: string,
  targetHandle: string,
): string {
  return pick(`forum-contract:${postId}`, FORUM_CONTRACT_COPY)(targetHandle);
}

export function describeForumUnmaskingCopy(
  postId: string,
  unmaskerHandle: string,
): string {
  return pick(`forum-unmask:${postId}`, FORUM_UNMASKING_COPY)(unmaskerHandle);
}

export function describePhysicalSignalCopy(
  signalId: string,
  kind: string,
): string {
  const variants = PHYSICAL_COPY[kind as PhysicalSignalKind];

  if (!variants) {
    return "something outside the network does not fit";
  }

  return pick(`physical:${signalId}:${kind}`, variants);
}
