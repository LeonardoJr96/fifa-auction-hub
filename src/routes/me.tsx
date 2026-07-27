import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { useAuth } from "@/features/auth/AuthContext";
import { useChangePassword, useMe, useTransactions } from "@/features/me/hooks";
import { ApiError } from "@/lib/api";
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

function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setDone(false);
    if (next !== confirm) {
      setErrors({ new_password_confirm: "As senhas não coincidem." });
      return;
    }
    try {
      await changePassword.mutateAsync({
        current_password: current,
        new_password: next,
        new_password_confirm: confirm,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (changeError) {
      const fieldErrors: Record<string, string> = {};
      const data = changeError instanceof ApiError ? changeError.data : null;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
          if (typeof value === "string") fieldErrors[key] = value;
          else if (Array.isArray(value) && typeof value[0] === "string")
            fieldErrors[key] = value[0];
        }
      }
      setErrors(
        Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : {
              detail:
                changeError instanceof Error
                  ? changeError.message
                  : "Não foi possível alterar a senha.",
            },
      );
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Alterar senha
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:max-w-sm">
        <div>
          <label htmlFor="current_password" className="text-sm font-medium text-foreground">
            Senha atual
          </label>
          <input
            id="current_password"
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            required
            className={inputClass}
          />
          {errors.current_password ? (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {errors.current_password}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="new_password" className="text-sm font-medium text-foreground">
            Nova senha
          </label>
          <input
            id="new_password"
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
            required
            className={inputClass}
          />
          {errors.new_password ? (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {errors.new_password}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="new_password_confirm" className="text-sm font-medium text-foreground">
            Confirmar nova senha
          </label>
          <input
            id="new_password_confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
            className={inputClass}
          />
          {errors.new_password_confirm ? (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {errors.new_password_confirm}
            </p>
          ) : null}
        </div>

        {errors.detail ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errors.detail}
          </p>
        ) : null}

        {done ? (
          <p className="rounded-md border border-pitch bg-pitch/10 px-3 py-2 text-sm font-semibold text-foreground">
            Senha alterada com sucesso.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={changePassword.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {changePassword.isPending ? "Salvando…" : "Alterar senha"}
        </button>
      </form>
    </section>
  );
}
