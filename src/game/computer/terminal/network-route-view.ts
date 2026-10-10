import type { VisibleNetworkRouteChallenge } from "@/game/simulation/projection/project-world";

/**
 * Read-only terminal views come exclusively from player-safe projections.
 * Mutating 'path test' is deliberately left to the ordinary typed parser.
 */
export function renderNetworkRouteQuery(
  input: string,
  routes: readonly VisibleNetworkRouteChallenge[] | undefined,
): string | null {
  const parts = input.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== "path" ||
      !["map", "inspect", "preview"].includes(parts[1]?.toLowerCase() ?? "")) {
    return null;
  }
  const action = parts[1]!.toLowerCase();
  const [targetId, challengeId, routeId] = parts.slice(2);
  if (!targetId || (action === "map" && parts.length !== 3) ||
      (action !== "map" && parts.length !== 5)) {
    return "Usage: path map <target> | path inspect <target> <challenge> <route> | path preview <target> <challenge> <route>";
  }
  const available = (routes ?? []).filter(route => route.targetId === targetId);
  if (!available.length) return "No observed route challenge on this target. Survey a known entry first.";

  if (action === "map") {
    return available.flatMap(challenge => [
      `NETWORK MAP ${challenge.id} (${challenge.targetId})`,
      `Known carrier: ${challenge.known.carrier ?? "UNRESOLVED"} | echo: ${challenge.known.echo ?? "UNRESOLVED"}`,
      ...challenge.candidates.map(candidate =>
        `  ${candidate.id}: ${candidate.label} | ${candidate.carrier} | ${candidate.echo} | ${candidate.status.toUpperCase()}`),
      "Select a link with 'path inspect' and preview the consequences with 'path preview'.",
    ]).join("\n");
  }
  const challenge = available.find(item => item.id === challengeId);
  const candidate = challenge?.candidates.find(item => item.id === routeId);
  if (!challenge || !candidate) return "Unknown observed challenge/route for this target.";

  if (action === "inspect") {
    return `${candidate.label} [${candidate.id}]\nCarrier: ${candidate.carrier}\nEcho: ${candidate.echo}\nStatus: ${candidate.status.toUpperCase()}\nThis is only a hypothesis until verified.`;
  }
  if (candidate.status === "confirmed" || candidate.status === "refuted") {
    return `Route already tested in this epoch: ${candidate.status.toUpperCase()}.`;
  }
  if (!challenge.preview) return "Route test not ready: obtain current sourced clues or start an eligible operation.";
  return `Preview: ${challenge.preview.minutes} world minutes, +${challenge.preview.traceWeight} trace.\nCommit with path test ${targetId} ${challenge.id} ${candidate.id}`;
}
