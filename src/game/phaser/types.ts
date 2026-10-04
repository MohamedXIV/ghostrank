import type { HousingAnonymity } from "@/content/housing-catalog";

/**
 * Phase 6 P0 — the physical bridge *contracts*. These were declared in Phase 0
 * and fed by nothing until now: `RoomPresentation` had no producer anywhere in
 * `src`, and `PhysicalIntent` had exactly one shape, so the room could only
 * wait. The translation lives in `bridge.ts`, keeping this file types-only.
 *
 * The rule these shapes exist to keep (`AGENTS.md`): Phaser may *request* a
 * physical action and may *render* simulation facts, but it decides nothing. A
 * presentation is therefore a pure read of derived presence, and an intent maps
 * onto the **same typed commands the Terminal and the Market already emit** —
 * relocating from the room and relocating via `rent <id>` are one path, never
 * two implementations of "moving house".
 */

/** What the physical scene is allowed to know: names and one minute. */
export interface RoomPresentation {
  locationId: string;
  label: string;
  /** A coarse band rendered as fiction, never a numeric stat. */
  anonymity: HousingAnonymity;
  /** True when the player holds the keys here (vs. the baseline room). */
  leased: boolean;
  worldMinute: number;
  /**
   * Cosmetic flag: this place took time to reach. The scene may use it for
   * atmosphere; the consequence itself stays in the simulation.
   */
  distant: boolean;
  /**
   * Presentation only, kept from the Phase 0 contract. Not simulation truth:
   * P0 does not simulate movement *within* a room, so the scene owns its own
   * avatar position locally and this stays a label.
   */
  avatarPosition: string;
}

export type PhysicalIntent =
  | {
      type: "wait";
      minutes: number;
    }
  | {
      /** Relocate to a listed dwelling. Pays travel time, never credits. */
      type: "moveTo";
      housingId: string;
    }
  | {
      /** Pack up and return to the baseline room. Pays the trip back. */
      type: "leave";
    };
