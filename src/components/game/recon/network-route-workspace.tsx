"use client";

import { useState } from "react";
import { useTable } from "tinybase/ui-react";
import { useClockHold } from "@/components/game/clock-context";
import { testNetworkRouteFromGui } from "@/game/computer/apps/target-actions";
import { formatNetworkRouteFeedback } from "@/components/game/recon/network-route-feedback";
import { buildNetworkRouteWorkbench } from "@/components/game/recon/network-route-workbench-model";
import { NetworkRouteWorkbench } from "@/components/game/recon/network-route-workbench";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import type { VisibleNetworkRouteChallenge } from "@/game/simulation/projection/project-world";

/** The GUI has no solver and never receives the target's hidden route truth. */
export function NetworkRouteWorkspace({
  targetId,
  runtime,
}: {
  targetId: string;
  runtime: GameRuntime;
}) {
  const rows = useTable("networkRoutes", runtime.projection);
  const challenges: VisibleNetworkRouteChallenge[] = Object.values(rows)
    .filter(row => row.targetId === targetId && typeof row.json === "string")
    .flatMap(row => {
      try {
        return [JSON.parse(String(row.json)) as VisibleNetworkRouteChallenge];
      } catch {
        return [];
      }
    });

  if (challenges.length === 0) return null;

  return (
    <section aria-label="Network route hypotheses" className="network-route-workspace">
      <div className="network-route-heading">
        <span className="panel-label">NETWORK MAPPING · SIGNAL PATH</span>
        <p>Inspect the carrier and echo marks. Match the observed clues, then test your hypothesis.</p>
      </div>
      {challenges.map(challenge => (
        <NetworkRouteChallengeView key={challenge.id} challenge={challenge} runtime={runtime} />
      ))}
    </section>
  );
}

function NetworkRouteChallengeView({
  challenge,
  runtime,
}: {
  challenge: VisibleNetworkRouteChallenge;
  runtime: GameRuntime;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  // The same G1 hold used by other blocking confirmations: no clock drift while reading.
  useClockHold(confirming);
  const model = buildNetworkRouteWorkbench(challenge, selected);

  return (
    <NetworkRouteWorkbench
      model={model}
      confirming={confirming}
      notice={notice}
      onSelect={routeId => {
        setSelected(routeId);
        setConfirming(false);
        setNotice("");
      }}
      onRequestTest={() => setConfirming(true)}
      onConfirm={() => {
        const candidate = model.selected;
        if (!candidate) return;
        const result = runtime.execute(
          testNetworkRouteFromGui(challenge.targetId, challenge.id, candidate.id),
        );
        setNotice(formatNetworkRouteFeedback(result, challenge.id, candidate.id));
        setConfirming(false);
      }}
      onCancel={() => setConfirming(false)}
    />
  );
}
