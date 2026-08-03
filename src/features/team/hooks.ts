import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiListAll, apiRequest } from "@/lib/api";
import type { Formation, Player, Team } from "@/types/api";

export function useTeam(enabled = true, campaignId?: number) {
  return useQuery({
    queryKey: ["team", campaignId ?? "global"],
    queryFn: () => apiRequest<Team>(`/team/me/${campaignId ? `?campaign_id=${campaignId}` : ""}`),
    enabled,
  });
}

export function useRoster(enabled = true, campaignId?: number) {
  return useQuery({
    queryKey: ["roster", campaignId ?? "global"],
    queryFn: () =>
      apiListAll<Player>(`/team/me/roster/${campaignId ? `?campaign_id=${campaignId}` : ""}`),
    enabled,
  });
}

export function useChangeFormation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formation, campaignId }: { formation: Formation; campaignId?: number }) =>
      apiRequest<Team>("/team/me/", {
        method: "PATCH",
        body: { formation, ...(campaignId ? { campaign_id: campaignId } : {}) },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team", "me"] });
    },
  });
}

export function useSetSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slotCode,
      playerId,
      campaignId,
    }: {
      slotCode: string;
      playerId: number | null;
      campaignId?: number;
    }) =>
      apiRequest<unknown>(`/team/me/slots/${slotCode}/`, {
        method: "PUT",
        body: { player_id: playerId, ...(campaignId ? { campaign_id: campaignId } : {}) },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team", "me"] });
    },
  });
}
