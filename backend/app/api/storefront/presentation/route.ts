import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHomePresentation } from "@/lib/home-content";
import { parseHomePresentationSettings } from "@/lib/home-presentation-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findFirst({ select: { homePresentation: true } });
    const presentation = getHomePresentation(
      new Date(),
      parseHomePresentationSettings(settings?.homePresentation),
    );

    return NextResponse.json(
      {
        theme: presentation.theme,
        logoUrl: presentation.logoUrl,
        ambientMusic: presentation.ambientMusic,
      },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar o tema sazonal." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
