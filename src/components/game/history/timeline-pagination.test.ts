import { describe, expect, it } from "vitest";

import { paginateTimeline } from "./timeline-pagination";

describe("paginateTimeline", () => {
  const events = Array.from({ length: 250 }, (_, index) => index);

  it("starts at the newest events and preserves order within the page", () => {
    expect(paginateTimeline(events, 0, 100)).toEqual({
      page: 0,
      pageCount: 3,
      startIndex: 150,
      endIndex: 250,
      items: events.slice(150),
    });
  });

  it("clamps a stale page to the oldest available page", () => {
    const page = paginateTimeline(events, 99, 100);

    expect(page.page).toBe(2);
    expect(page.startIndex).toBe(0);
    expect(page.endIndex).toBe(50);
    expect(page.items).toEqual(events.slice(0, 50));
  });

  it("returns one empty page for a run without events", () => {
    expect(paginateTimeline([], 0, 100)).toEqual({
      page: 0,
      pageCount: 1,
      startIndex: 0,
      endIndex: 0,
      items: [],
    });
  });
});
