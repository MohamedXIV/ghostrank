import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { VisiblePresence } from "@/game/simulation/projection/project-world";
import type { PhysicalIntent, RoomPresentation } from "@/game/phaser/types";

/**
 * Phase 6 P0 — the physical intent bridge. It stays a *pure translation* from
 * physical intent onto the normal command layer: no bus handle, no state, no
 * decisions. That is what keeps `AGENTS.md`'s rule true by construction rather
 * than by discipline — Phaser can ask to move, and cannot decide anything about
 * what moving costs or who has found you.
 *
 * `moveTo` and `leave` deliberately reuse the Phase 4 lease commands rather than
 * gaining their own command types. Relocating from the room, from `rent <id>` in
 * the Terminal, and from the Market panel are then one path with one set of
 * rules, and parity between them is testable, not hoped for.
 */
export function physicalIntentToCommand(
  intent: PhysicalIntent,
): SimulationCommand {
  switch (intent.type) {
    case "wait":
      return {
        type: "advanceTime",
        minutes: intent.minutes,
      };
    case "moveTo":
      return {
        type: "rentHousing",
        housingId: intent.housingId,
      };
    case "leave":
      return {
        type: "breakLease",
      };
  }
}

/**
 * Build the scene's view from the projected presence. It reads only what the
 * projection already chose to show — a label, a coarse band, a boolean — so the
 * renderer cannot learn a hidden fact through the back door. `avatarPosition`
 * is supplied by the scene and stays presentation-only: P0 does not simulate
 * movement within a room.
 */
export function presentRoom(
  presence: VisiblePresence,
  worldMinute: number,
  avatarPosition = "stand",
): RoomPresentation {
  return {
    locationId: presence.locationId,
    label: presence.label,
    anonymity: presence.anonymity,
    leased: presence.leased,
    worldMinute,
    distant: presence.distanceMinutes > 0,
    avatarPosition,
  };
}
