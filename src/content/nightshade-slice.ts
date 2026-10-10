/**
 * Authored content for the Nightshade briefing, the first interactive G3 slice
 * (D071). Rules live in `systems/nightshade-slice.ts`; this file holds the
 * words the player reads and the fixed anchors those rules point at.
 *
 * Every line here is fiction. Machines, services and clues describe an
 * imaginary network inside the simulation, never a real host.
 */

export const NIGHTSHADE_SLICE_RULES = "nightshade-v1" as const;

export const NIGHTSHADE_TARGET_ID = "nightshade";
export const RELAY_MACHINE_ID = "ns-relay";
export const VAULT_MACHINE_ID = "ns-vault";
export const BROKER_SERVICE_ID = "ns-signal";
export const ARCHIVE_SERVICE_ID = "ns-archive";
export const SLICE_CONTRACT_ID = "contract:nightshade-briefing";

/** Infrastructure map: the relay and the vault must both be on the file. */
export const SLICE_MAP_MACHINES = 2;

/**
 * The briefing window, counted from the start of the run. When it closes with
 * the operation still open, the briefing ends as expired.
 */
export const SLICE_WINDOW_END_MINUTE = 24 * 60;

/** A footprint at or above this ends the operation by force (D071). */
export const SLICE_BURN_FOOTPRINT = 8;

export const SLICE_CLUE_IDS = [
  "opening-broker-note",
  "broker-routing",
  "rotated-routing",
] as const;
export type SliceClueId = (typeof SLICE_CLUE_IDS)[number];

export const SLICE_OUTCOMES = [
  "delivered",
  "burned",
  "retreated",
  "locked-out",
  "expired",
  "declined",
] as const;
export type SliceOutcome = (typeof SLICE_OUTCOMES)[number];

export const SLICE_CLUES: Record<SliceClueId, { title: string; text: string }> = {
  "opening-broker-note": {
    title: "Broker tip",
    text: "A broker you have not paid yet says the Outer Relay on Nightshade still answers queries nobody else can read. The tip does not say where the answers go.",
  },
  "broker-routing": {
    title: "Routing from the broker",
    text: "The Signal Broker forwards archive queries into a cold segment. The segment is not on the relay's own map. Its name is Cold Vault.",
  },
  "rotated-routing": {
    title: "Routing after the review",
    text: "The broker's routing changed after the owner's review. The archive answers only a rotated key now, and the cold segment is still the Cold Vault.",
  },
};

/** The v2 teaching story names puzzle clues, without controlling their rules. */
export const SLICE_CLUES_V2: typeof SLICE_CLUES = {
  ...SLICE_CLUES,
  "broker-routing": {
    title: "Signal Broker routing hint",
    text: "The current echo mark is TRIANGLE. Open Network Mapping in Recon to compare it with sealed-carrier candidates; the Vault is not on your map yet.",
  },
  "rotated-routing": {
    title: "Rotated Signal Broker hint",
    text: "The owner rotated the echo mark to CIRCLE. Recheck the sealed-carrier routes in Network Mapping; an old verified path is now stale.",
  },
};

/**
 * In-world reasons for failures. A key may have variants; the rules choose the
 * variant that matches what the player has actually learned.
 */
export const SLICE_FAILURE_CLUES: Record<string, string> = {
  TARGET_NOT_OBSERVED:
    "Nothing on file for Nightshade yet. Observe the target before you open anything.",
  NO_ACTIVE_OPERATION:
    "No operation is open. Open one on Nightshade once you have observed it.",
  "NO_NEW_MACHINE_EVIDENCE.unread":
    "The relay's map ends at the relay. Its broker may know where the archive is routed. Read the broker first.",
  "NO_NEW_MACHINE_EVIDENCE.pending":
    "The broker has the routing, but it answers on the owner's schedule. Check again after the next boundary.",
  "NO_NEW_MACHINE_EVIDENCE.locked":
    "The vault has been off the map since the owner's review. Only a rotated key brings it back.",
  "NO_NEW_MACHINE_EVIDENCE.known":
    "Every host the relay names is already on your map.",
  MACHINE_NOT_OBSERVED:
    "The Cold Vault is not on your map. Nothing you have read so far shows where it is.",
  NO_NEW_SERVICE_EVIDENCE:
    "Nothing new to read on that machine. Its services are already on your file.",
  SERVICE_EVIDENCE_REQUIRED:
    "Escalation needs something to aim at. The broker is the only service you can read so far.",
  ESCALATION_UNCONFIRMED:
    "Escalating costs trace you have not seen yet. Preview it first, then confirm.",
  OPERATION_ALREADY_ESCALATED:
    "You are already intrusive. The only way out of this stage is to disengage.",
  CONTRACT_NOT_ACCEPTED:
    "Accept the map contract before you deliver it.",
  "OBJECTIVE_NOT_MET.unfinished":
    "The map is not finished. The relay and the vault both have to be on it.",
  "OBJECTIVE_NOT_MET.locked":
    "The vault dropped off the map in the owner's review. Read the broker again for the rotated key, then survey.",
  SLICE_ENDED:
    "The Nightshade briefing is closed for this run. Its record is in brief.",
};

export const SLICE_OUTCOME_TEXT: Record<
  SliceOutcome,
  { title: string; text: string }
> = {
  delivered: {
    title: "Delivered",
    text: "The infrastructure map is with the broker and the contract is paid. Nightshade's owner keeps what you left behind.",
  },
  burned: {
    title: "Burned",
    text: "Your footprint crossed the line and the operation was shut down from outside. The Nightshade contract is closed.",
  },
  retreated: {
    title: "Retreated while watched",
    text: "You left with the owner already watching. They keep your footprint, and the Nightshade contract is closed.",
  },
  "locked-out": {
    title: "Locked out",
    text: "The owner's review rotated the Cold Vault while you were still on it, and you left before finding the new key.",
  },
  expired: {
    title: "Window closed",
    text: "The briefing window ran out with the operation still open. The Nightshade contract is closed.",
  },
  declined: {
    title: "Declined",
    text: "You turned the broker's contract down before starting. Nothing was touched, and the briefing is closed.",
  },
};

/**
 * Log keys the simulation writes. The presentation maps each to a line, and the
 * footprint on each entry is the footprint after that step.
 */
export const SLICE_LOG_TEXT: Record<string, string> = {
  "opening-received": "Broker tip received. Nightshade is the target.",
  "contract-offered": "Contract offered: infrastructure map of Nightshade.",
  "probe-survey": "Surveyed Nightshade's map. +1 footprint.",
  "probe-read": "Read the relay's broker. Its routing is due at the next boundary.",
  "probe-reread": "Read the broker again for the rotated key. Routing is due at the next boundary.",
  "clue-broker-routing": "The broker's routing is on file: the Cold Vault exists.",
  "clue-rotated-routing": "The broker's rotated routing is on file.",
  escalate: "Escalated to intrusive. The vault answered directly.",
  "escalate-v2": "Escalated to intrusive. A spectral routing hint appeared; the Vault still needs proof.",
  "disengage-recon": "Disengaged from recon.",
  "disengage-intrusive": "Disengaged from an intrusive stage.",
  "watch-started": "The owner started watching Nightshade.",
  "review-scheduled": "The owner's review is scheduled for the next boundary.",
  "review-ran": "The owner's review rotated the Cold Vault's key.",
  delivered: "Infrastructure map delivered.",
  burned: "Footprint crossed the burn line.",
  retreated: "Left the operation while the owner was watching.",
  "locked-out": "Left the operation after the owner's review.",
  expired: "The briefing window closed with the operation open.",
  declined: "Declined the broker's contract.",
};
