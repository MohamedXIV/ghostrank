"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Actions, DockLocation, Layout, type Model, type TabNode } from "flexlayout-react";
import type { DistroId } from "@/presentation/distros";
import type { ComputerWindowId } from "@/stores/ui/use-ui-store";
import {
  safeRestoredDockModel, tabIdsInDock, WORKSPACE_APP_IDS, WORKSPACE_TITLES,
} from "./docking-model";

const PREFIX = "ghostrank:docking:v1:";
function isApp(value: unknown): value is ComputerWindowId {
  return typeof value === "string" && (WORKSPACE_APP_IDS as readonly string[]).includes(value);
}
interface Props {
  distroId: DistroId;
  colorMode: "light" | "dark";
  openWindows: readonly ComputerWindowId[];
  focusedWindow: ComputerWindowId | null;
  onClose: (id: ComputerWindowId) => void;
  onFocus: (id: ComputerWindowId) => void;
  renderApp: (id: ComputerWindowId) => ReactNode;
}

/** FlexLayout is layout authority only; useUiStore remains app open/focus authority. */
export function DockingWorkspace({
  distroId, colorMode, openWindows, focusedWindow, onClose, onFocus, renderApp,
}: Props) {
  const [model] = useState<Model>(() => {
    let stored: string | null = null;
    try {
      if (typeof window !== "undefined") stored = window.localStorage.getItem(PREFIX + distroId);
    } catch { /* Persisted UI layouts are optional and never game-state authority. */ }
    return safeRestoredDockModel(distroId, openWindows, focusedWindow, stored);
  });
  const focusSync = useRef<ComputerWindowId | null>(null);
  const persist = useCallback(() => {
    try {
      window.localStorage.setItem(PREFIX + distroId, JSON.stringify(model.toJson()));
    } catch { /* No layout persistence is better than interrupting gameplay. */ }
  }, [distroId, model]);

  useEffect(() => {
    const expected = new Set(openWindows);
    for (const id of tabIdsInDock(model)) {
      if (!expected.has(id)) model.doAction(Actions.deleteTab(id));
    }
    for (const id of openWindows) {
      if (!model.getNodeById(id)) {
        const target = model.getNodeById("main-dock") ?? model.getNodeById("side-dock");
        if (target) {
          model.doAction(Actions.addTab({
            type: "tab", id, component: id, name: WORKSPACE_TITLES[id],
            enableFloat: true, enablePopout: false,
          }, target.getId(), DockLocation.CENTER, -1, true));
        }
      }
    }
    if (focusedWindow && focusSync.current !== focusedWindow && model.getNodeById(focusedWindow)) {
      model.doAction(Actions.selectTab(focusedWindow));
      focusSync.current = focusedWindow;
    }
    persist();
  }, [model, openWindows, focusedWindow, persist]);

  const handleAction: NonNullable<React.ComponentProps<typeof Layout>["onAction"]> =
    useCallback((action) => {
      const data = action.data as Record<string, unknown>;
      if (action.type === Actions.DELETE_TAB && isApp(data.node)) {
        onClose(data.node);
        if (focusSync.current === data.node) focusSync.current = null;
      }
      if (action.type === Actions.SELECT_TAB && isApp(data.tabNode)) {
        onFocus(data.tabNode);
        focusSync.current = data.tabNode;
      }
      return action;
    }, [onClose, onFocus]);

  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent();
    if (!isApp(component)) return null;
    return (
      <section
        className={`os-window os-window-${component} docked-app-window`}
        data-docking-app={component}
        aria-label={WORKSPACE_TITLES[component]}
      >
        <div className="window-content">{renderApp(component)}</div>
      </section>
    );
  }, [renderApp]);

  return (
    <div
      className={`docking-workspace flexlayout__theme_${colorMode}`}
      data-docking-workspace={distroId}
      aria-label="Dockable application workspace"
    >
      <Layout model={model} factory={factory} onAction={handleAction} onModelChange={persist} />
    </div>
  );
}
