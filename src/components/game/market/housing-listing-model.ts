/** Presentation of *visible* housing rows. No private presence/threat state enters here. */
export interface HousingProjectionRow {
  readonly label: string;
  readonly dailyCost: number;
  readonly active: boolean;
  readonly travelMinutes: number;
  readonly kind: string;
  readonly anonymity: string;
  readonly compute: number;
  readonly memory: number;
  readonly vram: number;
  readonly storage: number;
  readonly network: number;
}

export type HousingMetric = "CPU" | "MEM" | "VRAM" | "STO" | "NET";
export interface HousingListing {
  readonly id: string;
  readonly label: string;
  readonly dailyCostCr: number;
  readonly active: boolean;
  readonly travelMinutes: number;
  readonly kind: string;
  readonly anonymity: string;
  readonly art: string;
  readonly capabilities: ReadonlyArray<{ metric: HousingMetric; value: number }>;
}

const ART_IDS = new Set([
  "housing-cowork-loft",
  "housing-rented-lab",
  "housing-sleeper-unit",
  "housing-basement-cot",
  "housing-night-shift-office",
  "housing-sublet-studio",
  "housing-archive-lockup",
  "housing-cellar-studio",
]);

/** Artwork is illustrative, never evidence of a location's condition or security. */
export function presentHousingListing(id: string, row: Readonly<HousingProjectionRow>): HousingListing {
  const capabilities = ([
    ["CPU", row.compute], ["MEM", row.memory], ["VRAM", row.vram],
    ["STO", row.storage], ["NET", row.network],
  ] as const)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .map(([metric, value]) => ({ metric, value }));
  return {
    id,
    label: row.label,
    dailyCostCr: row.dailyCost,
    active: row.active,
    travelMinutes: row.travelMinutes,
    kind: row.kind,
    anonymity: row.anonymity,
    capabilities,
    art: "/visual-reboot/housing/" + (ART_IDS.has(id) ? id : "generic") + ".svg",
  };
}
