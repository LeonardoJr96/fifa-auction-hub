import { useState } from "react";

import {
  useCompetitionMatches,
  useCompetitionRosters,
  useGenerateLeagueFixtures,
  useRegisterMatchResult,
  useSimulateMatch,
} from "@/features/competitions/hooks";
import type { CompetitionMatch, MatchResultPayload } from "@/types/api";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/StatePanel";

function MatchResultForm({
  competitionId,
  match,
  canReportResults,
  canSimulate,
}: {
  competitionId: string;
  match: CompetitionMatch;
  canReportResults: boolean;
  canSimulate: boolean;
}) {
  const { data: rosters } = useCompetitionRosters(competitionId);
  const registerResult = useRegisterMatchResult(competitionId);
  const simulate = useSimulateMatch(competitionId);
  const [homeScore, setHomeScore] = useState(String(match.home_score));
  const [awayScore, setAwayScore] = useState(String(match.away_score));
  const [isEditing, setIsEditing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statRows, setStatRows] = useState<
    Array<{ player: string; team: string; goals: string; assists: string }>
  >([{ player: "", team: String(match.home_team ?? ""), goals: "0", assists: "0" }]);

  if (!canReportResults) {
    return null;
  }

  if (match.status === "played" && !isEditing) {
    return (
      <Button
        type="button"
        variant="outline"
        className="mt-3"
        onClick={() => {
          setHomeScore(String(match.home_score));
          setAwayScore(String(match.away_score));
          setIsEditing(true);
        }}
      >
        Editar resultado
      </Button>
    );
  }

  const allPlayers =
    rosters?.flatMap((roster) =>
      roster.players.map((player) => ({
        ...player,
        team_id: roster.team_id,
        team_name: roster.team_name,
      })),
    ) ?? [];

  function handleSubmit(event: React.FormEvent) {
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
    registerResult.mutate({ matchId: match.id, payload }, { onSuccess: () => setIsEditing(false) });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-md border border-border bg-muted/20 p-3"
    >
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
        <input
          type="checkbox"
          checked={showStats}
          onChange={(event) => setShowStats(event.target.checked)}
        />
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
          <Button
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
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={registerResult.isPending}>
          {registerResult.isPending
            ? "Salvando…"
            : match.status === "played"
              ? "Atualizar resultado"
              : "Registrar resultado"}
        </Button>
        {match.status === "played" ? (
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
            Cancelar
          </Button>
        ) : null}
        {canSimulate ? (
          <Button
            type="button"
            disabled={simulate.isPending}
            onClick={() => simulate.mutate(match.id)}
            variant="outline"
          >
            {simulate.isPending ? "Simulando…" : "Simular"}
          </Button>
        ) : null}
      </div>
      {registerResult.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {registerResult.error instanceof Error
            ? registerResult.error.message
            : "Não foi possível salvar o resultado."}
        </p>
      ) : null}
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
  canReportResults,
  canSimulate,
  canGenerateFixtures,
}: {
  competitionId: string;
  canReportResults: boolean;
  canSimulate: boolean;
  canGenerateFixtures: boolean;
}) {
  const { data: matches, isLoading, isError } = useCompetitionMatches(competitionId);
  const generateFixtures = useGenerateLeagueFixtures(competitionId);

  if (isLoading) {
    return <StatePanel kind="loading" title="Carregando partidas" />;
  }
  if (isError) {
    return (
      <StatePanel
        kind="error"
        title="Partidas indisponíveis"
        description="Tente novamente em alguns instantes."
      />
    );
  }
  if (!matches?.length) {
    return (
      <div className="space-y-4">
        <StatePanel
          kind="empty"
          title="Nenhuma partida gerada"
          description="O calendário aparecerá após a geração dos confrontos."
        />
        {canGenerateFixtures ? (
          <Button
            type="button"
            disabled={generateFixtures.isPending}
            onClick={() => generateFixtures.mutate()}
          >
            {generateFixtures.isPending ? "Gerando rodadas…" : "Gerar rodadas"}
          </Button>
        ) : null}
        {generateFixtures.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {generateFixtures.error instanceof Error
              ? generateFixtures.error.message
              : "Não foi possível gerar as rodadas."}
          </p>
        ) : null}
      </div>
    );
  }

  const grouped = matches.reduce<Record<string, CompetitionMatch[]>>((acc, match) => {
    const key = match.round_number ? `Rodada ${match.round_number}` : "Partidas";
    acc[key] = acc[key] ? [...acc[key], match] : [match];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([roundLabel, roundMatches]) => (
        <section key={roundLabel} className="surface-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Calendário</p>
              <h3 className="font-display font-semibold text-foreground">{roundLabel}</h3>
            </div>
          </div>
          <ul className="mt-4 space-y-4">
            {roundMatches.map((match) => (
              <li
                key={match.id}
                className="rounded-lg border border-border/70 bg-background/30 p-4"
              >
                <div className="match-row">
                  <span className="min-w-0 flex-1 truncate text-right font-semibold text-foreground">
                    {match.home_team_name}
                  </span>
                  <div
                    className={`score-box ${match.status === "played" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {match.status === "played"
                      ? `${match.home_score} - ${match.away_score}`
                      : "Agendado"}
                  </div>
                  <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                    {match.away_team_name}
                  </span>
                </div>
                <MatchStats match={match} />
                <MatchResultForm
                  competitionId={competitionId}
                  match={match}
                  canReportResults={canReportResults}
                  canSimulate={canSimulate}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
