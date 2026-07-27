import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Criar conta · ReverseDraft" },
      {
        name: "description",
        content: "Cadastre-se no ReverseDraft para dar lances no leilão de jogadores.",
      },
      { property: "og:title", content: "Criar conta · ReverseDraft" },
      {
        property: "og:description",
        content: "Cadastre-se no ReverseDraft para dar lances no leilão de jogadores.",
      },
    ],
  }),
  component: RegisterPage,
});

const inputClass =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

const FIELDS = [
  { name: "username", label: "Usuário", type: "text", autoComplete: "username" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "password", label: "Senha", type: "password", autoComplete: "new-password" },
  {
    name: "password_confirm",
    label: "Confirmar senha",
    type: "password",
    autoComplete: "new-password",
  },
  { name: "cpf", label: "CPF", type: "text", autoComplete: "off" },
  { name: "cellphone", label: "Celular", type: "tel", autoComplete: "tel" },
  { name: "address", label: "Endereço", type: "text", autoComplete: "street-address" },
  { name: "town", label: "Cidade", type: "text", autoComplete: "address-level2" },
  { name: "post_code", label: "CEP", type: "text", autoComplete: "postal-code" },
  { name: "country", label: "País", type: "text", autoComplete: "country-name" },
  { name: "birth_date", label: "Data de nascimento", type: "date", autoComplete: "bday" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

const EMPTY: Record<FieldName, string> = {
  username: "",
  email: "",
  password: "",
  password_confirm: "",
  cpf: "",
  cellphone: "",
  address: "",
  town: "",
  post_code: "",
  country: "",
  birth_date: "",
};

function isAdult(birthDate: string) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return birth <= limit;
}

/** Normaliza os erros por campo devolvidos pelo DRF. */
function parseFieldErrors(data: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === "string") errors[key] = value;
      else if (Array.isArray(value) && typeof value[0] === "string") errors[key] = value[0];
    }
  }
  return errors;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<FieldName, string>>(EMPTY);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function setField(name: FieldName, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    if (values.password !== values.password_confirm) {
      setErrors({ password_confirm: "As senhas não coincidem." });
      return;
    }
    if (!isAdult(values.birth_date)) {
      setErrors({ birth_date: "É preciso ter 18 anos ou mais para se cadastrar." });
      return;
    }
    if (!acceptTerms) {
      setErrors({ accept_terms: "É preciso aceitar os termos de uso." });
      return;
    }

    setPending(true);
    try {
      await apiRequest("/users/register/", {
        method: "POST",
        body: { ...values, accept_terms: acceptTerms },
      });
      navigate({
        to: "/login",
        replace: true,
        search: { registered: true },
      });
    } catch (registerError) {
      if (registerError instanceof ApiError) {
        const fieldErrors = parseFieldErrors(registerError.data);
        setErrors(
          Object.keys(fieldErrors).length > 0
            ? fieldErrors
            : { non_field_errors: registerError.message },
        );
      } else {
        setErrors({ non_field_errors: "Não foi possível criar a conta." });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Criar conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha seus dados para participar dos leilões.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="text-sm font-medium text-foreground">
              {field.label}
            </label>
            <input
              id={field.name}
              type={field.type}
              value={values[field.name]}
              onChange={(event) => setField(field.name, event.target.value)}
              autoComplete={field.autoComplete}
              required
              className={inputClass}
            />
            {errors[field.name] ? (
              <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                {errors[field.name]}
              </p>
            ) : null}
          </div>
        ))}

        <div>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Li e aceito os{" "}
              <Link to="/terms" className="font-semibold text-pitch hover:underline">
                termos de uso e a política de privacidade
              </Link>
              .
            </span>
          </label>
          {errors.accept_terms ? (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {errors.accept_terms}
            </p>
          ) : null}
        </div>

        {errors.non_field_errors || errors.detail ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errors.non_field_errors ?? errors.detail}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? "Criando conta…" : "Criar conta"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login" className="font-semibold text-pitch hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
