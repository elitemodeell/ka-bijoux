import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos e condições de uso da KA Bijoux.",
};

const sections = [
  {
    title: "1. Aceitação dos Termos",
    content: `Ao acessar ou usar os serviços da KA Bijoux (site e aplicativo), você concorda com estes Termos de Uso. Se não concordar com alguma cláusula, não utilize nossos serviços.`,
  },
  {
    title: "2. Sobre a KA Bijoux",
    content: `A KA Bijoux é uma loja de acessórios, bijuterias e produtos para presente localizada em Itaúna/MG. Vendemos produtos físicos por meio do site e do aplicativo móvel.

E-mail de contato: contato@kabijoux.com.br`,
  },
  {
    title: "3. Cadastro e Conta",
    content: `• Você deve ter pelo menos 18 anos para se cadastrar.
• É responsável pela confidencialidade da sua senha.
• Não é permitido criar contas falsas ou em nome de terceiros sem autorização.
• A KA Bijoux pode suspender ou encerrar contas que violem estes termos.`,
  },
  {
    title: "4. Produtos e Preços",
    content: `• Todos os preços são em Reais (BRL) e incluem impostos quando aplicável.
• Nos reservamos o direito de alterar preços sem aviso prévio, exceto para pedidos já confirmados.
• As imagens dos produtos são meramente ilustrativas. Eventuais variações de cor ou embalagem podem ocorrer.
• A disponibilidade de estoque é atualizada em tempo real, mas podem ocorrer divergências excepcionais. Nesse caso, entraremos em contato para resolver.`,
  },
  {
    title: "5. Pedidos e Pagamento",
    content: `• Um pedido só é confirmado após aprovação do pagamento.
• Aceitamos PIX e cartão de crédito via Mercado Pago.
• O prazo de processamento do pagamento pode variar de acordo com o método escolhido.
• Em caso de não pagamento, o pedido é cancelado automaticamente.`,
  },
  {
    title: "6. Entrega",
    content: `• As opções de entrega disponíveis são: Correios (PAC/SEDEX), Mototáxi local (Itaúna) e Retirada na loja.
• Os prazos de entrega são estimados e podem variar por fatores externos (Correios, feriados, etc.).
• A KA Bijoux não se responsabiliza por atrasos causados pelos Correios ou por endereços incorretos informados pelo cliente.`,
  },
  {
    title: "7. Troca e Devolução",
    content: `Conforme o Código de Defesa do Consumidor (Lei 8.078/90):

• Você tem **7 dias corridos** a partir do recebimento para solicitar a devolução de qualquer produto comprado fora do estabelecimento físico, sem necessidade de justificativa (direito de arrependimento).
• Produtos com defeito podem ser trocados em até 30 dias (bens não duráveis) ou 90 dias (bens duráveis).
• Para iniciar uma troca ou devolução, entre em contato pelo WhatsApp ou e-mail.
• Produtos de uso íntimo (itens de sex shop) não podem ser trocados ou devolvidos por questões de higiene, exceto em caso de defeito de fabricação.`,
  },
  {
    title: "8. Propriedade Intelectual",
    content: `Todo o conteúdo do site e app (imagens, textos, logotipo) é de propriedade da KA Bijoux ou de seus fornecedores e está protegido por direitos autorais. É proibida a reprodução sem autorização expressa.`,
  },
  {
    title: "9. Limitação de Responsabilidade",
    content: `A KA Bijoux não se responsabiliza por danos indiretos, lucros cessantes ou perdas decorrentes do uso ou impossibilidade de uso dos nossos serviços, exceto quando exigido por lei.`,
  },
  {
    title: "10. Alterações dos Termos",
    content: `Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas por e-mail ou notificação no app. O uso continuado dos serviços após a notificação implica aceitação dos novos termos.`,
  },
  {
    title: "11. Foro",
    content: `Fica eleito o foro da Comarca de Itaúna/MG para dirimir quaisquer controvérsias oriundas destes Termos de Uso, com renúncia a qualquer outro, por mais privilegiado que seja.`,
  },
  {
    title: "12. Contato",
    content: `**KA Bijoux**
Itaúna — MG
E-mail: contato@kabijoux.com.br

Última atualização: julho de 2026.`,
  },
];

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-black text-gray-900">Termos de Uso</h1>
      <p className="mb-10 text-sm text-gray-500">
        KA Bijoux · Itaúna, MG · Última atualização: julho de 2026
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
