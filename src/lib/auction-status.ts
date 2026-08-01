import type { Auction, AuctionStatus } from "@/types/api";

/**
 * A API pode devolver o status em minúsculas ("open") ou maiúsculas ("OPEN").
 * Normalizamos sempre para maiúsculas antes de comparar.
 */
export function normalizeStatus(status: string | null | undefined): AuctionStatus {
  return (status ?? "").toUpperCase() as AuctionStatus;
}

export function auctionStatus(auction: Pick<Auction, "status"> | null | undefined): AuctionStatus {
  return normalizeStatus(auction?.status);
}

export function isOpenAuction(auction: Pick<Auction, "status"> | null | undefined): boolean {
  return auctionStatus(auction) === "OPEN";
}
