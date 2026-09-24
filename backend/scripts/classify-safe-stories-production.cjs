const {
  ContentClassification,
  DistributionChannel,
  PlayStoreStatus,
  PolicyReviewStatus,
  PrismaClient,
} = require("@prisma/client");

const EXPECTED_GROUP_IDS = [
  "story-novidades",
  "story-promocoes",
  "story-lancamentos",
  "story-clientes",
  "story-ofertas",
];

const EXPECTED_ITEM_IDS = [
  "cmr6c4g5d001qfu1prq5telhl",
  "cmr6c4g5d001rfu1plgopgdfl",
  "cmr6c4gi2001sfu1phw4qixgp",
  "cmr6c4go5001tfu1pghd7krp6",
  "cmr6c4gui001ufu1pzrscva86",
  "cmr6c4h0y001vfu1p2am4bxa1",
];

const prisma = new PrismaClient();

function sameIds(actual, expected) {
  return (
    actual.length === expected.length &&
    [...actual].sort().every((id, index) => id === [...expected].sort()[index])
  );
}

async function main() {
  const [groups, items, store] = await Promise.all([
    prisma.storyGroup.findMany({ select: { id: true } }),
    prisma.storyItem.findMany({ select: { id: true } }),
    prisma.storeSettings.findFirst({ select: { storeName: true } }),
  ]);

  if (!store?.storeName.toLowerCase().includes("ka bijoux")) {
    throw new Error("Banco não identificado como KA Bijoux.");
  }
  if (!sameIds(groups.map(({ id }) => id), EXPECTED_GROUP_IDS)) {
    throw new Error("Conjunto de grupos mudou após a auditoria; classificação abortada.");
  }
  if (!sameIds(items.map(({ id }) => id), EXPECTED_ITEM_IDS)) {
    throw new Error("Conjunto de itens mudou após a auditoria; classificação abortada.");
  }

  const reviewedAt = new Date();
  const common = {
    distributionChannels: [
      DistributionChannel.WEB_FULL,
      DistributionChannel.GOOGLE_PLAY,
      DistributionChannel.ADMIN,
    ],
    playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
    playStoreReviewedAt: reviewedAt,
    playStoreReviewedBy: "codex-policy-audit-2026-07-31",
    playStoreReviewNotes:
      "Conteúdo geral seguro auditado individualmente; sem lingerie, Sex Shop, conteúdo sensual ou link adulto.",
    contentClassification: ContentClassification.GENERAL,
    policyReviewStatus: PolicyReviewStatus.APPROVED,
    policyReviewedAt: reviewedAt,
    policyReviewedBy: "codex-policy-audit-2026-07-31",
    policyReviewNotes:
      "Capas, mídia, texto, CTA e destino revisados para distribuição Google Play.",
  };

  const [updatedGroups, updatedItems] = await prisma.$transaction([
    prisma.storyGroup.updateMany({
      where: { id: { in: EXPECTED_GROUP_IDS } },
      data: common,
    }),
    prisma.storyItem.updateMany({
      where: { id: { in: EXPECTED_ITEM_IDS } },
      data: common,
    }),
  ]);

  const [allowedGroups, allowedItems, eligibleGroups] = await Promise.all([
    prisma.storyGroup.count({ where: { playStoreStatus: PlayStoreStatus.PLAY_ALLOWED } }),
    prisma.storyItem.count({ where: { playStoreStatus: PlayStoreStatus.PLAY_ALLOWED } }),
    prisma.storyGroup.count({
      where: {
        isActive: true,
        distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
        playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
        items: {
          some: {
            isActive: true,
            distributionChannels: { has: DistributionChannel.GOOGLE_PLAY },
            playStoreStatus: PlayStoreStatus.PLAY_ALLOWED,
          },
        },
      },
    }),
  ]);

  console.log(`STORY_GROUPS_CLASSIFIED=${updatedGroups.count}`);
  console.log(`STORY_ITEMS_CLASSIFIED=${updatedItems.count}`);
  console.log(`STORY_GROUPS_ALLOWED=${allowedGroups}`);
  console.log(`STORY_ITEMS_ALLOWED=${allowedItems}`);
  console.log(`STORY_GROUPS_ELIGIBLE=${eligibleGroups}`);
  console.log("CLASSIFICATION=PLAY_ALLOWED");
}

main()
  .catch((error) => {
    console.error(`CLASSIFICATION_ABORTED=${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
