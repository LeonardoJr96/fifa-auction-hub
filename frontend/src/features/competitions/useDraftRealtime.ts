import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { draftSocketUrl, parseSocketPayload } from "@/lib/realtime";
import type { DraftState } from "@/types/api";

export function useDraftRealtime(competitionId: string, enabled = true) {
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
        socket = new WebSocket(draftSocketUrl(competitionId));
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
        if (!payload || payload.competition_id === undefined) return;
        queryClient.setQueryData<DraftState>(["competition", competitionId, "draft"], payload as DraftState);
        void queryClient.invalidateQueries({ queryKey: ["competition", competitionId] });
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
  }, [competitionId, enabled, queryClient]);

  return { connected };
}
