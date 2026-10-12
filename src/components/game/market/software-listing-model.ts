/** Only fields from the current *visible* TinyBase software projection. */
export interface SoftwareProjectionRow {
  readonly label: string;
  readonly dailyCost: number;
  readonly active: boolean;
  readonly discountFactor: number;
  readonly compute: number;
  readonly memory: number;
  readonly vram: number;
  readonly storage: number;
  readonly network: number;
}
export interface SoftwareListing {
  readonly id: string;
  readonly label: string;
  readonly active: boolean;
  readonly dailyCostCr: number;
  readonly efficiency: string | null;
  readonly capabilities: ReadonlyArray<{ metric: "CPU" | "MEM" | "VRAM" | "STO" | "NET"; value: number }>;
  readonly art: string;
}
const KNOWN_IDS = new Set([
  "software-net-monitor", "software-auto-recon", "software-analysis-pipeline",
  "software-storage-index", "software-batch-scheduler",
]);

export function presentSoftwareListing(id: string, row: Readonly<SoftwareProjectionRow>): SoftwareListing {
  const capabilities: Array<{ metric: "CPU" | "MEM" | "VRAM" | "STO" | "NET"; value: number }> = (
    [
      ["CPU", row.compute], ["MEM", row.memory], ["VRAM", row.vram],
      ["STO", row.storage], ["NET", row.network],
    ] as const
  ).filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([metric, value]) => ({ metric, value }));
  return {
    id,
    label: row.label,
    active: row.active,
    dailyCostCr: row.dailyCost,
    efficiency: row.discountFactor < 1 ? `×${row.discountFactor} action time` : null,
    capabilities,
    art: "/visual-reboot/software/" + (KNOWN_IDS.has(id) ? id : "generic") + ".svg",
  };
}
