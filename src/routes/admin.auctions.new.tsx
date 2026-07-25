import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useCreateAuction } from "@/features/auction/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { useProducts } from "@/features/players/hooks";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/auctions/new")({
  head: () => ({
    meta: [
      { title: "Criar leilão · ReverseDraft" },
      { name: "description", content: "Painel administrativo para abrir um novo leilão." },
      { property: "og:title", content: "Criar leilão · ReverseDraft" },
      { property: "og:description", content: "Painel administrativo para abrir um novo leilão." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewAuctionPage,
});

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function NewAuctionPage() {
  const { isAuthenticated, isStaff } = useAuth();
  const navigate = useNavigate();
  const { data: products, isLoading } = useProducts();
  const createAuction = useCreateAuction();

  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [pricingMode, setPricingMode] = useState<"player_value" | "manual">("player_value");
  const [manualPrice, setManualPrice] = useState("");
  const [duration, setDuration] = useState("10");

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return (products ?? [])
      .filter((product) => product.title.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, query]);

  const selected = (products ?? []).find((product) => product.id === productId);

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!productId) return;
    const auction = await createAuction.mutateAsync({
      product: productId,
      pricing_mode: pricingMode,
      duration_minutes: Number(duration) || 10,
      ...(pricingMode === "manual" ? { manual_price: Number(manualPrice) || 0 } : {}),
    });
    navigate({ to: "/auctions/$auctionId", params: { auctionId: String(auction.id) } });
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Criar leilão</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="product" className="text-sm font-medium text-foreground">
            Jogador / produto
          </label>
          <input
            id="product"
            value={selected ? selected.title : query}
            onChange={(event) => {
              setQuery(event.target.value);
              setProductId(null);
            }}
            placeholder={isLoading ? "Carregando produtos…" : "Buscar por nome…"}
            className={`${inputClass} mt-1`}
          />
          {!selected && matches.length > 0 ? (
            <ul className="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-card">
              {matches.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setProductId(product.id);
                      setQuery(product.title);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span>{product.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.category} · {formatMoney(product.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Preço inicial</legend>
          <div className="mt-2 inline-flex rounded-md border border-border p-1">
            {(
              [
                ["player_value", "Valor do jogador"],
                ["manual", "Definir manualmente"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPricingMode(value)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  pricingMode === value
                    ? "bg-pitch text-pitch-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {pricingMode === "manual" ? (
            <input
              type="number"
              min={0}
              step="0.01"
              value={manualPrice}
              onChange={(event) => setManualPrice(event.target.value)}
              placeholder="1000000"
              className={`${inputClass} mt-3`}
            />
          ) : selected ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Base: {formatMoney(selected.price)}
            </p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="duration" className="text-sm font-medium text-foreground">
            Duração (minutos)
          </label>
          <input
            id="duration"
            type="number"
            min={1}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className={`${inputClass} mt-1`}
          />
        </div>

        {createAuction.isError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {createAuction.error instanceof Error
              ? createAuction.error.message
              : "Não foi possível criar o leilão."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!productId || createAuction.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {createAuction.isPending ? "Criando…" : "Criar leilão"}
        </button>
      </form>
    </div>
  );
}
