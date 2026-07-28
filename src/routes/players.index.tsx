import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

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

export const Route = createFileRoute("/players/")({
  head: () => ({
    meta: [
      { title: "Todos os jogadores · ReverseDraft" },
      {
        name: "description",
        content: "Veja todos os jogadores disponíveis no ReverseDraft.",
      },
      { property: "og:title", content: "Todos os jogadores · ReverseDraft" },
      {
        property: "og:description",
        content: "Veja todos os jogadores disponíveis no ReverseDraft.",
      },
    ],
  }),
  component: PlayersPage,
});

function PlayersPage() {
  const { data: products, isLoading, isError } = useProducts();
  const openAuctions = useOpenAuctionsByProduct();
  const [filters, setFilters] = useState<PlayerFilterValues>(defaultPlayerFilters);

  const { positions, filtered } = usePlayerFiltering(products, filters);
  const pagination = usePagination(filtered, 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Todos os jogadores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Carregando lista de jogadores..."
              : `${pagination.total} jogadores encontrados · 100 por página.`}
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Ir para o catálogo
        </Link>
      </div>

      <PlayerFilters
        values={filters}
        positions={positions}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={() => setFilters(defaultPlayerFilters)}
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

      {!isLoading && !isError && pagination.total === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Nenhum jogador encontrado com esses filtros.
        </p>
      ) : null}
    </div>
  );
}
