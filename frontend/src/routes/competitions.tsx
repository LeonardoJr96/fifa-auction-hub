import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Radio, Trophy, UsersRound } from "lucide-react";

import { useCompetitions, useJoinCompetition } from "@/features/competitions/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/competitions")({
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
        <div className="grid gap-4 lg:grid-cols-2">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({ competition }: { competition: import("@/types/api").Competition }) {
  const { isAuthenticated } = useAuth();
  const join = useJoinCompetition(String(competition.id));

  const canJoin =
    isAuthenticated &&
    competition.status === "registration" &&
    !competition.is_joined &&
    competition.participant_count < competition.max_participants;

  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50">
      <div className="h-1 bg-primary" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <span className="club-mark"><Trophy /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-dot"><Radio />{STATUS_LABEL[competition.status] ?? competition.status}</span>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{TYPE_LABEL[competition.competition_type] ?? competition.competition_type}</span>
            </div>
            <h2 className="mt-3 font-display text-xl font-bold text-foreground">{competition.name}</h2>
            {competition.description ? <p className="mt-1 text-sm text-muted-foreground">{competition.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-secondary px-2.5 py-1 text-muted-foreground">{DRAFT_MODE_LABEL[competition.draft_mode] ?? competition.draft_mode}</span>
              <span className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-muted-foreground"><UsersRound className="size-3.5" />{competition.participant_count}/{competition.max_participants} times</span>
              <span className="rounded bg-secondary px-2.5 py-1 text-muted-foreground">{competition.draft_rounds} rodadas</span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {canJoin ? (
            <Button
              type="button"
              disabled={join.isPending}
              onClick={() => join.mutate()}
            >
              {join.isPending ? "Inscrevendo…" : "Inscrever-se"}
            </Button>
          ) : competition.is_joined ? (
            <span className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">
              Você está inscrito
            </span>
          ) : null}
          <Link
            to="/competitions/$competitionId"
            params={{ competitionId: String(competition.id) }}
            className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
          >
            {competition.status === "draft" ? "Entrar no draft" : "Abrir central"}<ArrowRight className="size-4" />
          </Link>
        </div>
        {join.isError ? <p className="mt-3 text-sm text-destructive">{(join.error as Error)?.message ?? "Erro ao inscrever-se."}</p> : null}
      </div>
    </article>
  );
}
