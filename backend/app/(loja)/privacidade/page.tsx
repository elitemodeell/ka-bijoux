import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ADDRESS_INLINE, LEGAL_IDENTITY } from "@/lib/legal-identity";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade da KA Bijoux: dados tratados, finalidades, fornecedores e direitos LGPD.",
};

const sections = [
  {
    title: "1. Controlador e versão",
    content: `O controlador dos dados tratados pelo site e pelo aplicativo é **${LEGAL_IDENTITY.legalName}**, CNPJ **${LEGAL_IDENTITY.cnpj}**, com sede em **${LEGAL_ADDRESS_INLINE}**.

Representante legal: **${LEGAL_IDENTITY.legalRepresentative}**. Canal para atendimento e exercício de direitos: **${LEGAL_IDENTITY.email}**.

A empresa não designou publicamente um encarregado separado nesta versão. As solicitações LGPD são recebidas diretamente pelo canal oficial acima.

Versão: **2026-08-03 (v3.0)**.`,
  },
  {
    title: "2. Dados que tratamos",
    content: `Dependendo da função utilizada, tratamos:

• **Conta:** nome, e-mail, telefone opcional, CPF quando necessário ao checkout, senha protegida por hash, estado da conta e datas de criação/alteração.
• **Entrega:** rótulo do endereço, rua, número, complemento, bairro, cidade, estado e CEP.
• **Compras:** carrinho, itens, favoritos, avaliações, pedidos, valores, descontos, modalidade de entrega, histórico de status e atendimento.
• **Pagamentos:** método, valor, parcelas, estado, identificadores e referências externas da Asaas, URLs hospedadas, linha digitável de boleto e dados Pix necessários à exibição. A KA Bijoux não coleta nem armazena número completo de cartão ou CVV; o cartão usa checkout hospedado pelo provedor quando estiver habilitado.
• **Consentimento e segurança:** versão dos termos aceitos, data, IP, user-agent, registros de autenticação, rate limit, eventos de webhook e trilha pseudonimizada da exclusão.
• **Comunicação:** e-mail usado para recuperação de senha e confirmação de exclusão; notificações internas relacionadas ao pedido.
• **Armazenamento local:** carrinho, stories já vistos e posição de navegação podem ser mantidos no navegador ou no dispositivo.
• **Dados técnicos:** requisições podem gerar IP, user-agent e logs técnicos na infraestrutura de hospedagem.

Não foram encontrados SDKs de publicidade ou analytics no aplicativo.

O aplicativo distribuído pela Google Play consulta uma seleção de catálogo separada e controlada pelo servidor. Registros não classificados ou não aprovados para esse canal são excluídos das respostas, inclusive de listagens, buscas, favoritos, carrinho, avaliações, stories e notificações. Itens de pedidos anteriores que não pertencem à seleção são apresentados de forma neutra no aplicativo.`,
  },
  {
    title: "3. Notificações e dados do dispositivo",
    content: `O registro de notificações push está **inativo no aplicativo nesta versão**. O código móvel não obtém nem envia token push atualmente. Portanto, não declaramos coleta ativa de token de notificação.

O banco e o backend conservam estrutura preparada para token push, mas ela só poderá ser ativada após configuração, consentimento/permissão aplicável e atualização desta política e da declaração de Segurança dos dados.

O aplicativo usa **Expo/EAS Update** para entregar atualizações. Para essa finalidade técnica, o serviço pode processar versão do sistema operacional, versão do aplicativo e um identificador aleatório da instalação, além de registros técnicos de entrega, erro e desempenho. Esses dados não são usados pela KA Bijoux para publicidade ou rastreamento comportamental e devem constar da declaração de Segurança dos dados da Google Play.`,
  },
  {
    title: "4. Finalidades e bases legais",
    content: `Os dados são tratados para:

• criar e administrar a conta — **execução de contrato e procedimentos preliminares**;
• manter carrinho, favoritos e preferências — **execução do serviço e legítimo interesse**, com possibilidade de exclusão;
• calcular frete, processar pedido, pagamento, entrega, troca e suporte — **execução de contrato**;
• prevenir fraude, abuso, duplicidade, acesso indevido e contestação — **legítimo interesse e exercício regular de direitos**;
• manter documentos transacionais e atender autoridades — **cumprimento de obrigação legal ou regulatória**;
• registrar a aceitação dos termos — **cumprimento de obrigação, exercício de direitos e, quando aplicável, consentimento**;
• enviar recuperação de senha e confirmação de exclusão — **segurança e execução do serviço**.

Não utilizamos os dados para publicidade comportamental nesta versão.`,
  },
  {
    title: "5. Fornecedores e compartilhamento",
    content: `Não vendemos dados pessoais. Conforme a função efetivamente configurada, dados podem ser processados por:

• **Asaas:** cadastro do pagador, Pix, boleto, checkout hospedado de cartão, conciliação, prevenção a fraude, cancelamento e estorno.
• **Melhor Envio e transportadores integrados:** CEP de destino e características do pacote para cotação; dados adicionais de remessa somente quando a contratação da etiqueta for implementada e utilizada.
• **Supabase:** banco PostgreSQL e armazenamento de imagens/arquivos operacionais.
• **Resend:** envio de recuperação de senha e confirmação de exclusão ao e-mail cadastrado.
• **Vercel ou hospedagem equivalente:** execução do site/API e logs técnicos de segurança e disponibilidade.
• **Expo/EAS:** build, atualização do aplicativo e dados técnicos indispensáveis a esses serviços; push está inativo no mobile.
• **Bling:** integração operacional de catálogo/estoque; não foi comprovado envio de dados pessoais de clientes no fluxo atual.

Cloudinary aparece como configuração legada, mas o armazenamento ativo encontrado no código usa Supabase; ele não é declarado como destinatário de dados do usuário sem comprovação de uso. Mercado Pago não é gateway ativo.`,
  },
  {
    title: "6. Segurança",
    content: `Aplicamos controles proporcionais ao risco:

• senhas protegidas com bcrypt e nunca armazenadas em texto claro;
• HTTPS/TLS nos ambientes públicos e validação de URL segura nos retornos de pagamento;
• autenticação por token com expiração e armazenamento seguro da sessão no app;
• webhooks autenticados, idempotência e validação de valor/referência;
• rate limit em rotas sensíveis;
• confirmação de exclusão por token aleatório, temporário, de uso único e persistido somente como hash;
• segredos mantidos no backend e fora do repositório.

Nenhum sistema é absolutamente invulnerável. Incidentes serão tratados conforme a LGPD e o risco aos titulares.`,
  },
  {
    title: "7. Retenção",
    content: `A conta e preferências permanecem enquanto ela estiver ativa. Códigos de recuperação expiram em 15 minutos e links de exclusão em 30 minutos.

Após a exclusão, perfil, credencial, telefone, CPF, token push, carrinho, favoritos, avaliações, notificações e endereços sem vínculo com pedidos são apagados ou anonimizados. Pedidos, pagamentos, referências antifraude, consentimentos, auditorias e endereços ligados a transações podem ser retidos pelo prazo necessário a obrigações fiscais, legais, prevenção a fraude, estornos e contestações.

A referência operacional atual é de **até 5 anos para registros transacionais**, mas o prazo e a tabela de retenção devem ser validados pelo responsável jurídico/contábil antes da publicação definitiva. Encerrado o fundamento, os dados devem ser eliminados ou anonimizados.`,
  },
  {
    title: "8. Exclusão de conta",
    content: `É possível excluir a conta:

• no aplicativo, em **Perfil > Excluir minha conta**, com sessão autenticada e digitação da confirmação **EXCLUIR**; ou
• na página externa **/excluir-conta**, sem instalar ou abrir o aplicativo.

No fluxo externo, enviamos um link ao e-mail cadastrado. A resposta inicial não informa se a conta existe. O link expira, só pode ser usado uma vez e permite cancelar antes da confirmação. A anonimização é automática após a confirmação; casos que exijam análise operacional podem levar até 7 dias.`,
  },
  {
    title: "9. Direitos LGPD",
    content: `Nos limites da legislação, você pode pedir confirmação e acesso, correção, anonimização, bloqueio ou eliminação, portabilidade, informação sobre compartilhamento, revisão de decisões automatizadas, oposição e revogação do consentimento.

O aplicativo oferece edição de perfil, exportação de dados e exclusão de conta. Solicitações adicionais podem ser encaminhadas ao canal indicado na seção 1. Poderemos solicitar confirmação de identidade sem pedir dados excessivos.`,
  },
  {
    title: "10. Cookies e armazenamento local",
    content: `O site usa cookie HTTP-only de autenticação apenas para o painel administrativo. Para consumidores, foram encontrados armazenamento local do carrinho e stories vistos, além de armazenamento de sessão para restaurar navegação.

Não foram encontrados cookies de publicidade, pixels ou analytics de terceiros. Se forem adicionados, esta política e o mecanismo de consentimento deverão ser revistos antes da ativação.`,
  },
  {
    title: "11. Crianças e adolescentes",
    content: `O serviço não é dirigido a crianças e não há intenção de coletar conscientemente seus dados. O proprietário deve manter a classificação de conteúdo e o público-alvo coerentes com a seleção efetivamente exibida em cada canal.`,
  },
  {
    title: "12. Transferência e localização do tratamento",
    content: `Fornecedores de nuvem, e-mail, pagamentos e distribuição podem operar infraestrutura no Brasil ou no exterior. Quando houver transferência internacional, ela deverá observar os mecanismos previstos na LGPD e as garantias contratuais e de segurança do fornecedor.`,
  },
  {
    title: "13. Alterações",
    content: `Mudanças materiais de finalidade, fornecedor, push, publicidade, analytics ou forma de pagamento exigem nova auditoria da política e da declaração de Segurança dos dados. A versão e a data serão atualizadas, e a comunicação ao titular será feita quando exigida.`,
  },
  {
    title: "14. Contato",
    content: `**${LEGAL_IDENTITY.legalName}**
CNPJ: **${LEGAL_IDENTITY.cnpj}**
Representante legal: **${LEGAL_IDENTITY.legalRepresentative}**
Endereço: **${LEGAL_ADDRESS_INLINE}**
E-mail: **${LEGAL_IDENTITY.email}**
Site: **${LEGAL_IDENTITY.website}**`,
  },
];

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="mb-2 text-3xl font-black text-gray-900">Política de Privacidade</h1>
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
        Solicite a exclusão pela{" "}
        <Link href="/excluir-conta" className="font-semibold text-rose-800 underline">
          página externa de exclusão de conta
        </Link>
        .
      </p>
    </main>
  );
}
