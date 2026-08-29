import { Link } from "@tanstack/react-router";

import { useCompetitionMatches, useCompetitions } from "@/features/competitions/hooks";
import type { Competition } from "@/types/api";

type BracketStatus = {
  generated: boolean;
  label: string;
  reason: string | null;
};

export function describeBracketStatus(competition: Competition, matchCount: number): BracketStatus {
  if (competition.competition_type === "draft") {
    return {
      generated: false,
      label: "Não se aplica",
      reason: "Draft puro não gera chaveamento nem rodadas.",
    };
  }

  if (matchCount > 0) {
    return {
      generated: true,
      label: `Gerado (${matchCount} ${matchCount === 1 ? "partida" : "partidas"})`,
      reason: null,
    };
  }

  const missing = competition.max_participants - competition.participant_count;

  if (competition.participant_count < 2) {
    return {
      generated: false,
      label: "Pendente",
      reason: `Participantes insuficientes: ${competition.participant_count} de no mínimo 2.`,
    };
  }

  if (missing > 0) {
    return {
      generated: false,
      label: "Pendente",
      reason: `Ainda há vagas abertas: ${competition.participant_count}/${competition.max_participants} — faltam ${missing} para gerar automaticamente. Ative a competição para gerar antes de lotar.`,
    };
  }

  if (competition.status === "draft") {
    return {
      generated: false,
      label: "Pendente",
      reason: "Vagas cheias, mas o draft ainda está em andamento — gera ao terminar o draft.",
    };
  }

  return {
    generated: false,
    label: "Pendente",
    reason: "Vagas cheias e pronto para gerar: ative a competição ou use a geração manual.",
  };
}

function CompetitionRow({ competition }: { competition: Competition }) {
  const matches = useCompetitionMatches(String(competition.id));
  const matchCount = matches.data?.length ?? 0;
  const status = describeBracketStatus(competition, matchCount);

  return (
    <li className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <Link
          to="/competitions/$competitionId"
          params={{ competitionId: String(competition.id) }}
          className="truncate text-sm font-semibold text-foreground hover:text-primary"
        >
          {competition.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {competition.competition_type} · {competition.status} · {competition.participant_count}/
          {competition.max_participants} participantes
        </p>
        {status.reason ? <p className="mt-1 text-xs text-muted-foreground">{status.reason}</p> : null}
      </div>
      <span
        className={`shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-center ${
          status.generated
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {matches.isPending ? "Verificando…" : status.label}
      </span>
    </li>
  );
}

export function BracketStatusPanel() {
  const competitions = useCompetitions();

  return (
    <section className="mt-8 rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-base font-bold text-foreground">Status do chaveamento</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Mostra se as rodadas/chaveamento já foram gerados e o motivo quando ainda estão pendentes.
        </p>
      </header>

      {competitions.isPending ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : competitions.data?.length ? (
        <ul>
          {competitions.data.map((competition) => (
            <CompetitionRow key={competition.id} competition={competition} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma competição cadastrada.</p>
      )}
    </section>
  );
}
