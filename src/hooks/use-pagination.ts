import { useEffect, useMemo, useState } from "react";

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  hasPrev: boolean;
  hasNext: boolean;
  goTo: (page: number) => void;
  next: () => void;
  prev: () => void;
}

/** Paginação simples no cliente: mostra apenas uma página de itens por vez. */
export function usePagination<T>(items: T[], pageSize = 100): PaginationResult<T> {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const current = Math.min(page, pageCount);

  const visible = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(1, next), pageCount));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    items: visible,
    page: current,
    pageCount,
    total,
    rangeStart: total === 0 ? 0 : (current - 1) * pageSize + 1,
    rangeEnd: Math.min(current * pageSize, total),
    hasPrev: current > 1,
    hasNext: current < pageCount,
    goTo,
    next: () => goTo(current + 1),
    prev: () => goTo(current - 1),
  };
}
