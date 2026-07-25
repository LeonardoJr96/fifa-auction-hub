import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useOpenAuctionsByProduct, useProducts } from "@/features/players/hooks";

interface CatalogSearch {
  position: string;
  minOverall: number;
  maxPrice: number;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    position: typeof search.position === "string" ? search.position : "",
    minOverall: Number(search.minOverall) || 0,
    maxPrice: Number(search.maxPrice) || 0,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo de jogadores · ReverseDraft" },
      {
        name: "description",
        content:
          "Explore jogadores importados do SoFIFA, compare atributos e entre nos leilões ao vivo.",
      },
      { property: "og:title", content: "Catálogo de jogadores · ReverseDraft" },
      {
        property: "og:description",
        content: "Explore jogadores, compare atributos e entre nos leilões ao vivo.",
      },
    ],
  }),
  component: CatalogPage,
});

const inputClass =
  "rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: products, isLoading, isError, error } = useProducts();
  const openAuctions = useOpenAuctionsByProduct();

  const positions = useMemo(() => {
    const set = new Set<string>();
    for (const product of products ?? []) if (product.category) set.add(product.category);
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => {
      if (search.position && product.category !== search.position) return false;
      if (search.minOverall && (product.player?.overall_rating ?? 0) < search.minOverall) return false;
      if (search.maxPrice && Number(product.price) > search.maxPrice) return false;
      return true;
    });
  }, [products, search]);

  const update = (patch: Partial<CatalogSearch>) =>
    navigate({ to: ".", search: (prev) => ({ ...prev, ...patch }) });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Catálogo de jogadores
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Jogadores disponíveis para leilão ascendente.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Posição
          <select
            value={search.position}
            onChange={(event) => update({ position: event.target.value })}
            className={inputClass}
          >
            <option value="">Todas</option>
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Overall mínimo
          <input
            type="number"
            min={0}
            max={99}
            value={search.minOverall || ""}
            onChange={(event) => update({ minOverall: Number(event.target.value) || 0 })}
            placeholder="0"
            className={`${inputClass} w-32`}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Preço máximo (€)
          <input
            type="number"
            min={0}
            step={100000}
            value={search.maxPrice || ""}
            onChange={(event) => update({ maxPrice: Number(event.target.value) || 0 })}
            placeholder="sem limite"
            className={`${inputClass} w-44`}
          />
        </label>
      </div>

      {isError ? (
        <p role="alert" className="mt-8 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Não foi possível carregar o catálogo."}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
          : filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                openAuction={openAuctions.get(product.id)}
              />
            ))}
      </div>

      {!isLoading && !isError && filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Nenhum jogador encontrado com esses filtros.
        </p>
      ) : null}
    </div>
  );
}
