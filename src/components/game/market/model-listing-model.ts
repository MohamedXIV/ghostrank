/** Player-visible AI listings only. Never read hidden properties, NPC state or catalog tuning. */
export interface ProjectedModelListing {
  readonly label: string;
  readonly source: string;
  readonly cost: number;
  readonly dailyCost: number;
  readonly factor: number;
  readonly deliveredFactor: number;
  readonly vram: number;
  readonly storage: number;
  readonly author: string;
  readonly owned: boolean;
  readonly running: boolean;
}
export interface PresentedModelListing {
  readonly id: string;
  readonly label: string;
  readonly art: string;
  readonly source: "cloud" | "local" | "unknown";
  readonly costCr: number;
  readonly dailyCostCr: number;
  readonly factor: number;
  readonly deliveredFactor: number;
  readonly starved: boolean;
  readonly footprint: { readonly vram: number; readonly storage: number };
  readonly rig: { readonly vram: number; readonly storage: number };
  readonly author: string;
  readonly owned: boolean;
  readonly running: boolean;
  readonly action: "stop" | "run" | "buy" | "unavailable";
  readonly canBuy: boolean;
}

const ART_IDS = new Set([
  "model-cloud-frontier", "model-cloud-compact", "model-local-workhorse",
  "model-local-tuned", "model-cloud-context", "model-local-reliable",
  "model-local-salvage",
]);

export function presentModelListing(
  id: string,
  row: Readonly<ProjectedModelListing>,
  credits: number,
  rig: Readonly<{vram: number; storage: number}>,
): PresentedModelListing {
  const source = row.source === "cloud" || row.source === "local" ? row.source : "unknown";
  const starved = source === "local" && row.deliveredFactor > row.factor;
  const action = source === "unknown" ? "unavailable"
    : row.running ? "stop"
    : source === "cloud" || row.owned ? "run" : "buy";
  return {
    id, label: row.label, source, art: "/visual-reboot/models/" + (ART_IDS.has(id) ? id : "generic") + ".svg",
    costCr: row.cost, dailyCostCr: row.dailyCost,
    factor: row.factor, deliveredFactor: row.deliveredFactor, starved,
    footprint: {vram:row.vram, storage:row.storage},
    rig:{vram:rig.vram, storage:rig.storage},
    author:row.author, owned:row.owned, running:row.running,
    action, canBuy:action==="buy" && credits>=row.cost,
  };
}
