"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { BookOpen, Pin, PinOff } from "lucide-react";

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
  readonly legacyTitle: string;
}> = [
  { id: "terminal", label: "Terminal", shortcut: "Alt+1", legacyTitle: "Terminal (Alt+1)" },
  { id: "recon", label: "Recon", shortcut: "Alt+2", legacyTitle: "Recon (Alt+2)" },
  { id: "underground", label: "Underground", shortcut: "Alt+3", legacyTitle: "Underground Index (Alt+3)" },
  { id: "market", label: "Market", shortcut: "Alt+4", legacyTitle: "Market & Rig (Alt+4)" },
  { id: "history", label: "History", shortcut: "Alt+5", legacyTitle: "Run History (Alt+5)" },
  { id: "settings", label: "Appearance", shortcut: "Alt+6", legacyTitle: "System & Appearance (Alt+6)" },
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
  const storageKey = `ghostrank:launcher:pinned:${distroId}`;
  const pinned = useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("ghostrank:launcher-pin-change", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("ghostrank:launcher-pin-change", notify);
      };
    },
    () => {
      try { return window.localStorage.getItem(storageKey) === "true"; }
      catch { return false; }
    },
    () => false,
  );
  const togglePin = () => {
    try { window.localStorage.setItem(storageKey, String(!pinned)); }
    catch { /* Nonpersistent fallback: auto-hide stays available on hover. */ }
    window.dispatchEvent(new Event("ghostrank:launcher-pin-change"));
  };
  return (
    <nav
      className="desktop-launcher distro-launcher"
      aria-label="Applications"
      data-distro-launcher={distroId}
      data-shell-placement={shell.launcherPlacement}
      data-pinned={String(pinned)}
    >
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="launcher-pin"
        aria-label={pinned ? "Auto-hide application dock" : "Pin application dock open"}
        aria-pressed={pinned}
        title={pinned ? "Auto-hide dock" : "Keep dock visible"}
        onClick={togglePin}
      >
        {pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
      </Button>
      {LAUNCHER_APPS.map(({ id, label, shortcut, legacyTitle }) => (
        <Button
          key={id}
          variant="ghost"
          type="button"
          data-window-id={id}
          data-open={String(openWindows.includes(id))}
          data-focused={String(focusedWindow === id)}
          aria-label={`Open ${label} (${shortcut})`}
          aria-keyshortcuts={shortcut}
          title={legacyTitle}
          onClick={() => onOpenWindow(id)}
        >
          <span className="launcher-glyph" aria-hidden="true">
            <Image
              unoptimized
              className="distro-app-icon"
              src={`/visual-reboot/icons/${distroId}/${id}.svg`}
              width={38}
              height={38}
              alt=""
            />
          </span>
          <span className="launcher-app-label">{label}</span>
        </Button>
      ))}
      <Button
        variant="ghost"
        type="button"
        data-window-id={undefined}
        aria-label="Open system glossary (F1)"
        aria-keyshortcuts="F1"
        title="System symbols & truth vocabulary glossary (F1)"
        onClick={onOpenGlossary}
      >
        <span className="launcher-glyph" aria-hidden="true"><BookOpen size={22} strokeWidth={1.7} /></span>
        <span className="launcher-app-label">Glossary</span>
      </Button>
    </nav>
  );
}
