import { CalendarClock, Goal, ShieldCheck, Trophy, UsersRound } from "lucide-react";

import { useCompetitionMatches, useCompetitionStandings } from "@/features/competitions/hooks";
import type { Competition, CompetitionMatch } from "@/types/api";
import { StatePanel } from "@/components/StatePanel";

function Scoreline({ match }: { match: CompetitionMatch }) {
  return (
    <div className="match-row">
      <span className="min-w-0 flex-1 truncate text-right font-semibold text-foreground">{match.home_team_name ?? "A definir"}</span>
      <strong className="score-box">{match.status === "played" ? `${match.home_score} · ${match.away_score}` : "VS"}</strong>
      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{match.away_team_name ?? "A definir"}</span>
    </div>
  );
}

export function CompetitionOverviewPanel({ competition }: { competition: Competition }) {
  const competitionId = String(competition.id);
  const matches = useCompetitionMatches(competitionId, competition.competition_type !== "draft");
  const standings = useCompetitionStandings(competitionId, competition.competition_type === "league");
  const all = matches.data ?? [];
  const played = all.filter((match) => match.status === "played");
  const scheduled = all.filter((match) => match.status !== "played");
  const goals = played.reduce((sum, match) => sum + match.home_score + match.away_score, 0);
  const leader = standings.data?.[0];
  const bestAttack = standings.data?.length ? [...standings.data].sort((a, b) => b.goals_for - a.goals_for)[0] : undefined;
  const bestDefense = standings.data?.length ? [...standings.data].sort((a, b) => a.goals_against - b.goals_against)[0] : undefined;

  const stats = [
    { label: "Participantes", value: `${competition.participant_count}/${competition.max_participants}`, icon: UsersRound },
    { label: "Partidas realizadas", value: String(played.length), icon: Trophy },
    { label: "Partidas restantes", value: String(scheduled.length), icon: CalendarClock },
    { label: "Gols", value: String(goals), detail: played.length ? `${(goals / played.length).toFixed(1)} por jogo` : "sem média", icon: Goal },
  ];

  return (
    <div className="space-y-6">
      <section className="stats-strip">
        {stats.map((stat) => <div key={stat.label} className="stat-cell"><stat.icon /><div><p>{stat.label}</p><strong>{stat.value}</strong>{stat.detail ? <small>{stat.detail}</small> : null}</div></div>)}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="surface-panel">
          <div className="section-heading"><div><p className="eyebrow">Agenda</p><h2>Próximos jogos</h2></div><CalendarClock /></div>
          {matches.isLoading ? <StatePanel kind="loading" title="Carregando partidas" compact /> : scheduled.length ? <div className="divide-y divide-border">{scheduled.slice(0, 4).map((match) => <Scoreline key={match.id} match={match} />)}</div> : <StatePanel kind="empty" title="Sem próximos jogos" description="A agenda aparecerá após a geração das rodadas." compact />}
        </section>
        <section className="surface-panel">
          <div className="section-heading"><div><p className="eyebrow">Destaques</p><h2>Desempenho</h2></div><ShieldCheck /></div>
          <dl className="divide-y divide-border text-sm">
            <div className="data-pair"><dt>Líder</dt><dd>{leader?.team_name ?? "A definir"}</dd></div>
            <div className="data-pair"><dt>Melhor ataque</dt><dd>{bestAttack ? `${bestAttack.team_name} · ${bestAttack.goals_for} GP` : "A definir"}</dd></div>
            <div className="data-pair"><dt>Melhor defesa</dt><dd>{bestDefense ? `${bestDefense.team_name} · ${bestDefense.goals_against} GC` : "A definir"}</dd></div>
          </dl>
        </section>
      </div>
      <section className="surface-panel">
        <div className="section-heading"><div><p className="eyebrow">Placar final</p><h2>Últimos resultados</h2></div></div>
        {played.length ? <div className="grid gap-2 lg:grid-cols-2">{played.slice(-4).reverse().map((match) => <Scoreline key={match.id} match={match} />)}</div> : <StatePanel kind="empty" title="A bola ainda não rolou" description="Os resultados registrados aparecerão aqui." compact />}
      </section>
    </div>
  );
}