import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest, toList } from "@/lib/api";
import type { Formation, Player, Team } from "@/types/api";

export function useTeam(enabled = true) {
  return useQuery({
    queryKey: ["team", "me"],
    queryFn: () => apiRequest<Team>("/team/me/"),
    enabled,
  });
}

export function useRoster(enabled = true) {
  return useQuery({
    queryKey: ["team", "me", "roster"],
    queryFn: async () => toList<Player>(await apiRequest<unknown>("/team/me/roster/")),
    enabled,
  });
}

export function useChangeFormation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formation: Formation) =>
      apiRequest<Team>("/team/me/", { method: "PATCH", body: { formation } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team", "me"] });
    },
  });
}

export function useSetSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotCode, playerId }: { slotCode: string; playerId: number | null }) =>
      apiRequest<unknown>(`/team/me/slots/${slotCode}/`, {
        method: "PUT",
        body: { player_id: playerId },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team", "me"] });
    },
  });
}
