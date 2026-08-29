import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useCreateCompetition } from "@/features/competitions/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { RestrictedNotice } from "@/routes/admin.index";
import type { CompetitionType, DraftMode, DraftOrderMode } from "@/types/api";

export const Route = createFileRoute("/admin/competitions/new")({
  head: () => ({
    meta: [
      { title: "Criar competição · ReverseDraft" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewCompetitionPage,
});

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function NewCompetitionPage() {
  const { isAuthenticated, isStaff } = useAuth();
  const navigate = useNavigate();
  const createCompetition = useCreateCompetition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [competitionType, setCompetitionType] = useState<CompetitionType>("draft");
  const [draftMode, setDraftMode] = useState<DraftMode>("snake");
  const [draftOrderMode, setDraftOrderMode] = useState<DraftOrderMode>("random");
  const [draftSeed, setDraftSeed] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("8");
  const [draftRounds, setDraftRounds] = useState("18");
  const [leagueDoubleRound, setLeagueDoubleRound] = useState(true);

  if (!isAuthenticated || !isStaff) {
    return <RestrictedNotice />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const competition = await createCompetition.mutateAsync({
      name,
      description,
      competition_type: competitionType,
      draft_mode: draftMode,
      draft_order_mode: draftOrderMode,
      draft_seed: draftSeed ? Number(draftSeed) : null,
      max_participants: Number(maxParticipants) || 8,
      draft_rounds: competitionType === "draft" ? Number(draftRounds) || 18 : 0,
      league_double_round: leagueDoubleRound,
    });
    navigate({
      to: "/competitions/$competitionId",
      params: { competitionId: String(competition.id) },
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary">
        ← Admin
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Criar competição</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure draft, liga ou copa com inscrições abertas.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Nome</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Descrição</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Tipo</span>
          <select
            value={competitionType}
            onChange={(e) => setCompetitionType(e.target.value as CompetitionType)}
            className={inputClass}
          >
            <option value="draft">Draft reverso</option>
            <option value="league">Liga (pontos corridos)</option>
            <option value="cup">Copa (mata-mata)</option>
          </select>
        </label>

        {competitionType === "draft" ? (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-foreground">Modo do draft</span>
              <select
                value={draftMode}
                onChange={(e) => setDraftMode(e.target.value as DraftMode)}
                className={inputClass}
              >
                <option value="snake">Snake</option>
                <option value="reverse">Reverse</option>
                <option value="linear">Linear</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-foreground">Ordem do draft</span>
              <select
                value={draftOrderMode}
                onChange={(e) => setDraftOrderMode(e.target.value as DraftOrderMode)}
                className={inputClass}
              >
                <option value="random">Aleatória</option>
                <option value="join_order">Ordem de inscrição</option>
                <option value="manual">Manual (definir antes de iniciar)</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-foreground">Seed (opcional)</span>
              <input
                type="number"
                min={1}
                value={draftSeed}
                onChange={(e) => setDraftSeed(e.target.value)}
                placeholder="Ex.: 42 para ordem reproduzível"
                className={inputClass}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-foreground">Rodadas do draft</span>
              <input
                type="number"
                min={1}
                max={30}
                value={draftRounds}
                onChange={(e) => setDraftRounds(e.target.value)}
                className={inputClass}
              />
            </label>
          </>
        ) : null}

        {competitionType === "league" ? (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={leagueDoubleRound}
              onChange={(e) => setLeagueDoubleRound(e.target.checked)}
            />
            Turno e returno (ida e volta)
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Máx. participantes</span>
          <input
            type="number"
            min={2}
            max={32}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            className={inputClass}
          />
        </label>

        {createCompetition.isError ? (
          <p className="text-sm text-destructive">
            {(createCompetition.error as Error)?.message ?? "Erro ao criar competição."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={createCompetition.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {createCompetition.isPending ? "Criando…" : "Criar competição"}
        </button>
      </form>
    </div>
  );
}
