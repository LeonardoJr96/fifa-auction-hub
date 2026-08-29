import { createFileRoute, Link } from "@tanstack/react-router";

import { useCompetitions, useJoinCompetition } from "@/features/competitions/hooks";
import { useAuth } from "@/features/auth/AuthContext";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "Competições · ReverseDraft" },
      { name: "description", content: "Participe de drafts e monte seu time para competições." },
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
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Competições</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inscreva-se e participe do draft reverso ao vivo.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Carregando competições…</p>
      ) : isError ? (
        <p className="mt-8 text-sm text-destructive">Não foi possível carregar as competições.</p>
      ) : !competitions?.length ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma competição aberta no momento.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
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
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{competition.name}</h2>
          {competition.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{competition.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary">
              {STATUS_LABEL[competition.status] ?? competition.status}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {TYPE_LABEL[competition.competition_type] ?? competition.competition_type}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {DRAFT_MODE_LABEL[competition.draft_mode] ?? competition.draft_mode}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {competition.participant_count}/{competition.max_participants} inscritos
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {competition.draft_rounds} rodadas
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canJoin ? (
            <button
              type="button"
              disabled={join.isPending}
              onClick={() => join.mutate()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {join.isPending ? "Inscrevendo…" : "Inscrever-se"}
            </button>
          ) : competition.is_joined ? (
            <span className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">
              Você está inscrito
            </span>
          ) : null}
          <Link
            to="/competitions/$competitionId"
            params={{ competitionId: String(competition.id) }}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {competition.status === "draft" ? "Entrar no draft" : "Ver detalhes"}
          </Link>
        </div>
      </div>
      {join.isError ? (
        <p className="mt-3 text-sm text-destructive">
          {(join.error as Error)?.message ?? "Erro ao inscrever-se."}
        </p>
      ) : null}
    </article>
  );
}
