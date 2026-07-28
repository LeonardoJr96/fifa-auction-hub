import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Persiste no navegador (IndexedDB) as queries pesadas — hoje a lista de produtos,
 * que traz as fotos em base64. Assim trocar de página/rota não refaz o download.
 */
export function useQueryCachePersistence(queryClient: QueryClient) {
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ persistQueryClient }, { createAsyncStoragePersister }, idb] = await Promise.all([
        import("@tanstack/react-query-persist-client"),
        import("@tanstack/query-async-storage-persister"),
        import("idb-keyval"),
      ]);
      if (cancelled) return;

      const store = idb.createStore("reversedraft-cache", "queries");

      const persister = createAsyncStoragePersister({
        storage: {
          getItem: (key) => idb.get(key, store).then((value) => value ?? null),
          setItem: (key, value) => idb.set(key, value, store),
          removeItem: (key) => idb.del(key, store),
        },
        key: "reversedraft-query-cache",
        throttleTime: 2000,
      });

      type PersistOptions = Parameters<typeof persistQueryClient>[0];

      const [unsubscribe] = persistQueryClient({
        queryClient: queryClient as unknown as PersistOptions["queryClient"],
        persister,

        maxAge: 24 * 60 * 60 * 1000,
        buster: "v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const root = query.queryKey[0];
            return (
              query.state.status === "success" && (root === "products" || root === "player")
            );
          },
        },
      });
      dispose = unsubscribe;
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [queryClient]);
}
