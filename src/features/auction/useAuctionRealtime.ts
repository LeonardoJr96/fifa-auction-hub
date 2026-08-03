import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { auctionSocketUrl, parseSocketPayload } from "@/lib/realtime";
import type { Auction, Bid } from "@/types/api";

/**
 * Assina o canal `auction_{auction_id}` e sincroniza preço atual,
 * status e histórico de lances sem refresh.
 *
 * Retorna `connected` para que as queries reduzam/desliguem o polling.
 */
export function useAuctionRealtime(auctionId: string, enabled = true) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("WebSocket" in window)) return;

    let closedByUs = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      let socket: WebSocket;
      try {
        socket = new WebSocket(auctionSocketUrl(auctionId));
      } catch {
        setConnected(false);
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        retry = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        const payload = parseSocketPayload(event.data);
        if (!payload) return;

        const auctionPatch =
          payload.auction && typeof payload.auction === "object"
            ? (payload.auction as Partial<Auction>)
            : {
                ...(payload.current_price !== undefined
                  ? { current_price: payload.current_price }
                  : {}),
                ...(payload.status !== undefined ? { status: payload.status } : {}),
                ...(payload.end_time !== undefined ? { end_time: payload.end_time } : {}),
                ...(payload.winner !== undefined ? { winner: payload.winner } : {}),
              };

        if (Object.keys(auctionPatch).length > 0) {
          queryClient.setQueryData<Auction>(["auction", auctionId], (previous) =>
            previous ? ({ ...previous, ...auctionPatch } as Auction) : previous,
          );
        }

        const incoming = Array.isArray(payload.bids)
          ? (payload.bids as Bid[])
          : payload.bid && typeof payload.bid === "object"
            ? [payload.bid as Bid]
            : [];

        if (incoming.length > 0) {
          queryClient.setQueryData<Bid[]>(["auction", auctionId, "bids"], (previous) => {
            const merged = [...incoming, ...(previous ?? [])];
            const unique = new Map<string, Bid>();
            for (const bid of merged) {
              unique.set(String(bid.id ?? `${bid.price}-${bid.bid_time}`), bid);
            }
            return [...unique.values()].sort((a, b) => {
              const diff = Number(b.price) - Number(a.price);
              if (diff !== 0) return diff;
              return new Date(b.bid_time).getTime() - new Date(a.bid_time).getTime();
            });
          });
        }

        if (Object.keys(auctionPatch).length === 0 && incoming.length === 0) {
          void queryClient.invalidateQueries({ queryKey: ["auction", auctionId] });
        }
      };

      socket.onerror = () => setConnected(false);

      socket.onclose = () => {
        setConnected(false);
        if (closedByUs) return;
        retry += 1;
        const delay = Math.min(1000 * 2 ** (retry - 1), 15000);
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [auctionId, enabled, queryClient]);

  return { connected };
}
