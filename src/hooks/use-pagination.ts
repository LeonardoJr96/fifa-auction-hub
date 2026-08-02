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

export interface PaginationOptions {
  /** Página controlada (ex.: search param da URL). */
  page?: number;
  /** Chamado quando a página muda; obrigatório no modo controlado. */
  onPageChange?: (page: number) => void;
}

/** Paginação no cliente. Aceita modo controlado para sincronizar com a URL. */
export function usePagination<T>(
  items: T[],
  pageSize = 100,
  options: PaginationOptions = {},
): PaginationResult<T> {
  const controlled = options.page !== undefined && options.onPageChange !== undefined;
  const [internalPage, setInternalPage] = useState(controlled ? Number(options.page) || 1 : 1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const externalPage = controlled ? Number(options.page) || 1 : null;

  // Espelha a página da URL quando ela muda por fora (link, voltar/avançar).
  useEffect(() => {
    if (externalPage !== null) setInternalPage(externalPage);
  }, [externalPage]);

  // Sem controle externo, qualquer mudança na lista volta pro início.
  useEffect(() => {
    if (!controlled) setInternalPage(1);
  }, [items, pageSize, controlled]);

  const current = Math.min(Math.max(1, internalPage), pageCount);

  const visible = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  const goTo = (next: number) => {
    const target = Math.min(Math.max(1, next), pageCount);
    setInternalPage(target);
    if (controlled) options.onPageChange?.(target);
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
