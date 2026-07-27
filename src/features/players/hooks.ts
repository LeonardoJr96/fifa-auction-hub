import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest, toList } from "@/lib/api";
import type { Auction, Player, Product } from "@/types/api";

export const productsQueryOptions = () =>
  queryOptions({
    queryKey: ["products"],
    queryFn: async () => toList<Product>(await apiRequest<unknown>("/products/")),
  });

export function useProducts() {
  return useQuery(productsQueryOptions());
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
    queryFn: async () => toList<Auction>(await apiRequest<unknown>("/auctions/")),
    refetchInterval: 15000,
  });
}

export function auctionProductId(auction: Auction): number {
  return typeof auction.product === "number" ? auction.product : auction.product.id;
}

/** Mapa produto -> leilão aberto. */
export function useOpenAuctionsByProduct() {
  const { data } = useAuctions();
  const map = new Map<number, Auction>();
  for (const auction of data ?? []) {
    if (auction.status === "OPEN") map.set(auctionProductId(auction), auction);
  }
  return map;
}
