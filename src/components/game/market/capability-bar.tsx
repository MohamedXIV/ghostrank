import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CapabilityMetric =
  | "compute"
  | "memory"
  | "vram"
  | "storage"
  | "network";

export interface CapabilityMetricMeta {
  metric: CapabilityMetric;
  label: string;
  glyph: string;
  shortLabel: string;
}

export const CAPABILITY_METRIC_META: Readonly<
  Record<CapabilityMetric, CapabilityMetricMeta>
> = {
  compute: {
    metric: "compute",
    label: "Compute",
    glyph: "⚙",
    shortLabel: "CPU",
  },
  memory: {
    metric: "memory",
    label: "Memory",
    glyph: "▥",
    shortLabel: "MEM",
  },
  vram: {
    metric: "vram",
    label: "VRAM",
    glyph: "▦",
    shortLabel: "VRM",
  },
  storage: {
    metric: "storage",
    label: "Storage",
    glyph: "▤",
    shortLabel: "STO",
  },
  network: {
    metric: "network",
    label: "Network",
    glyph: "☵",
    shortLabel: "NET",
  },
};

export interface CapabilityBarProps extends HTMLAttributes<HTMLDivElement> {
  metric: CapabilityMetric;
  currentValue: number;
  deltaValue?: number;
  maxScale?: number;
  showExactNumbers?: boolean;
}

export function CapabilityBar({
  metric,
  currentValue,
  deltaValue = 0,
  maxScale = 32,
  showExactNumbers = true,
  className,
  ...props
}: CapabilityBarProps) {
  const meta = CAPABILITY_METRIC_META[metric];
  const safeCurrent = Math.max(0, currentValue);
  const safeDelta = Math.max(0, deltaValue);
  const total = safeCurrent + safeDelta;

  const currentPercent = Math.min(100, (safeCurrent / maxScale) * 100);
  const deltaPercent = Math.min(100 - currentPercent, (safeDelta / maxScale) * 100);

  return (
    <div
      className={cn("capability-metric-row", className)}
      data-metric={metric}
      aria-label={`${meta.label}: ${safeCurrent}${safeDelta > 0 ? ` (+${safeDelta})` : ""}`}
      {...props}
    >
      <div className="capability-metric-info">
        <span className="metric-glyph" aria-hidden="true">
          {meta.glyph}
        </span>
        <span className="metric-name">{meta.shortLabel}</span>
      </div>

      <div
        className="capability-bar-track"
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={maxScale}
      >
        <div
          className="capability-bar-current"
          style={{ width: `${currentPercent}%` }}
        />
        {deltaPercent > 0 && (
          <div
            className="capability-bar-delta"
            style={{ width: `${deltaPercent}%` }}
          />
        )}
      </div>

      {showExactNumbers && (
        <div className="capability-numeric-readout">
          <strong className="numeric-current">{safeCurrent}</strong>
          {safeDelta > 0 && (
            <span className="numeric-delta" aria-label={`Plus ${safeDelta}`}>
              +{safeDelta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
