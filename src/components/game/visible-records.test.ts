import { describe, expect, it } from "vitest";

import {
  RECORDS_PER_PAGE,
  recordPageCount,
  visibleRecords,
} from "./visible-records";

describe("long record list pages", () => {
  it("keeps each rendered set bounded and preserves source order", () => {
    const records = Array.from({ length: 1_800 }, (_, index) => index);

    expect(visibleRecords(records, 0)).toEqual(
      records.slice(0, RECORDS_PER_PAGE),
    );
    expect(visibleRecords(records, 1)).toEqual(
      records.slice(RECORDS_PER_PAGE, RECORDS_PER_PAGE * 2),
    );
    expect(visibleRecords(records, 71)).toHaveLength(RECORDS_PER_PAGE);
  });

  it("clamps a stale page and keeps short lists complete", () => {
    const short = ["one", "two"];
    const records = Array.from({ length: 40 }, (_, index) => index);

    expect(visibleRecords(records, 99)).toEqual(records.slice(25));
    expect(visibleRecords(short, 99)).toBe(short);
  });

  it("pages every long list without dropping entries", () => {
    const short = Array.from({ length: 3 }, (_, index) => index);
    const long = Array.from({ length: 1_800 }, (_, index) => index);
    const pageCount = recordPageCount([short, long]);
    const allLongItems = Array.from({ length: pageCount }, (_, page) =>
      visibleRecords(long, page),
    ).flat();

    expect(pageCount).toBe(72);
    expect(allLongItems).toEqual(long);
    expect(recordPageCount([short])).toBe(1);
  });
});
