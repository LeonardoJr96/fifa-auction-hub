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
import { useAuctions, auctionProductId } from "@/features/players/hooks";
import { usePagination } from "@/hooks/use-pagination";
import type { Product } from "@/types/api";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Partial<PlayerFilterValues> => ({
    q: typeof search.q === "string" ? search.q : undefined,
    position: typeof search.position === "string" ? search.position : undefined,
    minOverall: Number(search.minOverall) || undefined,
    maxOverall: Number(search.maxOverall) || undefined,
    maxPrice: Number(search.maxPrice) || undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Leilão de jogadores · ReverseDraft" },
      {
        name: "description",
        content:
          "Explore jogadores importados do SoFIFA, compare atributos e entre nos leilões ao vivo.",
      },
      { property: "og:title", content: "Leilão de jogadores · ReverseDraft" },
      {
        property: "og:description",
        content: "Explore jogadores, compare atributos e entre nos leilões ao vivo.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const rawSearch = Route.useSearch();
  // Mescla com defaults para garantir valores sempre definidos
  const search: PlayerFilterValues = { ...defaultPlayerFilters, ...rawSearch };
  const navigate = Route.useNavigate();

  // Usa auctions diretamente: o serializer já traz product+player aninhados
  const { data: auctions, isLoading, isError } = useAuctions();

  const { openAuctions, products } = useMemo(() => {
    const openMap = new Map();
    const prods: Product[] = [];
    for (const auction of auctions ?? []) {
      if (auction.status === "OPEN" && typeof auction.product !== "number") {
        openMap.set(auctionProductId(auction), auction);
        prods.push(auction.product as Product);
      }
    }
    return { openAuctions: openMap, products: prods };
  }, [auctions]);

  const { positions, filtered } = usePlayerFiltering(products, search);
  const pagination = usePagination(filtered, 24);

  const update = (patch: Partial<PlayerFilterValues>) =>
    navigate({ to: "/", search: { ...search, ...patch } });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Leilão de jogadores
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
          Erro ao carregar leilões. Verifique se o backend está rodando.
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
          {(auctions ?? []).length === 0
            ? "Não há nenhum leilão aberto no momento."
            : "Nenhum jogador encontrado com esses filtros."}
        </p>
      ) : null}
    </div>
  );
}
