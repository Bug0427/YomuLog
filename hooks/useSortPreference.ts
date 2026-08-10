// hooks/useSortPreference.ts
// Shared sort preference hook with AsyncStorage persistence.
// Used by LibraryScreen and ManageDownloadsScreen for A-Z / Z-A sort.

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SortOrder = 'updated' | 'az' | 'za';

const STORAGE_KEY = '@yomulog_sort_order';

const SORT_LABELS: Record<SortOrder, string> = {
  updated: 'Recently Updated',
  az: 'A–Z',
  za: 'Z–A',
};

const SORT_ICONS: Record<SortOrder, string> = {
  updated: 'clock-outline',
  az: 'sort-alphabetical-ascending',
  za: 'sort-alphabetical-descending',
};

export { SORT_LABELS, SORT_ICONS };

/** Cycle to next sort order: updated → az → za → updated */
export function nextSortOrder(current: SortOrder): SortOrder {
  const cycle: SortOrder[] = ['updated', 'az', 'za'];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

/**
 * Sorts an array of objects by a string property.
 * If sortOrder is 'updated', returns the array unchanged (original order).
 */
export function applySortOrder<T>(
  items: T[],
  sortOrder: SortOrder,
  key: (item: T) => string,
): T[] {
  if (sortOrder === 'updated') return items;
  const sorted = [...items].sort((a, b) => {
    const aVal = (key(a) || '').toLowerCase();
    const bVal = (key(b) || '').toLowerCase();
    if (aVal < bVal) return sortOrder === 'az' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'az' ? 1 : -1;
    return 0;
  });
  return sorted;
}

export function useSortPreference(defaultOrder: SortOrder = 'updated') {
  const [sortOrder, setSortOrderRaw] = useState<SortOrder>(defaultOrder);
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'az' || stored === 'za' || stored === 'updated') {
        setSortOrderRaw(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderRaw(order);
    AsyncStorage.setItem(STORAGE_KEY, order);
  }, []);

  const cycleSort = useCallback(() => {
    setSortOrderRaw((prev) => {
      const next = nextSortOrder(prev);
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { sortOrder, setSortOrder, cycleSort, loaded, label: SORT_LABELS[sortOrder], icon: SORT_ICONS[sortOrder] };
}
