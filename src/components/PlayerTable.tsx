import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { formatMoney } from "@/lib/format";
import { playerPhotoSrc } from "@/lib/player-photo";
import { ratingBg } from "@/lib/rating";
import { cn } from "@/lib/utils";
import type { Auction, Product } from "@/types/api";

interface PlayerTableProps {
  products: Product[];
  openAuctions: Map<number, Auction>;
}

const Row = memo(function Row({
  product,
  openAuction,
}: {
  product: Product;
  openAuction?: Auction;
}) {
  const { player } = product;
  const positions = (player.positions ?? [player.best_position]).filter(Boolean) as string[];

  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-secondary/50">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <PlayerPhoto
            src={playerPhotoSrc(player)}
            alt={player.common_name}
            className="h-9 w-9 shrink-0"
            size={36}
          />
          <div className="min-w-0">
            <Link
              to="/players/$playerId"
              params={{ playerId: String(player.id) }}
              className="block truncate text-sm font-semibold text-foreground hover:text-pitch hover:underline"
            >
              {player.common_name}
            </Link>
            <span className="text-[11px] text-muted-foreground">{product.category}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-center text-sm tabular-nums text-muted-foreground">
        {player.age}
      </td>
      <td className="px-3 py-2 text-center">
        <span
          className={cn(
            "inline-block min-w-8 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums",
            ratingBg(player.overall_rating),
          )}
        >
          {player.overall_rating}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <span
          className={cn(
            "inline-block min-w-8 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums",
            ratingBg(player.potential),
          )}
        >
          {player.potential}
        </span>
      </td>
      <td className="hidden px-3 py-2 sm:table-cell">
        <div className="flex flex-wrap gap-1">
          {positions.length ? (
            positions.map((position) => (
              <span
                key={position}
                className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-secondary-foreground"
              >
                {position}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-foreground">
        {formatMoney(product.price)}
      </td>
      <td className="px-3 py-2 text-right">
        {openAuction ? (
          <Link
            to="/auctions/$auctionId"
            params={{ auctionId: String(openAuction.id) }}
            className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-foreground"
          >
            Em leilão
          </Link>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
});

/** Tabela densa de jogadores, no estilo das listas do SoFIFA. */
export function PlayerTable({ products, openAuctions }: PlayerTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left">Nome</th>
            <th className="px-3 py-2 text-center">Id.</th>
            <th className="px-3 py-2 text-center">OVR</th>
            <th className="px-3 py-2 text-center">POT</th>
            <th className="hidden px-3 py-2 text-left sm:table-cell">Posições</th>
            <th className="px-3 py-2 text-right">Valor</th>
            <th className="px-3 py-2 text-right">Leilão</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <Row
              key={product.id}
              product={product}
              openAuction={openAuctions.get(product.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlayerTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0">
          <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
