// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  vite: {
    // Um único .env na raiz do monorepo (padrão Mega8Lance).
    envDir: repoRoot,
    server: {
      // NÃO fixar port/strictPort: o preview do sandbox escolhe a porta.
      // Fixar 5173 com strictPort fazia o dev server morrer no boot (porta ocupada)
      // e estourar o timeout de 45s de inicialização.
      proxy: {
        // Apenas prefixos do Django. /login, /admin e /me são rotas do próprio app.
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          // Se o Django não estiver rodando, responde 503 limpo em vez de 500.
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              console.warn("[proxy /api] backend indisponível:", err.message);
              const r = res as import("node:http").ServerResponse;
              if (r && !r.headersSent && typeof r.writeHead === "function") {
                r.writeHead(503, { "Content-Type": "application/json" });
                r.end(JSON.stringify({ detail: "Backend indisponível" }));
              }
            });
          },
        },
        "/ws": { target: "ws://127.0.0.1:8000", ws: true, changeOrigin: true },
        "/django-admin": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/static": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/media": { target: "http://127.0.0.1:8000", changeOrigin: true },
      },
    },
  },

  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
