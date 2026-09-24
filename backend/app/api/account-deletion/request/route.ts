export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import {
  ACCOUNT_DELETION_GENERIC_MESSAGE,
  createAccountDeletionRequest,
  getRequestIp,
  hashAuditValue,
  markDeletionEmailFailed,
  normalizeAccountEmail,
  recordDeletionAudit,
  sendAccountDeletionConfirmation,
} from "@/lib/account-deletion";

const schema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(req: NextRequest) {
  const limitedByIp = await rateLimit(req, RATE_LIMITS.accountDeletionIp);
  if (limitedByIp) return limitedByIp;

  let email: string;
  try {
    email = normalizeAccountEmail(schema.parse(await req.json()).email);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Informe um e-mail válido.", 422);
    }
    return apiError("Solicitação inválida.", 400);
  }

  const limitedByEmail = await rateLimit(
    req,
    RATE_LIMITS.accountDeletionEmail,
    hashAuditValue(email)
  );
  if (limitedByEmail) return limitedByEmail;

  const ip = getRequestIp(req.headers);
  const userAgent = req.headers.get("user-agent");

  try {
    const customer = await prisma.customer.findUnique({
      where: { email, active: true },
      select: { id: true, email: true },
    });

    if (!customer) {
      await recordDeletionAudit({
        event: "REQUEST_RECEIVED",
        outcome: "NO_ACTIVE_ACCOUNT",
        email,
        ip,
        userAgent,
      });
      return apiSuccess({ message: ACCOUNT_DELETION_GENERIC_MESSAGE });
    }

    const request = await createAccountDeletionRequest({
      customerId: customer.id,
      email: customer.email,
      ip,
      userAgent,
    });

    let sent = false;
    try {
      sent = await sendAccountDeletionConfirmation({
        requestId: request.requestId,
        email: customer.email,
        token: request.token,
        expiresAt: request.expiresAt,
      });
    } catch {
      sent = false;
    }
    if (!sent) await markDeletionEmailFailed(request.requestId);

    return apiSuccess({ message: ACCOUNT_DELETION_GENERIC_MESSAGE });
  } catch {
    console.error("account-deletion request failed");
    return apiSuccess({ message: ACCOUNT_DELETION_GENERIC_MESSAGE });
  }
}
