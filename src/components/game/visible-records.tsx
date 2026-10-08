import type { ReactNode } from "react";

export const RECORDS_PER_PAGE = 25;

export function recordPageCount(
  lists: readonly (readonly unknown[])[],
): number {
  return Math.max(
    1,
    ...lists.map((records) => Math.ceil(records.length / RECORDS_PER_PAGE)),
  );
}

export function visibleRecords<T>(
  records: readonly T[],
  requestedPage: number,
): readonly T[] {
  if (records.length <= RECORDS_PER_PAGE) {
    return records;
  }

  const pageCount = Math.max(1, Math.ceil(records.length / RECORDS_PER_PAGE));
  const page = Math.min(pageCount - 1, Math.max(0, Math.floor(requestedPage)));
  const start = page * RECORDS_PER_PAGE;

  return records.slice(start, start + RECORDS_PER_PAGE);
}

export function RecordScopeControl({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (nextPage: number) => void;
}): ReactNode {
  if (pageCount <= 1) {
    return null;
  }
  const boundedPage = Math.min(pageCount - 1, Math.max(0, page));

  return (
    <nav className="record-scope-control" aria-label="Long record lists">
      <button
        type="button"
        disabled={boundedPage === 0}
        onClick={() => onPageChange(boundedPage - 1)}
      >
        PREVIOUS SET
      </button>
      <span aria-live="polite">
        SET {boundedPage + 1} OF {pageCount}
        {" // "}
        UP TO {RECORDS_PER_PAGE} PER LIST
      </span>
      <button
        type="button"
        disabled={boundedPage >= pageCount - 1}
        onClick={() => onPageChange(boundedPage + 1)}
      >
        NEXT SET
      </button>
    </nav>
  );
}
