import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { apiListAll, apiPage, apiRequest } from "@/lib/api";
import type { Auction, Player, Product } from "@/types/api";
import { isOpenAuction } from "@/lib/auction-status";

export interface PlayerFilterParams {
  q?: string;
  position?: string;
  minOverall?: number;
  maxOverall?: number;
  minPotential?: number;
  minAge?: number;
  maxAge?: number;
  foot?: string;
  maxPrice?: number;
  sort?: string;
}

export const productsPageQueryOptions = (
  page = 1,
  pageSize = 24,
  filters?: Partial<PlayerFilterParams>,
) => {
  const searchParams: Record<string, string | number | undefined> = {};
  if (filters?.q) searchParams.q = filters.q.trim();
  if (filters?.position) searchParams.position = filters.position;
  if (filters?.minOverall) searchParams.minOverall = filters.minOverall;
  if (filters?.maxOverall) searchParams.maxOverall = filters.maxOverall;
  if (filters?.minPotential) searchParams.minPotential = filters.minPotential;
  if (filters?.minAge) searchParams.minAge = filters.minAge;
  if (filters?.maxAge) searchParams.maxAge = filters.maxAge;
  if (filters?.foot) searchParams.foot = filters.foot;
  if (filters?.maxPrice) searchParams.maxPrice = filters.maxPrice;
  if (filters?.sort && filters.sort !== "default") searchParams.sort = filters.sort;

  return queryOptions({
    queryKey: ["products-page", { page, pageSize, ...searchParams }],
    queryFn: () => apiPage<Product>("/products/", { page, pageSize, search: searchParams }),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export function useProductsPage(
  page = 1,
  pageSize = 24,
  filters?: Partial<PlayerFilterParams>,
) {
  return useQuery(productsPageQueryOptions(page, pageSize, filters));
}

export const productsQueryOptions = (
  page = 1,
  pageSize = 24,
  filters?: Partial<PlayerFilterParams>,
) =>
  queryOptions({
    ...productsPageQueryOptions(page, pageSize, filters),
    queryKey: ["products", { page, pageSize, ...filters }],
    select: (pageData) => pageData.results,
  });

export function useProducts(
  page = 1,
  pageSize = 24,
  filters?: Partial<PlayerFilterParams>,
) {
  return useQuery(productsQueryOptions(page, pageSize, filters));
}

export const playerQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["player", id],
    queryFn: () => apiRequest<Player>(`/details/players/${id}/`),
  });

export function usePlayer(id: string) {
  return useQuery(playerQueryOptions(id));
}

/** Lista de leilões sem polling global por padrão. Telas ativas podem habilitar
 * atualização periódica explicitamente caso precisem de sincronização em tempo real.
 */
export function useAuctions(
  options: { enabled?: boolean; realtime?: boolean; page?: number; pageSize?: number } = {},
) {
  const { enabled = true, realtime = false, page = 1, pageSize = 24 } = options;

  return useQuery({
    queryKey: ["auctions", realtime ? "live" : "snapshot", page, pageSize],
    queryFn: () => apiPage<Auction>("/auctions/", { page, pageSize }),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: realtime ? 15000 : false,
    refetchOnWindowFocus: false,
    select: (pageData) => pageData.results,
  });
}

export function auctionProductId(auction: Auction): number {
  return typeof auction.product === "number" ? auction.product : auction.product.id;
}

/** Mapa produto -> leilão aberto. */
export function useOpenAuctionsByProduct() {
  const { data } = useAuctions({ realtime: false });
  return useMemo(() => {
    const map = new Map<number, Auction>();
    for (const auction of data ?? []) {
      if (isOpenAuction(auction)) map.set(auctionProductId(auction), auction);
    }
    return map;
  }, [data]);
}
