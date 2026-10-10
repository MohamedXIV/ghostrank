"use client";

import { useState } from "react";
import { useTable } from "tinybase/ui-react";
import { Button } from "@/components/ui/button";
import { useClockHold } from "@/components/game/clock-context";
import { testNetworkRouteFromGui } from "@/game/computer/apps/target-actions";
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
  const candidate = challenge.candidates.find(route => route.id === selected);
  const alreadyTested = candidate?.status === "refuted" || candidate?.status === "confirmed";
  const canCommit = challenge.preview !== null && candidate !== undefined && !alreadyTested;

  return (
    <div className="network-route-challenge" data-challenge-id={challenge.id}>
      <div className="network-route-clues">
        <span>Carrier clue: <strong>{challenge.known.carrier ?? "UNRESOLVED"}</strong></span>
        <span>Echo clue: <strong>{challenge.known.echo ?? "UNRESOLVED"}</strong></span>
      </div>
      <p className="network-route-caveat">
        Candidate links are hypotheses, not observed destination machines.
      </p>
      <div className="network-route-candidates" role="group" aria-label="Route candidates">
        {challenge.candidates.map(route => (
          <button
            type="button"
            key={route.id}
            className="network-route-candidate"
            aria-pressed={selected === route.id}
            onClick={() => {
              setSelected(route.id);
              setConfirming(false);
              setNotice("");
            }}
          >
            <strong>{route.label}</strong>
            <span>Carrier: {route.carrier} · Echo: {route.echo}</span>
            <span className="network-route-status">Status: {route.status.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="network-route-actions">
        <p>
          {challenge.preview
            ? `Route verification costs ${challenge.preview.minutes} world minutes and +${challenge.preview.traceWeight} trace.`
            : "Route verification unavailable: gather the current sourced clues."}
        </p>
        {confirming && canCommit && candidate ? (
          <div role="group" aria-label="Confirm route verification">
            <p>Test {candidate.label}? The clock and trace cost are real even if this link is wrong.</p>
            <Button size="sm" onClick={() => {
              const result = runtime.execute(
                testNetworkRouteFromGui(challenge.targetId, challenge.id, candidate.id),
              );
              setNotice(result.ok
                ? "Route test recorded. Review your network evidence and trace."
                : `Route refused: ${result.error ?? "unknown error"}`);
              setConfirming(false);
            }}>
              CONFIRM ROUTE TEST
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              CANCEL
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            disabled={!canCommit}
            onClick={() => setConfirming(true)}
          >
            TEST SELECTED ROUTE
          </Button>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
    </div>
  );
}
