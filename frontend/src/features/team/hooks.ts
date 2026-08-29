import { useQuery } from "@tanstack/react-query";

import { apiListAll, apiRequest } from "@/lib/api";
import type { Player, Team } from "@/types/api";

/** Saldo e elenco global — usado em Minha conta e leilões (sem página de formação). */
export function useTeam(enabled = true) {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => apiRequest<Team>("/team/me/"),
    enabled,
  });
}

export function useRoster(enabled = true) {
  return useQuery({
    queryKey: ["roster"],
    queryFn: () => apiListAll<Player>("/team/me/roster/"),
    enabled,
  });
}
