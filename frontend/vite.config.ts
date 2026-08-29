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
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/ws": { target: "ws://127.0.0.1:8000", ws: true, changeOrigin: true },
        "/admin": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/static": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/login": { target: "http://127.0.0.1:8000", changeOrigin: true },
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
