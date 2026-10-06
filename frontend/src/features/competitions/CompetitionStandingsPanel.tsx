import { useCompetitionStandings } from "@/features/competitions/hooks";
import { StatePanel } from "@/components/StatePanel";

export function CompetitionStandingsPanel({ competitionId }: { competitionId: string }) {
  const { data: standings, isLoading, isError } = useCompetitionStandings(competitionId);

  if (isLoading) {
    return <StatePanel kind="loading" title="Carregando classificação" />;
  }
  if (isError) {
    return <StatePanel kind="error" title="Classificação indisponível" description="Não foi possível carregar a tabela." />;
  }
  if (!standings?.length) {
    return <StatePanel kind="empty" title="Classificação ainda vazia" description="A tabela será atualizada após os primeiros resultados." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="premium-table min-w-full">
        <thead>
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
            <tr key={row.team_id} className={row.position === 1 ? "bg-primary/5" : ""}>
              <td><span className={`inline-grid size-7 place-items-center rounded font-bold ${row.position === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>{row.position}</span></td>
              <td>
                <div className="font-medium text-foreground">{row.team_name}</div>
                <div className="text-xs text-muted-foreground">{row.username}</div>
              </td>
              <td className="font-display text-base font-bold text-primary">{row.points}</td>
              <td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goals_for}</td><td>{row.goals_against}</td><td>{row.goal_diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
