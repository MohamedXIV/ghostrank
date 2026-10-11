/**
 * G6 P0: The very first Recon suggestion must be sourced from what the
 * player can actually read in Underground, never hidden target ownership.
 * This is presentation-only: it does not issue a contract or grant evidence.
 */
export interface PublicOpeningContract {
  status?: string;
  targetId?: string;
  targetHandle?: string;
  expiresWorldMinute?: number;
}
export interface OpeningReconCue {
  targetId: string;
  label: string;
  source: "contract" | "observed";
  contractId?: string;
}
export function deriveOpeningReconCue(input: {
  contracts: Readonly<Record<string, PublicOpeningContract>>;
  observedTargetIds: readonly string[];
  worldMinute: number;
}): OpeningReconCue | null {
  const offers = Object.entries(input.contracts)
    .filter(([, row]) =>
      typeof row.targetId === "string" && row.targetId.length > 0 &&
      (row.status === "accepted" ||
        (row.status === "offered" &&
          Number.isFinite(row.expiresWorldMinute) &&
          row.expiresWorldMinute! >= input.worldMinute)))
    .sort(([aId, a], [bId, b]) => {
      // A contract already accepted by the player comes first.
      const aPriority = a.status === "accepted" ? 0 : 1;
      const bPriority = b.status === "accepted" ? 0 : 1;
      return aPriority - bPriority ||
        (a.expiresWorldMinute ?? Infinity) - (b.expiresWorldMinute ?? Infinity) ||
        aId.localeCompare(bId);
    });
  const offered = offers[0];
  if (offered) {
    return {
      targetId: offered[1].targetId!,
      label: offered[1].targetHandle || offered[1].targetId!,
      source: "contract",
      contractId: offered[0],
    };
  }
  // Known targets are themselves player-evidence-gated by WorldProjection.
  const observed = [...input.observedTargetIds].filter(Boolean).sort()[0];
  return observed ? { targetId: observed, label: observed, source: "observed" } : null;
}
