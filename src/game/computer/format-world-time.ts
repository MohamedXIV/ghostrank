export function formatWorldTime(worldMinute: number): string {
  const safeMinute = Math.max(0, Math.floor(worldMinute));
  const day = Math.floor(safeMinute / 1_440) + 1;
  const minuteOfDay = safeMinute % 1_440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  return `DAY ${day} // ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
