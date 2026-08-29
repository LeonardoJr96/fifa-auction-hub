import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CompetitionAdminBar } from "@/features/competitions/CompetitionAdminBar";
import { CompetitionBracketPanel } from "@/features/competitions/CompetitionBracketPanel";
import { CompetitionDraftPanel } from "@/features/competitions/CompetitionDraftPanel";
import { CompetitionMatchesPanel } from "@/features/competitions/CompetitionMatchesPanel";
import { CompetitionStandingsPanel } from "@/features/competitions/CompetitionStandingsPanel";
import { useCompetition, useJoinCompetition } from "@/features/competitions/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import type { CompetitionType } from "@/types/api";

export const Route = createFileRoute("/competitions/$competitionId")({
  head: () => ({
    meta: [
      { title: "Competição · ReverseDraft" },
      { name: "description", content: "Acompanhe draft, tabela, partidas e chaveamento." },
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

type Tab = "overview" | "draft" | "standings" | "matches" | "bracket";

function CompetitionDetailPage() {
  const { competitionId } = Route.useParams();
  const { isAuthenticated, isStaff } = useAuth();
  const { data: competition, isLoading } = useCompetition(competitionId);
  const join = useJoinCompetition(competitionId);
  const [tab, setTab] = useState<Tab>("overview");

  if (isLoading) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!competition) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Competição não encontrada</h1>
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
    { id: "draft", label: "Draft", show: competition.competition_type === "draft" || competition.status === "draft" },
    { id: "standings", label: "Tabela", show: competition.competition_type === "league" },
    { id: "matches", label: "Partidas", show: competition.competition_type !== "draft" || competition.status !== "registration" },
    { id: "bracket", label: "Chaveamento", show: competition.competition_type === "cup" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link to="/competitions" className="text-sm text-muted-foreground hover:text-primary">
          ← Competições
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{competition.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {TYPE_LABEL[competition.competition_type]} · {STATUS_LABEL[competition.status] ?? competition.status}
        </p>
        {competition.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{competition.description}</p>
        ) : null}
      </div>

      <CompetitionAdminBar competition={competition} competitionId={competitionId} isStaff={isStaff} />

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs
          .filter((item) => item.show)
          .map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
      </div>

      <div className="mt-6">
        {tab === "overview" ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Participantes</h2>
            <ul className="mt-3 space-y-2">
              {(competition.participants ?? []).map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">{participant.username}</span>
                  {participant.draft_slot ? (
                    <span className="text-xs text-muted-foreground">#{participant.draft_slot}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {canJoin ? (
              <button
                type="button"
                disabled={join.isPending}
                onClick={() => join.mutate()}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {join.isPending ? "Inscrevendo…" : "Inscrever-se"}
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === "draft" ? (
          <CompetitionDraftPanel competition={competition} competitionId={competitionId} isStaff={isStaff} />
        ) : null}
        {tab === "standings" ? <CompetitionStandingsPanel competitionId={competitionId} /> : null}
        {tab === "matches" ? (
          <CompetitionMatchesPanel competitionId={competitionId} isStaff={isStaff} />
        ) : null}
        {tab === "bracket" ? <CompetitionBracketPanel competitionId={competitionId} /> : null}
      </div>
    </div>
  );
}
