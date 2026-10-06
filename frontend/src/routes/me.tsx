import { createFileRoute, Link } from "@tanstack/react-router";
import { playerPhotoSrc } from "@/lib/player-photo";
import { useState } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { useAuth } from "@/features/auth/AuthContext";
import { useChangePassword, useMe, useTransactions, useUpdateProfile } from "@/features/me/hooks";
import { useRoster, useTeam } from "@/features/team/hooks";
import type { Me } from "@/types/api";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MePage,
});

const TX_LABEL: Record<string, string> = {
  auction_payment: "Pagamento de leilão",
  balance_recharge: "Recarga de saldo",
  refund: "Reembolso",
  direct_purchase: "Compra/venda entre jogadores",
};

function MePage() {
  const { isAuthenticated } = useAuth();
  const { data: me, isLoading, isError } = useMe(isAuthenticated);
  const { data: transactions } = useTransactions(isAuthenticated);
  const { data: team } = useTeam(isAuthenticated);
  const { data: roster } = useRoster(isAuthenticated);

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
      <div className="page-container"><StatePanel kind="loading" title="Carregando sua conta" /></div>
    );
  }

  if (isError || !me) {
    return (
      <div className="page-container"><StatePanel kind="error" title="Conta indisponível" description="Não foi possível carregar seus dados agora." /></div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader eyebrow="Meu clube" title={me.username} description={me.email} />
      <header className="surface-panel border-primary/30">
        <h2 className="font-display text-lg font-bold text-foreground">Finanças do clube</h2>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo</p>
          <p className="text-4xl font-black tabular-nums text-foreground">
            {formatMoney(team?.balance ?? me.balance ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Usado para pagar leilões vencidos.</p>
        </div>
      </header>

      <ProfileCard me={me} />

      <ChangePasswordCard />

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Meus jogadores ({roster?.length ?? 0})
          </h2>
          <Link
            to="/bolsa"
            className="text-xs font-semibold text-pitch hover:underline"
          >
            Gerenciar bolsa →
          </Link>
        </div>
        {roster?.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((player) => (
              <li key={player.id}>
                <Link
                  to="/players/$playerId"
                  params={{ playerId: String(player.id) }}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  <PlayerPhoto
                    src={playerPhotoSrc(player)}
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
            Nenhum jogador comprado ainda. Vença um leilão e pague para adicioná-lo ao seu elenco.
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

const PROFILE_FIELDS = [
  { key: "cellphone", label: "Celular" },
  { key: "address", label: "Endereço" },
  { key: "town", label: "Cidade" },
  { key: "post_code", label: "CEP" },
  { key: "country", label: "País" },
] as const;

function ProfileCard({ me }: { me: Me }) {
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(PROFILE_FIELDS.map((field) => [field.key, me[field.key] ?? ""])),
  );
  const [saved, setSaved] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    await updateProfile.mutateAsync(form);
    setSaved(true);
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Meus dados
      </h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">CPF</dt>
          <dd className="font-medium text-foreground">{me.cpf ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Nascimento</dt>
          <dd className="font-medium text-foreground">{me.birth_date ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">E-mail</dt>
          <dd className="truncate font-medium text-foreground">{me.email}</dd>
        </div>
      </dl>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="text-sm font-medium text-foreground">
              {field.label}
            </label>
            <input
              id={field.key}
              value={form[field.key] ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
              }
              className={inputClass}
            />
          </div>
        ))}
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="rounded-md bg-pitch px-4 py-2 text-sm font-bold text-pitch-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updateProfile.isPending ? "Salvando…" : "Salvar dados"}
          </button>
          {saved ? <span className="text-xs font-medium text-pitch">Dados atualizados.</span> : null}
          {updateProfile.isError ? (
            <span role="alert" className="text-xs font-medium text-destructive">
              {updateProfile.error instanceof Error
                ? updateProfile.error.message
                : "Não foi possível salvar."}
            </span>
          ) : null}
        </div>
      </form>
    </section>
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
