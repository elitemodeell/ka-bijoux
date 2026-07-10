export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/utils";

const schema = z.object({ email: z.string().email() });

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendResetEmail(email: string, name: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Em desenvolvimento sem RESEND_API_KEY, loga o código no console
    console.log(`[DEV] Código de redefinição para ${email}: ${code}`);
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "KA Bijoux <noreply@kabijoux.com.br>",
      to: email,
      subject: "Código para redefinir sua senha — KA Bijoux",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #d63384;">KA Bijoux</h2>
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <div style="background: #f8f0f5; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Seu código de verificação:</p>
            <p style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #d63384;">${code}</p>
          </div>
          <p style="color: #666; font-size: 14px;">⏱️ Este código expira em <strong>15 minutos</strong>.</p>
          <p style="color: #666; font-size: 14px;">Se você não solicitou a redefinição, ignore este e-mail.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px;">KA Bijoux — Itaúna/MG</p>
        </div>
      `,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const customer = await prisma.customer.findUnique({
      where: { email, active: true },
    });

    // Sempre retorna sucesso para não revelar se o e-mail existe
    if (!customer) return apiSuccess({ message: "Se o e-mail estiver cadastrado, você receberá um código." });

    const code = generateOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordResetCode: code, passwordResetExpires: expires },
    });

    await sendResetEmail(email, customer.name, code);

    return apiSuccess({ message: "Se o e-mail estiver cadastrado, você receberá um código." });
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    console.error("forgot-password error:", e);
    return apiError("Erro interno.", 500);
  }
}
