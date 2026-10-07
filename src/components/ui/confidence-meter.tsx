import type { HTMLAttributes } from "react";

import {
  evidenceConfidenceMeta,
  type EvidenceConfidence,
} from "@/components/ui/semantic-state";
import { cn } from "@/lib/utils";

export interface ConfidenceMeterProps extends HTMLAttributes<HTMLSpanElement> {
  confidence: string | EvidenceConfidence | null | undefined;
  showLabel?: boolean;
}

export function ConfidenceMeter({
  confidence,
  showLabel = true,
  className,
  ...props
}: ConfidenceMeterProps) {
  const meta = evidenceConfidenceMeta(confidence);

  return (
    <span
      className={cn("confidence-meter", `confidence-${meta.level}`, className)}
      data-confidence={meta.level}
      aria-label={`${meta.label} (${meta.meterSegments} of 3)`}
      {...props}
    >
      <span className="confidence-meter-bars" aria-hidden="true">
        {[1, 2, 3].map((seg) => (
          <span
            key={seg}
            className={cn(
              "confidence-meter-pip",
              seg <= meta.meterSegments ? "is-filled" : "is-empty",
            )}
          />
        ))}
      </span>
      {showLabel && (
        <span className="confidence-meter-label">{meta.label}</span>
      )}
    </span>
  );
}
