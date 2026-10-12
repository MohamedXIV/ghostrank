import type { HardwareCategory } from "@/content/hardware-catalog";

/** Only fields the player-visible TinyBase catalog projection currently exposes. */
export interface ProjectedHardwareRow {
  readonly label: string;
  readonly category: HardwareCategory | string;
  readonly cost: number;
  readonly compute: number;
  readonly memory: number;
  readonly vram: number;
  readonly storage: number;
  readonly network: number;
  readonly owned: number;
}
export type HardwareMetric = "CPU" | "MEM" | "VRAM" | "STO" | "NET";
export interface HardwareItemPresentation {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly imageSrc: string;
  readonly priceCr: number;
  readonly ownedCount: number;
  readonly affordable: boolean;
  readonly stats: ReadonlyArray<{ metric: HardwareMetric; value: number }>;
}
const CATEGORIES: ReadonlySet<string> = new Set([
  "workstation", "cpu", "memory", "gpu", "storage", "network",
]);

export function hardwareArtSource(category: string): string {
  return "/visual-reboot/hardware/" +
    (CATEGORIES.has(category) ? category : "generic") + ".svg";
}

export function presentHardwareItem(
  id: string,
  row: Readonly<ProjectedHardwareRow>,
  credits: number,
): HardwareItemPresentation {
  const stats: Array<{ metric: HardwareMetric; value: number }> = (
    [
      ["CPU", row.compute],
      ["MEM", row.memory],
      ["VRAM", row.vram],
      ["STO", row.storage],
      ["NET", row.network],
    ] as const
  ).filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([metric, value]) => ({ metric, value }));

  return {
    id,
    label: row.label,
    category: row.category,
    imageSrc: hardwareArtSource(row.category),
    priceCr: row.cost,
    ownedCount: row.owned,
    affordable: credits >= row.cost,
    stats,
  };
}
