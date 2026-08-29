import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { useAuctions, useProducts } from "@/features/players/hooks";
import { formatCountdown, formatMoney } from "@/lib/format";
import type { AuctionStatus } from "@/types/api";
import { auctionStatus } from "@/lib/auction-status";

export const Route = createFileRoute("/admin/auctions/")({
  head: () => ({
    meta: [
      { title: "Leilões · Painel admin · ReverseDraft" },
      { name: "description", content: "Lista de todos os leilões da plataforma." },
      { property: "og:title", content: "Leilões · Painel admin · ReverseDraft" },
      { property: "og:description", content: "Lista de todos os leilões da plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAuctionsPage,
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

const STATUSES: AuctionStatus[] = [
  "OPEN",
  "CLOSE",
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "NO_WINNER",
];

function AdminAuctionsPage() {
  const { isAuthenticated, isStaff } = useAuth();
  const { data: auctions, isLoading, isError, error } = useAuctions();
  const { data: products } = useProducts();
  const [status, setStatus] = useState<"ALL" | AuctionStatus>("ALL");

  const productTitle = useMemo(() => {
    const map = new Map<number, string>();
    for (const product of products ?? []) map.set(product.id, product.title);
    return map;
  }, [products]);

  const filtered = useMemo(
    () => (auctions ?? []).filter((auction) => status === "ALL" || auctionStatus(auction) === status),
    [auctions, status],
  );

  if (!isAuthenticated || !isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Leilões</h1>
        <Link
          to="/admin/auctions/new"
          className="rounded-md bg-pitch px-4 py-2 text-sm font-bold text-pitch-foreground transition-opacity hover:opacity-90"
        >
          + Novo leilão
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["ALL", ...STATUSES] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === option
                ? "border-pitch bg-pitch text-pitch-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {option === "ALL" ? "Todos" : (STATUS_LABEL[option] ?? option)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Não foi possível carregar os leilões."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum leilão encontrado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Produto</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Preço atual</th>
                <th className="px-4 py-3 text-right font-semibold">Lances</th>
                <th className="px-4 py-3 text-right font-semibold">Tempo restante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((auction) => {
                const id = typeof auction.product === "number" ? auction.product : auction.product.id;
                const title =
                  typeof auction.product === "number"
                    ? (productTitle.get(id) ?? `Produto #${id}`)
                    : auction.product.title;
                const remaining = new Date(auction.time_ending).getTime() - Date.now();
                return (
                  <tr key={auction.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        to="/auctions/$auctionId"
                        params={{ auctionId: String(auction.id) }}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {STATUS_LABEL[auctionStatus(auction)] ?? auction.status}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatMoney(auction.current_price)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{auction.number_of_bids}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {auctionStatus(auction) === "OPEN" && remaining > 0
                        ? formatCountdown(remaining)
                        : "encerrado"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
