import type { HTMLAttributes } from "react";

import {
  truthLevelMeta,
  type TruthLevel,
} from "@/components/ui/semantic-state";
import { cn } from "@/lib/utils";

export interface TruthMarkProps extends HTMLAttributes<HTMLSpanElement> {
  level: TruthLevel;
  label?: string;
}

export function TruthMark({
  level,
  label,
  className,
  ...props
}: TruthMarkProps) {
  const meta = truthLevelMeta(level);

  return (
    <span
      className={cn("truth-mark", className)}
      data-truth-level={level}
      {...props}
    >
      <span className="truth-mark-glyph" aria-hidden="true">
        {meta.glyph}
      </span>
      <span>{label ?? meta.label}</span>
    </span>
  );
}
