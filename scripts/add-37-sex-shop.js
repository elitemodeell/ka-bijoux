const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

const CAT_SEX_SHOP = "cat-sex-shop";
const SUB_VIBRADORES = "sub-vibradores";
const SUB_MASTURBADORES = "sub-masturbadores";
const SUB_ANEIS = "sub-aneis";
const SUB_GEIS = "sub-geis";
const SUB_LUBRIFICANTES = "sub-lubrificantes";
const SUB_JOGOS = "cmr6c4ekq000nfu1prqi7msy1";

const PRODUTOS = [
  // ── VIBRADORES PREMIUM ──────────────────────────────────────────────────────
  { slug:"vibrador-premium-1-rosa",     name:"Vibrador Premium 1 - Rosa",     sku:"3104000004915", price:27, stock:5,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-1-rosa-3104000004915.jpg",     desc:"Vibrador premium com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-2-rosa",     name:"Vibrador Premium 2 - Rosa",     sku:"3104000004924", price:27, stock:1,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-2-rosa-3104000004924.jpg",     desc:"Vibrador premium com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-3-rosa",     name:"Vibrador Premium 3 - Rosa",     sku:"3104000004925", price:27, stock:1,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-3-rosa-3104000004925.jpg",     desc:"Vibrador premium com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-5-roxo",     name:"Vibrador Premium 5 - Roxo",     sku:"3104000004927", price:27, stock:1,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-5-roxo-3104000004927.jpg",     desc:"Vibrador premium roxo com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-6-vermelho", name:"Vibrador Premium 6 - Vermelho", sku:"3104000004928", price:27, stock:1,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-6-vermelho-3104000004928.jpg", desc:"Vibrador premium vermelho com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-9-roxo",     name:"Vibrador Premium 9 - Roxo",     sku:"3104000004931", price:27, stock:2,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-9-roxo-3104000004931.jpg",     desc:"Vibrador premium roxo com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-11-roxo",    name:"Vibrador Premium 11 - Roxo",    sku:"3104000004917", price:27, stock:1,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-11-roxo-3104000004917.jpg",    desc:"Vibrador premium roxo com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-14-roxo",    name:"Vibrador Premium 14 - Roxo",    sku:"3104000004920", price:27, stock:1,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-14-roxo-3104000004920.jpg",    desc:"Vibrador premium roxo com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-16-rosa",    name:"Vibrador Premium 16 - Rosa",    sku:"3104000004922", price:27, stock:1,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-16-rosa-3104000004922.jpg",    desc:"Vibrador premium rosa com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-17-roxo",    name:"Vibrador Premium 17 - Roxo",    sku:"3104000004923", price:27, stock:2,  subcat:SUB_VIBRADORES,    img:"vibrador-premium-17-roxo-3104000004923.jpg",    desc:"Vibrador premium roxo com design elegante e vibração intensa. Embalagem discreta." },

  // ── VIBRADORES ──────────────────────────────────────────────────────────────
  { slug:"mini-bullet-duplo-sugador-rosa",    name:"Mini Bullet Duplo Sugador Rosa",    sku:"3104000004757", price:24, stock:6,  subcat:SUB_VIBRADORES, img:"mini-bullet-duplo-sugador-rosa-3104000004757.jpg", desc:"Mini bullet com função sugadora e vibração dupla. Rosa, discreto e potente.", isNew:true },
  { slug:"vibrador-golfinho-sexy",            name:"Vibrador Golfinho Sexy",            sku:"3104000003540", price:12, stock:4,  subcat:SUB_VIBRADORES, img:"vibrador-golfinho-rosa.png",                      desc:"Vibrador modelo golfinho com dupla estimulação e múltiplas velocidades." },
  { slug:"vibrador-sexy-controle-preto",      name:"Vibrador Sexy Controle Preto",      sku:"3104000004756", price:12, stock:3,  subcat:SUB_VIBRADORES, img:"vibrador-sexy-controle-preto-3104000004756.jpg",   desc:"Vibrador com controle remoto, cor preta. Múltiplas vibrações e uso discreto." },
  { slug:"vibrador-sexy-controle-marrom",     name:"Vibrador Sexy Controle Marrom",     sku:"3104000004754", price:12, stock:1,  subcat:SUB_VIBRADORES, img:"vibrador-sexy-controle-marrom-3104000004754.jpg",  desc:"Vibrador com controle remoto, cor marrom. Múltiplas vibrações e uso discreto." },
  { slug:"vibrador-sexy-controle-branco",     name:"Vibrador Sexy Controle Branco",     sku:"3104000004753", price:12, stock:1,  subcat:SUB_VIBRADORES, img:"vibrador-sexy-controle-branco-3104000004753.jpg",  desc:"Vibrador com controle remoto, cor branca. Múltiplas vibrações e uso discreto." },
  { slug:"vibrador-sexy-controle-vermelho",   name:"Vibrador Sexy Controle Vermelho",   sku:"3104000004752", price:12, stock:8,  subcat:SUB_VIBRADORES, img:"vibrador-sexy-controle-vermelho-3104000004752.jpg",desc:"Vibrador com controle remoto, cor vermelha. Múltiplas vibrações e uso discreto." },

  // ── MASTURBADORES EGG ───────────────────────────────────────────────────────
  { slug:"masturbador-egg-laranja-sexy", name:"Masturbador EGG Laranja Sexy", sku:"3104000000801", price:12, stock:13, subcat:SUB_MASTURBADORES, img:"masturbador-egg-laranja-sexy-3104000000801.jpg", desc:"Masturbador EGG laranja com textura interna única para prazer masculino intenso." },
  { slug:"masturbador-egg-rosa-sexy",    name:"Masturbador EGG Rosa Sexy",    sku:"3104000004694", price:12, stock:2,  subcat:SUB_MASTURBADORES, img:"masturbador-egg-rosa-sexy-3104000004694.jpg",    desc:"Masturbador EGG rosa com textura interna única para prazer masculino intenso." },
  { slug:"masturbador-egg-roxo-sexy",    name:"Masturbador EGG Roxo Sexy",    sku:"3104000004695", price:12, stock:7,  subcat:SUB_MASTURBADORES, img:"masturbador-egg-roxo-sexy-3104000004695.jpg",    desc:"Masturbador EGG roxo com textura interna única para prazer masculino intenso." },
  { slug:"masturbador-egg-verde-sexy",   name:"Masturbador EGG Verde Sexy",   sku:"3104000004697", price:12, stock:0,  subcat:SUB_MASTURBADORES, img:"masturbador-egg-verde-sexy-3104000004697.jpg",   desc:"Masturbador EGG verde com textura interna única para prazer masculino intenso." },

  // ── ANÉIS PENIANOS ──────────────────────────────────────────────────────────
  { slug:"anel-peniano-sexy-ursinho-preto",  name:"Anel Peniano Sexy Ursinho Preto",  sku:"3104000004749", price:12, stock:3, subcat:SUB_ANEIS, img:"anel-peniano-sexy-ursinho-preto-3104000004749.jpg",  desc:"Anel peniano modelo ursinho preto. Estimulação para os dois durante o ato." },
  { slug:"anel-peniano-sexy-ursinho-transp", name:"Anel Peniano Sexy Ursinho Transp.", sku:"3104000004748", price:12, stock:3, subcat:SUB_ANEIS, img:"anel-peniano-sexy-ursinho-transp-3104000004748.jpg", desc:"Anel peniano modelo ursinho transparente. Estimulação para os dois durante o ato." },
  { slug:"anel-peniano-sexy-bolinha-rosa",   name:"Anel Peniano Sexy Bolinha Rosa",   sku:"3104000004746", price:12, stock:2, subcat:SUB_ANEIS, img:"anel-peniano-sexy-bolinha-rosa-3104000004746.jpg",   desc:"Anel peniano com bolinhas rosa. Estimulação extra durante o ato." },
  { slug:"anel-peniano-sexy-bolinha-preto",  name:"Anel Peniano Sexy Bolinha Preto",  sku:"3104000004745", price:12, stock:2, subcat:SUB_ANEIS, img:"anel-peniano-sexy-bolinha-preto-3104000004745.jpg",  desc:"Anel peniano com bolinhas preto. Estimulação extra durante o ato." },

  // ── GÉIS & CREMES ───────────────────────────────────────────────────────────
  { slug:"gel-for-sexy-leite-condensado", name:"Gel For Sexy Leite Condensado", sku:"3104000004832", price:12, stock:1,  subcat:SUB_GEIS, img:"gel-for-sexy-leite-condensado-3104000004832.jpg", desc:"Gel comestível sabor leite condensado. Para massagem e beijos apaixonados." },
  { slug:"gel-for-sexy-hot-caramelo",     name:"Gel For Sexy Hot Caramelo",     sku:"3104000004831", price:12, stock:2,  subcat:SUB_GEIS, img:"gel-for-sexy-hot-caramelo-3104000004831.jpg",     desc:"Gel comestível hot sabor caramelo. Gera calor na aplicação. 30ml." },
  { slug:"gel-massagem-sempre-virgem",    name:"Gel Massagem Sempre Virgem",    sku:"3104000004788", price:12, stock:7,  subcat:SUB_GEIS, img:"magic-gel-sempre-virgem-15ml.png",                desc:"Gel adstringente Sempre Virgem para massagem e prazer. Fórmula exclusiva 15ml." },
  { slug:"gel-napepex-sexy",              name:"Gel Napepex Sexy",              sku:"3104000003960", price:12, stock:4,  subcat:SUB_GEIS, img:"napepex-18ml.png",                                 desc:"Gel Napepex estimulante com fórmula exclusiva. Embalagem discreta 18ml." },
  { slug:"gel-sensual-sexy",              name:"Gel Sensual",                   sku:"3104000004720", price:12, stock:6,  subcat:SUB_GEIS, img:"gel-sensual-3104000004720.jpg",                    desc:"Gel sensual para massagem corporal. Fórmula suave e perfumada." },
  { slug:"gel-chines-sexy",               name:"Gel Chinês Sexy",               sku:"3104000004725", price:12, stock:0,  subcat:SUB_GEIS, img:"gel-chines-sexy-3104000004725.jpg",                desc:"Gel estimulante Chinês Sexy com efeito prolongado. Embalagem discreta." },
  { slug:"nabucetao-gel",                 name:"Nabucetão Gel",                 sku:"3104000004716", price:12, stock:2,  subcat:SUB_GEIS, img:"nabucetao-gel-3104000004716.jpg",                  desc:"Gel estimulante Nabucetão com fórmula potente. Embalagem discreta." },

  // ── LUBRIFICANTES ───────────────────────────────────────────────────────────
  { slug:"lub-plus-gel-100ml",       name:"Lub-Plus Gel 100ml",       sku:"3104000004699", price:17, stock:10, subcat:SUB_LUBRIFICANTES, img:"lub-plus-100ml.png",                    desc:"Lubrificante íntimo Lub-Plus 100ml. Fórmula suave, compatível com preservativos." },
  { slug:"lubrificante-intimo-sexy", name:"Lubrificante Íntimo Sexy", sku:"3104000000789", price:12, stock:53, subcat:SUB_LUBRIFICANTES, img:"kit-lubrificantes-intimos-10-sabores.png", desc:"Lubrificante íntimo sexy com fórmula suave e compatível com preservativos." },

  // ── JOGOS ADULTOS ───────────────────────────────────────────────────────────
  { slug:"jogo-seducao-sexy",          name:"Jogo Sedução Sexy",          sku:"3104000004949", price:36, stock:8,  subcat:SUB_JOGOS, img:"jogo-de-seducao-sexy-3104000001671.jpg",       desc:"Jogo de sedução para casais. Desafios picantes e momentos inesquecíveis.", featured:true },
  { slug:"duelo-do-prazer-namoro",     name:"Duelo do Prazer — Namoro",   sku:"3104000004955", price:12, stock:10, subcat:SUB_JOGOS, img:"jogo-duelo-do-prazer-sexy-3104000004391.jpg",  desc:"Duelo do Prazer versão Namoro. Cartas com desafios especiais para casais." },
  { slug:"duelo-do-prazer-fetiches",   name:"Duelo do Prazer — Fetiches", sku:"3104000004954", price:12, stock:7,  subcat:SUB_JOGOS, img:"jogo-duelo-do-prazer-sexy-3104000004391.jpg",  desc:"Duelo do Prazer versão Fetiches. Cartas com desafios ousados para casais." },
  { slug:"duelo-do-prazer-36-posicoes",name:"Duelo do Prazer — 36 Posições",sku:"3104000004953",price:12,stock:3, subcat:SUB_JOGOS, img:"jogo-duelo-do-prazer-sexy-3104000004391.jpg",  desc:"Duelo do Prazer com 36 posições. Cartas para explorar novas posições a dois." },
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
        featured: p.featured || false,
        isNew: p.isNew || false,
        sku: p.sku,
        importSource: "MANUAL",
        publicationStatus: "PUBLISHED",
        categoryId: CAT_SEX_SHOP,
        subcategoryId: p.subcat,
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
