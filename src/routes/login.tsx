import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    registered: search.registered === true || search.registered === "true",
  }),
  head: () => ({
    meta: [
      { title: "Entrar · ReverseDraft" },
      { name: "description", content: "Acesse sua conta para dar lances no leilão de jogadores." },
      { property: "og:title", content: "Entrar · ReverseDraft" },
      {
        property: "og:description",
        content: "Acesse sua conta para dar lances no leilão de jogadores.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { registered } = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(username, password);
      navigate({ to: "/", replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Entrar</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A sessão fica apenas em memória: ao recarregar a página é preciso entrar novamente.
      </p>

      {registered ? (
        <p className="mt-4 rounded-md border border-pitch bg-pitch/10 px-3 py-2 text-sm font-semibold text-foreground">
          Conta criada! Faça login para continuar.
        </p>
      ) : null}



      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="username" className="text-sm font-medium text-foreground">
            Usuário
          </label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
