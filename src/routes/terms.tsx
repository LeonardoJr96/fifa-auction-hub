import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de uso e privacidade · ReverseDraft" },
      {
        name: "description",
        content: "Termos de uso e política de privacidade da plataforma de leilões ReverseDraft.",
      },
      { property: "og:title", content: "Termos de uso e privacidade · ReverseDraft" },
      {
        property: "og:description",
        content: "Regras de participação, pagamentos e uso de dados no ReverseDraft.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Termos de uso e política de privacidade
      </h1>

      <section className="mt-6 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">1. Participação nos leilões</h2>
        <p>
          Cada lance é uma oferta firme e irrevogável. Ao vencer um leilão, o usuário se compromete
          a efetuar o pagamento com o saldo da conta dentro do prazo informado na tela do leilão.
        </p>
        <h2 className="text-base font-semibold text-foreground">2. Elegibilidade</h2>
        <p>
          É necessário ter 18 anos ou mais e fornecer dados cadastrais verdadeiros e atualizados.
        </p>
        <h2 className="text-base font-semibold text-foreground">3. Dados pessoais</h2>
        <p>
          Os dados informados no cadastro são usados apenas para identificação da conta, controle de
          saldo e cumprimento de obrigações legais, e não são compartilhados com terceiros para fins
          publicitários.
        </p>
        <h2 className="text-base font-semibold text-foreground">4. Conta e segurança</h2>
        <p>
          O usuário é responsável por manter a confidencialidade de suas credenciais e por toda
          atividade realizada na sua conta.
        </p>
      </section>
    </div>
  );
}
