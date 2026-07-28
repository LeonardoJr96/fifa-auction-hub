import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { PlayerPhoto } from "@/components/PlayerPhoto";
import { StatBars } from "@/components/StatBars";
import { formatMoney } from "@/lib/format";
import type { Auction, Product } from "@/types/api";

interface ProductCardProps {
  product: Product;
  openAuction?: Auction;
}

export const ProductCard = memo(function ProductCard({ product, openAuction }: ProductCardProps) {
  const { player } = product;

  return (
    <article
      className="group relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lg"
      style={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}
    >

      {openAuction ? (
        <Link
          to="/auctions/$auctionId"
          params={{ auctionId: String(openAuction.id) }}
          className="absolute right-3 top-3 z-10 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-foreground shadow-sm"
        >
          Em leilão
        </Link>
      ) : null}

      <div className="flex items-center gap-3">
        <PlayerPhoto src={player.photo_url} alt={player.common_name} className="h-16 w-16 shrink-0" />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{product.title}</h3>
          <p className="text-xs text-muted-foreground">
            {product.category} · {player.age} anos
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <span className="rounded bg-pitch px-1.5 py-0.5 text-pitch-foreground tabular-nums">
              {player.overall_rating}
            </span>
            OVR
          </p>
        </div>
      </div>

      <div className="mt-4">
        <StatBars player={player} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-bold tabular-nums text-foreground">
          {formatMoney(product.price)}
        </span>
        <Link
          to="/players/$playerId"
          params={{ playerId: String(player.id) }}
          className="text-xs font-semibold text-pitch underline-offset-4 hover:underline"
        >
          Ver detalhes
        </Link>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-4 animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="mt-5 h-4 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
