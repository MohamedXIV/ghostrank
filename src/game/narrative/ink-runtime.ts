import { Story } from "inkjs";
import { Compiler } from "inkjs/full";
import {
  NARRATIVE_STORIES, type NarrativeStoryId, type NarrativeVariant,
} from "@/content/narrative/stories";

export interface InkNarrativeFrame {
  text: string;
  choices: { index: number; text: string }[];
}

/** Engine instances are disposable; authoring bytecode is immutable and cached. */
const compiled = new Map<NarrativeStoryId, string>();
function freshStory(id: NarrativeStoryId): Story {
  const source = NARRATIVE_STORIES[id];
  let json = compiled.get(id);
  if (!json) {
    json = new Compiler(source.source).Compile().ToJson();
    compiled.set(id, json);
  }
  return new Story(json);
}

/**
 * Replaying a choice from a pinned v1 source, rather than accepting a mutable
 * Ink-state blob, makes replay deterministic and prevents saves injecting
 * arbitrary variables, external bindings or a new content version.
 */
export function renderInkNarrative(
  id: NarrativeStoryId,
  variant: NarrativeVariant,
  selectedIndex?: number,
): InkNarrativeFrame {
  const story = freshStory(id);
  if (id === "g9.lead-dilemma.v1") {
    story.ChoosePathString(variant === "mapped" ? "mapped" : "unmapped");
  } else if (variant !== "npc") {
    throw new Error("invalid narrative variant");
  }

  const intro = story.ContinueMaximally().trim();
  const options = story.currentChoices.map((choice) => ({
    index: choice.index, text: choice.text.trim(),
  }));
  if (selectedIndex === undefined) return { text: intro, choices: options };
  if (!Number.isSafeInteger(selectedIndex) ||
      !options.some((choice) => choice.index === selectedIndex)) {
    throw new Error("invalid authored choice");
  }
  story.ChooseChoiceIndex(selectedIndex);
  const reply = story.ContinueMaximally().trim();
  return { text: [intro, reply].filter(Boolean).join("\n"), choices: [] };
}
