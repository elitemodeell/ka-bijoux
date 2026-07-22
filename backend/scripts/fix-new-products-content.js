const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const GENERIC_TERMS = [
  "informacoes tecnicas pendentes",
  "informações técnicas pendentes",
  "produto ka bijoux com nome",
  "foi escolhido para a vitrine ka bijoux",
  "foi selecionado para a vitrine ka bijoux",
  "proposta pratica e versatil",
  "proposta prática e versátil",
  "uma opcao para complementar sua rotina",
  "uma opção para complementar sua rotina",
];

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isGenericText(value) {
  const normalized = normalize(value);
  return !normalized || GENERIC_TERMS.some((term) => normalized.includes(normalize(term)));
}

function isGenericProduct(product) {
  return isGenericText(product.description);
}

function extractColor(name) {
  const normalized = normalize(name);
  const colors = [
    [/\bazul\b/, "azul"],
    [/\bvermelh[oa]\b/, "vermelha"],
    [/\bverde\b/, "verde"],
    [/\brox[oa]\b/, "roxa"],
    [/\bpreto\b/, "preta"],
    [/\bbranc[oa]\b/, "branca"],
    [/\brosa\b/, "rosa"],
    [/\bdourad[oa]\b/, "dourada"],
    [/\bpratead[oa]\b/, "prateada"],
  ];
  return colors.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function extractPhoneModel(name) {
  const normalized = normalize(name);
  const match =
    normalized.match(/\bip\s*(\d{1,2})\s*(pro max|pro|plus)?\b/) ??
    normalized.match(/\biphone\s*(\d{1,2})\s*(pro max|pro|plus)?\b/);
  if (match) {
    const suffix = match[2] ? ` ${match[2].replace(/\b\w/g, (letter) => letter.toUpperCase())}` : "";
    return `iPhone ${match[1]}${suffix}`;
  }
  if (/\bip\s*xr\b|\biphone\s*xr\b/.test(normalized)) return "iPhone XR";
  return null;
}

function powerFromName(name) {
  return name.match(/\b\d+\s*w\b/i)?.[0]?.toUpperCase().replace(/\s+/g, "") ?? null;
}

function inferCategorySlug(name) {
  const n = normalize(name);
  if (/\b(caneta|caderno|lapis|papel|estojo)\b/.test(n)) return "papelaria";
  if (/\b(placa|decor|quadro|porta retrato|flor|vaso)\b/.test(n)) return "decoracao";
  if (/\b(controle|smart tv|ar condic)\b/.test(n)) return "utilidades-domesticas";
  if (/\b(case|capinha|capa|silicone|iphone|ip\s*(?:xr|\d{1,2}\s*(?:pro\s*max|pro|max|plus)?)|pelicula|pelic|carregador|carreg|fonte|fone|headphone|cabo|usb|tipo c|type c|v8|micro usb|adaptador|conversor|smartwatch|smart watch|suporte p celular|suporte para celular|ventosa p celular|ventosa para celular|pulseira de celular|corda de celular|cordao de celular|fita salva celular|sim card|tag rastreadora|pen drive)\b/.test(n)) {
    return "capinhas-acessorios-celular";
  }
  if (/\b(brinco|colar|pulseira|bracelete|broche|anel|pingente|argola)\b/.test(n)) return "bijuterias";
  return null;
}

function buildDescription(name, categoryName) {
  const n = normalize(`${name} ${categoryName}`);
  const color = extractColor(name);
  const colorText = color ? ` na cor ${color}` : "";
  const model = extractPhoneModel(name);
  const power = powerFromName(name);

  if (/\b(case|capinha|capa|silicone|iphone|ip\s*\d+|ip\s*xr)\b/.test(n)) {
    const modelText = model ? ` para ${model}` : "";
    return `${name} é uma capa para celular${modelText}${colorText}, indicada para proteger o aparelho no uso diário e renovar o visual. Verifique o modelo do celular antes da compra para garantir o encaixe correto.`;
  }
  if (/\b(pelicula|pelic)\b/.test(n)) {
    const modelText = model ? ` para ${model}` : "";
    return `${name} é um acessório de proteção${modelText}, pensado para ajudar a preservar a área indicada no próprio nome do produto. Confirme o modelo do aparelho antes da compra e aplique com a superfície limpa e seca.`;
  }
  if (/\b(cabo|fonte|carregador|adaptador|conversor|usb|tipo c|type c|v8|micro usb)\b/.test(n)) {
    const powerText = power ? ` com potência informada de ${power}` : "";
    return `${name} é um acessório de carregamento ou conexão${powerText}, útil para o dia a dia, trabalho e viagens. Antes de usar, confira se o conector é compatível com o seu aparelho e evite forçar encaixes.`;
  }
  if (/\b(fone|headphone|bluetooth|p1|p2)\b/.test(n)) {
    return `${name} é um acessório de áudio para ouvir músicas, vídeos e chamadas no dia a dia. Confira o tipo de conexão indicado no nome do produto e mantenha o item protegido de umidade, quedas e calor excessivo.`;
  }
  if (/\b(smartwatch|smart watch|pulseira smart)\b/.test(n)) {
    return `${name} é uma pulseira para smartwatch pensada para trocar o visual do relógio inteligente com praticidade. A compatibilidade depende do modelo e do encaixe do aparelho, por isso confira as medidas antes da compra.`;
  }
  if (/\b(suporte|ventosa|fita salva celular|pulseira de celular|corda de celular|cordao de celular)\b/.test(n)) {
    return `${name} é um acessório para celular feito para facilitar o uso, transporte ou apoio do aparelho na rotina. Use conforme a finalidade indicada no nome do produto e confira o encaixe antes de utilizar.`;
  }
  if (/\b(controle|controle universal|smart tv|ar condic)\b/.test(n)) {
    return `${name} é um controle de reposição ou uso complementar para aparelhos compatíveis. Confira a aplicação indicada no nome do produto e teste as funções básicas após configurar ou inserir as pilhas adequadas.`;
  }
  if (/\b(caneta|caderno|lapis|papel|estojo)\b/.test(n)) {
    return `${name} é um item de papelaria para apoiar tarefas do dia a dia, estudos ou organização. Guarde em local seco e utilize conforme a função indicada no próprio produto.`;
  }
  if (/\b(placa|decor|quadro|porta retrato|flor|vaso)\b/.test(n)) {
    return `${name} é um item decorativo para compor ambientes, vitrines ou espaços de uso diário. Posicione em local adequado e evite exposição a umidade ou calor excessivo.`;
  }
  if (/\b(brinco|colar|pulseira|bracelete|broche|anel|pingente|argola)\b/.test(n)) {
    return `${name} é um acessório para complementar o visual em produções casuais ou especiais. Para conservar melhor, evite contato com água, perfumes, cremes e produtos químicos.`;
  }
  return `${name} é um produto para uso diário com proposta funcional e visual alinhado ao cadastro atual. Confira nome, fotos, preço e categoria antes da compra para confirmar se atende ao que você precisa.`;
}

function buildBenefits(name) {
  const n = normalize(name);
  if (/\b(case|capinha|capa|silicone|iphone|ip\s*\d+|ip\s*xr|pelicula|pelic)\b/.test(n)) {
    return "Ajuda a proteger o aparelho no uso diário, facilita a identificação do modelo pela foto e deixa o visual do celular mais organizado.";
  }
  if (/\b(cabo|fonte|carregador|adaptador|conversor|usb|tipo c|type c|v8|micro usb)\b/.test(n)) {
    return "Facilita a rotina de carregamento ou conexão, é simples de transportar e ajuda a manter um acessório reserva sempre à mão.";
  }
  if (/\b(fone|headphone|bluetooth|p1|p2)\b/.test(n)) {
    return "Ajuda a ouvir conteúdos e atender chamadas com mais praticidade, conforme o tipo de conexão indicado no produto.";
  }
  if (/\b(suporte|ventosa|fita salva celular|pulseira de celular|corda de celular|cordao de celular|smartwatch|smart watch)\b/.test(n)) {
    return "Traz mais praticidade no manuseio, transporte ou personalização do aparelho, com uso simples no dia a dia.";
  }
  return "Produto com uso simples, cadastro revisado e foto real vinculada ao item.";
}

function buildHowToUse(name) {
  const n = normalize(name);
  if (/\b(case|capinha|capa|silicone|iphone|ip\s*\d+|ip\s*xr)\b/.test(n)) {
    return "Confira o modelo do celular, alinhe os recortes da capa e encaixe sem forçar botões, câmera ou conectores.";
  }
  if (/\b(pelicula|pelic)\b/.test(n)) {
    return "Limpe bem a superfície, alinhe a película com cuidado e pressione levemente para fixar, seguindo as instruções da embalagem.";
  }
  if (/\b(cabo|fonte|carregador|adaptador|conversor|usb|tipo c|type c|v8|micro usb)\b/.test(n)) {
    return "Conecte ao aparelho compatível sem forçar o encaixe. Desconecte puxando pelo conector, não pelo cabo.";
  }
  if (/\b(fone|headphone|bluetooth|p1|p2)\b/.test(n)) {
    return "Conecte ou pareie conforme o tipo do produto e ajuste o volume em nível confortável.";
  }
  if (/\b(suporte|ventosa|fita salva celular|pulseira de celular|corda de celular|cordao de celular|smartwatch|smart watch)\b/.test(n)) {
    return "Instale conforme o encaixe do produto e confira se ficou firme antes de usar no dia a dia.";
  }
  return "Use conforme a função indicada no nome e nas fotos do produto, mantendo o item limpo e bem armazenado.";
}

function buildCare(name) {
  const n = normalize(name);
  if (/\b(cabo|fonte|carregador|adaptador|conversor|usb|tipo c|type c|v8|micro usb|fone|bluetooth|controle|smart tv|ar condic|pen drive|tag rastreadora)\b/.test(n)) {
    return "Evite contato com água, quedas, calor excessivo e uso com conectores danificados. Guarde em local seco.";
  }
  if (/\b(brinco|colar|pulseira|bracelete|broche|anel|pingente|argola)\b/.test(n)) {
    return "Evite contato com água, perfumes, cremes e produtos químicos. Guarde separado para preservar o acabamento.";
  }
  return "Mantenha em local seco, limpo e protegido de calor excessivo. Limpe suavemente quando necessário.";
}

function buildPackageContents(name) {
  return `1 unidade de ${name.toLowerCase()}.`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  const products = await prisma.product.findMany({
    where: {
      active: true,
      images: { some: { url: { contains: "/produtos-novos/" } } },
    },
    include: { category: true, images: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const updates = [];
  for (const product of products) {
    const data = {};
    if (isGenericProduct(product)) {
      data.description = buildDescription(product.name, product.category?.name ?? "");
      data.benefits = buildBenefits(product.name);
      data.howToUse = buildHowToUse(product.name);
      data.careInstructions = buildCare(product.name);
      if (isGenericText(product.packageContents)) data.packageContents = buildPackageContents(product.name);
    }

    const inferredSlug = inferCategorySlug(product.name);
    if (inferredSlug && inferredSlug !== product.category?.slug && categoryBySlug.has(inferredSlug)) {
      data.categoryId = categoryBySlug.get(inferredSlug);
      data.subcategoryId = null;
      data.searchTags = Array.from(new Set([...(product.searchTags ?? []), inferredSlug]));
    }

    if (Object.keys(data).length) {
      updates.push({ product, data });
      if (apply) await prisma.product.update({ where: { id: product.id }, data });
    }
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    scanned: products.length,
    updates: updates.length,
    descriptionUpdates: updates.filter((item) => "description" in item.data).length,
    categoryUpdates: updates.filter((item) => "categoryId" in item.data).length,
    items: updates.map(({ product, data }) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      fromCategory: product.category?.slug,
      toCategoryId: data.categoryId ?? null,
      changedDescription: "description" in data,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
