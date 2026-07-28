import { createFileRoute, Link } from "@tanstack/react-router";
import { playerPhotoSrc } from "@/lib/player-photo";
import { useEffect, useRef, useState } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { StatBars } from "@/components/StatBars";
import { useAuction, useAuctionProduct, useBids, usePlaceBid } from "@/features/auction/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { useMe, usePayAuction } from "@/features/me/hooks";

import { formatCountdown, formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/auctions/$auctionId")({
  head: () => ({
    meta: [
      { title: "Leilão ao vivo · ReverseDraft" },
      {
        name: "description",
        content: "Acompanhe o preço atual, o cronômetro e o histórico de lances em tempo real.",
      },
      { property: "og:title", content: "Leilão ao vivo · ReverseDraft" },
      { property: "og:description", content: "Preço atual, cronômetro e lances em tempo real." },
    ],
  }),
  component: AuctionPage,
});

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberto",
  CLOSE: "Fechado",
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  FAILED: "Falhou",
  EXPIRED: "Expirado",
  NO_WINNER: "Sem vencedor",
};

/** Cronômetro re-ancorado no time_ending do servidor a cada poll. */
function useCountdown(timeEnding: string | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNow(Date.now());
  }, [timeEnding]);

  if (!timeEnding) return 0;
  return new Date(timeEnding).getTime() - now;
}

