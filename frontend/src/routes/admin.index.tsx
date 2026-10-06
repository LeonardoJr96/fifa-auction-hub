import { createFileRoute, Link } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/AuthContext";
import { BracketStatusPanel } from "@/features/competitions/BracketStatusPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatePanel } from "@/components/StatePanel";


export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel admin · ReverseDraft" },
      { name: "description", content: "Administração de leilões da plataforma." },
      { property: "og:title", content: "Administração · ReverseDraft" },
      { property: "og:description", content: "Operação de leilões e competições da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
    to: "/admin/competitions/new",
    title: "Criar competição",
    description: "Abrir inscrições para um draft reverso ao vivo.",
  },
] as const;

function AdminHomePage() {
  const { isAuthenticated, isStaff } = useAuth();

  if (!isAuthenticated || !isStaff) {
    return <RestrictedNotice />;
  }

  return (
    <div className="page-container">
      <PageHeader eyebrow="Sistema" title="Administração" description="Controle leilões, competições e o chaveamento da plataforma." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="surface-panel transition-colors hover:border-primary/60"
          >
            <h2 className="text-base font-bold text-foreground">{card.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </div>

      <BracketStatusPanel />
    </div>
  );
}


export function RestrictedNotice() {
  return (
    <div className="page-container"><StatePanel kind="permission" title="Acesso restrito" description="Esta área é exclusiva para administradores." />
      <Link
        to="/login"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Entrar
      </Link>
    </div>
  );
}
