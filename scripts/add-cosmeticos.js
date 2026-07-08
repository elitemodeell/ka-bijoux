const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

const CAT = "cat-maquiagem";

const PRODUTOS = [
  {
    slug: "oleo-cuticula-hello-mini",
    name: "Óleo Hidratante de Cutícula Hello Mini",
    sku: "3104000004669",
    price: 12,
    stock: 8,
    img: "oleo-cuticula-hello-mini-3104000004669.png",
    desc: "Óleo hidratante de cutícula Hello Mini 15ml. Disponível nas fragrâncias Jasmine, Rose, Lavender e Orange. Hidrata as cutículas, cuidado diário, toque suave.",
  },
  {
    slug: "progressiva-chuveiro-sache-sis",
    name: "Progressiva de Chuveiro Sachê SIS",
    sku: "3104000004666",
    price: 6,
    stock: 21,
    img: "progressiva-chuveiro-sache-3104000004666.png",
    desc: "Progressiva de chuveiro SIS Cosméticos em sachê 25g. Sem formol, fórmula vegana com FrutoCiv e vitaminas. Uso instantâneo, combate o frizz.",
  },
  {
    slug: "algodao-demaquilante-miamake",
    name: "Algodão Demaquilante Mia Make",
    sku: "3104000004667",
    price: 12,
    stock: 12,
    img: "algodao-demaquilante-miamake-3104000004667.png",
    desc: "Algodão demaquilante Mia Make com 40 unidades (70g). Toque macio, limpeza suave, remove a maquiagem com facilidade. Uso diário.",
  },
  {
    slug: "bobbi-cuidados-delicados",
    name: "Bobbi Cuidados Delicados",
    sku: "SKU-BOBBI-CUIDADOS",
    price: 12,
    stock: 5,
    img: "bobbi-cuidados-delicados.png",
    desc: "Creme Bobbi Cuidados Delicados. Visual delicado, toque suave, rotina de autocuidado. Um toque encantador na sua rotina.",
  },
  {
    slug: "creme-facial-q10-sis",
    name: "Creme Facial Diurno Q10 SIS",
    sku: "SKU-Q10-SIS",
    price: 12,
    stock: 5,
    img: "creme-facial-q10-sis.png",
    desc: "Creme Facial Diurno Q10 + Lipossomas SIS Make-Up 55ml. Hidratação diária, nutre a pele, aparência luminosa. Para todos os tipos de pele.",
  },
];

async function main() {
  let inseridos = 0;
  let pulados = 0;

  for (const p of PRODUTOS) {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ slug: p.slug }, { sku: p.sku }] }
    });

    if (existing) {
      console.log(`⟳  já existe: ${p.name}`);
      pulados++;
      continue;
    }

    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.desc,
        price: p.price,
        stock: p.stock,
        minStock: 2,
        weight: 0.1,
        height: 5,
        width: 5,
        length: 10,
        active: true,
        featured: false,
        isNew: false,
        sku: p.sku,
        importSource: "MANUAL",
        publicationStatus: "PUBLISHED",
        categoryId: CAT,
        images: {
          create: {
            url: `/uploads/products/${p.img}`,
            alt: p.name,
            order: 0,
          }
        }
      }
    });

    console.log(`✓  ${p.name}`);
    inseridos++;
  }

  console.log(`\nPronto! ${inseridos} inseridos, ${pulados} já existiam.`);
}

main()
  .catch(e => { console.error("ERRO:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
