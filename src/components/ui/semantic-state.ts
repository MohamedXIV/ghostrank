export type TruthLevel =
  | "confirmed"
  | "observed"
  | "inferred"
  | "rumored"
  | "stale"
  | "unknown";

export interface TruthLevelMeta {
  label: string;
  glyph: string;
}

/**
 * Presentation-only epistemic vocabulary.
 *
 * These labels never determine simulation truth. UI callers must choose a
 * level from player-safe projection facts they already received.
 */
export const TRUTH_LEVEL_META: Readonly<Record<TruthLevel, TruthLevelMeta>> = {
  confirmed: { label: "CONFIRMED", glyph: "✓" },
  observed: { label: "OBSERVED", glyph: "◉" },
  inferred: { label: "INFERRED", glyph: "◇" },
  rumored: { label: "RUMORED", glyph: "≈" },
  stale: { label: "STALE", glyph: "◷" },
  unknown: { label: "UNKNOWN", glyph: "?" },
};

export function truthLevelMeta(level: TruthLevel): TruthLevelMeta {
  return TRUTH_LEVEL_META[level];
}

/**
 * Presentation-only relationship vocabulary derived from player-observable facts.
 *
 * Never introduces a parallel simulation boolean: "rival" derives from
 * surfaced relationship/history information (such as active retaliation, unmasking,
 * or hostile stance with scene heat).
 */
export type RelationshipCategory =
  | "self"
  | "trusted"
  | "neutral"
  | "wary"
  | "hostile"
  | "rival";

export interface RelationshipCategoryMeta {
  category: RelationshipCategory;
  label: string;
  glyph: string;
  description: string;
}

export const RELATIONSHIP_CATEGORY_META: Readonly<
  Record<RelationshipCategory, RelationshipCategoryMeta>
> = {
  self: {
    category: "self",
    label: "YOU",
    glyph: "◆",
    description: "Your active handle in the underground index",
  },
  trusted: {
    category: "trusted",
    label: "TRUSTED",
    glyph: "◈",
    description: "Established partner with cooperative standing",
  },
  neutral: {
    category: "neutral",
    label: "NEUTRAL",
    glyph: "○",
    description: "Standard peer with no notable friction or alliance",
  },
  wary: {
    category: "wary",
    label: "WARY",
    glyph: "▲",
    description: "Guarded or cautious stance based on observed activity",
  },
  hostile: {
    category: "hostile",
    label: "HOSTILE",
    glyph: "✕",
    description: "Direct opposition or grievance against your handle",
  },
  rival: {
    category: "rival",
    label: "RIVAL",
    glyph: "⚡",
    description: "Active antagonist with open retaliation or direct conflict",
  },
};

export function deriveRelationshipCategory(options: {
  stance?: string | null;
  hasHeat?: boolean;
  isPlayer?: boolean;
}): RelationshipCategory {
  if (options.isPlayer) {
    return "self";
  }
  if (options.hasHeat) {
    return "rival";
  }
  const s = options.stance?.toLowerCase();
  if (s === "friendly" || s === "trusted") {
    return "trusted";
  }
  if (s === "hostile") {
    return "hostile";
  }
  if (s === "wary") {
    return "wary";
  }
  return "neutral";
}

export function relationshipCategoryMeta(
  category: RelationshipCategory,
): RelationshipCategoryMeta {
  return RELATIONSHIP_CATEGORY_META[category];
}

/**
 * Presentation-only confidence levels for assistant inferences.
 */
export type EvidenceConfidence = "low" | "medium" | "high";

export interface EvidenceConfidenceMeta {
  level: EvidenceConfidence;
  label: string;
  glyph: string;
  meterSegments: number; // 1 to 3
}

export const EVIDENCE_CONFIDENCE_META: Readonly<
  Record<EvidenceConfidence, EvidenceConfidenceMeta>
> = {
  low: {
    level: "low",
    label: "LOW CONFIDENCE",
    glyph: "▪▫▫",
    meterSegments: 1,
  },
  medium: {
    level: "medium",
    label: "MED CONFIDENCE",
    glyph: "▪▪▫",
    meterSegments: 2,
  },
  high: {
    level: "high",
    label: "HIGH CONFIDENCE",
    glyph: "▪▪▪",
    meterSegments: 3,
  },
};

export function evidenceConfidenceMeta(
  confidence: string | null | undefined,
): EvidenceConfidenceMeta {
  const norm = (confidence?.toLowerCase() ?? "low") as EvidenceConfidence;
  return EVIDENCE_CONFIDENCE_META[norm] ?? EVIDENCE_CONFIDENCE_META.low;
}

/**
 * Contract objective presentation categories.
 */
export type ContractObjectiveCategory =
  | "recon-report"
  | "infrastructure-map"
  | "quiet-recon"
  | "intrusion"
  | "unknown";

export interface ContractObjectiveMeta {
  category: ContractObjectiveCategory;
  familyLabel: string;
  badge: string;
  glyph: string;
  description: string;
}

export const CONTRACT_OBJECTIVE_META: Readonly<
  Record<ContractObjectiveCategory, ContractObjectiveMeta>
