import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import {
  useBracket,
  useCompetitions,
  useFinishCompetition,
  useGenerateBracket,
} from "@/features/campaigns/hooks";
import { RestrictedNotice } from "@/routes/admin.index";

export const Route = createFileRoute("/admin/competitions")({
  head: () => ({
    meta: [
      { title: "Competições · Painel admin · ReverseDraft" },
      {
        name: "description",
        content: "Encerre competições e gere o chaveamento das copas e ligas.",
      },
      { property: "og:title", content: "Competições · Painel admin · ReverseDraft" },
      {
        property: "og:description",
        content: "Encerre competições e gere o chaveamento das copas e ligas.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCompetitionsPage,
});

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function teamLabel(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object" && "name" in (value as Record<string, unknown>)) {
    return String((value as { name?: string }).name ?? "—");
  }
  return `Time #${String(value)}`;
}

function AdminCompetitionsPage() {
  const { isAuthenticated, isStaff } = useAuth();
  const { data: competitions, isLoading } = useCompetitions();
  const finishCompetition = useFinishCompetition();
  const generateBracket = useGenerateBracket();
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const bracket = useBracket(selectedId);

  if (!isAuthenticated || !isStaff) return <RestrictedNotice />;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Competições</h1>
        <Link to="/admin" className="text-sm font-semibold text-primary hover:underline">
          ← Painel
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2" aria-busy="true">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : !competitions?.length ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhuma competição registrada.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {competitions.map((competition) => (
            <li
              key={competition.id}
              className="rounded-xl border border-border bg-card p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground">{competition.name}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {competition.competition_type} ·{" "}
                  {competition.campaign ? `Campanha #${competition.campaign}` : "Global"} ·{" "}
                  {competition.is_active ? "Ativa" : "Encerrada"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
                <button
                  type="button"
                  onClick={() => generateBracket.mutate(competition.id)}
                  disabled={generateBracket.isPending}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  Gerar chaveamento
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(competition.id)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent"
                >
                  Ver chaveamento
                </button>
                {competition.is_active ? (
                  <button
                    type="button"
                    onClick={() => finishCompetition.mutate(competition.id)}
                    disabled={finishCompetition.isPending}
                    className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    Encerrar competição
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {finishCompetition.isError ? (
        <p role="alert" className="mt-4 text-sm font-medium text-destructive">
          {errorText(finishCompetition.error, "Não foi possível encerrar a competição.")}
        </p>
      ) : null}
      {generateBracket.isError ? (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {errorText(generateBracket.error, "Não foi possível gerar o chaveamento.")}
        </p>
      ) : null}

      {selectedId !== undefined ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Chaveamento · competição #{selectedId}
          </h2>
          {bracket.isLoading ? (
            <div className="mt-3 h-16 animate-pulse rounded bg-muted" aria-busy="true" />
          ) : bracket.isError ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {errorText(bracket.error, "Chaveamento indisponível para esta competição.")}
            </p>
          ) : !bracket.data?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum confronto gerado ainda. Use “Gerar chaveamento”.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {bracket.data.map((match, index) => (
                <li
                  key={match.id ?? index}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Rodada {match.round ?? index + 1}
                  </span>
                  <span className="font-medium text-foreground">
                    {teamLabel(match.home_team)} {match.home_score ?? "-"} ×{" "}
                    {match.away_score ?? "-"} {teamLabel(match.away_team)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
