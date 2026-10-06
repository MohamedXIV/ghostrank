import { describe, expect, it } from "vitest";

import { getWindowMotionProps } from "./window-motion";

describe("OS window motion", () => {
  it("uses a restrained enter and exit transition when motion is allowed", () => {
    expect(getWindowMotionProps(false)).toEqual({
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 8 },
      transition: { duration: 0.18, ease: "easeOut" },
    });
  });

  it("keeps windows stationary and immediate for reduced motion", () => {
    expect(getWindowMotionProps(true)).toEqual({
      initial: false,
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    });
  });
});
