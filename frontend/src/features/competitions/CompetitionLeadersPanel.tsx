import { useMemo } from "react";
import { StatePanel } from "@/components/StatePanel";
import { useCompetitionMatches } from "@/features/competitions/hooks";

export function CompetitionLeadersPanel({ competitionId, metric }: { competitionId: string; metric: "goals" | "assists" }) {
  const matches = useCompetitionMatches(competitionId);
  const ranking = useMemo(() => {
    const map = new Map<number, { id: number; name: string; team: number; value: number }>();
    for (const match of matches.data ?? []) for (const stat of match.player_stats ?? []) {
      const row = map.get(stat.player) ?? { id: stat.player, name: stat.player_name ?? `Jogador #${stat.player}`, team: stat.team, value: 0 };
      row.value += stat[metric]; map.set(stat.player, row);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [matches.data, metric]);
  if (matches.isLoading) return <StatePanel kind="loading" title="Calculando ranking" />;
  if (matches.isError) return <StatePanel kind="error" title="Ranking indisponível" />;
  if (!ranking.length) return <StatePanel kind="empty" title={`Sem ${metric === "goals" ? "gols" : "assistências"} registrados`} description="O ranking usa apenas estatísticas oficiais das partidas." />;
  return <div className="surface-panel p-0"><ol className="divide-y divide-border">{ranking.map((player, index) => <li key={player.id} className="flex items-center gap-4 px-5 py-4"><strong className="rank-number">{String(index + 1).padStart(2, "0")}</strong><div className="min-w-0 flex-1"><p className="truncate font-semibold text-foreground">{player.name}</p><p className="text-xs text-muted-foreground">Time #{player.team}</p></div><strong className="font-display text-2xl text-primary">{player.value}</strong></li>)}</ol></div>;
}