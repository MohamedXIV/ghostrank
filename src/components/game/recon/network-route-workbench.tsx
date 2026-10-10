"use client";

import { Button } from "@/components/ui/button";
import { NetworkRouteLane } from "@/components/game/recon/network-route-lane";
import type {
  NetworkRouteClueModel,
  NetworkRouteWorkbenchModel,
} from "@/components/game/recon/network-route-workbench-model";

export interface NetworkRouteWorkbenchProps {
  model: NetworkRouteWorkbenchModel;
  confirming: boolean;
  notice: string;
  onSelect: (routeId: string) => void;
  onRequestTest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Presentational workbench: all facts come from the view model. */
export function NetworkRouteWorkbench({
  model,
  confirming,
  notice,
  onSelect,
  onRequestTest,
  onConfirm,
  onCancel,
}: NetworkRouteWorkbenchProps) {
  const { inspector, selected } = model;

  return (
    <div className="network-route-challenge" data-challenge-id={model.challengeId}>
      <div className="network-route-clues" aria-label="Observed clues">
        <ClueSlot kind="carrier" clue={model.clues.carrier} />
        <ClueSlot kind="echo" clue={model.clues.echo} />
      </div>
      <p className="network-route-caveat">{model.caveat}</p>
      <div className="network-route-candidates" role="group" aria-label="Route candidates">
        {model.lanes.map(lane => (
          <button
            type="button"
            key={lane.id}
            className="network-route-candidate"
            aria-pressed={lane.selected}
            data-status={lane.status}
            onClick={() => onSelect(lane.id)}
          >
            <NetworkRouteLane lane={lane} />
            <strong>{lane.label}</strong>
            <span>{`Carrier: ${lane.carrier} · Echo: ${lane.echo}`}</span>
            <span className="network-route-status">{`Status: ${lane.statusLabel}`}</span>
            <span className="network-route-endpoint">{lane.endLabel}</span>
          </button>
        ))}
      </div>
      <div className="network-route-inspector" aria-live="polite">
        <strong>{inspector.heading}</strong>
        <p>{inspector.detail}</p>
        {inspector.costText && <p className="network-route-cost">{inspector.costText}</p>}
        {inspector.unavailableText && <p>{inspector.unavailableText}</p>}
        {!inspector.canCommit && inspector.blockedReason && <p>{inspector.blockedReason}</p>}
      </div>
      <div className="network-route-actions">
        {confirming && inspector.canCommit && selected ? (
          <div role="group" aria-label="Confirm route verification">
            <p>{`Test ${selected.label}? The clock and trace cost are real even if this link is wrong.`}</p>
            <Button size="sm" onClick={onConfirm}>CONFIRM ROUTE TEST</Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>CANCEL</Button>
          </div>
        ) : (
          <Button size="sm" disabled={!inspector.canCommit} onClick={onRequestTest}>
            TEST SELECTED ROUTE
          </Button>
        )}
        {notice && <p role="status">{notice}</p>}
      </div>
    </div>
  );
}

function ClueSlot({ kind, clue }: { kind: "carrier" | "echo"; clue: NetworkRouteClueModel }) {
  return (
    <span className="network-route-clue" data-clue={kind} data-resolved={clue.resolved ? "true" : "false"}>
      <ClueGlyph kind={kind} value={clue.value} />
      <span>{`${kind === "carrier" ? "Carrier" : "Echo"} clue: `}<strong>{clue.label}</strong></span>
    </span>
  );
}

/** Same non-colour encoding as the lanes, so an observed clue can be matched by eye. */
function ClueGlyph({ kind, value }: { kind: "carrier" | "echo"; value: string | null }) {
  if (kind === "carrier") {
    const style = value === "sealed" ? "dashed" : value === "public" ? "solid" : "unknown";
    return (
      <svg aria-hidden="true" focusable="false" className="network-route-clue-glyph" viewBox="0 0 28 12">
        <line className="lane-line" data-line-style={style} x1="2" y1="6" x2="26" y2="6" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" focusable="false" className="network-route-clue-glyph" viewBox="0 0 28 12">
      {value === "triangle"
        ? <polygon className="lane-echo" points="14,1 20,11 8,11" />
        : <circle className="lane-echo" data-echo-shape={value ?? "unknown"} cx="14" cy="6" r="5" />}
    </svg>
  );
}
