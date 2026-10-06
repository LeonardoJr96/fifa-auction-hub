import { createFileRoute, Link } from "@tanstack/react-router";
import { playerPhotoSrc } from "@/lib/player-photo";
import { useEffect, useRef, useState } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { StatBars } from "@/components/StatBars";
import { useAuction, useAuctionProduct, useBids, usePlaceBid } from "@/features/auction/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { useMe, usePayAuction } from "@/features/me/hooks";
import { useTeam } from "@/features/team/hooks";
import { useAuctionRealtime } from "@/features/auction/useAuctionRealtime";

import { formatCountdown, formatDateTime, formatMoney } from "@/lib/format";
import { auctionStatus } from "@/lib/auction-status";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";
import { Gavel, Radio, Timer } from "lucide-react";

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
  const { connected: liveConnected } = useAuctionRealtime(auctionId);
  const { data: auction, isLoading, isError, error } = useAuction(auctionId, liveConnected);
  const { data: product } = useAuctionProduct(auction);
  const {
    data: bids,
    isLoading: bidsLoading,
    isError: bidsError,
  } = useBids(auctionId, auctionStatus(auction) === "OPEN", liveConnected);
  const { data: me } = useMe(isAuthenticated);
  const { data: team } = useTeam(isAuthenticated);
  const placeBid = usePlaceBid(auctionId);
  const payAuction = usePayAuction();
  const isWinner =
    auctionStatus(auction) === "PENDING" && me?.id !== undefined && auction?.winner === me.id;


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
      <div className="page-container"><StatePanel kind="loading" title="Carregando leilão" description="Sincronizando preço, cronômetro e histórico." /></div>
    );
  }

  if (isError || !auction) {
    return (
      <div className="page-container"><StatePanel kind="error" title="Leilão indisponível" description={error instanceof Error ? error.message : "Leilão não encontrado."} /></div>
    );
  }

  const player = product?.player;
  const minimumBid =
    auction.number_of_bids === 0
      ? Number(auction.starting_price)
      : Number(auction.current_price) + Number(auction.min_increment);
  const isOpen = auctionStatus(auction) === "OPEN" && remaining > 0;

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
    <div className="page-container">
      <PageHeader eyebrow="Sala de disputa" title={player?.common_name ?? product?.title ?? "Leilão ao vivo"} description={`${product?.category ?? "Jogador"} · ${STATUS_LABEL[auctionStatus(auction)] ?? auction.status}`} actions={<span className="status-dot"><Radio />{liveConnected ? "Ao vivo" : "Atualização periódica"}</span>} />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="surface-panel">
          <div className="flex items-center gap-4">
            <PlayerPhoto
              src={playerPhotoSrc(player)}
              alt={player?.common_name ?? "Jogador"}
              className="h-20 w-20 shrink-0"
            />
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
                {player?.common_name ?? product?.title ?? "Jogador"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {product?.category ?? "—"} · {STATUS_LABEL[auctionStatus(auction)] ?? auction.status}
                {auction.seller_username ? (
                  <> · Revenda de <strong>{auction.seller_username}</strong></>
                ) : null}
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
            className={`surface-panel text-center transition-all ${
              extended ? "border-gold shadow-bid" : "border-border"
            }`}
          >
            <p className="eyebrow flex items-center justify-center gap-2"><Gavel className="size-4" />
              Preço atual
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums text-foreground">
              {formatMoney(auction.current_price)}
            </p>
            <p className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Timer className="size-4" />
              Tempo restante
            </p>
            <p className="text-2xl font-bold tabular-nums text-pitch">
              {isOpen ? formatCountdown(remaining) : "encerrado"}
            </p>
            {extended ? (
              <p className="mt-1 text-xs font-bold text-gold-foreground">Tempo estendido!</p>
            ) : null}
          </div>

          {auctionStatus(auction) === "PENDING" ? (
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
                    Saldo do time: {formatMoney(team?.balance ?? 0)} · valor a pagar:{" "}
                    {formatMoney(auction.current_price)}
                  </p>
                   <Button
                    type="button"
                    onClick={() => payAuction.mutate(auction.id)}
                    disabled={payAuction.isPending}
                     className="mt-3 w-full"
                  >
                    {payAuction.isPending ? "Pagando…" : "Pagar agora"}
                   </Button>
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

          {auctionStatus(auction) === "PAID" ? (
            <p className="rounded-xl border border-pitch bg-pitch/10 px-4 py-3 text-sm font-semibold text-foreground">
              Pago! O jogador já está no seu elenco — veja em{" "}
              <Link to="/me" className="text-pitch hover:underline">
                Minha conta
              </Link>
              .
            </p>
          ) : null}


          {auctionStatus(auction) === "NO_WINNER" ? (
            <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              Ninguém deu lance.
            </p>
          ) : null}

          <form onSubmit={handleBid} className="surface-panel">
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
            <Button
              type="submit"
              disabled={!isOpen || !isAuthenticated || placeBid.isPending}
              className="mt-3 w-full"
            >
              {placeBid.isPending ? "Enviando…" : "Dar lance"}
            </Button>
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

          <div className="surface-panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Últimos lances
              </h2>
              <span
                className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                  liveConnected ? "text-pitch" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    liveConnected ? "animate-pulse bg-pitch" : "bg-muted-foreground/50"
                  }`}
                />
                {liveConnected ? "Ao vivo" : "Atualização periódica"}
              </span>
            </div>
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
