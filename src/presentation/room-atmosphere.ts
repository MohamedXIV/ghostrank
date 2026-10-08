import type { PhysicalSignalKind } from "@/game/simulation/state/world-state";

export interface ProjectedRoomSignal {
  id: string;
  kind: PhysicalSignalKind;
  worldMinute: number;
  atCurrentLocation: boolean;
}

/** Presentation reads only projected signals already known at this location. */
export function latestKnownRoomSignal(
  signals: readonly ProjectedRoomSignal[],
): ProjectedRoomSignal | null {
  return (
    [...signals]
      .filter((signal) => signal.atCurrentLocation)
      .sort(
        (a, b) =>
          b.worldMinute - a.worldMinute ||
          b.id.localeCompare(a.id, undefined, { numeric: true }),
      )[0] ?? null
  );
}

export function describePhysicalRoomSignal(kind: PhysicalSignalKind): string {
  switch (kind) {
    case "strange-vehicle":
      return "the same unfamiliar car was outside";
    case "door-camera-motion":
      return "the door camera caught motion, then nobody";
    case "outage":
      return "power dropped while the block stayed lit";
    case "unusual-connectivity":
      return "the local link behaved wrong for a while";
    case "nearby-activity":
      return "there was too much quiet movement nearby";
    case "footsteps":
      return "footsteps stopped outside long enough to listen";
    case "knock":
      return "someone knocked once and left before you reached the door";
    case "unknown-call":
      return "an unknown caller rang and said nothing";
    case "unexpected-delivery":
      return "an unexpected delivery appeared";
  }
}

/** Keep the room's pointer feedback still when reduced motion is effective. */
export function roomHoverZoom(reducedMotion: boolean): number {
  return reducedMotion ? 1 : 1.015;
}
