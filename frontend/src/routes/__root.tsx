import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useQueryCachePersistence } from "@/lib/query-persist";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CircleHelp, Wifi } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você abriu não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao leilão
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "ReverseDraft" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteHeader() {
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="size-9" aria-label="Abrir ou recolher navegação" />
      <div className="h-5 w-px bg-border" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-foreground">Central de competição</p>
        <p className="hidden text-[11px] text-muted-foreground sm:block">Operação, performance e mercado em tempo real</p>
      </div>
      <span className="hidden items-center gap-2 rounded-full border border-live/20 bg-live/10 px-3 py-1.5 text-[11px] font-bold text-live sm:flex"><Wifi className="size-3.5" /> Sistema online</span>
      {isAuthenticated ? <Link to="/me" className="grid size-9 place-items-center rounded-full border border-border bg-secondary font-display text-xs font-bold text-foreground" aria-label="Abrir minha conta">{user?.username?.slice(0, 2).toUpperCase()}</Link> : <Link to="/login" className="text-sm font-semibold text-primary">Entrar</Link>}
      <CircleHelp className="hidden size-4 text-muted-foreground lg:block" aria-hidden="true" />
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useQueryCachePersistence(queryClient);



  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider defaultOpen>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <SidebarInset className="min-w-0">
              <SiteHeader />
              <div className="flex-1"><Outlet /></div>
              <footer className="border-t border-border px-6 py-5 text-xs text-muted-foreground">ReverseDraft · futebol, competição e performance</footer>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
