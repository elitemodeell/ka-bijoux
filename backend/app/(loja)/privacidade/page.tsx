import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de privacidade da KA Bijoux — como coletamos, usamos e protegemos seus dados.",
};

const sections = [
  {
    title: "1. Informações que coletamos",
    content: `Coletamos as seguintes informações quando você utiliza nossos serviços:

• **Dados de cadastro:** nome, e-mail, telefone e CPF (opcional).
• **Endereço de entrega:** rua, número, complemento, bairro, cidade, estado e CEP.
• **Dados de pedido:** produtos adquiridos, valores, forma de pagamento e histórico de compras.
• **Dados de dispositivo (app):** token de notificação push para envio de atualizações de pedido.
• **Dados de navegação:** cookies essenciais para funcionamento do site (sessão, carrinho).`,
  },
  {
    title: "2. Como utilizamos seus dados",
    content: `Utilizamos seus dados exclusivamente para:

• Processar e entregar seus pedidos.
• Enviar notificações sobre o status do seu pedido (push e e-mail).
• Calcular o frete até seu endereço.
• Processar pagamentos com segurança via Mercado Pago.
• Melhorar nossos produtos e serviços.
• Cumprir obrigações legais e fiscais.`,
  },
  {
    title: "3. Compartilhamento de dados",
    content: `Não vendemos seus dados. Compartilhamos apenas com:

• **Mercado Pago:** processamento de pagamento (PIX e cartão de crédito).
• **Melhor Envio / Correios:** cálculo e envio de encomendas.
• **Cloudinary:** armazenamento de imagens dos produtos.

Todos os parceiros seguem políticas de privacidade próprias e adequadas à LGPD.`,
  },
  {
    title: "4. Seus direitos (LGPD)",
    content: `Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:

• **Acesso:** solicitar cópia dos seus dados.
• **Correção:** atualizar dados incompletos ou incorretos.
• **Exclusão:** solicitar a remoção dos seus dados pessoais — disponível diretamente no app em Perfil > Excluir conta.
• **Portabilidade:** receber seus dados em formato estruturado.
• **Revogação de consentimento:** a qualquer momento, sem prejuízo ao tratamento já realizado.

Para exercer seus direitos, entre em contato: **contato@kabijoux.com.br**`,
  },
  {
    title: "5. Segurança",
    content: `Adotamos medidas técnicas para proteger seus dados:

• Senhas armazenadas com hash bcrypt (não armazenamos senha em texto claro).
• Comunicação via HTTPS/TLS.
• Tokens JWT com expiração.
• Acesso restrito ao painel administrativo.`,
  },
  {
    title: "6. Retenção de dados",
    content: `Mantemos seus dados enquanto sua conta estiver ativa ou pelo prazo mínimo exigido pela legislação fiscal brasileira (5 anos para dados de transação). Ao excluir sua conta, removemos imediatamente os dados pessoais não obrigados por lei.`,
  },
  {
    title: "7. Cookies",
    content: `Utilizamos apenas cookies essenciais para funcionamento da loja (sessão de carrinho). Não utilizamos cookies de rastreamento ou publicidade de terceiros.`,
  },
  {
    title: "8. Notificações push (app)",
    content: `O aplicativo KA Bijoux pode enviar notificações push para informar sobre o status do seu pedido. Você pode desativar as notificações a qualquer momento nas configurações do seu dispositivo. Ao desinstalar o app ou fazer logout, seu token de notificação é removido.`,
  },
  {
    title: "9. Contato",
    content: `Dúvidas ou solicitações relacionadas à privacidade:

**KA Bijoux**
Itaúna — MG
E-mail: contato@kabijoux.com.br

Esta política foi atualizada em junho de 2026.`,
  },
];

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-black text-gray-900">Política de Privacidade</h1>
      <p className="mb-10 text-sm text-gray-500">
        KA Bijoux — CNPJ a definir · Itaúna, MG · Última atualização: junho de 2026
      </p>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-lg font-bold text-gray-900">{section.title}</h2>
            <div className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
              {section.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={i} className="font-semibold text-gray-800">
                    {part.slice(2, -2)}
                  </strong>
                ) : (
                  part
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
