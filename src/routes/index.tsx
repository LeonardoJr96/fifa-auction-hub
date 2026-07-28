import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { PaginationBar } from "@/components/PaginationBar";
import {
  PlayerFilters,
  defaultPlayerFilters,
  usePlayerFiltering,
  type PlayerFilterValues,
} from "@/components/PlayerFilters";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useOpenAuctionsByProduct, useProducts } from "@/features/players/hooks";
import { usePagination } from "@/hooks/use-pagination";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): PlayerFilterValues => ({
    q: typeof search.q === "string" ? search.q : "",
    position: typeof search.position === "string" ? search.position : "",
    minOverall: Number(search.minOverall) || 0,
    maxOverall: Number(search.maxOverall) || 0,
    maxPrice: Number(search.maxPrice) || 0,
    sort: typeof search.sort === "string" ? search.sort : "default",
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

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: products, isLoading, isError } = useProducts();
  const openAuctions = useOpenAuctionsByProduct();

  const inAuction = useMemo(
    () => (products ?? []).filter((product) => openAuctions.has(product.id)),
    [products, openAuctions],
  );

  const { positions, filtered } = usePlayerFiltering(inAuction, search);
  const pagination = usePagination(filtered, 100);

  const update = (patch: Partial<PlayerFilterValues>) =>
    navigate({ to: "/", search: { ...search, ...patch } });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Catálogo de jogadores
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Jogadores disponíveis para leilão ascendente.
      </p>

      <PlayerFilters
        values={search}
        positions={positions}
        onChange={update}
        onReset={() => navigate({ to: "/", search: defaultPlayerFilters })}
      />

      {isError ? (
        <p role="alert" className="mt-8 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Nenhum jogador encontrado.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
          : pagination.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                openAuction={openAuctions.get(product.id)}
              />
            ))}
      </div>

      {!isLoading ? (
        <PaginationBar
          page={pagination.page}
          pageCount={pagination.pageCount}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          total={pagination.total}
          hasPrev={pagination.hasPrev}
          hasNext={pagination.hasNext}
          onPrev={pagination.prev}
          onNext={pagination.next}
        />
      ) : null}

      {!isLoading && !isError && filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Nenhum jogador encontrado com esses filtros.
        </p>
      ) : null}
    </div>
  );
}
