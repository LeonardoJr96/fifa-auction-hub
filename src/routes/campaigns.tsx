import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useBuyDirect,
  useCampaigns,
  useCreateCampaign,
  useCreateMarketWindow,
  useJoinCampaign,
  useMarketListings,
  useMarketWindowAction,
  useMarketWindows,
  useRespondTransfer,
  useTransfers,
} from "@/features/campaigns/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/campaigns")({ component: CampaignsPage });

type Feedback = { type: "success" | "error"; text: string };
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function CampaignsPage() {
  const { isAuthenticated, user } = useAuth();
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: listings, isLoading: loadingListings } = useMarketListings();
  const { data: windows } = useMarketWindows();
  const { data: transfers, isLoading: loadingTransfers } = useTransfers();
  const createCampaign = useCreateCampaign();
  const joinCampaign = useJoinCampaign();
  const buyDirect = useBuyDirect();
  const respondTransfer = useRespondTransfer();
  const createWindow = useCreateMarketWindow();
  const windowAction = useMarketWindowAction();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [minRoster, setMinRoster] = useState("18");
  const [maxRoster, setMaxRoster] = useState("22");
  const [transferPolicy, setTransferPolicy] = useState<"always_allowed" | "market_window_only">(
    "market_window_only",
  );
  const [windowMode, setWindowMode] = useState<"auction" | "market" | "hybrid">("hybrid");
  const [windowName, setWindowName] = useState("Janela de mercado");
  const [windowCount, setWindowCount] = useState("10");

  const selectedCampaign = campaigns?.find((campaign) => campaign.id === selectedCampaignId);
  const activeListings = (listings ?? []).filter((listing) => listing.is_active);
  const selectedWindows = (windows ?? []).filter(
    (window) => window.campaign === selectedCampaignId,
  );
  const filteredListings = selectedCampaignId
    ? activeListings.filter((listing) =>
        (windows ?? []).some(
          (window) => window.id === listing.market_window && window.campaign === selectedCampaignId,
        ),
      )
    : activeListings;
  const myTransfers = (transfers ?? []).filter(
    (transfer) => transfer.requester === user?.id || transfer.receiver === user?.id,
  );

  function submitCampaign(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    createCampaign.mutate(
      {
        name: campaignName,
        min_roster_size: Number(minRoster),
        max_roster_size: Number(maxRoster),
        transfer_policy: transferPolicy,
      },
      {
        onSuccess: () => {
          setCampaignName("");
          setFeedback({ type: "success", text: "Campanha criada com sucesso." });
        },
        onError: (error) =>
          setFeedback({
            type: "error",
            text: errorText(error, "Não foi possível criar a campanha."),
          }),
      },
    );
  }

  function handleBuyDirect(playerId: number, price?: string) {
    if (!selectedCampaignId) {
      setFeedback({ type: "error", text: "Selecione uma campanha antes de comprar." });
      return;
    }
    buyDirect.mutate(
      { campaignId: selectedCampaignId, playerId, price },
      {
        onSuccess: () => setFeedback({ type: "success", text: "Compra efetuada com sucesso!" }),
        onError: (error) =>
          setFeedback({ type: "error", text: errorText(error, "Erro ao realizar compra direta.") }),
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Campanhas & Mercado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Participe de campanhas, negocie jogadores e administre janelas de mercado.
        </p>
      </div>
      {feedback && (
        <div
          className={`rounded-md border p-4 text-sm font-medium ${feedback.type === "success" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : "border-destructive/30 bg-destructive/15 text-destructive"}`}
        >
          {feedback.text}
        </div>
      )}

      {isAuthenticated && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-bold">Criar campanha</h2>
          <form onSubmit={submitCampaign} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Nome da campanha"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              required
              min="1"
              type="number"
              value={minRoster}
              onChange={(e) => setMinRoster(e.target.value)}
              aria-label="Elenco mínimo"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              required
              min="1"
              type="number"
              value={maxRoster}
              onChange={(e) => setMaxRoster(e.target.value)}
              aria-label="Elenco máximo"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <select
              value={transferPolicy}
              onChange={(e) => setTransferPolicy(e.target.value as typeof transferPolicy)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="always_allowed">Trocas sempre permitidas</option>
              <option value="market_window_only">Só na janela de mercado</option>
            </select>
            <button
              disabled={createCampaign.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {createCampaign.isPending ? "Criando..." : "Criar campanha"}
            </button>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Campanhas Ativas</h2>
        {loadingCampaigns ? (
          <p className="text-sm text-muted-foreground">Carregando campanhas...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(campaigns ?? []).map((campaign) => (
              <div
                key={campaign.id}
                className={`rounded-xl border p-5 ${selectedCampaignId === campaign.id ? "border-gold bg-pitch-deep/40" : "border-border bg-card"}`}
              >
                <span className="text-xs text-muted-foreground">ID #{campaign.id}</span>
                <h3 className="mt-2 text-lg font-bold">{campaign.name}</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Elenco: {campaign.min_roster_size}–{campaign.max_roster_size} ·{" "}
                  {campaign.transfer_policy === "always_allowed"
                    ? "Trocas livres"
                    : "Trocas na janela"}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() =>
                      setSelectedCampaignId(selectedCampaignId === campaign.id ? null : campaign.id)
                    }
                    className="flex-1 rounded-md border border-input py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    {selectedCampaignId === campaign.id ? "Limpar filtro" : "Selecionar"}
                  </button>
                  {isAuthenticated && campaign.is_member !== true && (
                    <button
                      disabled={joinCampaign.isPending}
                      onClick={() =>
                        joinCampaign.mutate(campaign.id, {
                          onSuccess: (data) => setFeedback({ type: "success", text: data.detail }),
                          onError: (error) =>
                            setFeedback({
                              type: "error",
                              text: errorText(error, "Não foi possível entrar."),
                            }),
                        })
                      }
                      className="rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-gold-foreground"
                    >
                      Entrar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedCampaign?.is_admin && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xl font-bold">Administração: {selectedCampaign.name}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createWindow.mutate(
                {
                  campaignId: selectedCampaign.id,
                  name: windowName,
                  mode: windowMode,
                  playerCount: Number(windowCount),
                  randomSelection: true,
                },
                {
                  onSuccess: () =>
                    setFeedback({ type: "success", text: "Janela de mercado criada." }),
                  onError: (error) =>
                    setFeedback({
                      type: "error",
                      text: errorText(error, "Não foi possível criar a janela."),
                    }),
                },
              );
            }}
            className="mt-4 flex flex-wrap gap-3"
          >
            <select
              value={windowMode}
              onChange={(e) => setWindowMode(e.target.value as typeof windowMode)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="auction">Leilão</option>
              <option value="market">Mercado</option>
              <option value="hybrid">Híbrida</option>
            </select>
            <input
              type="number"
              min="1"
              value={windowCount}
              onChange={(e) => setWindowCount(e.target.value)}
              className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Criar janela
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {selectedWindows.map((window) => (
              <div
                key={window.id}
                className="flex items-center justify-between rounded border border-border p-3 text-sm"
              >
                <span>
                  #{window.id} · {window.mode} · {window.is_open ? "Aberta" : "Fechada"}
                </span>
                <button
                  onClick={() =>
                    windowAction.mutate({
                      windowId: window.id,
                      action: window.is_open ? "close" : "open",
                    })
                  }
                  className="rounded border border-input px-3 py-1 text-xs font-semibold"
                >
                  {window.is_open ? "Fechar" : "Abrir"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">Mercado</h2>
          <span className="text-xs text-muted-foreground">
            {filteredListings.length} disponível(is)
          </span>
        </div>
        {loadingListings ? (
          <p className="text-sm text-muted-foreground">Carregando listagens...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="space-y-3 rounded-xl border border-border bg-card p-5"
              >
                <div>
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {listing.listing_type === "direct" ? "Venda direta" : "Leilão"}
                  </span>
                  <h3 className="font-bold">
                    {typeof listing.player === "object"
                      ? listing.player.common_name
                      : `Jogador #${listing.player}`}
                  </h3>
                  <p className="text-gold">
                    {listing.price
                      ? formatMoney(Number(listing.price))
                      : "Preço definido no leilão"}
                  </p>
                </div>
                {listing.listing_type === "direct" ? (
                  isAuthenticated ? (
                    <button
                      onClick={() =>
                        handleBuyDirect(
                          typeof listing.player === "object" ? listing.player.id : listing.player,
                          listing.price ?? undefined,
                        )
                      }
                      disabled={buyDirect.isPending}
                      className="w-full rounded-md bg-gold px-4 py-2 text-sm font-bold text-gold-foreground"
                    >
                      Comprar agora
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Faça login para comprar</p>
                  )
                ) : listing.auction ? (
                  <Link
                    to="/auctions/$auctionId"
                    params={{ auctionId: String(listing.auction) }}
                    className="block rounded-md bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground"
                  >
                    Ver leilão e dar lance
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Leilão ainda não foi aberto pelo admin.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {isAuthenticated && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Minhas Propostas de Troca</h2>
          {loadingTransfers ? (
            <p className="text-sm text-muted-foreground">Carregando trocas...</p>
          ) : (
            <div className="space-y-3">
              {myTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <p className="text-sm">
                    {transfer.receiver === user?.id
                      ? `Proposta de #${transfer.requester}`
                      : `Proposta para #${transfer.receiver}`}{" "}
                    · {transfer.status}
                  </p>
                  {transfer.status === "pending" && transfer.receiver === user?.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          respondTransfer.mutate({ transferId: transfer.id, accepted: true })
                        }
                        className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() =>
                          respondTransfer.mutate({ transferId: transfer.id, accepted: false })
                        }
                        className="rounded bg-destructive px-3 py-1 text-xs font-bold text-white"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {myTransfers.length === 0 && (
                <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  Você não possui propostas de troca.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
