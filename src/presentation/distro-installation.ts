import type { DistroId } from "@/presentation/distros";

export type DistroTransitionKind = "install" | "boot";

export interface DistroTransitionStage {
  id: string;
  label: string;
  at: number;
}

export interface DistroTransitionFrame {
  kind: DistroTransitionKind;
  distroId: DistroId;
  progress: number;
  stage: DistroTransitionStage;
  complete: boolean;
}

export const INSTALL_STAGES: readonly DistroTransitionStage[] = [
  { id: "verify", label: "VERIFYING PACKAGE SIGNATURE", at: 0 },
  { id: "unpack", label: "UNPACKING SYSTEM IMAGE", at: 18 },
  { id: "configure", label: "CONFIGURING SHELL + APPLICATIONS", at: 48 },
  { id: "identity", label: "APPLYING DISTRO IDENTITY", at: 72 },
  { id: "finalize", label: "FINALIZING INSTALLATION", at: 90 },
  { id: "reboot", label: "REBOOTING INTO NEW ENVIRONMENT", at: 98 },
];

export const BOOT_STAGES: readonly DistroTransitionStage[] = [
  { id: "handover", label: "CLOSING CURRENT SESSION", at: 0 },
  { id: "mount", label: "MOUNTING INSTALLED ENVIRONMENT", at: 36 },
  { id: "shell", label: "STARTING SYSTEM SHELL", at: 72 },
  { id: "ready", label: "HANDOVER COMPLETE", at: 96 },
];

export const TRANSITION_DURATION_MS: Readonly<
  Record<DistroTransitionKind, number>
> = {
  install: 4200,
  boot: 1500,
};

export const REDUCED_MOTION_DURATION_MS: Readonly<
  Record<DistroTransitionKind, number>
> = {
  install: 900,
  boot: 450,
};

export function transitionDurationMs(
  kind: DistroTransitionKind,
  reducedMotion: boolean,
): number {
  return reducedMotion
    ? REDUCED_MOTION_DURATION_MS[kind]
    : TRANSITION_DURATION_MS[kind];
}

export function transitionFrame(
  distroId: DistroId,
  kind: DistroTransitionKind,
  elapsedMs: number,
  reducedMotion = false,
): DistroTransitionFrame {
  const duration = transitionDurationMs(kind, reducedMotion);
  const progress = Math.max(0, Math.min(100, (elapsedMs / duration) * 100));
  const stages = kind === "install" ? INSTALL_STAGES : BOOT_STAGES;
  const stage = [...stages]
    .reverse()
    .find((candidate) => progress >= candidate.at) ?? stages[0];

  return {
    kind,
    distroId,
    progress,
    stage,
    complete: progress >= 100,
  };
}
