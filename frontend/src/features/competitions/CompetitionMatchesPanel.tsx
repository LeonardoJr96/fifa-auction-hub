import { useState } from "react";

import {
  useCompetitionMatches,
  useCompetitionRosters,
  useRegisterMatchResult,
  useSimulateMatch,
} from "@/features/competitions/hooks";
import type { CompetitionMatch, MatchResultPayload } from "@/types/api";

function MatchResultForm({
  competitionId,
  match,
  isStaff,
}: {
  competitionId: string;
  match: CompetitionMatch;
  isStaff: boolean;
}) {
  const { data: rosters } = useCompetitionRosters(competitionId);
  const registerResult = useRegisterMatchResult(competitionId);
  const simulate = useSimulateMatch(competitionId);
  const [homeScore, setHomeScore] = useState(String(match.home_score));
  const [awayScore, setAwayScore] = useState(String(match.away_score));
  const [showStats, setShowStats] = useState(false);
  const [statRows, setStatRows] = useState<
    Array<{ player: string; team: string; goals: string; assists: string }>
  >([{ player: "", team: String(match.home_team ?? ""), goals: "0", assists: "0" }]);

  if (!isStaff || match.status === "played") {
    return null;
  }

  const allPlayers =
    rosters?.flatMap((roster) =>
      roster.players.map((player) => ({
        ...player,
        team_id: roster.team_id,
        team_name: roster.team_name,
      })),
    ) ?? [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload: MatchResultPayload = {
      home_score: Number(homeScore) || 0,
      away_score: Number(awayScore) || 0,
    };
    if (showStats) {
      payload.stats = statRows
        .filter((row) => row.player)
        .map((row) => ({
          player: Number(row.player),
          team: Number(row.team),
          goals: Number(row.goals) || 0,
          assists: Number(row.assists) || 0,
        }));
    }
    await registerResult.mutateAsync({ matchId: match.id, payload });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{match.home_team_name}</span>
          <input
            type="number"
            min={0}
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{match.away_team_name}</span>
          <input
            type="number"
            min={0}
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={showStats} onChange={(event) => setShowStats(event.target.checked)} />
        Registrar estatísticas dos jogadores
      </label>

      {showStats ? (
        <div className="space-y-2">
          {statRows.map((row, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-4">
              <select
                value={row.player}
                onChange={(event) => {
                  const next = [...statRows];
                  next[index] = { ...row, player: event.target.value };
                  setStatRows(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">Jogador</option>
                {allPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.team_name})
                  </option>
                ))}
              </select>
              <select
                value={row.team}
                onChange={(event) => {
                  const next = [...statRows];
                  next[index] = { ...row, team: event.target.value };
                  setStatRows(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value={match.home_team ?? ""}>{match.home_team_name}</option>
                <option value={match.away_team ?? ""}>{match.away_team_name}</option>
              </select>
              <input
                type="number"
                min={0}
                placeholder="Gols"
                value={row.goals}
                onChange={(event) => {
                  const next = [...statRows];
                  next[index] = { ...row, goals: event.target.value };
                  setStatRows(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                placeholder="Assist."
                value={row.assists}
                onChange={(event) => {
                  const next = [...statRows];
                  next[index] = { ...row, assists: event.target.value };
                  setStatRows(next);
                }}
                className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setStatRows((rows) => [
                ...rows,
                { player: "", team: String(match.home_team ?? ""), goals: "0", assists: "0" },
              ])
            }
            className="text-sm text-primary"
          >
            + Adicionar linha
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={registerResult.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {registerResult.isPending ? "Salvando…" : "Registrar resultado"}
        </button>
        <button
          type="button"
          disabled={simulate.isPending}
          onClick={() => simulate.mutate(match.id)}
          className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-60"
        >
          {simulate.isPending ? "Simulando…" : "Simular"}
        </button>
      </div>
    </form>
  );
}

function MatchStats({ match }: { match: CompetitionMatch }) {
  if (!match.player_stats?.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
      {match.player_stats.map((stat) => (
        <li key={stat.id}>
          {stat.player_name ?? `Jogador #${stat.player}`}: {stat.goals}G {stat.assists}A
        </li>
      ))}
    </ul>
  );
}

export function CompetitionMatchesPanel({
  competitionId,
  isStaff,
}: {
  competitionId: string;
  isStaff: boolean;
}) {
  const { data: matches, isLoading, isError } = useCompetitionMatches(competitionId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando partidas…</p>;
  }
  if (isError) {
    return <p className="text-sm text-destructive">Não foi possível carregar as partidas.</p>;
  }
  if (!matches?.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma partida gerada ainda.</p>;
  }

  const grouped = matches.reduce<Record<string, CompetitionMatch[]>>((acc, match) => {
    const key = match.round_number ? `Rodada ${match.round_number}` : "Partidas";
    acc[key] = acc[key] ? [...acc[key], match] : [match];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([roundLabel, roundMatches]) => (
        <section key={roundLabel} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">{roundLabel}</h3>
          <ul className="mt-4 space-y-4">
            {roundMatches.map((match) => (
              <li key={match.id} className="rounded-md border border-border/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{match.home_team_name}</span>
                    <span className="mx-2 text-muted-foreground">vs</span>
                    <span className="font-medium text-foreground">{match.away_team_name}</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {match.status === "played"
                      ? `${match.home_score} - ${match.away_score}`
                      : "Agendado"}
                  </div>
                </div>
                <MatchStats match={match} />
                <MatchResultForm competitionId={competitionId} match={match} isStaff={isStaff} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
