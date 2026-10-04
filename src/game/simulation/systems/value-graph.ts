import { FENCE_COUNTERPARTY } from "@/content/player-tool-catalog";
import { LANDLORD_COUNTERPARTY } from "@/content/housing-catalog";
import { PROVIDER_COUNTERPARTY } from "@/content/model-catalog";
import { VENDOR_COUNTERPARTY } from "@/content/software-catalog";
import { MARKET_COUNTERPARTY } from "@/content/hardware-catalog";
import type { LedgerCauseKind } from "@/game/simulation/state/world-state";

/**
 * The digital-value graph: the design's promise that "digital currencies are
 * represented as transaction graphs, not anonymous money bars"
 * (`docs/ECONOMY_PROGRESSION_AND_SKILLS.md`). It is derived, never stored — a
 * read of the same append-only ledger P0 seeded and P5 gave its first named
 * edges. Every credit and debit already records a counterparty, so the graph
 * just aggregates those movements by who the player exchanged value with.
 *
 * It is honestly player-centred: the simulation tracks the *player's* money, so
 * this is the player's value network, not a fabricated NPC↔NPC economy. True
 * multi-hop chains across simulated peers need credit flows between actors,
 * which later slices add; nothing here invents edges the ledger did not record.
 */

export type ValueNodeKind = "peer" | "institution";

/** A named role the money passes through, not a person in the scene. */
const INSTITUTION_COUNTERPARTIES: ReadonlySet<string> = new Set([
  MARKET_COUNTERPARTY,
  LANDLORD_COUNTERPARTY,
  VENDOR_COUNTERPARTY,
  FENCE_COUNTERPARTY,
  PROVIDER_COUNTERPARTY,
]);

/**
 * A single counterparty node, aggregated from every ledger movement that named
 * them. Amounts are player-relative: `received` is credits the counterparty
 * gave the player, `paid` is credits the player gave them.
 */
export interface ValueNode {
  /** Stable key: the resolved counterparty handle or role label. */
  id: string;
  kind: ValueNodeKind;
  received: number;
  paid: number;
  /** Net flow toward the player: received − paid. */
  net: number;
  interactions: number;
  firstWorldMinute: number;
  lastWorldMinute: number;
  /** Distinct ledger cause kinds that touched this counterparty. */
  causeKinds: LedgerCauseKind[];
}

/** The graph summary: whole-network totals and every node, sorted stably. */
export interface ValueGraph {
  counterparties: number;
  totalInflow: number;
  totalOutflow: number;
  net: number;
  nodes: ValueNode[];
}

interface LedgerMovement {
  counterparty: string;
  direction: "credit" | "debit";
  amount: number;
  causeKind: LedgerCauseKind;
  worldMinute: number;
}

/**
 * Aggregate ledger movements into the player's value graph. Deterministic:
 * nodes sort by total volume (inflow + outflow) descending, then by id, so the
 * most-traded counterparties lead regardless of ledger insertion order. The
 * `causeKinds` on each node are de-duplicated and sorted for a stable read.
 */
export function deriveValueGraph(
  movements: readonly LedgerMovement[],
): ValueGraph {
  const nodes = new Map<string, ValueNode>();
  const causes = new Map<string, Set<LedgerCauseKind>>();

  for (const movement of movements) {
    let node = nodes.get(movement.counterparty);

    if (!node) {
      // A node only exists once it has recorded a movement, so the first
      // minute and last minute both seed from that movement.
      node = {
        id: movement.counterparty,
        kind: INSTITUTION_COUNTERPARTIES.has(movement.counterparty)
          ? "institution"
          : "peer",
        received: 0,
        paid: 0,
        net: 0,
        interactions: 0,
        firstWorldMinute: movement.worldMinute,
        lastWorldMinute: movement.worldMinute,
        causeKinds: [],
      };
      nodes.set(node.id, node);
      causes.set(node.id, new Set());
    }

    if (movement.direction === "credit") {
      node.received += movement.amount;
    } else {
      node.paid += movement.amount;
    }

    node.net = node.received - node.paid;
    node.interactions += 1;
    node.firstWorldMinute = Math.min(
      node.firstWorldMinute,
      movement.worldMinute,
    );
    node.lastWorldMinute = Math.max(node.lastWorldMinute, movement.worldMinute);
    causes.get(node.id)!.add(movement.causeKind);
  }

  const list: ValueNode[] = [];

  for (const node of nodes.values()) {
    list.push({ ...node, causeKinds: [...causes.get(node.id)!].sort() });
  }

  list.sort(
    (a, b) =>
      b.paid + b.received - (a.paid + a.received) || a.id.localeCompare(b.id),
  );

  const totalInflow = list.reduce((sum, node) => sum + node.received, 0);
  const totalOutflow = list.reduce((sum, node) => sum + node.paid, 0);

  return {
    counterparties: list.length,
    totalInflow,
    totalOutflow,
    net: totalInflow - totalOutflow,
    nodes: list,
  };
}
