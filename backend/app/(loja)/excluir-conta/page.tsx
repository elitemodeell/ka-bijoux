import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exclusão de conta",
  description: "Como excluir sua conta KA Bijoux e como seus dados são tratados.",
};

export default function ExcluirContaPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-3 text-3xl font-black text-gray-900">Exclusão de conta</h1>
      <p className="mb-10 text-sm text-gray-500">KA Bijoux · Itaúna, MG · Atualizado em agosto de 2026</p>

      <div className="space-y-9 text-sm leading-relaxed text-gray-600">
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Como excluir pelo aplicativo</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Abra o aplicativo KA Bijoux e entre na sua conta.</li>
            <li>Acesse <strong className="text-gray-800">Perfil</strong>.</li>
            <li>Toque em <strong className="text-gray-800">Excluir minha conta</strong>.</li>
            <li>Revise as informações e confirme a exclusão. Contas por e-mail pedem a senha; contas Apple ou Google usam a sessão autenticada.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Dados removidos ou anonimizados</h2>
          <p>O acesso à conta é encerrado, as sessões são invalidadas e os dados de perfil são removidos ou anonimizados. Também removemos carrinho, favoritos, notificações, avaliações, endereços sem vínculo com pedidos e credenciais de recuperação.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Conta criada com Apple</h2>
          <p>Depois da exclusão no aplicativo, você também pode remover a autorização diretamente no iPhone em Ajustes &gt; seu nome &gt; Início de Sessão e Segurança &gt; Iniciar sessão com Apple &gt; KA Bijoux &gt; Parar de usar. Essa etapa encerra a autorização mantida pela própria Apple.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Informações preservadas por obrigação legal</h2>
          <p>Registros de pedidos, pagamentos e os dados estritamente necessários para comprovação fiscal, prevenção a fraude, exercício regular de direitos e atendimento a obrigações legais podem ser preservados pelo prazo aplicável. Esses registros ficam vinculados a uma conta desativada e anonimizada e não permitem novo login.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Solicitação por atendimento</h2>
          <p>Se você não conseguir acessar o aplicativo, envie uma solicitação para <a className="font-semibold text-pink-800 underline" href="mailto:adm@kabijoux.com.br">adm@kabijoux.com.br</a>. Poderemos solicitar informações adicionais apenas para confirmar sua identidade.</p>
        </section>

        <section className="rounded-2xl bg-pink-50 p-5">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Documentos relacionados</h2>
          <div className="flex flex-wrap gap-4">
            <Link className="font-semibold text-pink-800 underline" href="/privacidade">Política de Privacidade</Link>
            <Link className="font-semibold text-pink-800 underline" href="/termos">Termos de Uso</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
