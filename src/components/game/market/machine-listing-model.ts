/** Only public machine/rack projection fields, no hidden stock or vendor data. */
export interface ProjectedMachineListing {
  readonly label: string;
  readonly cost: number;
  readonly ownedCount: number;
  readonly exotic: boolean;
  readonly compute: number;
  readonly memory: number;
  readonly vram: number;
  readonly storage: number;
  readonly network: number;
}
export interface ProjectedOwnedMachine {
  readonly label: string;
  readonly catalogId: string;
  readonly paidCost: number;
  readonly resaleValue: number;
  readonly acquiredWorldMinute: number;
  readonly compute: number;
  readonly memory: number;
  readonly vram: number;
  readonly storage: number;
  readonly network: number;
}
export type MachineMetric = "CPU" | "MEM" | "VRAM" | "STO" | "NET";
export type MachineStat = { readonly metric: MachineMetric; readonly value: number };
interface MachineDisplay {
  readonly id: string;
  readonly label: string;
  readonly art: string;
  readonly stats: ReadonlyArray<MachineStat>;
}
export interface MachineListingDisplay extends MachineDisplay {
  readonly priceCr: number;
  readonly affordable: boolean;
  readonly ownedCount: number;
  readonly exotic: boolean;
}
export interface OwnedMachineDisplay extends MachineDisplay {
  readonly catalogId: string;
  readonly paidCostCr: number;
  readonly resaleCr: number;
  readonly acquiredWorldMinute: number;
}
const ART_IDS = new Set([
  "box-burner", "box-analysis-node", "box-attack-cluster", "box-silent-proxy",
  "box-archive-node", "box-model-host", "box-annealing-rack",
]);
export function machineArtSource(catalogId: string): string {
  return "/visual-reboot/machines/" + (ART_IDS.has(catalogId) ? catalogId : "generic") + ".svg";
}
type MachineCapabilityCells = Pick<ProjectedMachineListing,"compute"|"memory"|"vram"|"storage"|"network">;
function presentStats(row: MachineCapabilityCells): ReadonlyArray<MachineStat> {
  return ([
    ["CPU", row.compute], ["MEM", row.memory], ["VRAM", row.vram],
    ["STO", row.storage], ["NET", row.network],
  ] as const).filter(([,value]) => Number.isFinite(value) && value > 0)
    .map(([metric,value]) => ({ metric, value }));
}
export function presentMachineListing(id: string, row: Readonly<ProjectedMachineListing>, credits: number): MachineListingDisplay {
  return {
    id, label: row.label, art: machineArtSource(id), priceCr: row.cost,
    affordable: credits >= row.cost, ownedCount: row.ownedCount,
    exotic: row.exotic, stats: presentStats(row),
  };
}
export function presentOwnedMachine(id: string, row: Readonly<ProjectedOwnedMachine>): OwnedMachineDisplay {
  return {
    id, label: row.label, catalogId: row.catalogId, art: machineArtSource(row.catalogId),
    paidCostCr: row.paidCost, resaleCr: row.resaleValue,
    acquiredWorldMinute: row.acquiredWorldMinute, stats: presentStats(row),
  };
}
