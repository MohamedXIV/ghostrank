"use client";

import { useEffect, useMemo, useRef } from "react";
import { useCell, useRow, useTable } from "tinybase/ui-react";

import {
  EndingPresentation,
  type EndingEvidenceItem,
} from "@/components/game/ending/ending-presentation";
import { DISTRO_PROFILES } from "@/presentation/distros";
import { playDistroSound } from "@/presentation/distro-sound";
import type { VisibleRunEnding } from "@/game/simulation/projection/project-world";
import type { RetirementVariant } from "@/game/simulation/systems/retirement";
import type { WorldProjectionStore } from "@/stores/projection/world-projection";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";

function physicalEvidence(kind: string): string {
  switch (kind) {
    case "strange-vehicle":
      return "An unfamiliar vehicle watched the entrance.";
    case "footsteps":
      return "Footsteps stopped outside long enough to listen.";
    case "knock":
      return "Someone knocked once and left before the door opened.";
    case "unknown-call":
      return "An unknown caller rang and said nothing.";
    case "door-camera-motion":
      return "The door camera caught movement that did not reach the door.";
    case "outage":
      return "Power dropped while the rest of the block stayed lit.";
    case "unusual-connectivity":
      return "The local connection changed shape for a few minutes.";
    case "unexpected-delivery":
      return "An unrequested delivery appeared.";
    case "nearby-activity":
      return "Unusually quiet activity gathered nearby.";
    default:
      return "A physical signal was recorded.";
  }
}

function collectEndingEvidence(
  endingMinute: number,
  investigations: ReturnType<typeof useTable>,
  probes: ReturnType<typeof useTable>,
  physicalSignals: ReturnType<typeof useTable>,
  compromises: ReturnType<typeof useTable>,
  retaliations: ReturnType<typeof useTable>,
): EndingEvidenceItem[] {
  const items: EndingEvidenceItem[] = [];
  const push = (
    id: string,
    category: string,
    worldMinute: unknown,
    text: string,
  ) => {
    const minute = Number(worldMinute ?? 0);
    if (minute <= endingMinute) items.push({ id, category, worldMinute: minute, text });
  };

  for (const [id, row] of Object.entries(investigations ?? {})) {
    const target = String(row.targetHandle ?? "a known target");
    const text =
      row.kind === "unusual-login"
        ? `An unfamiliar login touched ${target}.`
        : row.kind === "marketplace-behavior"
          ? `The market started answering differently about ${target}.`
          : `A message with no sender asked about work on ${target}.`;
    push(id, "INVESTIGATION", row.worldMinute, text);
  }

  for (const [id, row] of Object.entries(probes ?? {})) {
    const text =
      row.artifactKind === "probe-ping"
        ? "A probe touched a port you were not listening on."
        : row.artifactKind === "caller-question"
          ? "An unknown number asked for you by name."
          : "A contact went quiet after someone leaned on them.";
    push(id, "RIVAL TELL", row.worldMinute, text);
  }

  for (const [id, row] of Object.entries(physicalSignals ?? {})) {
    push(id, "PHYSICAL SIGNAL", row.worldMinute, physicalEvidence(String(row.kind ?? "")));
  }

  for (const [id, row] of Object.entries(compromises ?? {})) {
    push(id, "RECORDED LOSS", row.worldMinute, String(row.label ?? "A named compromise was recorded."));
  }

  for (const [id, row] of Object.entries(retaliations ?? {})) {
    push(
      id,
      "PUBLIC RETALIATION",
      row.worldMinute,
      row.kind === "unmasking"
        ? "A public retaliation exposed an identity."
        : "A public smear appeared in the underground record.",
    );
  }

  return items
    .sort(
      (a, b) =>
        b.worldMinute - a.worldMinute ||
        a.category.localeCompare(b.category),
    )
    .slice(0, 5)
    .reverse();
}

export function EndingScreen({
  projection,
  onStartNewRun,
}: {
  projection: WorldProjectionStore;
  onStartNewRun: () => void;
}) {
  const status = String(useCell("meta", "run", "status", projection) ?? "vanished") as
    | "arrested"
    | "unmasked"
    | "missing"
    | "compromised"
    | "stranded"
    | "retired"
    | "vanished";
  const label = String(useCell("meta", "run", "label", projection) ?? "RUN ENDED");
  const endingMinute = Number(useCell("meta", "run", "worldMinute", projection) ?? 0);
  const variant = String(useCell("meta", "run", "variant", projection) ?? "");
  const detail = String(useCell("meta", "run", "detail", projection) ?? "");
  const player = useRow("player", "current", projection);
  const finalRank = Number(player.rank ?? 0);
  const handle = String(player.handle ?? "UNKNOWN");
  const finalCredits = Number(useCell("meta", "wallet", "credits", projection) ?? 0);
  const footprint = useRow("footprint", "current", projection);
  const traceCount = Number(footprint.traceCount ?? 0);
  const investigationSignals = useTable("investigationSignals", projection);
  const probes = useTable("probes", projection);
  const physicalSignals = useTable("physicalSignals", projection);
  const compromises = useTable("compromises", projection);
  const retaliations = useTable("retaliations", projection);
  const evidence = useMemo(
    () =>
      collectEndingEvidence(
        endingMinute,
        investigationSignals,
        probes,
        physicalSignals,
        compromises,
        retaliations,
      ),
    [endingMinute, investigationSignals, probes, physicalSignals, compromises, retaliations],
  );

  const distroId = usePresentationStore((state) => state.distroId);
  const themeId = usePresentationStore((state) => state.themeId);
  const soundEnabled = usePresentationStore((state) => state.soundEnabled);
  const textScale = usePresentationStore((state) => state.textScale);
  const motionMode = usePresentationStore((state) => state.motionMode);
  const transparencyMode = usePresentationStore((state) => state.transparencyMode);
  const densityMode = usePresentationStore((state) => state.densityMode);
  const contrastMode = usePresentationStore((state) => state.contrastMode);
  const cuePlayed = useRef(false);

  useEffect(() => {
    if (cuePlayed.current) return;
    cuePlayed.current = true;
    playDistroSound(DISTRO_PROFILES[distroId].sound, "ending", soundEnabled);
  }, [distroId, soundEnabled]);

  const ending = useMemo<VisibleRunEnding>(
    () => ({
      status,
      label,
      worldMinute: endingMinute,
      ...(variant ? { variant: variant as RetirementVariant } : {}),
      ...(detail ? { detail } : {}),
    }),
    [status, label, endingMinute, variant, detail],
  );

  return (
    <main className="game-shell">
      <EndingPresentation
        ending={ending}
        handle={handle}
        finalRank={finalRank}
        finalCredits={finalCredits}
        traceCount={traceCount}
        evidence={evidence}
        distroId={distroId}
        themeId={themeId}
        textScale={textScale}
        motionMode={motionMode}
        transparencyMode={transparencyMode}
        densityMode={densityMode}
        contrastMode={contrastMode}
        onStartNewRun={onStartNewRun}
      />
    </main>
  );
}
