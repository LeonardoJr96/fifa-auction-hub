import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, CircleDot, Settings, Trophy, UsersRound } from "lucide-react";

import { CompetitionAdminBar } from "@/features/competitions/CompetitionAdminBar";
import { CompetitionBracketPanel } from "@/features/competitions/CompetitionBracketPanel";
import { CompetitionDraftPanel } from "@/features/competitions/CompetitionDraftPanel";
import { CompetitionMatchesPanel } from "@/features/competitions/CompetitionMatchesPanel";
import { CompetitionStandingsPanel } from "@/features/competitions/CompetitionStandingsPanel";
import { CompetitionOverviewPanel } from "@/features/competitions/CompetitionOverviewPanel";
import { CompetitionRostersPanel } from "@/features/competitions/CompetitionRostersPanel";
import { CompetitionLeadersPanel } from "@/features/competitions/CompetitionLeadersPanel";
import { useCompetition, useJoinCompetition } from "@/features/competitions/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import type { CompetitionType } from "@/types/api";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/StatePanel";

export const Route = createFileRoute("/competitions/$competitionId")({
  head: () => ({
    meta: [
      { title: "Competição · ReverseDraft" },
      { name: "description", content: "Acompanhe draft, tabela, partidas e chaveamento." },
      { property: "og:title", content: "Central de competição · ReverseDraft" },
      { property: "og:description", content: "Tabela, partidas, times, jogadores e estatísticas da competição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompetitionDetailPage,
});

const STATUS_LABEL: Record<string, string> = {
  registration: "Inscrições abertas",
  draft: "Draft ao vivo",
  active: "Em andamento",
  finished: "Encerrada",
};

const TYPE_LABEL: Record<CompetitionType, string> = {
  draft: "Draft",
  league: "Liga",
  cup: "Copa",
};

type Tab = "overview" | "standings" | "matches" | "teams" | "players" | "stats" | "scorers" | "assists" | "draft" | "bracket" | "settings";

function CompetitionDetailPage() {
  const { competitionId } = Route.useParams();
  const { isAuthenticated, isStaff } = useAuth();
  const { data: competition, isLoading } = useCompetition(competitionId);
  const join = useJoinCompetition(competitionId);
  const [tab, setTab] = useState<Tab>("standings");

  if (isLoading) {
    return <div className="page-container"><StatePanel kind="loading" title="Carregando competição" description="Preparando tabela, partidas e informações do torneio." /></div>;
  }

  if (!competition) {
    return (
      <div className="page-container"><StatePanel kind="error" title="Competição não encontrada" description="Ela pode ter sido removida ou você não tem acesso." />
        <Link to="/competitions" className="mt-4 inline-block text-sm text-primary">
          Voltar
        </Link>
      </div>
    );
  }

  const canJoin =
    isAuthenticated &&
    competition.status === "registration" &&
    !competition.is_joined &&
    competition.participant_count < competition.max_participants;

  const tabs: Array<{ id: Tab; label: string; show: boolean }> = [
    { id: "overview", label: "Visão geral", show: true },
    { id: "standings", label: "Classificação", show: competition.competition_type === "league" },
    { id: "matches", label: "Partidas", show: competition.competition_type !== "draft" || competition.status !== "registration" },
    { id: "teams", label: "Times", show: true },
    { id: "players", label: "Jogadores", show: true },
    { id: "stats", label: "Estatísticas", show: competition.competition_type !== "draft" },
    { id: "scorers", label: "Artilharia", show: competition.competition_type !== "draft" },
    { id: "assists", label: "Assistências", show: competition.competition_type !== "draft" },
    { id: "draft", label: "Draft", show: competition.competition_type === "draft" || competition.status === "draft" },
    { id: "bracket", label: "Chaveamento", show: competition.competition_type === "cup" },
    { id: "settings", label: "Configurações", show: isStaff },
  ];

  return (
    <div className="page-container">
      <div className="mb-5">
        <Link to="/competitions" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
          <ChevronLeft className="size-4" /> Competições
        </Link>
      </div>
      <header className="competition-header">
        <span className="competition-mark"><Trophy /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="status-dot"><CircleDot />{STATUS_LABEL[competition.status] ?? competition.status}</span><span className="text-xs font-semibold uppercase text-muted-foreground">{TYPE_LABEL[competition.competition_type]}</span></div><h1 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">{competition.name}</h1>{competition.description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{competition.description}</p> : null}</div>
        <div className="competition-capacity"><UsersRound /><div><strong>{competition.participant_count}</strong><span> de {competition.max_participants} times</span></div></div>
        {canJoin ? <Button disabled={join.isPending} onClick={() => join.mutate()}>{join.isPending ? "Inscrevendo…" : "Inscrever-se"}</Button> : null}
      </header>

      <div className="tab-rail" role="tablist" aria-label="Áreas da competição">
        {tabs
          .filter((item) => item.show)
          .map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              role="tab"
              aria-selected={tab === item.id}
              className={`tab-button ${
                tab === item.id
                  ? "tab-button-active"
                  : ""
              }`}
            >
              {item.label}
            </button>
          ))}
      </div>

      <div className="mt-7">
        {tab === "overview" ? <CompetitionOverviewPanel competition={competition} /> : null}

        {tab === "draft" ? (
          <CompetitionDraftPanel competition={competition} competitionId={competitionId} isStaff={isStaff} />
        ) : null}
        {tab === "standings" ? <CompetitionStandingsPanel competitionId={competitionId} /> : null}
        {tab === "matches" ? (
          <CompetitionMatchesPanel
            competitionId={competitionId}
            canReportResults={isStaff || competition.is_joined}
            canSimulate={isStaff}
          />
        ) : null}
        {tab === "teams" ? <CompetitionRostersPanel competitionId={competitionId} /> : null}
        {tab === "players" ? <CompetitionRostersPanel competitionId={competitionId} playersOnly /> : null}
        {tab === "stats" ? <CompetitionOverviewPanel competition={competition} /> : null}
        {tab === "scorers" ? <CompetitionLeadersPanel competitionId={competitionId} metric="goals" /> : null}
        {tab === "assists" ? <CompetitionLeadersPanel competitionId={competitionId} metric="assists" /> : null}
        {tab === "bracket" ? <CompetitionBracketPanel competitionId={competitionId} /> : null}
        {tab === "settings" ? <section className="surface-panel"><div className="section-heading"><div><p className="eyebrow">Administração</p><h2>Configurações da competição</h2></div><Settings /></div><CompetitionAdminBar competition={competition} competitionId={competitionId} isStaff={isStaff} /></section> : null}
      </div>
    </div>
  );
}
