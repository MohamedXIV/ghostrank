import { useReducedMotion } from "motion/react";

import { usePresentationStore } from "@/stores/ui/use-presentation-store";

export function useEffectiveReducedMotion(): boolean {
  const systemReducedMotion = useReducedMotion();
  const motionMode = usePresentationStore((state) => state.motionMode);

  if (motionMode === "reduce") {
    return true;
  }
  if (motionMode === "standard") {
    return false;
  }
  return systemReducedMotion !== false;
}

export function getWindowMotionProps(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.18, ease: "easeOut" as const },
  };
}
