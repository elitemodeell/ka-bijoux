import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Endpoint legado preservado apenas para responder de forma explícita.
// Nenhum evento Mercado Pago é autenticado ou processado nesta fase.
export async function POST() {
  return NextResponse.json(
    {
      error: "Integração Mercado Pago desativada. Use o webhook Asaas configurado no backend.",
      code: "PAYMENT_PROVIDER_DISABLED",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    }
  );
}