import { NextRequest } from "next/server";
import { z } from "zod";
import { getCustomerFromRequest } from "@/lib/auth";
import { RATE_LIMITS, rateLimit } from "@/lib/ratelimit";
import { isValidStoreVisitorId, setStoreLike, storeLikeState } from "@/lib/store-likes";
import { apiError, apiSuccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  visitorId: z.string().uuid(),
  liked: z.boolean(),
}).strict();

export async function GET(req: NextRequest) {
  try {
    const visitorId = req.headers.get("x-ka-store-visitor");
    if (visitorId && !isValidStoreVisitorId(visitorId)) return apiError("Identificador inválido.", 422);
    const customer = await getCustomerFromRequest(req);
    const limited = await rateLimit(req, RATE_LIMITS.storeLike, customer?.id ?? visitorId ?? undefined);
    if (limited) return limited;
    const ipLimited = await rateLimit(req, RATE_LIMITS.storeLikeIp);
    if (ipLimited) return ipLimited;
    const state = await storeLikeState(visitorId, customer?.id ?? null);
    const response = apiSuccess(state);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return apiError("Não foi possível carregar as curtidas da loja.", 503);
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = updateSchema.parse(await req.json());
    const customer = await getCustomerFromRequest(req);
    const limited = await rateLimit(req, RATE_LIMITS.storeLike, customer?.id ?? input.visitorId);
    if (limited) return limited;
    const ipLimited = await rateLimit(req, RATE_LIMITS.storeLikeIp);
    if (ipLimited) return ipLimited;
    const state = await setStoreLike(input.visitorId, customer?.id ?? null, input.liked);
    const response = apiSuccess({ count: state.count, liked: state.liked });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(error.issues[0].message, 422);
    return apiError("Não foi possível atualizar a curtida da loja.", 503);
  }
}
