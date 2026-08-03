/**
 * Conexão WebSocket com o canal de leilão do backend (Django Channels + Redis).
 *
 * URL padrão: derivada de VITE_API_URL, trocando http(s) por ws(s).
 * Pode ser sobrescrita com VITE_WS_URL (ex.: ws://localhost:8000/ws).
 */
import { API_URL, getAccessToken } from "@/lib/api";

export const WS_BASE_URL = (() => {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, "");
  try {
    const url = new URL(API_URL);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}/ws`;
  } catch {
    return "ws://localhost:8000/ws";
  }
})();

/** URL do canal `auction_{auction_id}`. */
export function auctionSocketUrl(auctionId: string | number): string {
  const token = getAccessToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${WS_BASE_URL}/auctions/${auctionId}/${query}`;
}

export interface AuctionSocketPayload {
  type?: string;
  event?: string;
  current_price?: string | number;
  status?: string;
  end_time?: string;
  winner?: number | null;
  bid?: unknown;
  bids?: unknown;
  auction?: unknown;
  [key: string]: unknown;
}

export function parseSocketPayload(raw: unknown): AuctionSocketPayload | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AuctionSocketPayload;
  } catch {
    return null;
  }
}
