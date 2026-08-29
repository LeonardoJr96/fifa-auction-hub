import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, apiRequest, toList } from "@/lib/api";
import type {
  BracketResponse,
  Competition,
  CompetitionCreatePayload,
  CompetitionMatch,
  CompetitionRoster,
  DraftOrderItem,
  DraftState,
  MatchResultPayload,
  StandingRow,
} from "@/types/api";

export function useCompetitions() {
  return useQuery({
    queryKey: ["competitions"],
    queryFn: async () => toList<Competition>(await apiRequest<unknown>("/competitions/")),
  });
}

export function useCompetition(id: string) {
  return useQuery({
    queryKey: ["competition", id],
    queryFn: () => apiRequest<Competition>(`/competitions/${id}/`),
    enabled: Boolean(id),
  });
}

export function useDraftState(competitionId: string, enabled = true) {
  return useQuery({
    queryKey: ["competition", competitionId, "draft"],
    queryFn: () => apiRequest<DraftState>(`/competitions/${competitionId}/draft/`),
    enabled: enabled && Boolean(competitionId),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useCompetitionStandings(competitionId: string, enabled = true) {
  return useQuery({
    queryKey: ["competition", competitionId, "standings"],
    queryFn: () => apiRequest<StandingRow[]>(`/competitions/${competitionId}/standings/`),
    enabled: enabled && Boolean(competitionId),
  });
}

export function useCompetitionMatches(competitionId: string, enabled = true) {
  return useQuery({
    queryKey: ["competition", competitionId, "matches"],
    queryFn: () => apiRequest<CompetitionMatch[]>(`/competitions/${competitionId}/matches/`),
    enabled: enabled && Boolean(competitionId),
  });
}

export function useCompetitionBracket(competitionId: string, enabled = true) {
  return useQuery({
    queryKey: ["competition", competitionId, "bracket"],
    queryFn: () => apiRequest<BracketResponse>(`/competitions/${competitionId}/bracket/`),
    enabled: enabled && Boolean(competitionId),
  });
}

export function useCompetitionRosters(competitionId: string, enabled = true) {
  return useQuery({
    queryKey: ["competition", competitionId, "rosters"],
    queryFn: () => apiRequest<CompetitionRoster[]>(`/competitions/${competitionId}/rosters/`),
    enabled: enabled && Boolean(competitionId),
  });
}

function invalidateCompetition(queryClient: ReturnType<typeof useQueryClient>, competitionId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["competitions"] }),
    queryClient.invalidateQueries({ queryKey: ["competition", competitionId] }),
    queryClient.invalidateQueries({ queryKey: ["competition", competitionId, "standings"] }),
    queryClient.invalidateQueries({ queryKey: ["competition", competitionId, "matches"] }),
    queryClient.invalidateQueries({ queryKey: ["competition", competitionId, "bracket"] }),
    queryClient.invalidateQueries({ queryKey: ["competition", competitionId, "rosters"] }),
  ]);
}

export function useJoinCompetition(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<Competition>(`/competitions/${competitionId}/join/`, { method: "POST" }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useStartDraft(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<DraftState>(`/competitions/${competitionId}/draft/start/`, { method: "POST" }),
    onSuccess: async (data) => {
      queryClient.setQueryData(["competition", competitionId, "draft"], data);
      await invalidateCompetition(queryClient, competitionId);
    },
  });
}

export function useSetDraftOrder(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (order: DraftOrderItem[]) =>
      apiRequest<Competition>(`/competitions/${competitionId}/draft/order/`, {
        method: "POST",
        body: { order },
      }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useDraftPick(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: number) =>
      apiRequest<{ pick: unknown; draft: DraftState }>(`/competitions/${competitionId}/draft/pick/`, {
        method: "POST",
        body: { player: playerId },
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(["competition", competitionId, "draft"], data.draft);
      await queryClient.invalidateQueries({ queryKey: ["competition", competitionId, "rosters"] });
    },
  });
}

export function useGenerateLeagueFixtures(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<CompetitionMatch[]>(`/competitions/${competitionId}/generate-fixtures/`, { method: "POST" }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useGenerateBracket(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ matches: CompetitionMatch[] }>(`/competitions/${competitionId}/generate-bracket/`, {
        method: "POST",
        body: {},
      }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useRegisterMatchResult(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, payload }: { matchId: number; payload: MatchResultPayload }) =>
      apiRequest<CompetitionMatch>(`/competitions/${competitionId}/matches/${matchId}/result/`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useSimulateMatch(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: number) =>
      apiRequest<CompetitionMatch>(`/competitions/${competitionId}/matches/${matchId}/simulate/`, {
        method: "POST",
      }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useFinishCompetition(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`/competitions/${competitionId}/finish/`, { method: "POST" }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useActivateCompetition(competitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<Competition>(`/competitions/${competitionId}/activate/`, { method: "POST" }),
    onSuccess: async () => invalidateCompetition(queryClient, competitionId),
  });
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompetitionCreatePayload) =>
      apiRequest<Competition>("/competitions/", { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}