function AuctionPage() {
  const { auctionId } = Route.useParams();
  const { isAuthenticated } = useAuth();
  const { data: auction, isLoading, isError, error } = useAuction(auctionId);
  const { data: product } = useAuctionProduct(auction);
  const {
    data: bids,
    isLoading: bidsLoading,
    isError: bidsError,
  } = useBids(auctionId, auction?.status === "OPEN");
  const { data: me } = useMe(isAuthenticated);
  const placeBid = usePlaceBid(auctionId);
  const payAuction = usePayAuction();
  const isWinner =
    auction?.status === "PENDING" && me?.id !== undefined && auction.winner === me.id;


  const remaining = useCountdown(auction?.time_ending);
  const [extended, setExtended] = useState(false);
  const previousEnding = useRef<string | undefined>(undefined);
  const [bidValue, setBidValue] = useState("");

  useEffect(() => {
    if (!auction) return;
    if (previousEnding.current && previousEnding.current !== auction.time_ending) {
      setExtended(true);
      const timeout = setTimeout(() => setExtended(false), 1200);
      previousEnding.current = auction.time_ending;
      return () => clearTimeout(timeout);
    }
    previousEnding.current = auction.time_ending;
  }, [auction]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !auction) {
    return (
      <p role="alert" className="mx-auto max-w-4xl px-4 py-10 text-sm text-destructive">
        {error instanceof Error ? error.message : "Leilão não encontrado."}
      </p>
    );
  }

  const player = product?.player;
  const minimumBid =
    auction.number_of_bids === 0
      ? Number(auction.starting_price)
      : Number(auction.current_price) + Number(auction.min_increment);
  const isOpen = auction.status === "OPEN" && remaining > 0;

  async function handleBid(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(bidValue);
    if (!Number.isFinite(value)) return;
    try {
      await placeBid.mutateAsync(value);
      setBidValue("");
    } catch {
      /* erro exibido abaixo via placeBid.error */
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <PlayerPhoto
              src={playerPhotoSrc(player)}
              alt={player?.common_name ?? "Jogador"}
              className="h-20 w-20 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
                {player?.common_name ?? product?.title ?? "Jogador"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {product?.category ?? "—"} · {STATUS_LABEL[auction.status] ?? auction.status}
              </p>
              {player ? (
                <Link
                  to="/players/$playerId"
                  params={{ playerId: String(player.id) }}
                  className="text-xs font-semibold text-pitch underline-offset-4 hover:underline"
                >
                  Ver ficha completa
                </Link>
              ) : null}
            </div>
          </div>

          {player ? (
            <div className="mt-5">
              <StatBars player={player} />
            </div>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Preço inicial</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(auction.starting_price)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Incremento mínimo</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(auction.min_increment)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Lances</dt>
              <dd className="font-semibold tabular-nums">{auction.number_of_bids}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fim previsto</dt>
              <dd className="font-semibold">{formatDateTime(auction.time_ending)}</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-4">
          <div
            className={`rounded-xl border bg-card p-5 text-center transition-all ${
              extended ? "border-gold shadow-bid" : "border-border"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preço atual
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums text-foreground">
              {formatMoney(auction.current_price)}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tempo restante
            </p>
            <p className="text-2xl font-bold tabular-nums text-pitch">
              {isOpen ? formatCountdown(remaining) : "encerrado"}
            </p>
            {extended ? (
              <p className="mt-1 text-xs font-bold text-gold-foreground">Tempo estendido!</p>
            ) : null}
          </div>

          {auction.status === "PENDING" ? (
            <div className="rounded-xl border border-gold bg-gold/15 px-4 py-3 text-sm text-foreground">
              <p className="font-semibold">
                Encerrado! Vencedor: {auction.winner === me?.id ? "você" : `usuário #${auction.winner ?? "—"}`}
                {auction.payment_deadline
                  ? ` · pagamento até ${formatDateTime(auction.payment_deadline)}`
                  : ""}
              </p>
              {isWinner ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Seu saldo: {formatMoney(me?.balance ?? 0)} · valor a pagar:{" "}
                    {formatMoney(auction.current_price)}
                  </p>
                  <button
                    type="button"
                    onClick={() => payAuction.mutate(auction.id)}
                    disabled={payAuction.isPending}
                    className="mt-3 w-full rounded-md bg-pitch px-4 py-2.5 text-sm font-bold text-pitch-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {payAuction.isPending ? "Pagando…" : "Pagar agora"}
                  </button>
                  {payAuction.isError ? (
                    <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                      {payAuction.error instanceof Error
                        ? payAuction.error.message
                        : "Pagamento recusado."}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {auction.status === "PAID" ? (
            <p className="rounded-xl border border-pitch bg-pitch/10 px-4 py-3 text-sm font-semibold text-foreground">
              Pago! O jogador já está no seu elenco —{" "}
              <Link to="/team" className="text-pitch hover:underline">
                escale no Meu time
              </Link>
              .
            </p>
          ) : null}


          {auction.status === "NO_WINNER" ? (
            <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              Ninguém deu lance.
            </p>
          ) : null}

          <form onSubmit={handleBid} className="rounded-xl border border-border bg-card p-5">
            <label htmlFor="bid" className="text-sm font-medium text-foreground">
              Seu lance (mínimo {formatMoney(minimumBid)})
            </label>
            <input
              id="bid"
              type="number"
              min={minimumBid}
              step="0.01"
              value={bidValue}
              onChange={(event) => setBidValue(event.target.value)}
              placeholder={String(minimumBid)}
              disabled={!isOpen || !isAuthenticated}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!isOpen || !isAuthenticated || placeBid.isPending}
              className="mt-3 w-full rounded-md bg-gold px-4 py-3 text-base font-bold text-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {placeBid.isPending ? "Enviando…" : "Dar lance"}
            </button>
            {!isAuthenticated ? (
              <p className="mt-2 text-xs text-muted-foreground">
                <Link to="/login" className="font-semibold text-pitch hover:underline">
                  Entre na sua conta
                </Link>{" "}
                para dar lances.
              </p>
            ) : null}
            {placeBid.isError ? (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {placeBid.error instanceof Error ? placeBid.error.message : "Lance recusado."}
              </p>
            ) : null}
          </form>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Últimos lances
            </h2>
            {bidsLoading ? (
              <div className="mt-3 space-y-2" aria-busy="true">
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
              </div>
            ) : bidsError ? (
              <p role="alert" className="mt-3 text-sm text-muted-foreground">
                Histórico de lances indisponível no momento.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(bids ?? []).slice(0, 10).map((bid) => (
                  <li key={bid.id} className="flex items-center justify-between gap-3">
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(bid.price)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {bid.username ?? "Você"} · {formatDateTime(bid.bid_time)}
                    </span>
                  </li>
                ))}
                {(bids ?? []).length === 0 ? (
                  <li className="text-sm text-muted-foreground">Nenhum lance ainda.</li>
                ) : null}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
