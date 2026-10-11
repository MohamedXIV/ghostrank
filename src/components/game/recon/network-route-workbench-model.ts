import type { VisibleNetworkRouteChallenge } from "@/game/simulation/projection/project-world";

/**
 * Pure presentation model for the Network Mapping workbench.
 *
 * It reads only player-safe projected fields. It never judges whether a route
 * is correct: the simulation owns verdicts and the player compares clues with
 * the drawn hypotheses. Costs are challenge-level in the simulation (not per
 * route), so the one projected preview is accurate for any selected candidate.
 */
type Candidate = VisibleNetworkRouteChallenge["candidates"][number];
type Preview = VisibleNetworkRouteChallenge["preview"];

export type RouteCandidateStatus = Candidate["status"];
export type RouteCarrier = Candidate["carrier"];
export type RouteEcho = Candidate["echo"];
export type RouteLinkKind = "hypothesis" | "verified";

export interface NetworkRouteLaneModel {
  id: string;
  label: string;
  carrier: RouteCarrier;
  echo: RouteEcho;
  status: RouteCandidateStatus;
  statusLabel: string;
  endLabel: string;
  /** Only a confirmed route is ever presented as a verified link. */
  linkKind: RouteLinkKind;
  /** Non-colour cue: observed carrier class is drawn solid or dashed. */
  lineStyle: "solid" | "dashed";
  selected: boolean;
}

export interface NetworkRouteClueModel {
  resolved: boolean;
  value: string | null;
  label: string;
}

export interface NetworkRouteInspectorModel {
  heading: string;
  detail: string;
  costText: string | null;
  unavailableText: string | null;
  canCommit: boolean;
  blockedReason: string | null;
}

export interface NetworkRouteWorkbenchModel {
  challengeId: string;
  caveat: string;
  clues: { carrier: NetworkRouteClueModel; echo: NetworkRouteClueModel };
  lanes: NetworkRouteLaneModel[];
  selected: NetworkRouteLaneModel | null;
  inspector: NetworkRouteInspectorModel;
}

const STATUS_LABEL: Record<RouteCandidateStatus, string> = {
  candidate: "CANDIDATE",
  refuted: "REFUTED",
  confirmed: "CONFIRMED",
  stale: "STALE",
};

const END_LABEL: Record<RouteCandidateStatus, string> = {
  candidate: "UNVERIFIED",
  refuted: "NOT THIS LINK",
  confirmed: "VERIFIED LINK",
  stale: "RETEST",
};

const STATUS_DETAIL: Record<RouteCandidateStatus, string> = {
  candidate: "Untested. Its result stays uncertain until you verify it.",
  refuted: "Tested in this network epoch and refuted. It cannot be tested again here.",
  confirmed: "Tested in this network epoch and confirmed.",
  stale: "Tested in an earlier network epoch. Retest it against the current evidence.",
};

const CARRIER_NAME: Record<RouteCarrier, string> = {
  public: "Public carrier",
  sealed: "Sealed carrier",
};

const UNAVAILABLE = "Route verification unavailable: gather the current sourced clues.";
const CAVEAT = "Candidate links are hypotheses, not observed destination machines.";

function clue(value: string | undefined): NetworkRouteClueModel {
  return value
    ? { resolved: true, value, label: value }
    : { resolved: false, value: null, label: "UNRESOLVED" };
}

function inspectorFor(
  lane: NetworkRouteLaneModel,
  preview: Preview,
): NetworkRouteInspectorModel {
  const tested = lane.status === "refuted" || lane.status === "confirmed";
  return {
    heading: lane.label,
    detail: `${CARRIER_NAME[lane.carrier]} · ${lane.echo} echo. ${STATUS_DETAIL[lane.status]}`,
    costText: preview
      ? `Testing costs ${preview.minutes} world minutes and +${preview.traceWeight} trace, whether or not this link is correct.`
      : null,
    unavailableText: preview ? null : UNAVAILABLE,
    canCommit: preview !== null && !tested,
    blockedReason: tested
      ? "Already tested in this network epoch."
      : preview ? null : "Gather the current sourced clues before testing.",
  };
}

export function buildNetworkRouteWorkbench(
  challenge: VisibleNetworkRouteChallenge,
  selectedId: string | null,
): NetworkRouteWorkbenchModel {
  const lanes: NetworkRouteLaneModel[] = challenge.candidates.map(candidate => ({
    id: candidate.id,
    label: candidate.label,
    carrier: candidate.carrier,
    echo: candidate.echo,
    status: candidate.status,
    statusLabel: STATUS_LABEL[candidate.status],
    endLabel: END_LABEL[candidate.status],
    linkKind: candidate.status === "confirmed" ? "verified" : "hypothesis",
    lineStyle: candidate.carrier === "sealed" ? "dashed" : "solid",
    selected: candidate.id === selectedId,
  }));
  const selected = lanes.find(lane => lane.selected) ?? null;
  const preview = challenge.preview;

  return {
    challengeId: challenge.id,
    caveat: CAVEAT,
    clues: {
      carrier: clue(challenge.known.carrier),
      echo: clue(challenge.known.echo),
    },
    lanes,
    selected,
    inspector: selected
      ? inspectorFor(selected, preview)
      : {
          heading: "No hypothesis selected",
          detail: "Select a route to inspect its carrier, echo and status before testing it.",
          costText: null,
          unavailableText: preview ? null : UNAVAILABLE,
          canCommit: false,
          blockedReason: "Select a route first.",
        },
  };
}
