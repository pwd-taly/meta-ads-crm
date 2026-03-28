import { useState, useCallback } from "react";

export function useBulkSelect<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const hasSelection = selectedIds.size > 0;

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    deselectAll,
    isSelected,
    isAllSelected,
    hasSelection,
    count: selectedIds.size,
  };
}
