import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { PaginationBar } from "@/components/PaginationBar";
import {
  AppliedFilters,
  PlayerFilters,
  cleanPlayerSearch,
  defaultPlayerFilters,
  parsePlayerSearch,
  usePlayerFiltering,
  type PlayerFilterValues,
} from "@/components/PlayerFilters";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useAuctions, auctionProductId } from "@/features/players/hooks";
import { usePagination } from "@/hooks/use-pagination";
import type { Product } from "@/types/api";
import { isOpenAuction } from "@/lib/auction-status";
import { Gavel, Radio } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Partial<PlayerFilterValues> =>
    parsePlayerSearch(search),
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const rawSearch = Route.useSearch();
  // Mescla com defaults para garantir valores sempre definidos
  const search: PlayerFilterValues = { ...defaultPlayerFilters, ...rawSearch };
  const navigate = Route.useNavigate();

  // O catálogo de leilões só precisa de atualização ativa quando a tela estiver em foco.
  const { data: auctions, isLoading, isFetching, isError } = useAuctions({ realtime: false });

  const { openAuctions, products } = useMemo(() => {
    const openMap = new Map();
    const prods: Product[] = [];
    for (const auction of auctions ?? []) {
      if (isOpenAuction(auction) && typeof auction.product !== "number") {
        openMap.set(auctionProductId(auction), auction);
        prods.push(auction.product as Product);
      }
    }
    return { openAuctions: openMap, products: prods };
  }, [auctions]);

  const { positions, filtered } = usePlayerFiltering(products, search);

  const update = (patch: Partial<PlayerFilterValues>) =>
    navigate({ to: "/", search: cleanPlayerSearch({ ...search, ...patch }) });

  const pagination = usePagination(filtered, 24, {
    page: search.page,
    onPageChange: (page) => update({ page }),
  });

  const refreshing = isFetching && !isLoading;

  return (
    <div className="page-container">
      <PageHeader eyebrow="Mercado ao vivo" title="Leilão de jogadores" description="Dispute atletas em leilões ascendentes e monte um elenco capaz de competir." actions={<span className="status-dot"><Radio /> Atualização ao vivo</span>} />
      <div className="mb-1 flex items-center justify-between gap-4"><p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Gavel className="size-4 text-primary" /> {filtered.length} jogadores em disputa</p></div>

      <PlayerFilters
        values={search}
        positions={positions}
        onChange={update}
        onReset={() => navigate({ to: "/", search: {} })}
        isLoading={refreshing}
      />

      <AppliedFilters
        values={search}
        onChange={update}
        onReset={() => navigate({ to: "/", search: {} })}
      />

      {isError ? (
        <StatePanel kind="error" title="Leilões indisponíveis" description="Nenhum jogador encontrado agora. Verifique a conexão com a API." />
      ) : null}

      <div
        aria-busy={isLoading || refreshing}
        className={`mt-6 grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
          refreshing ? "opacity-60" : "opacity-100"
        }`}
      >
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
          isLoading={refreshing}
        />
      ) : null}

      {!isLoading && !isError && filtered.length === 0 ? (
        <StatePanel kind="empty" title={(auctions ?? []).length === 0 ? "Nenhum leilão aberto" : "Nenhum jogador encontrado"} description={(auctions ?? []).length === 0 ? "Os próximos jogadores aparecerão assim que entrarem em disputa." : "Ajuste ou limpe os filtros para ampliar a busca."} />
      ) : null}
    </div>
  );
}
