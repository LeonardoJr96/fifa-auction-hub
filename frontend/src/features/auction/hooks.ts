import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, apiListAll, apiRequest } from "@/lib/api";
import type { Auction, Bid, Product } from "@/types/api";
import { normalizeStatus } from "@/lib/auction-status";

export function useAuction(id: string, realtime = false) {
  return useQuery({
    queryKey: ["auction", id],
    queryFn: () => apiRequest<Auction>(`/auctions/${id}/`),
    // Com WebSocket ativo o polling é só um fallback lento.
    refetchInterval: (query) =>
      normalizeStatus(query.state.data?.status) === "OPEN" ? (realtime ? 20000 : 2000) : false,
  });
}

/**
 * Lista pública de lances do leilão (todos os participantes).
 * Ordena por preço desc (empate: mais recente primeiro).
 */
export function useBids(id: string, enabled = true, realtime = false) {
  return useQuery({
    queryKey: ["auction", id, "bids"],
    queryFn: async () => {
      const list = await apiListAll<Bid>(`/auctions/${id}/bids/`);
      return [...list].sort((a, b) => {
        const diff = Number(b.price) - Number(a.price);
        if (diff !== 0) return diff;
        return new Date(b.bid_time).getTime() - new Date(a.bid_time).getTime();
      });
    },
    enabled,
    // Endpoint pode não existir ainda em produção: não insistir em 404.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
    refetchInterval: (query) =>
      enabled && !(query.state.error instanceof ApiError && query.state.error.status === 404)
        ? realtime
          ? 20000
          : 2000
        : false,
  });
}

export function usePlaceBid(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (price: number) =>
      apiRequest<Bid>(`/auctions/${id}/bids/`, { method: "POST", body: { price } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auction", id] });
    },
  });
}

export function useAuctionProduct(auction: Auction | undefined) {
  const productId = auction
    ? typeof auction.product === "number"
      ? auction.product
      : auction.product.id
    : undefined;

  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => apiRequest<Product>(`/products/${productId}/`),
    enabled: productId !== undefined && typeof auction?.product === "number",
    initialData:
      auction && typeof auction.product !== "number" ? (auction.product as Product) : undefined,
  });
}

export function useCreateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      product: number;
      starting_price: number;
      duration_minutes: number;
      min_increment?: number;
    }) => apiRequest<Auction>("/auctions/", { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}
