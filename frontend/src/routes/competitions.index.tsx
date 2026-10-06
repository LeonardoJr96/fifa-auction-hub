import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Radio, Trophy, UsersRound } from "lucide-react";

import { useCompetitions, useJoinCompetition } from "@/features/competitions/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/competitions/")({
  head: () => ({
    meta: [
      { title: "Competições · ReverseDraft" },
      { name: "description", content: "Participe de drafts e monte seu time para competições." },
      { property: "og:title", content: "Competições de futebol · ReverseDraft" },
      { property: "og:description", content: "Ligas, copas e drafts com partidas, tabelas e estatísticas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompetitionsPage,
});

const STATUS_LABEL: Record<string, string> = {
  registration: "Inscrições abertas",
  draft: "Draft ao vivo",
  active: "Em andamento",
  finished: "Encerrada",
};

const DRAFT_MODE_LABEL: Record<string, string> = {
  snake: "Snake",
  reverse: "Reverse",
  linear: "Linear",
};

const TYPE_LABEL: Record<string, string> = {
  draft: "Draft",
  league: "Liga",
  cup: "Copa",
};

function CompetitionsPage() {
  const { data: competitions, isLoading, isError } = useCompetitions();

  return (
    <div className="page-container">
      <PageHeader eyebrow="Temporadas e torneios" title="Competições" description="Acompanhe ligas, copas e drafts do início das inscrições ao último apito." />

      {isLoading ? (
        <StatePanel kind="loading" title="Carregando competições" />
      ) : isError ? (
        <StatePanel kind="error" title="Competições indisponíveis" description="Tente novamente em alguns instantes." />
      ) : !competitions?.length ? (
        <StatePanel kind="empty" title="Nenhuma competição aberta" description="Novas temporadas aparecerão aqui quando forem publicadas." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="premium-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Competição</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Times</th>
                <th className="px-4 py-3">Rodadas</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((competition) => (
                <CompetitionRow key={competition.id} competition={competition} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompetitionRow({ competition }: { competition: import("@/types/api").Competition }) {
  const { isAuthenticated } = useAuth();
  const join = useJoinCompetition(String(competition.id));
  const canJoin =
    isAuthenticated &&
    competition.status === "registration" &&
    !competition.is_joined &&
    competition.participant_count < competition.max_participants;

  return (
    <tr className="border-t border-border hover:bg-secondary/50">
      <td className="px-4 py-3">
        <Link
          to="/competitions/$competitionId"
          params={{ competitionId: String(competition.id) }}
          className="inline-flex items-center gap-2 font-semibold text-foreground hover:text-primary"
        >
          <Trophy className="size-4 text-primary" />
          {competition.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {TYPE_LABEL[competition.competition_type] ?? competition.competition_type} ·{" "}
        {DRAFT_MODE_LABEL[competition.draft_mode] ?? competition.draft_mode}
      </td>
      <td className="px-4 py-3">
        <span className="status-dot"><Radio />{STATUS_LABEL[competition.status] ?? competition.status}</span>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        <span className="inline-flex items-center gap-1"><UsersRound className="size-3.5" />{competition.participant_count}/{competition.max_participants}</span>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{competition.draft_rounds}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {canJoin ? (
            <Button type="button" size="sm" disabled={join.isPending} onClick={() => join.mutate()}>
              {join.isPending ? "Inscrevendo…" : "Inscrever-se"}
            </Button>
          ) : competition.is_joined ? (
            <span className="text-xs text-muted-foreground">Inscrito</span>
          ) : null}
          <Link
            to="/competitions/$competitionId"
            params={{ competitionId: String(competition.id) }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            Ver tabela<ArrowRight className="size-4" />
          </Link>
        </div>
        {join.isError ? <p className="mt-1 text-right text-xs text-destructive">{(join.error as Error)?.message ?? "Erro ao inscrever-se."}</p> : null}
      </td>
    </tr>
  );
}
