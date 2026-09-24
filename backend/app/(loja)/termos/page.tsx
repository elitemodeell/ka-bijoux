import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ADDRESS_INLINE, LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos e condições de uso do site e do aplicativo KA Bijoux.",
};

const sections = [
  {
    title: "1. Aceitação e versão",
    content: `Ao usar o site ou o aplicativo KA Bijoux, você declara que leu estes Termos e a Política de Privacidade. Se não concordar, não crie uma conta nem conclua uma compra.

Versão: **2026-08-03 (v3.0)**.`,
  },
  {
    title: "2. Identificação do fornecedor",
    content: `A loja KA Bijoux comercializa produtos físicos e é operada por **${LEGAL_IDENTITY.legalName}**, CNPJ **${LEGAL_IDENTITY.cnpj}**, representada legalmente por **${LEGAL_IDENTITY.legalRepresentative}**, com sede em **${LEGAL_ADDRESS_INLINE}**.

Atendimento oficial: **${LEGAL_IDENTITY.email}**. Site: **${LEGAL_IDENTITY.website}**.`,
  },
  {
    title: "3. Público e conta",
    content: `• O cadastro e a compra exigem capacidade civil para contratar; produtos eventualmente sujeitos a restrição etária seguem as regras informadas no respectivo canal.
• Você deve fornecer dados verdadeiros e manter sua senha em sigilo.
• Não é permitido criar conta em nome de terceiro sem autorização, fraudar pagamentos, abusar de cupons ou interferir no serviço.
• A conta pode ser suspensa por risco de fraude ou violação destes Termos, respeitados os direitos do consumidor.
• É possível exportar dados e excluir a conta pelo aplicativo ou pela página externa de exclusão.`,
  },
  {
    title: "4. Catálogo, estoque e oferta",
    content: `O site e o aplicativo usam canais de distribuição distintos. O aplicativo da Google Play exibe somente a seleção aprovada para esse canal; parâmetros enviados pelo usuário não alteram essa seleção. O site pode apresentar uma seleção diferente.

Preços são apresentados em reais. Características, composição, restrições de uso, disponibilidade, preço, frete e prazo aplicáveis serão mostrados antes da confirmação.

Imagens auxiliam a identificação do produto, mas tonalidades podem variar conforme tela e lote. Se houver erro material de estoque ou cadastro, a KA Bijoux informará o consumidor e oferecerá as alternativas legalmente cabíveis, inclusive cancelamento e restituição quando aplicável.`,
  },
  {
    title: "5. Pedidos e pagamento",
    content: `O pedido permanece pendente até a confirmação financeira. As formas efetivamente disponíveis aparecem no checkout e podem variar conforme configuração e ambiente.

Os pagamentos são integrados à **Asaas**. O checkout apresenta apenas os métodos habilitados pelo servidor. Pix e boleto, quando disponíveis, são gerados pelo backend; cartão, quando disponível, usa checkout hospedado e a KA Bijoux não recebe número completo nem CVV. O retorno do navegador não comprova pagamento: a confirmação depende do provedor e da conciliação.`,
  },
  {
    title: "6. Entrega",
    content: `Somente opções retornadas e validadas no checkout estão disponíveis. O código prevê retirada, mototáxi local e cotação de transportadores por integração com o Melhor Envio, mas cada opção depende de região, configuração e disponibilidade.

O prazo é estimado e pode sofrer eventos externos. O cliente deve conferir o endereço antes do pagamento. A loja não anunciará entrega nacional até haver comprovação operacional.`,
  },
  {
    title: "7. Arrependimento, troca e devolução",
    content: `Nas compras feitas fora do estabelecimento, o consumidor pode exercer o direito de arrependimento no prazo legal de **7 dias**, contado do recebimento ou da contratação, conforme o art. 49 do Código de Defesa do Consumidor.

Produtos com vício seguem os prazos e soluções do CDC. Regras sanitárias ou de higiene aplicáveis a determinados produtos **não eliminam automaticamente direitos legais do consumidor**. O procedimento concreto deve ser validado pela assessoria jurídica e informado claramente antes da compra.

Para solicitar, o consumidor deve escrever para **${LEGAL_IDENTITY.email}**, informar o número do pedido e aguardar as instruções de postagem ou entrega. Não envie o produto sem autorização. Quando devido, o reembolso será solicitado pelo mesmo fluxo financeiro da compra; o prazo de crédito depende do método, do gateway e da instituição financeira.`,
  },
  {
    title: "8. Avaliações de produtos",
    content: `Somente clientes com compra do produto podem enviar avaliação. Toda avaliação nova ou alterada fica oculta até moderação administrativa; apenas conteúdo aprovado é exibido publicamente.

Podem ser recusadas avaliações com dados pessoais, publicidade, fraude, discurso ilegal, assédio ou conteúdo sem relação com o produto. A moderação não elimina críticas legítimas sobre qualidade, entrega ou atendimento e não substitui os canais de suporte e os direitos do consumidor.`,
  },
  {
    title: "9. Propriedade intelectual",
    content: `Marcas, interface, textos e imagens pertencem à KA Bijoux, aos fabricantes ou aos respectivos licenciantes. Nenhum conteúdo pode ser reproduzido ou usado de forma enganosa sem autorização.`,
  },
  {
    title: "10. Disponibilidade e responsabilidade",
    content: `Podem ocorrer indisponibilidades de rede, hospedagem, banco, gateway ou transportador. A KA Bijoux adota medidas razoáveis de continuidade e segurança e não exclui responsabilidades que não possam ser afastadas pelo Código de Defesa do Consumidor ou por outra lei aplicável.`,
  },
  {
    title: "11. Privacidade",
    content: `O tratamento de dados, fornecedores, retenção e direitos LGPD estão descritos na Política de Privacidade. A exclusão preserva somente os registros necessários a obrigações legais, segurança, fraude, estorno e contestação.`,
  },
  {
    title: "12. Alterações e contato",
    content: `Alterações materiais serão identificadas por nova versão e comunicadas pelo canal disponível quando exigido. O uso posterior não substitui consentimento específico quando a lei o exigir.

**${LEGAL_IDENTITY.legalName}** · CNPJ **${LEGAL_IDENTITY.cnpj}**
Representante legal: **${LEGAL_IDENTITY.legalRepresentative}**
Endereço: **${LEGAL_ADDRESS_INLINE}**
E-mail: **${LEGAL_IDENTITY.email}**`,
  },
];

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="mb-2 text-3xl font-black text-gray-900">Termos de Uso</h1>
      <p className="mb-5 text-sm text-gray-500">
        KA Bijoux · versão 3.0 · última atualização: 3 de agosto de 2026
      </p>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-lg font-bold text-gray-900">{section.title}</h2>
            <div className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {section.content.split(/(\*\*.*?\*\*)/).map((part, index) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={index} className="font-semibold text-gray-800">
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

      <p className="mt-12 border-t pt-6 text-sm text-gray-600">
        Consulte a{" "}
        <Link href="/privacidade" className="font-semibold text-rose-800 underline">
          Política de Privacidade
        </Link>{" "}
        ou a{" "}
        <Link href="/excluir-conta" className="font-semibold text-rose-800 underline">
          página de exclusão de conta
        </Link>
        .
      </p>
    </main>
  );
}
