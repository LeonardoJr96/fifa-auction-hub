import { useCompetitionBracket } from "@/features/competitions/hooks";

export function CompetitionBracketPanel({ competitionId }: { competitionId: string }) {
  const { data, isLoading, isError } = useCompetitionBracket(competitionId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando chaveamento…</p>;
  }
  if (isError) {
    return <p className="text-sm text-destructive">Não foi possível carregar o chaveamento.</p>;
  }
  if (!data?.rounds?.length) {
    return <p className="text-sm text-muted-foreground">Chaveamento ainda não foi gerado.</p>;
  }

  return (
    <div className="space-y-6">
      {data.rounds.map((round) => (
        <section key={round.round_number} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Rodada {round.round_number}</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {round.matches.map((match) => (
              <li key={match.id} className="rounded-md border border-border/70 p-4 text-sm">
                <div className="font-medium text-foreground">
                  {match.home_team_name ?? "A definir"} vs {match.away_team_name ?? "A definir"}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {match.status === "played"
                    ? `Resultado: ${match.home_score} - ${match.away_score}`
                    : "Aguardando confronto"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
