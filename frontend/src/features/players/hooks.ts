import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { apiListAll, apiPage, apiRequest } from "@/lib/api";
import type { Auction, Player, Product } from "@/types/api";
import { isOpenAuction } from "@/lib/auction-status";

export const productsPageQueryOptions = (page = 1, pageSize = 24) =>
  queryOptions({
    queryKey: ["products-page", { page, pageSize }],
    queryFn: () => apiPage<Product>("/products/", { page, pageSize }),
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export function useProductsPage(page = 1, pageSize = 24) {
  return useQuery(productsPageQueryOptions(page, pageSize));
}

export const productsQueryOptions = (page = 1, pageSize = 24) =>
  queryOptions({
    queryKey: ["products", { page, pageSize }],
    queryFn: () => apiPage<Product>("/products/", { page, pageSize }),
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (pageData) => pageData.results,
  });

export function useProducts(page = 1, pageSize = 24) {
  return useQuery(productsQueryOptions(page, pageSize));
}

export const playerQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["player", id],
    queryFn: () => apiRequest<Player>(`/details/players/${id}/`),
  });

export function usePlayer(id: string) {
  return useQuery(playerQueryOptions(id));
}

/** Todos os leilões — usado pra descobrir quais produtos estão em leilão aberto. */
export function useAuctions() {
  return useQuery({
    queryKey: ["auctions"],
    queryFn: () => apiListAll<Auction>("/auctions/"),
    refetchInterval: 15000,
  });
}

export function auctionProductId(auction: Auction): number {
  return typeof auction.product === "number" ? auction.product : auction.product.id;
}

/** Mapa produto -> leilão aberto. */
export function useOpenAuctionsByProduct() {
  const { data } = useAuctions();
  return useMemo(() => {
    const map = new Map<number, Auction>();
    for (const auction of data ?? []) {
      if (isOpenAuction(auction)) map.set(auctionProductId(auction), auction);
    }
    return map;
  }, [data]);
}
