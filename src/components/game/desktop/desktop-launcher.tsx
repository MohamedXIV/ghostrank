"use client";

import { BookOpen, Clock3, RadioTower, Settings2, ShoppingBag, Terminal, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DistroId } from "@/presentation/distros";
import { shellLayoutFor } from "@/presentation/shell-layout";
import type { ComputerWindowId } from "@/stores/ui/use-ui-store";

/**
 * Every launcher entry is a real game app backed by useUiStore.
 * Do not add fantasy file managers, power controls or browser shortcuts here.
 */
export const LAUNCHER_APPS: ReadonlyArray<{
  readonly id: ComputerWindowId;
  readonly label: string;
  readonly shortcut: string;
  readonly Icon: LucideIcon;
}> = [
  { id: "terminal", label: "Terminal", shortcut: "Alt+1", Icon: Terminal },
  { id: "recon", label: "Recon", shortcut: "Alt+2", Icon: RadioTower },
  { id: "underground", label: "Underground", shortcut: "Alt+3", Icon: UsersRound },
  { id: "market", label: "Market", shortcut: "Alt+4", Icon: ShoppingBag },
  { id: "history", label: "History", shortcut: "Alt+5", Icon: Clock3 },
  { id: "settings", label: "Appearance", shortcut: "Alt+6", Icon: Settings2 },
];

interface DesktopLauncherProps {
  distroId: DistroId;
  openWindows: ReadonlyArray<ComputerWindowId>;
  focusedWindow: ComputerWindowId | null;
  onOpenWindow: (id: ComputerWindowId) => void;
  onOpenGlossary: () => void;
}

export function DesktopLauncher({
  distroId, openWindows, focusedWindow, onOpenWindow, onOpenGlossary,
}: DesktopLauncherProps) {
  const shell = shellLayoutFor(distroId);
  return (
    <nav
      className="desktop-launcher distro-launcher"
      aria-label="Applications"
      data-distro-launcher={distroId}
      data-shell-placement={shell.launcherPlacement}
    >
      {LAUNCHER_APPS.map(({ id, label, shortcut, Icon }) => (
        <Button
          key={id}
          variant="ghost"
          type="button"
          data-window-id={id}
          data-open={String(openWindows.includes(id))}
          data-focused={String(focusedWindow === id)}
          aria-label={`Open ${label} (${shortcut})`}
          aria-keyshortcuts={shortcut}
          title={`${label} (${shortcut})`}
          onClick={() => onOpenWindow(id)}
        >
          <span className="launcher-glyph" aria-hidden="true"><Icon size={22} strokeWidth={1.7} /></span>
          <span className="launcher-app-label">{label}</span>
        </Button>
      ))}
      <Button
        variant="ghost"
        type="button"
        data-window-id={undefined}
        aria-label="Open system glossary (F1)"
        aria-keyshortcuts="F1"
        title="System glossary (F1)"
        onClick={onOpenGlossary}
      >
        <span className="launcher-glyph" aria-hidden="true"><BookOpen size={22} strokeWidth={1.7} /></span>
        <span className="launcher-app-label">Glossary</span>
      </Button>
    </nav>
  );
}
