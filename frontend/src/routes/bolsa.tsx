import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { useAuth } from "@/features/auth/AuthContext";
import {
  useAcceptDirectOffer,
  useCancelListing,
  useCreateListing,
  usePortfolio,
  useUserSearch,
} from "@/features/portfolio/hooks";
import { playerPhotoSrc } from "@/lib/player-photo";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Player, PortfolioListing } from "@/types/api";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";

export const Route = createFileRoute("/bolsa")({
  head: () => ({
    meta: [
      { title: "Minha bolsa · ReverseDraft" },
      {
        name: "description",
        content: "Gerencie seus jogadores adquiridos, coloque à venda em leilão ou venda direta.",
      },
      { property: "og:title", content: "Minha bolsa · ReverseDraft" },
      { property: "og:description", content: "Gerencie jogadores, leilões e propostas diretas." },
    ],
  }),
  component: BolsaPage,
});

function BolsaPage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = usePortfolio(isAuthenticated);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Minha bolsa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-pitch hover:underline">
            Entre na sua conta
          </Link>{" "}
          para ver e vender seus jogadores.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-container"><StatePanel kind="loading" title="Carregando sua bolsa" /></div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page-container"><StatePanel kind="error" title="Bolsa indisponível" description="Não foi possível carregar seus jogadores e propostas." /></div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader eyebrow="Mercado do clube" title="Minha bolsa" description="Gerencie jogadores adquiridos e negocie por leilão ou proposta direta." />

      {data.incoming_offers.length > 0 ? (
        <section className="surface-panel mb-6 border-gold/40 bg-gold/5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Propostas recebidas ({data.incoming_offers.length})
          </h2>
          <ul className="mt-4 space-y-3">
            {data.incoming_offers.map((offer) => (
              <IncomingOfferCard key={offer.id} offer={offer} />
            ))}
          </ul>
        </section>
      ) : null}

      {data.my_listings.length > 0 ? (
        <section className="surface-panel mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            À venda ({data.my_listings.length})
          </h2>
          <ul className="mt-4 space-y-3">
            {data.my_listings.map((listing) => (
              <ActiveListingCard key={listing.id} listing={listing} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="surface-panel">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Jogadores disponíveis ({data.players.length})
        </h2>
        {data.players.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.players.map((player) => (
              <PlayerBolsaCard key={player.id} player={player} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum jogador disponível para venda.{" "}
            <Link to="/" className="font-semibold text-pitch hover:underline">
              Participe de um leilão
            </Link>{" "}
            para montar sua bolsa.
          </p>
        )}
      </section>
    </div>
  );
}

function PlayerBolsaCard({ player }: { player: Player }) {
  const [mode, setMode] = useState<"idle" | "auction" | "direct">("idle");

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <PlayerPhoto
          src={playerPhotoSrc(player)}
          alt={player.common_name}
          className="h-12 w-12 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{player.common_name}</p>
          <p className="text-xs text-muted-foreground">
            {player.best_position ?? "—"} · {player.overall_rating} OVR
          </p>
        </div>
      </div>
      {mode === "idle" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("auction")}
            className="rounded-md bg-pitch px-3 py-1.5 text-xs font-bold text-pitch-foreground hover:opacity-90"
          >
            Leilão
          </button>
          <button
            type="button"
            onClick={() => setMode("direct")}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
          >
            Venda direta
          </button>
        </div>
      ) : (
        <ListingForm
          player={player}
          mode={mode}
          onCancel={() => setMode("idle")}
          onSuccess={() => setMode("idle")}
        />
      )}
    </li>
  );
}

function ListingForm({
  player,
  mode,
  onCancel,
  onSuccess,
}: {
  player: Player;
  mode: "auction" | "direct";
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const createListing = useCreateListing();
  const [price, setPrice] = useState(String(player.price ?? ""));
  const [duration, setDuration] = useState("60");
  const [buyerQuery, setBuyerQuery] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<{ id: number; username: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: searchResults } = useUserSearch(buyerQuery, mode === "direct");

  const inputClass =
    "mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "auction") {
        await createListing.mutateAsync({
          listing_type: "auction",
          player_id: player.id,
          price,
          duration_minutes: Number(duration),
        });
      } else {
        if (!selectedBuyer) {
          setError("Selecione o comprador.");
          return;
        }
        await createListing.mutateAsync({
          listing_type: "direct",
          player_id: player.id,
          buyer_id: selectedBuyer.id,
          price,
        });
      }
      onSuccess();
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? typeof submitError.data === "object" &&
            submitError.data &&
            "detail" in submitError.data
            ? String((submitError.data as { detail: string }).detail)
            : submitError.message
          : "Não foi possível criar a listagem.";
      setError(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-border pt-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Preço</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={inputClass}
        />
      </div>
      {mode === "auction" ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Duração (min)</label>
          <input
            type="number"
            min="5"
            max="10080"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputClass}
          />
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Comprador</label>
          <input
            type="text"
            placeholder="Buscar usuário…"
            value={buyerQuery}
            onChange={(e) => {
              setBuyerQuery(e.target.value);
              setSelectedBuyer(null);
            }}
            className={inputClass}
          />
          {searchResults && searchResults.length > 0 && !selectedBuyer ? (
            <ul className="mt-1 max-h-28 overflow-y-auto rounded-md border border-border bg-background text-sm">
              {searchResults.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBuyer(user);
                      setBuyerQuery(user.username);
                    }}
                    className="w-full px-2 py-1.5 text-left hover:bg-accent"
                  >
                    {user.username}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selectedBuyer ? (
            <p className="mt-1 text-xs text-pitch">Vender para: {selectedBuyer.username}</p>
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createListing.isPending}
          className="rounded-md bg-pitch px-3 py-1.5 text-xs font-bold text-pitch-foreground disabled:opacity-50"
        >
          {createListing.isPending ? "Salvando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ActiveListingCard({ listing }: { listing: PortfolioListing }) {
  const cancelListing = useCancelListing();
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    try {
      await cancelListing.mutateAsync(listing.id);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Erro ao cancelar.");
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <PlayerPhoto
          src={playerPhotoSrc(listing.player)}
          alt={listing.player.common_name}
          className="h-10 w-10 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {listing.player.common_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {listing.listing_type === "auction" ? "Leilão" : "Venda direta"}
            {listing.buyer_username ? ` → ${listing.buyer_username}` : ""} ·{" "}
            {formatMoney(listing.price)}
          </p>
          {listing.auction_id ? (
            <Link
              to="/auctions/$auctionId"
              params={{ auctionId: String(listing.auction_id) }}
              className="text-xs font-semibold text-pitch hover:underline"
            >
              Ver leilão #{listing.auction_id}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelListing.isPending}
          className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          Cancelar venda
        </button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </li>
  );
}

function IncomingOfferCard({ offer }: { offer: PortfolioListing }) {
  const acceptOffer = useAcceptDirectOffer();
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    try {
      await acceptOffer.mutateAsync(offer.id);
    } catch (acceptError) {
      const message =
        acceptError instanceof ApiError
          ? typeof acceptError.data === "object" &&
            acceptError.data &&
            "detail" in acceptError.data
            ? String((acceptError.data as { detail: string }).detail)
            : acceptError.message
          : "Não foi possível aceitar a oferta.";
      setError(message);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <PlayerPhoto
          src={playerPhotoSrc(offer.player)}
          alt={offer.player.common_name}
          className="h-10 w-10 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {offer.player.common_name}
          </p>
          <p className="text-xs text-muted-foreground">
            De <strong>{offer.seller_username}</strong> · {formatMoney(offer.price)}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateTime(offer.created_at)}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleAccept}
          disabled={acceptOffer.isPending}
          className="rounded-md bg-pitch px-3 py-1.5 text-xs font-bold text-pitch-foreground disabled:opacity-50"
        >
          {acceptOffer.isPending ? "Comprando…" : "Aceitar e comprar"}
        </button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </li>
  );
}
