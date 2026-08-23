import { OFFICIAL_EMAIL_ADDRESS } from "@/lib/email/resend";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

const BRAND_COLOR = "#7f1734";
const BRAND_ACCENT = "#f8f0f5";

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEmailShell(input: {
  preheader: string;
  title: string;
  content: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;background:#f6f3f4;color:#242424;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3f4">
      <tr>
        <td align="center" style="padding:24px 12px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:12px">
            <tr>
              <td style="padding:28px">
                <p style="margin:0 0 24px;color:${BRAND_COLOR};font-size:24px;font-weight:700">KA Bijoux</p>
                <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3">${escapeHtml(input.title)}</h1>
                ${input.content}
                <hr style="border:0;border-top:1px solid #ece7e9;margin:28px 0 20px">
                <p style="margin:0;color:#777;font-size:12px;line-height:1.5">
                  ${LEGAL_IDENTITY.legalName} · CNPJ ${LEGAL_IDENTITY.cnpj}<br>
                  ${LEGAL_IDENTITY.address.street}, ${LEGAL_IDENTITY.address.number}, ${LEGAL_IDENTITY.address.district}, ${LEGAL_IDENTITY.address.city}/${LEGAL_IDENTITY.address.state}<br>
                  Atendimento: <a href="mailto:${OFFICIAL_EMAIL_ADDRESS}" style="color:${BRAND_COLOR}">${OFFICIAL_EMAIL_ADDRESS}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildPasswordResetEmail(input: {
  name: string;
  code: string;
  expiresInMinutes: number;
}): EmailTemplate {
  const name = escapeHtml(input.name);
  const code = escapeHtml(input.code);
  const subject = "Código para redefinir sua senha — KA Bijoux";

  return {
    subject,
    html: renderEmailShell({
      preheader: `Seu código de recuperação expira em ${input.expiresInMinutes} minutos.`,
      title: "Redefinição de senha",
      content: `
        <p style="line-height:1.6">Olá, <strong>${name}</strong>!</p>
        <p style="line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <div style="background:${BRAND_ACCENT};border-radius:10px;padding:20px;text-align:center;margin:24px 0">
          <p style="margin:0 0 8px;color:#666;font-size:13px">Seu código de verificação</p>
          <p style="margin:0;color:${BRAND_COLOR};font-size:34px;font-weight:700;letter-spacing:7px">${code}</p>
        </div>
        <p style="color:#555;line-height:1.6">O código expira em <strong>${input.expiresInMinutes} minutos</strong>.</p>
        <p style="color:#555;line-height:1.6">Se você não solicitou a redefinição, ignore esta mensagem e não compartilhe o código.</p>`,
    }),
    text: [
      "KA Bijoux",
      "",
      `Olá, ${input.name}!`,
      "Recebemos uma solicitação para redefinir a senha da sua conta.",
      `Seu código de verificação é: ${input.code}`,
      `O código expira em ${input.expiresInMinutes} minutos.`,
      "Se você não solicitou a redefinição, ignore esta mensagem e não compartilhe o código.",
      "",
      `Atendimento: ${OFFICIAL_EMAIL_ADDRESS}`,
    ].join("\n"),
  };
}

export function buildAccountDeletionEmail(input: {
  confirmationUrl: string;
  expiresAt: Date;
}): EmailTemplate {
  const url = escapeHtml(input.confirmationUrl);
  const expiresAt = input.expiresAt.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const subject = "Confirme a exclusão da sua conta KA Bijoux";

  return {
    subject,
    html: renderEmailShell({
      preheader: "Revise e confirme sua solicitação de exclusão de conta.",
      title: "Exclusão de conta",
      content: `
        <p style="line-height:1.6">Recebemos uma solicitação para excluir sua conta.</p>
        <p style="line-height:1.6">Para confirmar sua identidade e revisar o que será apagado ou retido, use o botão abaixo:</p>
        <p style="margin:28px 0">
          <a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Revisar solicitação</a>
        </p>
        <p style="color:#555;line-height:1.6">O link expira em <strong>${escapeHtml(expiresAt)}</strong> e só pode ser utilizado uma vez.</p>
        <p style="color:#555;line-height:1.6">Se você não fez esta solicitação, ignore esta mensagem. Sua conta não será alterada sem confirmação.</p>`,
    }),
    text: [
      "KA Bijoux",
      "",
      "Recebemos uma solicitação para excluir sua conta.",
      "Revise e confirme a solicitação no endereço:",
      input.confirmationUrl,
      `O link expira em ${expiresAt} e só pode ser utilizado uma vez.`,
      "Se você não fez esta solicitação, ignore esta mensagem.",
      "",
      `Atendimento: ${OFFICIAL_EMAIL_ADDRESS}`,
    ].join("\n"),
  };
}
