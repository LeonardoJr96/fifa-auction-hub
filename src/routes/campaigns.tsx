import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useCampaigns,
  useMarketListings,
  useBuyDirect,
  useTransfers,
  useRespondTransfer,
} from "@/features/campaigns/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campanhas & Mercado Direct · ReverseDraft" },
      { name: "description", content: "Participe de campanhas privadas e compre jogadores via venda direta." },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const { isAuthenticated, user } = useAuth();
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: listings, isLoading: loadingListings } = useMarketListings();
  const { data: transfers, isLoading: loadingTransfers } = useTransfers();

  const buyDirectMutation = useBuyDirect();
  const respondTransferMutation = useRespondTransfer();

  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeListings = listings?.filter((l) => l.is_active) ?? [];
  const myTransfers = transfers?.filter((t) => t.requester === user?.id || t.receiver === user?.id) ?? [];

  const handleBuyDirect = (campaignId: number, playerId: number, price?: string) => {
    setFeedbackMsg(null);
    buyDirectMutation.mutate(
      { campaignId, playerId, price: price ?? undefined },
      {
        onSuccess: () => {
          setFeedbackMsg({ type: "success", text: "Compra efetuada com sucesso! O jogador já está no seu elenco da campanha." });
        },
        onError: (err) => {
          setFeedbackMsg({ type: "error", text: err.message || "Erro ao realizar compra direta." });
        },
      }
    );
  };

  const handleRespondTransfer = (transferId: number, accepted: boolean) => {
    setFeedbackMsg(null);
    respondTransferMutation.mutate(
      { transferId, accepted },
      {
        onSuccess: () => {
          setFeedbackMsg({
            type: "success",
            text: accepted ? "Proposta de troca aceita! Elencos atualizados." : "Proposta recusada.",
          });
        },
        onError: (err) => {
          setFeedbackMsg({ type: "error", text: err.message || "Erro ao responder proposta." });
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Campanhas & Mercado Direct</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie suas participações em campanhas, veja listagens de venda direta e negocie trocas de jogadores.
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`rounded-md p-4 text-sm font-medium ${
            feedbackMsg.type === "success" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-destructive/15 text-destructive border border-destructive/30"
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Seção 1: Lista de Campanhas */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Campanhas Ativas</h2>
        {loadingCampaigns ? (
          <p className="text-sm text-muted-foreground">Carregando campanhas...</p>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
            Nenhuma campanha encontrada.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-5 transition-all ${
                  selectedCampaignId === c.id ? "border-gold bg-pitch-deep/40 shadow-lg" : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    ID #{c.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Política: {c.transfer_policy === "always_allowed" ? "Trocas sempre permitidas" : "Trocas só na janela"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-foreground">{c.name}</h3>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Tamanho de elenco: {c.min_roster_size} - {c.max_roster_size} jogadores</p>
                  <p>Partidas p/ janela de mercado: {c.matches_played_since_last_market} / {c.matches_per_market_cycle}</p>
                </div>
                <button
                  onClick={() => setSelectedCampaignId(selectedCampaignId === c.id ? null : c.id)}
                  className="mt-4 w-full rounded-md border border-input bg-background py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                >
                  {selectedCampaignId === c.id ? "Ocultar detalhes" : "Filtrar ofertas"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seção 2: Listagens de Venda Direta / Híbrido */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Mercado de Venda Direta</h2>
          <span className="text-xs text-muted-foreground">
            {activeListings.length} jogador(es) disponível(is)
          </span>
        </div>

        {loadingListings ? (
          <p className="text-sm text-muted-foreground">Carregando listagens...</p>
        ) : activeListings.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
            Não há jogadores anunciados para compra direta no momento.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeListings
              .filter((l) => !selectedCampaignId || l.market_window === selectedCampaignId)
              .map((l) => (
                <div key={l.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        {l.listing_type === "direct" ? "Venda Direta" : l.listing_type === "hybrid" ? "Híbrido" : "Leilão"}
                      </span>
                      <h4 className="font-bold text-foreground">Jogador #{typeof l.player === "object" ? l.player.common_name : l.player}</h4>
                    </div>
                    <span className="text-lg font-black text-gold">
                      {l.price ? formatMoney(Number(l.price)) : "Sob consulta"}
                    </span>
                  </div>

                  {isAuthenticated ? (
                    <button
                      onClick={() => handleBuyDirect(selectedCampaignId || 1, typeof l.player === "object" ? l.player.id : l.player, l.price ?? undefined)}
                      disabled={buyDirectMutation.isPending}
                      className="w-full rounded-md bg-gold px-4 py-2 text-sm font-bold text-gold-foreground transition-all hover:bg-gold/90 disabled:opacity-50"
                    >
                      {buyDirectMutation.isPending ? "Processando..." : "Comprar Agora (Débito de Saldo)"}
                    </button>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">Faça login para comprar</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Seção 3: Minhas Trocas */}
      {isAuthenticated && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Minhas Propostas de Troca</h2>
          {loadingTransfers ? (
            <p className="text-sm text-muted-foreground">Carregando trocas...</p>
          ) : myTransfers.length === 0 ? (
            <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
              Você não possui propostas de troca pendentes ou recentes.
            </div>
          ) : (
            <div className="space-y-3">
              {myTransfers.map((t) => {
                const isReceiver = t.receiver === user?.id;
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            t.status === "pending"
                              ? "bg-amber-500/20 text-amber-400"
                              : t.status === "accepted"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {t.status.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {isReceiver ? `Proposta recebida do usuário #${t.requester}` : `Proposta enviada para o usuário #${t.receiver}`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Oferecidos: {t.offered_players.join(", ")} | Solicitados: {t.requested_players.join(", ")}
                      </p>
                    </div>

                    {t.status === "pending" && isReceiver && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRespondTransfer(t.id, true)}
                          disabled={respondTransferMutation.isPending}
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleRespondTransfer(t.id, false)}
                          disabled={respondTransferMutation.isPending}
                          className="rounded bg-destructive/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-destructive"
                        >
                          Recusar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
