import { createFileRoute, Link } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/AuthContext";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel admin · ReverseDraft" },
      { name: "description", content: "Central de administração de leilões, competições e mercado." },
      { property: "og:title", content: "Painel admin · ReverseDraft" },
      {
        property: "og:description",
        content: "Central de administração de leilões, competições e mercado.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHomePage,
});

const CARDS = [
  {
    to: "/admin/auctions",
    title: "Leilões",
    description: "Listar, filtrar e acompanhar o status de todos os leilões.",
  },
  {
    to: "/admin/auctions/new",
    title: "Criar leilão",
    description: "Abrir um novo leilão a partir de um produto/jogador.",
  },
  {
    to: "/admin/competitions",
    title: "Competições",
    description: "Encerrar competições e gerar/visualizar o chaveamento.",
  },
  {
    to: "/admin/campaigns",
    title: "Campanhas e mercado",
    description: "Janelas de mercado, administradores da campanha e gestão de listagens.",
  },
] as const;

function AdminHomePage() {
  const { isAuthenticated, isStaff } = useAuth();

  if (!isAuthenticated || !isStaff) {
    return <RestrictedNotice />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ações administrativas da plataforma em um só lugar.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60"
          >
            <h2 className="text-base font-bold text-foreground">{card.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function RestrictedNotice() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta área é exclusiva para administradores.
      </p>
      <Link
        to="/login"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Entrar
      </Link>
    </div>
  );
}
