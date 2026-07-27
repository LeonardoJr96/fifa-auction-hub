import { createFileRoute, Link } from "@tanstack/react-router";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { useAuth } from "@/features/auth/AuthContext";
import { useMe, useTransactions } from "@/features/me/hooks";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [
      { title: "Minha conta · ReverseDraft" },
      {
        name: "description",
        content: "Saldo, histórico de lances, jogadores comprados e transações da sua conta.",
      },
      { property: "og:title", content: "Minha conta · ReverseDraft" },
      {
        property: "og:description",
        content: "Acompanhe seu saldo, lances e elenco comprado no ReverseDraft.",
      },
    ],
  }),
  component: MePage,
});

const TX_LABEL: Record<string, string> = {
  auction_payment: "Pagamento de leilão",
  balance_recharge: "Recarga de saldo",
  refund: "Reembolso",
};

function MePage() {
  const { isAuthenticated } = useAuth();
  const { data: me, isLoading, isError } = useMe(isAuthenticated);
  const { data: transactions } = useTransactions(isAuthenticated);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Minha conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-pitch hover:underline">
            Entre na sua conta
          </Link>{" "}
          para ver saldo, lances e elenco.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !me) {
    return (
      <p role="alert" className="mx-auto max-w-5xl px-4 py-10 text-sm text-destructive">
        Não foi possível carregar sua conta.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{me.username}</h1>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Saldo disponível
        </p>
        <p className="text-4xl font-black tabular-nums text-pitch">{formatMoney(me.balance)}</p>
      </header>

      <ChangePasswordCard />



      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Meus jogadores ({me.players?.length ?? 0})
        </h2>
        {me.players?.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {me.players.map((player) => (
              <li key={player.id}>
                <Link
                  to="/players/$playerId"
                  params={{ playerId: String(player.id) }}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  <PlayerPhoto
                    src={player.photo_url}
                    alt={player.common_name}
                    className="h-12 w-12 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {player.common_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {player.best_position ?? "—"} · {player.overall_rating} OVR
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum jogador comprado ainda. Vença um leilão e pague para escalá-lo.
          </p>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico de lances
          </h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {(me.bid_history ?? []).map((bid) => (
              <li key={bid.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link
                    to="/auctions/$auctionId"
                    params={{ auctionId: String(bid.auction) }}
                    className="truncate font-semibold text-foreground hover:underline"
                  >
                    {bid.product_title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{formatDateTime(bid.bid_time)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatMoney(bid.price)}
                  </p>
                  <p className="text-xs text-muted-foreground">{bid.status}</p>
                </div>
              </li>
            ))}
            {(me.bid_history ?? []).length === 0 ? (
              <li className="py-2 text-muted-foreground">Nenhum lance ainda.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Transações
          </h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {(transactions ?? []).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {TX_LABEL[tx.type] ?? tx.type}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatMoney(tx.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    saldo {formatMoney(tx.balance_after)}
                  </p>
                </div>
              </li>
            ))}
            {(transactions ?? []).length === 0 ? (
              <li className="py-2 text-muted-foreground">Nenhuma transação ainda.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
