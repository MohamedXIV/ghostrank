import type { NetworkRouteLaneModel } from "@/components/game/recon/network-route-workbench-model";

/**
 * Decorative signal lane for one hypothesis. The card text next to it carries
 * the same facts for assistive technology, so this SVG is hidden from it.
 * Entry is observed; the far end is an unverified hypothesis, never a link.
 */
export function NetworkRouteLane({ lane }: { lane: NetworkRouteLaneModel }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="network-route-lane"
      viewBox="0 0 300 40"
      data-lane-state={lane.status}
      data-carrier={lane.carrier}
      data-echo={lane.echo}
      data-link-kind={lane.linkKind}
    >
      <circle className="lane-entry" cx="12" cy="20" r="6" />
      <line className="lane-line" data-line-style={lane.lineStyle} x1="20" y1="20" x2="262" y2="20" />
      {lane.echo === "circle"
        ? <circle className="lane-echo" cx="140" cy="20" r="5" />
        : <polygon className="lane-echo" points="140,14 146,25 134,25" />}
      <g className="lane-end">
        <circle className="lane-end-node" cx="282" cy="20" r="8" />
        {lane.status === "candidate" && <text className="lane-mark" x="282" y="24" textAnchor="middle">?</text>}
        {lane.status === "refuted" && <path className="lane-mark" d="M277 15 L287 25 M287 15 L277 25" />}
        {lane.status === "confirmed" && <path className="lane-mark" d="M277 20 L281 24 L288 16" />}
        {lane.status === "stale" && <path className="lane-mark" d="M287 16 A6 6 0 1 0 288 22" />}
      </g>
    </svg>
  );
}
