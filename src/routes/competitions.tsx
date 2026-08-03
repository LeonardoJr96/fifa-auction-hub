import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useCompetitions, useMatches, useSimulateMatch } from "@/features/campaigns/hooks";
import { useAuth } from "@/features/auth/AuthContext";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "Competições & Partidas · ReverseDraft" },
      { name: "description", content: "Acompanhe ligas, copas e simulação de partidas entre os times dos usuários." },
    ],
  }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const { isStaff } = useAuth();
  const { data: competitions, isLoading: loadingCompetitions } = useCompetitions();
  const { data: matches, isLoading: loadingMatches } = useMatches();
  const simulateMatchMutation = useSimulateMatch();
  const [competitionName, setCompetitionName] = useState("");
  const queryClient = useQueryClient();
  const createCompetition = useMutation({
    mutationFn: () => apiRequest("/competitions/", { method: "POST", body: { name: competitionName, competition_type: "league", is_active: true } }),
    onSuccess: () => { setCompetitionName(""); queryClient.invalidateQueries({ queryKey: ["competitions"] }); },
  });
  const finishCompetition = useMutation({
    mutationFn: (id: number) => apiRequest(`/competitions/${id}/finish/`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["competitions"] }),
  });

  const handleSimulate = (matchId: number) => {
    simulateMatchMutation.mutate(matchId);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Competições & Partidas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ligas e Copas integradas com acionamento automático da janela de mercado após partidas.
        </p>
      </div>

      {isStaff && (
        <form onSubmit={(event) => { event.preventDefault(); if (competitionName.trim()) createCompetition.mutate(); }} className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4">
          <input required value={competitionName} onChange={(event) => setCompetitionName(event.target.value)} placeholder="Nome da nova competição" className="min-w-64 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button disabled={createCompetition.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{createCompetition.isPending ? "Criando..." : "Criar competição"}</button>
        </form>
      )}

      {/* Ligas e Copas */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Competições Ativas</h2>
        {loadingCompetitions ? (
          <p className="text-sm text-muted-foreground">Carregando competições...</p>
        ) : !competitions || competitions.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
            Nenhuma competição registrada no momento.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitions.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary uppercase">
                    {c.competition_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.campaign ? `Campanha #${c.campaign}` : "Global"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
                {isStaff && c.is_active && <button onClick={() => finishCompetition.mutate(c.id)} disabled={finishCompetition.isPending} className="rounded border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10">Encerrar competição</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Partidas */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Calendário de Partidas</h2>
        {loadingMatches ? (
          <p className="text-sm text-muted-foreground">Carregando partidas...</p>
        ) : !matches || matches.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
            Nenhuma partida agendada ou disputada.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row items-center justify-between rounded-lg border border-border bg-card p-4 gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <span className="text-sm font-semibold text-foreground">
                    Mandante #{typeof m.home_team === "object" ? m.home_team.name : m.home_team}
                  </span>
                  <span className="rounded bg-pitch-deep px-3 py-1 text-base font-black text-gold">
                    {m.home_score} - {m.away_score}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Visitante #{typeof m.away_team === "object" ? m.away_team.name : m.away_team}
                  </span>
                </div>

                {isStaff && (
                  <button
                    onClick={() => handleSimulate(m.id)}
                    disabled={simulateMatchMutation.isPending}
                    className="rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/20 transition-all disabled:opacity-50"
                  >
                    {simulateMatchMutation.isPending ? "Simulando..." : "Simular Placar (Admin)"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
