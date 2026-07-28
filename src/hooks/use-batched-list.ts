import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Renderiza uma lista grande em lotes (padrão 100 itens) para não travar a UI.
 * Devolve os itens visíveis + um ref de sentinela pra carregar o próximo lote ao rolar.
 */
export function useBatchedList<T>(items: T[], batchSize = 100) {
  const [count, setCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCount(batchSize);
  }, [items, batchSize]);

  const visible = useMemo(() => items.slice(0, count), [items, count]);
  const hasMore = count < items.length;

  const loadMore = useCallback(() => {
    setCount((current) => Math.min(current + batchSize, items.length));
  }, [batchSize, items.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return { visible, hasMore, loadMore, sentinelRef, total: items.length };
}
