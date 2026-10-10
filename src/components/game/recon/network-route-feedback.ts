import type { CommandResult } from "@/game/simulation/command-bus";

/**
 * Convert the observed outcome of a player's own network-route action to
 * legible feedback. No challenge truth, rank or scenario-specific rules here.
 *
 * An accepted CommandBus action is NOT necessarily a solved route: it may
 * refute the hypothesis, become stale, or be interrupted by the run ending.
 */
export function formatNetworkRouteFeedback(
  result: CommandResult,
  challengeId: string,
  routeId: string,
): string {
  if (!result.ok) {
    switch (result.error) {
      case "ROUTE_ALREADY_TESTED":
        return "Route already tested in this network epoch. Choose another link or seek newer evidence.";
      case "CLUES_INCOMPLETE":
        return "Route not tested: both current clues are needed. Inspect the source or wait for new intelligence.";
      case "RUN_ENDED":
        return "Run already ended. No route test was carried out.";
      case "ENTRY_UNOBSERVED":
        return "Route not tested: discover the entry machine before verifying a link.";
      default:
        return `Route not tested: ${result.error ?? "the operation is unavailable"}.`;
    }
  }

  const verdict = result.events.find(event =>
    event.type === "NetworkRouteTested" &&
    event.challengeId === challengeId &&
    event.routeId === routeId
  );

  if (!verdict) {
    const ended = result.events.some(event => event.type === "RunEnded");
    return ended
      ? "Run ended before a route verdict. Review the final report."
      : "No route verdict was recorded. Check the operation and its current evidence.";
  }

  switch (verdict.result) {
    case "confirmed":
      return "Route confirmed. Review the new evidence in Recon and decide your next move.";
    case "refuted":
      return "Route refuted. The attempt cost time and left trace. Compare the clues and try a different candidate.";
    case "stale":
      return "Route changed during verification. Recheck the current clues before testing another hypothesis.";
  }
}
