import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useOpenAuctionsByProduct, useProducts } from "@/features/players/hooks";
import { useBatchedList } from "@/hooks/use-batched-list";

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

  const list = useMemo(() => products ?? [], [products]);
  const { visible, hasMore, loadMore, sentinelRef, total } = useBatchedList(list, 100);

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
              : `Exibindo ${visible.length} de ${total} jogadores disponíveis.`}
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Ir para o catálogo
        </Link>
      </div>

      {isError ? (
        <p role="alert" className="mt-8 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Nenhum jogador encontrado.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
          : visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                openAuction={openAuctions.get(product.id)}
              />
            ))}
      </div>

      {!isLoading && hasMore ? (
        <div ref={sentinelRef} className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Carregar mais 100
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && total === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Nenhum jogador disponível no momento.
        </p>
      ) : null}
    </div>
  );
}
