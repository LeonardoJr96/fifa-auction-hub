import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiListAll, apiRequest } from "@/lib/api";
import type {
  ListingType,
  Campaign,
  MarketWindow,
  MarketListing,
  Transfer,
  Competition,
  Match,
} from "@/types/api";

// CAMPAIGNS
export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => {
      return apiListAll<Campaign>("/campaigns/");
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      min_roster_size?: number;
      max_roster_size?: number;
      matches_per_market_cycle?: number;
      transfer_policy?: string;
    }) => apiRequest<Campaign>("/campaigns/", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useJoinCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: number) =>
      apiRequest<{ detail: string }>(`/campaigns/${campaignId}/join/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["my-campaign-memberships"] });
    },
  });
}

// MARKET WINDOWS & LISTINGS
export function useMarketWindows() {
  return useQuery({
    queryKey: ["market-windows"],
    queryFn: () => {
      return apiListAll<MarketWindow>("/campaigns/market-windows/");
    },
  });
}

export function useMarketListings() {
  return useQuery({
    queryKey: ["market-listings"],
    queryFn: () => {
      return apiListAll<MarketListing>("/campaigns/listings/");
    },
  });
}

export function useBuyDirect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      playerId,
      price,
    }: {
      campaignId: number;
      playerId: number;
      price?: string;
    }) =>
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

export function useListPlayerForSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      playerId,
      listingType,
      price,
    }: {
      campaignId: number;
      playerId: number;
      listingType: "auction" | "direct";
      price?: string;
    }) =>
      apiRequest<MarketListing>(`/campaigns/${campaignId}/list-player-for-sale/`, {
        method: "POST",
        body: { player_id: playerId, listing_type: listingType, price },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-listings"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useCreateMarketWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      name,
      mode,
      playerCount,
      randomSelection,
    }: {
      campaignId: number;
      name: string;
      mode: "auction" | "market" | "hybrid";
      playerCount?: number;
      randomSelection?: boolean;
    }) =>
      apiRequest<MarketWindow>(`/campaigns/${campaignId}/market-windows/create/`, {
        method: "POST",
        body: { name, mode, player_count: playerCount, random_selection: randomSelection },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["market-windows"] }),
  });
}

export function useMarketWindowAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ windowId, action }: { windowId: number; action: "open" | "close" }) =>
      apiRequest<MarketWindow>(`/campaigns/market-windows/${windowId}/${action}/`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-windows"] });
      queryClient.invalidateQueries({ queryKey: ["market-listings"] });
    },
  });
}

// TRANSFERS
export function useTransfers() {
  return useQuery({
    queryKey: ["transfers"],
    queryFn: () => {
      return apiListAll<Transfer>("/campaigns/transfers/");
    },
  });
}

export function useProposeTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      receiverId,
      offeredPlayers,
      requestedPlayers,
    }: {
      campaignId: number;
      receiverId: number;
      offeredPlayers: number[];
      requestedPlayers: number[];
    }) =>
      apiRequest<Transfer>(`/campaigns/${campaignId}/propose-transfer/`, {
        method: "POST",
        body: {
          receiver_id: receiverId,
          offered_players: offeredPlayers,
          requested_players: requestedPlayers,
        },
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
    queryFn: () => {
      return apiListAll<Competition>("/competitions/");
    },
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: () => {
      return apiListAll<Match>("/competitions/matches/");
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

// ===== ADMIN: COMPETIÇÕES =====
export function useFinishCompetition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (competitionId: number) =>
      apiRequest<Competition>(`/competitions/${competitionId}/finish/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useGenerateBracket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (competitionId: number) =>
      apiRequest<unknown>(`/competitions/${competitionId}/generate-bracket/`, { method: "POST" }),
    onSuccess: (_data, competitionId) => {
      queryClient.invalidateQueries({ queryKey: ["competitions", competitionId, "bracket"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export interface BracketMatch {
  id?: number;
  round?: number | string;
  home_team?: number | string | { id: number; name?: string } | null;
  away_team?: number | string | { id: number; name?: string } | null;
  home_score?: number | null;
  away_score?: number | null;
}

export function useBracket(competitionId?: number) {
  return useQuery({
    queryKey: ["competitions", competitionId, "bracket"],
    queryFn: () => apiListAll<BracketMatch>(`/competitions/${competitionId}/bracket/`),
    enabled: competitionId !== undefined,
    retry: false,
  });
}

// ===== ADMIN: CAMPANHA =====
export interface CampaignAdmin {
  id: number;
  user: number;
  username?: string;
}

export function useCampaignAdmins(campaignId?: number) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "admins"],
    queryFn: () => apiListAll<CampaignAdmin>(`/campaigns/${campaignId}/admins/`),
    enabled: campaignId !== undefined,
    retry: false,
  });
}

export function useAddCampaignAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, userId }: { campaignId: number; userId: number }) =>
      apiRequest<CampaignAdmin>(`/campaigns/${campaignId}/admins/`, {
        method: "POST",
        body: { user_id: userId },
      }),
    onSuccess: (_data, { campaignId }) =>
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "admins"] }),
  });
}

export function useRemoveCampaignAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, userId }: { campaignId: number; userId: number }) =>
      apiRequest<unknown>(`/campaigns/${campaignId}/admins/${userId}/`, { method: "DELETE" }),
    onSuccess: (_data, { campaignId }) =>
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "admins"] }),
  });
}

// ===== ADMIN: LISTAGENS =====
export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingId,
      price,
      listingType,
      isActive,
    }: {
      listingId: number;
      price?: string;
      listingType?: ListingType;
      isActive?: boolean;
    }) =>
      apiRequest<MarketListing>(`/campaigns/listings/${listingId}/`, {
        method: "PATCH",
        body: {
          ...(price !== undefined ? { price } : {}),
          ...(listingType !== undefined ? { listing_type: listingType } : {}),
          ...(isActive !== undefined ? { is_active: isActive } : {}),
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["market-listings"] }),
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: number) =>
      apiRequest<unknown>(`/campaigns/listings/${listingId}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["market-listings"] }),
  });
}
