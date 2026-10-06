import { Link } from "@tanstack/react-router";
import { Shirt } from "lucide-react";
import { StatePanel } from "@/components/StatePanel";
import { useCompetitionRosters } from "@/features/competitions/hooks";

export function CompetitionRostersPanel({ competitionId, playersOnly = false }: { competitionId: string; playersOnly?: boolean }) {
  const rosters = useCompetitionRosters(competitionId);
  if (rosters.isLoading) return <StatePanel kind="loading" title="Carregando elencos" />;
  if (rosters.isError) return <StatePanel kind="error" title="Elencos indisponíveis" description="Tente novamente em alguns instantes." />;
  if (!rosters.data?.length) return <StatePanel kind="empty" title="Nenhum elenco definido" description="Os jogadores aparecerão depois do draft." />;
  if (playersOnly) {
    const players = rosters.data.flatMap((roster) => roster.players.map((player) => ({ ...player, team: roster.team_name })));
    return <div className="overflow-x-auto surface-panel p-0"><table className="premium-table"><thead><tr><th>Jogador</th><th>Time</th><th className="text-right">OVR</th></tr></thead><tbody>{players.map((player) => <tr key={`${player.team}-${player.id}`}><td><Link to="/players/$playerId" params={{ playerId: String(player.id) }} className="font-semibold text-foreground hover:text-primary">{player.name}</Link></td><td>{player.team}</td><td className="text-right"><strong className="rating-pill">{player.overall}</strong></td></tr>)}</tbody></table></div>;
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rosters.data.map((roster) => <article key={roster.team_id} className="surface-panel"><div className="flex items-center gap-3"><span className="club-mark"><Shirt /></span><div><h3 className="font-display font-bold text-foreground">{roster.team_name}</h3><p className="text-xs text-muted-foreground">{roster.username} · {roster.players.length} jogadores</p></div></div><ul className="mt-4 divide-y divide-border">{roster.players.slice(0, 5).map((player) => <li key={player.id} className="flex items-center justify-between py-2 text-sm"><span className="truncate text-foreground">{player.name}</span><span className="font-bold tabular-nums text-primary">{player.overall}</span></li>)}</ul>{roster.players.length > 5 ? <p className="mt-3 text-xs text-muted-foreground">+ {roster.players.length - 5} jogadores</p> : null}</article>)}</div>;
}