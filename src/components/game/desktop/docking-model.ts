import { Actions, DockLocation, Model, type IJsonModel } from "flexlayout-react";
import type { DistroId } from "@/presentation/distros";
import type { ComputerWindowId } from "@/stores/ui/use-ui-store";

export const WORKSPACE_APP_IDS: readonly ComputerWindowId[] = [
  "terminal", "recon", "underground", "market", "history", "settings",
];

export const WORKSPACE_TITLES: Readonly<Record<ComputerWindowId, string>> = {
  terminal: "TERMINAL",
  recon: "RECON // OPERATIONS",
  underground: "UNDERGROUND INDEX",
  market: "MARKET // RIG",
  history: "RUN HISTORY",
  settings: "SYSTEM // APPEARANCE",
};

function validApp(id: unknown): id is ComputerWindowId {
  return typeof id === "string" && (WORKSPACE_APP_IDS as readonly string[]).includes(id);
}

function tab(id: ComputerWindowId) {
  return { type: "tab" as const, id, name: WORKSPACE_TITLES[id], component: id, enablePopout: false, enableFloat: true };
}

/** Distro decides initial ergonomics only; every distro exposes identical apps. */
export function buildDistroDockModel(
  distroId: DistroId,
  openWindows: readonly ComputerWindowId[],
  focusedWindow: ComputerWindowId | null,
): Model {
  const ids = [...new Set(openWindows.filter(validApp))];
  const primary = ids.filter(id => id === "terminal" || id === "recon");
  const others = ids.filter(id => !primary.includes(id));
  const technical = distroId === "lattice" || distroId === "ghost-os";
  const first = technical && primary.length ? [primary[0]] : ids.slice(0, 1);
  const remaining = ids.filter(id => !first.includes(id));
  const tabset = (id: string, values: ComputerWindowId[], weight: number) => ({
    type: "tabset" as const, id, weight, selected: Math.max(0, values.indexOf(focusedWindow as ComputerWindowId)),
    children: values.map(tab),
  });
  const children = [tabset("main-dock", first, distroId === "lattice" ? 54 : 62)];
  if (remaining.length) children.push(tabset("side-dock", remaining, distroId === "lattice" ? 46 : 38));
  const json: IJsonModel = {
    global: {
      tabEnableClose: true,
      tabEnableFloat: true,
      tabEnablePopout: false,
      tabEnableFloatIcon: true,
      tabEnablePopoutIcon: false,
      tabSetEnableMaximize: true,
      splitterSize: 7,
    },
    borders: [],
    layout: { type: "row", weight: 100, children },
  };
  return Model.fromJson(json);
}

/** Reject non-app nodes and unexpected layout structure before restoring localStorage. */
export function validateDockLayout(json: unknown): json is IJsonModel {
  if (!json || typeof json !== "object" || Array.isArray(json)) return false;
  const value = json as Record<string, unknown>;
  const seen = new Set<string>();
  let count = 0;
  const walk = (node: unknown): boolean => {
    if (!node || typeof node !== "object" || Array.isArray(node) || ++count > 48) return false;
    const o = node as Record<string, unknown>;
    if (o.type === "tab") {
      if (!validApp(o.id) || o.component !== o.id || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    }
    return (o.type === "row" || o.type === "tabset") &&
      Array.isArray(o.children) && o.children.every(walk);
  };
  if (!walk(value.layout)) return false;
  if (value.popouts !== undefined) {
    if (!value.popouts || typeof value.popouts !== "object" || Array.isArray(value.popouts)) return false;
    for (const popout of Object.values(value.popouts)) {
      if (!popout || typeof popout !== "object") return false;
      const candidate = popout as Record<string, unknown>;
      if (!walk(candidate.layout)) return false;
    }
  }
  return !value.borders || (Array.isArray(value.borders) && value.borders.length === 0);
}

export function tabIdsInDock(model: Model): ComputerWindowId[] {
  const nodes: ComputerWindowId[] = [];
  const seen = new Set<ComputerWindowId>();
  const walk = (o: unknown): void => {
    if (!o || typeof o !== "object") return;
    const n = o as { type?: string; id?: string; children?: unknown[]; layout?: unknown };
    if (n.type === "tab" && validApp(n.id)) {
      if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n.id); }
    }
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (n.layout) walk(n.layout);
  };
  const json = model.toJson();
  walk(json.layout);
  Object.values(json.popouts ?? {}).forEach(walk);
  return nodes;
}

export function safeRestoredDockModel(
  distroId: DistroId,
  openWindows: readonly ComputerWindowId[],
  focusedWindow: ComputerWindowId | null,
  serialized?: string | null,
): Model {
  let model: Model | undefined;
  if (serialized && serialized.length < 50_000) {
    try {
      const json: unknown = JSON.parse(serialized);
      if (validateDockLayout(json)) model = Model.fromJson(json);
    } catch { /* Corrupt optional UI state must not break play. */ }
  }
  if (!model) return buildDistroDockModel(distroId, openWindows, focusedWindow);
  const openSet = new Set(openWindows.filter(validApp));
  for (const id of tabIdsInDock(model)) {
    if (!openSet.has(id)) model.doAction(Actions.deleteTab(id));
  }
  for (const id of openSet) {
    if (!model.getNodeById(id)) {
      const target = model.getNodeById("main-dock") ?? model.getRoot();
      model.doAction(Actions.addTab(tab(id), target.getId(), DockLocation.CENTER, -1));
    }
  }
  return model;
}
