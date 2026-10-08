export interface TimelinePage<T> {
  page: number;
  pageCount: number;
  startIndex: number;
  endIndex: number;
  items: T[];
}

/** Return one bounded, chronological page of an archived run timeline. */
export function paginateTimeline<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): TimelinePage<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize));
  const page = Math.min(
    pageCount - 1,
    Math.max(0, Math.floor(requestedPage)),
  );
  const endIndex = Math.max(0, items.length - page * safePageSize);
  const startIndex = Math.max(0, endIndex - safePageSize);

  return {
    page,
    pageCount,
    startIndex,
    endIndex,
    items: items.slice(startIndex, endIndex),
  };
}
