import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api";
import type { Portfolio, PortfolioListing } from "@/types/api";

export function usePortfolio(enabled = true) {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => apiRequest<Portfolio>("/team/me/bolsa/"),
    enabled,
  });
}

export function useUserSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ["user-search", query],
    queryFn: () =>
      apiRequest<{ id: number; username: string }[]>(
        `/team/users/search/?q=${encodeURIComponent(query)}`,
      ),
    enabled: enabled && query.trim().length >= 2,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<PortfolioListing>("/team/me/listings/", {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useCancelListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: number) =>
      apiRequest<PortfolioListing>(`/team/me/listings/${listingId}/`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useAcceptDirectOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: number) =>
      apiRequest<PortfolioListing>(`/team/me/listings/${listingId}/accept/`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
