

// hooks/UsePagedTable.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type KeyGetter<T> = (item: T, index: number) => string;

export type UsePagedTableOptions<T> = {
  /** Number of rows to load per page (default 30) */
  pageSize?: number;
  /** Optional client-side filter before paging */
  filter?: (row: T) => boolean;
  /** Optional client-side sort before paging */
  sortCompare?: (a: T, b: T) => number;
  /** Optional key extractor (default uses `id` or index) */
  keyExtractor?: KeyGetter<T>;
};

export type UsePagedTableResult<T> = {
  /** Rows currently visible (paged) */
  rows: T[];
  /** Call from FlatList.onEndReached */
  onEndReached: () => void;
  /** True when we are extending the page */
  isPaging: boolean;
  /** True when there are no more rows to load */
  isEnd: boolean;
  /** Reset to first page (e.g., on tab change) */
  reset: () => void;
  /** Stable key extractor for FlatList */
  keyExtractor: KeyGetter<T>;
  /** Total rows after filter/sort (for badges/counters) */
  total: number;
};

/**
 * Light-weight client-side pagination for grid/table views.
 * Pass your full dataset; this hook will filter/sort (optionally) and then reveal rows in pages.
 */
export default function usePagedTable<T>(
  data: T[] | undefined | null,
  opts: UsePagedTableOptions<T> = {}
): UsePagedTableResult<T> {
  const {
    pageSize = 30,
    filter,
    sortCompare,
    keyExtractor: userKeyExtractor,
  } = opts;

  // Derived master list (filtered + sorted)
  const master = useMemo(() => {
    const base = (data ?? []).slice();
    const f = filter ? base.filter(filter) : base;
    const s = sortCompare ? f.sort(sortCompare) : f;
    return s;
  }, [data, filter, sortCompare]);

  const total = master.length;

  // Paging state
  const [limit, setLimit] = useState(pageSize);
  const isPagingRef = useRef(false);

  // Reset when data (or pageSize) changes
  useEffect(() => {
    setLimit(pageSize);
    isPagingRef.current = false;
  }, [pageSize, total]);

  const rows = useMemo(() => master.slice(0, Math.min(limit, total)), [master, limit, total]);
  const isEnd = rows.length >= total;
  const isPaging = isPagingRef.current;

  const onEndReached = useCallback(() => {
    if (isPagingRef.current || isEnd) return;
    isPagingRef.current = true;
    // Simulate async to let FlatList settle
    setTimeout(() => {
      setLimit((prev) => Math.min(prev + pageSize, total));
      isPagingRef.current = false;
    }, 0);
  }, [isEnd, pageSize, total]);

  const reset = useCallback(() => {
    isPagingRef.current = false;
    setLimit(pageSize);
  }, [pageSize]);

  const keyExtractor: KeyGetter<T> = useCallback(
    userKeyExtractor ?? ((item: any, index: number) => String(item?.id ?? index)),
    [userKeyExtractor]
  );

  return { rows, onEndReached, isPaging, isEnd, reset, keyExtractor, total };
}