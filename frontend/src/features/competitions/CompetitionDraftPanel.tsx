import { PlayerPhoto } from "@/components/PlayerPhoto";
import {
  useDraftPick,
  useDraftState,
  useSetDraftOrder,
  useStartDraft,
} from "@/features/competitions/hooks";
import { useDraftRealtime } from "@/features/competitions/useDraftRealtime";
import { useProducts } from "@/features/players/hooks";
import type { Competition } from "@/types/api";
import { useMemo, useState } from "react";

export function CompetitionDraftPanel({
  competition,
  competitionId,
  isStaff,
}: {
  competition: Competition;
  competitionId: string;
  isStaff: boolean;
}) {
  const draftEnabled =
    competition.competition_type === "draft" ||
    competition.status === "draft" ||
    competition.status === "active";
  const { data: draft, isLoading: draftLoading } = useDraftState(competitionId, draftEnabled);
  const { connected } = useDraftRealtime(competitionId, draftEnabled);
  const startDraft = useStartDraft(competitionId);
  const setDraftOrder = useSetDraftOrder(competitionId);
  const draftPick = useDraftPick(competitionId);
  const { data: products } = useProducts();
  const [query, setQuery] = useState("");

  const pickedPlayerIds = useMemo(
    () => new Set((draft?.picks ?? []).map((pick) => pick.player)),
    [draft?.picks],
  );

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return (products ?? [])
      .filter((product) => product.title.toLowerCase().includes(term))
      .filter((product) => !pickedPlayerIds.has(product.player.id))
      .slice(0, 8);
  }, [products, query, pickedPlayerIds]);

  const canStartDraft =
    isStaff && competition.status === "registration" && competition.participant_count >= 2;

  const manualOrder = competition.draft_order_mode === "manual";

  function applyJoinOrder() {
    const order = (competition.participants ?? []).map((participant, index) => ({
      participant: participant.id,
      draft_slot: index + 1,
    }));
    setDraftOrder.mutate(order);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Draft</h2>
          {connected ? <span className="text-xs text-primary">ao vivo</span> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Modo {competition.draft_mode} · ordem{" "}
          {competition.draft_order_mode === "random"
            ? "aleatória"
            : competition.draft_order_mode === "join_order"
              ? "por inscrição"
              : "manual"}
          {competition.draft_seed ? ` · seed ${competition.draft_seed}` : ""}
        </p>

        {isStaff && competition.status === "registration" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {canStartDraft ? (
              <button
                type="button"
                disabled={startDraft.isPending}
                onClick={() => startDraft.mutate()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {startDraft.isPending ? "Iniciando…" : "Iniciar draft"}
              </button>
            ) : null}
            {manualOrder ? (
              <button
                type="button"
                disabled={setDraftOrder.isPending}
                onClick={applyJoinOrder}
                className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-60"
              >
                Usar ordem de inscrição
              </button>
            ) : null}
          </div>
        ) : null}

        {draftLoading && !draft ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando draft…</p>
        ) : draft ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Pick {draft.current_pick_index + 1} de {draft.total_picks}
              {draft.current_username ? ` · vez de ${draft.current_username}` : ""}
            </p>
            {draft.is_my_turn ? (
              <div className="mt-4 space-y-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar jogador…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <ul className="space-y-2">
                  {matches.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        disabled={draftPick.isPending}
                        onClick={() => draftPick.mutate(product.player.id)}
                        className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left transition-colors hover:border-primary/50 disabled:opacity-60"
                      >
                        <PlayerPhoto player={product.player} className="h-10 w-10" />
                        <span className="text-sm font-medium text-foreground">{product.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          OVR {product.player.overall_rating}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : competition.status === "draft" ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Aguardando a vez do próximo participante.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">O draft ainda não começou.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Escolhas</h3>
        {!draft?.picks?.length ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma escolha ainda.</p>
        ) : (
          <ol className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
            {[...draft.picks].reverse().map((pick) => (
              <li key={pick.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <div className="font-medium text-foreground">
                  #{pick.pick_number} {pick.player_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pick.username} · OVR {pick.player_overall}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
