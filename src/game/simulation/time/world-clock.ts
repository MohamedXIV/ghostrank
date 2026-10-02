const MINUTES_PER_DAY = 24 * 60;

export function formatWorldClock(worldMinute: number): string {
  if (!Number.isInteger(worldMinute) || worldMinute < 0) {
    throw new RangeError("worldMinute must be a non-negative integer");
  }

  const day = Math.floor(worldMinute / MINUTES_PER_DAY) + 1;
  const minuteOfDay = worldMinute % MINUTES_PER_DAY;
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;

  return `Day ${day} · ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