> = {
  "recon-report": {
    category: "recon-report",
    familyLabel: "RECONNAISSANCE",
    badge: "RECON",
    glyph: "◎",
    description: "Profile verification and public intelligence gathering",
  },
  "infrastructure-map": {
    category: "infrastructure-map",
    familyLabel: "TOPOLOGY MAP",
    badge: "TOPOLOGY",
    glyph: "☲",
    description: "Discovery and mapping of connected target machine nodes",
  },
  "quiet-recon": {
    category: "quiet-recon",
    familyLabel: "SILENT PROBE",
    badge: "SILENT",
    glyph: "◌",
    description: "Service enumeration while keeping simulated trace footprint minimal",
  },
  intrusion: {
    category: "intrusion",
    familyLabel: "INTRUSION",
    badge: "INTRUSION",
    glyph: "⚡",
    description: "Deep penetration and escalation into secured infrastructure services",
  },
  unknown: {
    category: "unknown",
    familyLabel: "CONTRACT",
    badge: "TASK",
    glyph: "◇",
    description: "Unspecified underground commission",
  },
};

export function contractObjectiveMeta(
  objective: string | null | undefined,
): ContractObjectiveMeta {
  const norm = (objective?.toLowerCase() ?? "unknown") as ContractObjectiveCategory;
  return CONTRACT_OBJECTIVE_META[norm] ?? CONTRACT_OBJECTIVE_META.unknown;
}

/**
 * Contract deadline urgency presentation states.
 */
export type DeadlineUrgency =
  | "delivered"
  | "expired"
  | "urgent"
  | "closing"
  | "calm";

export interface DeadlineUrgencyMeta {
  urgency: DeadlineUrgency;
  label: string;
  glyph: string;
}

export const DEADLINE_URGENCY_META: Readonly<
  Record<DeadlineUrgency, DeadlineUrgencyMeta>
> = {
  delivered: {
    urgency: "delivered",
    label: "DELIVERED",
    glyph: "✓",
  },
  expired: {
    urgency: "expired",
    label: "EXPIRED",
    glyph: "✕",
  },
  urgent: {
    urgency: "urgent",
    label: "EXPIRING SOON",
    glyph: "⚠",
  },
  closing: {
    urgency: "closing",
    label: "CLOSING",
    glyph: "◷",
  },
  calm: {
    urgency: "calm",
    label: "ON SCHEDULE",
    glyph: "⏱",
  },
};

export function deriveDeadlineUrgency(options: {
  currentMinute: number;
  deadlineMinute: number;
  status: string;
}): {
  urgency: DeadlineUrgency;
  minutesRemaining: number;
  meta: DeadlineUrgencyMeta;
} {
  if (options.status === "completed") {
    return {
      urgency: "delivered",
      minutesRemaining: 0,
      meta: DEADLINE_URGENCY_META.delivered,
    };
  }
  if (options.status === "expired" || options.currentMinute >= options.deadlineMinute) {
    return {
      urgency: "expired",
      minutesRemaining: 0,
      meta: DEADLINE_URGENCY_META.expired,
    };
  }
  const minutesRemaining = Math.max(0, options.deadlineMinute - options.currentMinute);
  // Less than 6 in-game hours remaining (360 minutes) is urgent
  if (minutesRemaining <= 360) {
    return {
      urgency: "urgent",
      minutesRemaining,
      meta: DEADLINE_URGENCY_META.urgent,
    };
  }
  // Less than 24 in-game hours (1440 minutes) is closing
  if (minutesRemaining <= 1440) {
    return {
      urgency: "closing",
      minutesRemaining,
      meta: DEADLINE_URGENCY_META.closing,
    };
  }
  return {
    urgency: "calm",
    minutesRemaining,
    meta: DEADLINE_URGENCY_META.calm,
  };
}

/**
 * Machine role metadata for infrastructure topology.
 */
export interface MachineRoleMeta {
  role: string;
  label: string;
  glyph: string;
  tier: "ingress" | "gateway" | "core" | "vault" | "storage" | "general";
}

export function machineRoleMeta(role: string | null | undefined): MachineRoleMeta {
  const norm = role?.toLowerCase() ?? "unknown";
  switch (norm) {
    case "edge":
    case "gateway":
    case "relay":
      return {
        role: norm,
        label: norm.toUpperCase(),
        glyph: "☵",
        tier: "gateway",
      };
    case "ops":
    case "workbench":
    case "compute":
      return {
        role: norm,
        label: norm.toUpperCase(),
        glyph: "⚙",
        tier: "core",
      };
    case "vault":
    case "ledger":
      return {
        role: norm,
        label: norm.toUpperCase(),
        glyph: "🔒",
        tier: "vault",
      };
    case "storage":
    case "archive":
    case "cache":
    case "locker":
      return {
        role: norm,
        label: norm.toUpperCase(),
        glyph: "▤",
        tier: "storage",
      };
    default:
      return {
        role: norm,
        label: norm.toUpperCase(),
        glyph: "▣",
        tier: "general",
      };
  }
}
