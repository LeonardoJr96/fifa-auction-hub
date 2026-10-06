import { createFileRoute, Link } from "@tanstack/react-router";

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
import { PlayerTable, PlayerTableSkeleton } from "@/components/PlayerTable";
import { useOpenAuctionsByProduct, useProducts } from "@/features/players/hooks";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";
// Inline pagination to avoid hook-order issues

export const Route = createFileRoute("/players/")({
  validateSearch: (search: Record<string, unknown>): Partial<PlayerFilterValues> =>
    parsePlayerSearch(search),
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
  const { data: products, isLoading, isFetching, isError } = useProducts();
  const openAuctions = useOpenAuctionsByProduct();
  const rawSearch = Route.useSearch();
  const filters: PlayerFilterValues = { ...defaultPlayerFilters, ...rawSearch };
  const navigate = Route.useNavigate();

  const update = (patch: Partial<PlayerFilterValues>) =>
    navigate({ to: "/players", search: cleanPlayerSearch({ ...filters, ...patch }) });
  const reset = () => navigate({ to: "/players", search: {} });

  const { positions, filtered } = usePlayerFiltering(products, filters);

  const pageSize = 24;
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Number(filters.page) || 1;
  const current = Math.min(Math.max(1, page), pageCount);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  const goTo = (next: number) => {
    const target = Math.min(Math.max(1, next), pageCount);
    navigate({ to: "/players", search: cleanPlayerSearch({ ...filters, page: target }) });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  console.debug("[PlayersPage] render", {
    filters,
    productsCount: products?.length ?? 0,
    filteredCount: filtered.length,
    paginationPage: current,
    paginationPageCount: pageCount,
  });

  const refreshing = isFetching && !isLoading;

  return (
    <div className="page-container">
      <PageHeader eyebrow="Base FIFA / EA" title="Todos os jogadores" description={
              {isLoading
                ? "Carregando lista de jogadores..."
                : `${total} jogadores encontrados · 24 por página.`} as unknown as string
          } actions={
        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary"
        >
          Ir para o leilão <ArrowRight className="size-4" />
        </Link>
      } />

      <PlayerFilters
        values={filters}
        positions={positions}
        onChange={update}
        onReset={reset}
        isLoading={refreshing}
      />

      <AppliedFilters values={filters} onChange={update} onReset={reset} />

      {isError ? (
        <StatePanel kind="error" title="Nenhum jogador encontrado" description="A lista não pôde ser carregada agora." />
      ) : null}

      <div
        aria-busy={isLoading || refreshing}
        className={`mt-6 transition-opacity ${refreshing ? "opacity-60" : "opacity-100"}`}
      >
        {isLoading ? (
          <PlayerTableSkeleton />
        ) : (
          <PlayerTable products={visible} openAuctions={openAuctions} />
        )}
      </div>

      {!isLoading ? (
        <PaginationBar
          page={current}
          pageCount={pageCount}
          rangeStart={total === 0 ? 0 : (current - 1) * pageSize + 1}
          rangeEnd={Math.min(current * pageSize, total)}
          total={total}
          hasPrev={current > 1}
          hasNext={current < pageCount}
          onPrev={() => goTo(current - 1)}
          onNext={() => goTo(current + 1)}
          isLoading={refreshing}
        />
      ) : null}

      {!isLoading && !isError && total === 0 ? (
        <StatePanel kind="empty" title="Nenhum jogador encontrado" description="Ajuste ou limpe os filtros para ampliar a busca." />
      ) : null}
    </div>
  );
}
