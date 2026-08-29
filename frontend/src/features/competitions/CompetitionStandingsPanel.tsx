import { useCompetitionStandings } from "@/features/competitions/hooks";

export function CompetitionStandingsPanel({ competitionId }: { competitionId: string }) {
  const { data: standings, isLoading, isError } = useCompetitionStandings(competitionId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando tabela…</p>;
  }
  if (isError) {
    return <p className="text-sm text-destructive">Não foi possível carregar a tabela.</p>;
  }
  if (!standings?.length) {
    return <p className="text-sm text-muted-foreground">Nenhum resultado registrado ainda.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Pts</th>
            <th className="px-4 py-3">J</th>
            <th className="px-4 py-3">V</th>
            <th className="px-4 py-3">E</th>
            <th className="px-4 py-3">D</th>
            <th className="px-4 py-3">GP</th>
            <th className="px-4 py-3">GC</th>
            <th className="px-4 py-3">SG</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.team_id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{row.position}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{row.team_name}</div>
                <div className="text-xs text-muted-foreground">{row.username}</div>
              </td>
              <td className="px-4 py-3 font-semibold text-primary">{row.points}</td>
              <td className="px-4 py-3">{row.played}</td>
              <td className="px-4 py-3">{row.wins}</td>
              <td className="px-4 py-3">{row.draws}</td>
              <td className="px-4 py-3">{row.losses}</td>
              <td className="px-4 py-3">{row.goals_for}</td>
              <td className="px-4 py-3">{row.goals_against}</td>
              <td className="px-4 py-3">{row.goal_diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
