import { createFileRoute } from "@tanstack/react-router";

const BOOTED_AT = Date.now();

/**
 * Health check público do dev server / SSR.
 * Usado para checar rapidamente se o servidor subiu (evita esperar o timeout de 45s)
 * e para registrar detalhes de erro quando o backend Django não responde.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const apiUrl = process.env["VITE_API_URL"] ?? null;
        let api: { reachable: boolean; status?: number; error?: string } = { reachable: false };

        if (apiUrl) {
          try {
            const response = await fetch(`${apiUrl.replace(/\/$/, "")}/`, {
              method: "GET",
              signal: AbortSignal.timeout(3000),
            });
            api = { reachable: response.ok, status: response.status };
          } catch (error) {
            const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            api = { reachable: false, error: detail };
            console.error("[health] backend inacessível:", detail);
          }
        }

        return Response.json({
          status: "ok",
          uptime_ms: Date.now() - BOOTED_AT,
          timestamp: new Date().toISOString(),
          api_url: apiUrl,
          api,
        });
      },
    },
  },
});
