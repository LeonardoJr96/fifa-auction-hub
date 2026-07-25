import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest, toList } from "@/lib/api";
import type { Auction, Bid, Product } from "@/types/api";

export function useAuction(id: string) {
  return useQuery({
    queryKey: ["auction", id],
    queryFn: () => apiRequest<Auction>(`/auctions/${id}/`),
    refetchInterval: (query) => (query.state.data?.status === "OPEN" ? 2000 : false),
  });
}

export function useBids(id: string, enabled = true) {
  return useQuery({
    queryKey: ["auction", id, "bids"],
    queryFn: async () => toList<Bid>(await apiRequest<unknown>(`/auctions/${id}/bids/`)),
    enabled,
    refetchInterval: enabled ? 2000 : false,
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
      pricing_mode: "player_value" | "manual";
      manual_price?: number;
      duration_minutes: number;
    }) => apiRequest<Auction>("/auctions/", { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}
