import type { HTMLAttributes } from "react";

import {
  deriveRelationshipCategory,
  relationshipCategoryMeta,
  type RelationshipCategory,
} from "@/components/ui/semantic-state";
import { cn } from "@/lib/utils";

export interface RelationshipBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  stance?: string | null;
  hasHeat?: boolean;
  heatKind?: string | null;
  isPlayer?: boolean;
  showHeatDetail?: boolean;
}

export function RelationshipBadge({
  stance,
  hasHeat = false,
  heatKind,
  isPlayer = false,
  showHeatDetail = true,
  className,
  ...props
}: RelationshipBadgeProps) {
  const category: RelationshipCategory = deriveRelationshipCategory({
    stance,
    hasHeat,
    isPlayer,
  });
  const meta = relationshipCategoryMeta(category);

  return (
    <span
      className={cn(
        "relationship-badge",
        `relationship-${category}`,
        hasHeat ? "is-rival-heat" : undefined,
        className,
      )}
      data-relationship={category}
      aria-label={`${meta.label}: ${meta.description}`}
      {...props}
    >
      <span className="relationship-glyph" aria-hidden="true">
        {meta.glyph}
      </span>
      <span className="relationship-label">{meta.label}</span>
      {hasHeat && showHeatDetail && (
        <span className="relationship-heat-tag" aria-label={`Heat: ${heatKind ?? "retaliation"}`}>
          {heatKind === "unmasking" ? "UNMASKING" : "HEAT"}
        </span>
      )}
    </span>
  );
}
