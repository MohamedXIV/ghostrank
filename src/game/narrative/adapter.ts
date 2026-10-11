import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  NarrativeSession, NarrativeRunState, WorldState,
} from "@/game/simulation/state/world-state";
import { renderInkNarrative } from "@/game/narrative/ink-runtime";
import {
  NARRATIVE_STORIES, type NarrativeStoryId, type NarrativeVariant,
} from "@/content/narrative/stories";

export interface PlayerNarrative {
  id: string;
  storyId: NarrativeStoryId;
  version: 1;
  subjectLabel: string;
  text: string;
  choices: { id: string; index: number; text: string; costLabel: string }[];
  finished: boolean;
}
type StartResult =
  | { ok: true; events: SimulationEvent[] }
  | { ok: false; error: string; events: [] };
const failure = (error: string): StartResult => ({ ok: false, error, events: [] });

/** Explicit allowlist: a known NPC handle or a truly player-visible lead. */
function authorizedSubject(
  world: Readonly<WorldState>,
  id: NarrativeStoryId,
  refId: string,
): { label: string; variant: NarrativeVariant } | null {
  if (id === "g9.npc-relay.v1") {
    const actor = world.underground.actors.find((a) => a.id === refId);
    return actor ? { label: actor.handle, variant: "npc" } : null;
  }
  if (id !== "g9.lead-dilemma.v1") return null;
  const lead = world.opportunities?.find((l) => l.id === refId);
  if (!lead || (lead.status !== "open" && lead.status !== "mapped") ||
      world.worldMinute > lead.expiresWorldMinute) return null;
  const incident = world.underground.incidents.find((i) => i.id === lead.incidentId);
  if (!incident) return null;
  if (lead.origin === "public-incident") {
    if (!incident.public || lead.sourceId !== incident.id) return null;
  } else {
    const message = world.underground.messages.find((m) => m.id === lead.sourceId);
    const rumor = world.underground.rumors.find((r) => r.id === message?.rumorId);
    if (!message?.read || !rumor?.claim || rumor.sourceId !== incident.id ||
        rumor.relayId !== message.fromId) return null;
  }
  return {
    label: lead.origin === "relay-report" ? "Unverified relay" : "Public incident",
    variant: lead.status === "mapped" ? "mapped" : "unmapped",
  };
}

function selectIntent(
  scene: NarrativeSession,
  index: number,
): SimulationCommand | null {
  if (scene.storyId === "g9.npc-relay.v1") return null;
  if (scene.variant === "unmapped") {
    if (index === 0) return { type: "investigateLead", leadId: scene.refId };
    if (index === 1) return { type: "resolveLead", leadId: scene.refId, approach: "ignore" };
  }
  if (scene.variant === "mapped") {
    const approaches = ["disclose", "trade", "exploit", "ignore"] as const;
    const approach = approaches[index];
    if (approach) return { type: "resolveLead", leadId: scene.refId, approach };
  }
  return null;
}
function choiceKey(scene: NarrativeSession, index: number): string {
  return `${scene.id}:choice:${index}`;
}
function readFrame(scene: NarrativeSession) {
  return renderInkNarrative(scene.storyId, scene.variant, scene.selectedIndex);
}
function validateSession(world: Readonly<WorldState>, scene: NarrativeSession): boolean {
  return NARRATIVE_STORIES[scene.storyId]?.version === scene.version &&
    Boolean(authorizedSubject(world, scene.storyId, scene.refId));
}

export function startNarrative(
  world: WorldState, storyId: NarrativeStoryId, refId: string,
): StartResult {
  if (!NARRATIVE_STORIES[storyId]) return failure("STORY_NOT_FOUND");
  const subject = authorizedSubject(world, storyId, refId);
  if (!subject) return failure("STORY_SOURCE_UNAVAILABLE");
  // Never open an author-supplied arbitrary knot or a raw Ink string.
  const frame = renderInkNarrative(storyId, subject.variant);
  if (!frame.choices.length) return failure("STORY_HAS_NO_CHOICES");

  const state: NarrativeRunState = world.narrative ?? { nextSequence: 1 };
  const id = `scene:${state.nextSequence}`;
  state.nextSequence++;
  state.current = { id, storyId, version: 1, refId, variant: subject.variant,
    openedWorldMinute: world.worldMinute };
  world.narrative = state;
  return { ok: true, events: [{
    type: "NarrativeOpened", sceneId: id, worldMinute: world.worldMinute,
  }] };
}

export interface NarrativeChoicePlan {
  intent: SimulationCommand | null;
  scene: NarrativeSession;
  index: number;
}

/** Verify against the current Ink choice list and real source, not client IDs. */
export function planNarrativeChoice(
  world: Readonly<WorldState>,
  sceneId: string,
  choiceId: string,
): NarrativeChoicePlan | { error: string } {
  const scene = world.narrative?.current;
  if (!scene || scene.id !== sceneId || scene.selectedIndex !== undefined ||
      !validateSession(world, scene)) return { error: "STORY_SESSION_INVALID" };
  const choices = readFrame(scene).choices;
  const selected = choices.find((choice) => choiceKey(scene, choice.index) === choiceId);
  if (!selected) return { error: "STORY_CHOICE_INVALID" };
  const intent = selectIntent(scene, selected.index);
  if (scene.storyId === "g9.lead-dilemma.v1" && !intent) {
    return { error: "STORY_INTENT_INVALID" };
  }
  return { intent, scene, index: selected.index };
}

export function commitNarrativeChoice(
  world: WorldState, plan: NarrativeChoicePlan,
): SimulationEvent {
  const session = world.narrative?.current;
  if (!session || session.id !== plan.scene.id || session.selectedIndex !== undefined) {
    throw new Error("narrative commit without validated pending scene");
  }
  session.selectedIndex = plan.index;
  return { type: "NarrativeChoiceRecorded", sceneId: session.id,
    choiceIndex: plan.index, worldMinute: world.worldMinute };
}

/**
 * Presentation uses authorized, explicit labels and authored Ink text only.
 * No WorldState/hidden truth/Ink variable bridge reaches player UI.
 */
export function projectNarrative(world: Readonly<WorldState>): PlayerNarrative | null {
  const scene = world.narrative?.current;
  if (!scene || NARRATIVE_STORIES[scene.storyId]?.version !== scene.version) return null;
  // A finished scene remains readable, even if its action resolved the lead.
  const subject = scene.selectedIndex === undefined
    ? authorizedSubject(world, scene.storyId, scene.refId)
    : scene.storyId === "g9.npc-relay.v1"
      ? authorizedSubject(world, scene.storyId, scene.refId)
      : { label: "Incident outcome", variant: scene.variant };
  if (!subject) return null;
  try {
    const frame = readFrame(scene);
    return {
      id: scene.id, storyId: scene.storyId, version: 1,
      subjectLabel: subject.label, text: frame.text,
      finished: scene.selectedIndex !== undefined,
      choices: frame.choices.map((choice) => ({
        id: choiceKey(scene, choice.index), index: choice.index, text: choice.text,
        costLabel: scene.storyId === "g9.lead-dilemma.v1"
          ? "No extra dialogue minutes; consequences use the existing lead command"
          : "No clock cost",
      })),
    };
  } catch {
    return null;
  }
}
