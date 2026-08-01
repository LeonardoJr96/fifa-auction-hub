import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, toList } from "@/lib/api";
import type { Campaign, MarketWindow, MarketListing, Transfer, Competition, Match } from "@/types/api";

// CAMPAIGNS
export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await apiRequest<unknown>("/campaigns/");
      return toList<Campaign>(res);
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; min_roster_size?: number; max_roster_size?: number; matches_per_market_cycle?: number; transfer_policy?: string }) =>
      apiRequest<Campaign>("/campaigns/", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

// MARKET WINDOWS & LISTINGS
export function useMarketWindows() {
  return useQuery({
    queryKey: ["market-windows"],
    queryFn: async () => {
      const res = await apiRequest<unknown>("/campaigns/market-windows/");
      return toList<MarketWindow>(res);
    },
  });
}

export function useMarketListings() {
  return useQuery({
    queryKey: ["market-listings"],
    queryFn: async () => {
      const res = await apiRequest<unknown>("/campaigns/listings/");
      return toList<MarketListing>(res);
    },
  });
}

export function useBuyDirect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, playerId, price }: { campaignId: number; playerId: number; price?: string }) =>
      apiRequest<unknown>(`/campaigns/${campaignId}/buy-direct/`, {
        method: "POST",
        body: { player_id: playerId, price },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-listings"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

// TRANSFERS
export function useTransfers() {
  return useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const res = await apiRequest<unknown>("/campaigns/transfers/");
      return toList<Transfer>(res);
    },
  });
}

export function useProposeTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, receiverId, offeredPlayers, requestedPlayers }: { campaignId: number; receiverId: number; offeredPlayers: number[]; requestedPlayers: number[] }) =>
      apiRequest<Transfer>(`/campaigns/${campaignId}/propose-transfer/`, {
        method: "POST",
        body: { receiver_id: receiverId, offered_players: offeredPlayers, requested_players: requestedPlayers },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

export function useRespondTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, accepted }: { transferId: number; accepted: boolean }) =>
      apiRequest<Transfer>(`/campaigns/transfers/${transferId}/respond/`, {
        method: "POST",
        body: { accepted },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

// COMPETITIONS & MATCHES
export function useCompetitions() {
  return useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      const res = await apiRequest<unknown>("/competitions/");
      return toList<Competition>(res);
    },
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await apiRequest<unknown>("/competitions/matches/");
      return toList<Match>(res);
    },
  });
}

export function useSimulateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: number) =>
      apiRequest<Match>(`/competitions/matches/${matchId}/simulate/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["market-windows"] });
    },
  });
}
