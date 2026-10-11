import type { PlayerNarrative } from "@/game/narrative/adapter";

/** Shared player-safe narrative readout; no access to hidden WorldState. */
export function formatNarrativeTerminalView(scene: PlayerNarrative | null | undefined): string {
  if (!scene) return "NO ACTIVE CONVERSATION // talk <actor-id> or story lead <lead-id>";
  const header = [
    "NARRATIVE // " + scene.subjectLabel,
    scene.storyId + " // version " + scene.version + " // " + scene.id,
    scene.text,
  ];
  if (scene.finished) return [...header, "CONVERSATION CONCLUDED"].join("\n");
  return [
    ...header,
    "CHOICES // 0 additional narrative minutes",
    ...scene.choices.map((c) => "  " + c.index + ". " + c.text +
      " // story choose " + scene.id + " " + c.id),
  ].join("\n");
}
