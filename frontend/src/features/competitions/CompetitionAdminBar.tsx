import {
  useActivateCompetition,
  useFinishCompetition,
  useGenerateBracket,
  useStartDraft,
} from "@/features/competitions/hooks";
import type { Competition } from "@/types/api";

export function CompetitionAdminBar({
  competition,
  competitionId,
  canManage,
}: {
  competition: Competition;
  competitionId: string;
  canManage: boolean;
}) {
  const startDraft = useStartDraft(competitionId);
  const generateBracket = useGenerateBracket(competitionId);
  const activate = useActivateCompetition(competitionId);
  const finish = useFinishCompetition(competitionId);

  if (!canManage || competition.status === "finished") {
    return null;
  }

  const canStartDraft = competition.status === "registration" && competition.participant_count >= 2;

  const canGenerateCup =
    competition.competition_type === "cup" &&
    competition.status === "registration" &&
    competition.participant_count >= 2;

  const canActivate =
    competition.competition_type !== "draft" &&
    competition.status === "registration" &&
    competition.participant_count >= 2;

  const canFinish = competition.status === "active";

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4">
      {canStartDraft ? (
        <button
          type="button"
          disabled={startDraft.isPending}
          onClick={() => startDraft.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Iniciar draft
        </button>
      ) : null}
      {canGenerateCup ? (
        <button
          type="button"
          disabled={generateBracket.isPending}
          onClick={() => generateBracket.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Gerar chaveamento
        </button>
      ) : null}
      {canActivate ? (
        <button
          type="button"
          disabled={activate.isPending}
          onClick={() => activate.mutate()}
          className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-60"
        >
          Ativar sem draft
        </button>
      ) : null}
      {canFinish ? (
        <button
          type="button"
          disabled={finish.isPending}
          onClick={() => finish.mutate()}
          className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-60"
        >
          Encerrar competição
        </button>
      ) : null}
      {generateBracket.isError ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {generateBracket.error instanceof Error
            ? generateBracket.error.message
            : "Não foi possível gerar o chaveamento."}
        </p>
      ) : null}
    </div>
  );
}
