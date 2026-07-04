const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "reports/product-image-review/applied-platform-images.csv");
const OUTPUT = path.join(ROOT, "backend/data/product-content-overrides.json");
const REPORT = path.join(ROOT, "reports/product-image-review/mass-content-summary.csv");

const SOURCES = {
  winter: [
    "https://laveries-speed-queen.fr/pt/blog/lavar-cachecol-lenco/",
    "https://www.mariantonia.com.br/acessorios-femininos/lencos-e-echarpes/lenco-cachecol-xadrez-feminino-azul-marinho-e-bege",
  ],
  phoneCase: [
    "https://support.apple.com/en-us/122208",
    "https://www.apple.com/shop/product/md3n4zm/a/iphone-16e-silicone-case-black",
    "https://support.apple.com/en-us/103258",
  ],
  adult: [
    "https://www.plannedparenthood.org/learn/sex-pleasure-and-sexual-dysfunction/sex-and-pleasure/sex-toys",
    "https://www.nhs.uk/live-well/sexual-health/sexual-health-for-lesbian-and-bisexual-women/",
    "https://www.cdc.gov/condom-use/index.html",
  ],
  cosmetic: [
    "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2015/rdc0015_24_04_2015.pdf",
    "https://www.fda.gov/cosmetics/cosmetics-labeling-regulations/cosmetics-labeling-guide",
  ],
  havaianas: [
    "https://havaianas.com.br/pages/ajuda-como-limpar-suas-havaianas",
    "https://www.havaianas-store.com/gb/en/about-product-help.html",
  ],
  generic: [
    "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2015/rdc0015_24_04_2015.pdf",
  ],
};

function splitCsv(line) {
  const out = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ";" && !quoted) {
      out.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  out.push(value);
  return out;
}

function readRows() {
  const lines = fs.readFileSync(INPUT, "utf8").trim().split(/\r?\n/);
  const header = splitCsv(lines[0]);
  return lines.slice(1).map((line) => {
    const parts = splitCsv(line);
    return Object.fromEntries(header.map((key, index) => [key, parts[index] ?? ""]));
  });
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  const keepUpper = new Set(["KA", "IP", "MIAMAKE"]);
  return String(value || "")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase())
    .replace(/\bDo\b/g, "do")
    .replace(/\bDa\b/g, "da")
    .replace(/\bDe\b/g, "de")
    .replace(/\bDas\b/g, "das")
    .replace(/\bDos\b/g, "dos")
    .replace(/\bCom\b/g, "com")
    .replace(/\bPara\b/g, "para")
    .replace(/\bE\b/g, "e")
    .split(" ")
    .map((word) => (keepUpper.has(word.toUpperCase()) ? word.toUpperCase() : word))
    .join(" ");
}

function colorFrom(row) {
  if (row.color) return titleCase(row.color);
  const n = normalize(row.productName);
  const colors = [
    ["branco", "Branco"],
    ["branca", "Branca"],
    ["rosa", "Rosa"],
    ["vermelho", "Vermelho"],
    ["vermelha", "Vermelha"],
    ["preto", "Preto"],
    ["preta", "Preta"],
    ["marrom", "Marrom"],
    ["roxo", "Roxo"],
    ["roxa", "Roxa"],
    ["verde", "Verde"],
    ["prata", "Prata"],
    ["transp", "Transparente"],
    ["onca", "Onça"],
  ];
  return colors.find(([token]) => n.includes(token))?.[1] ?? "";
}

function isAdult(row) {
  const n = normalize(`${row.productName} ${row.category} ${row.subcategory}`);
  return /adulto|sexy|vibrador|bullet|peniano|dedeira|algema|gel sensual|gel chines|masturbador|dessensibilizante|nabucet|bumbum|pau erguido/.test(n);
}

function sourceType(row) {
  const n = normalize(`${row.productName} ${row.category}`);
  if (/cachecol/.test(n)) return "winter";
  if (/case ip|iphone|capinha|capa/.test(n)) return "phoneCase";
  if (isAdult(row)) return "adult";
  if (/oleo|cuticula|blush|demaquilante|progressiva|creme facial|maquiagem|perfumaria|carimbo de francesinha/.test(n)) return "cosmetic";
  if (/havaianas/.test(n)) return "havaianas";
  return "generic";
}

function displayName(row) {
  const raw = row.productName;
  const n = normalize(raw);
  const color = colorFrom(row);

  const exact = new Map([
    ["cachecol xadrez", "Cachecol Xadrez de Inverno"],
    ["cachecol liso pompom", "Cachecol Liso com Pompom"],
    ["cachecol xadrez premium", "Cachecol Xadrez Premium"],
    ["cachecol liso", "Cachecol Liso de Inverno"],
    ["mini bullet duplo linguinha roxo", "Mini Bullet Duplo Linguinha - Roxo"],
    ["mini vibrador sexy", "Mini Vibrador Sexy"],
    ["algema prata tradicional", "Algema Tradicional Prata"],
    ["conjunto colar brinco brasil", "Conjunto Colar e Brinco Brasil"],
    ["pulseira missanga do brasil", "Pulseira Miçanga do Brasil"],
    ["gel chines sexy", "Gel Chinês Sexy"],
    ["pau erguido sexy", "Gel Pau Erguido Sexy"],
    ["gel sensual", "Gel Sensual"],
    ["mais bumbum gel", "Mais Bumbum Gel"],
    ["nabucetao gel", "Nabucetão Gel"],
    ["masturbador egg verde sexy", "Masturbador Egg Verde Sexy"],
    ["creme dessensibilizante", "Creme Dessensibilizante"],
    ["creme multifuncoes sexy", "Creme Multifunções Sexy"],
    ["creme feminino sexy", "Creme Feminino Sexy"],
    ["bota de chuva para tenis", "Bota de Chuva para Tênis"],
    ["laco brasil", "Laço Brasil"],
    ["vale presente 50 00", "Vale-Presente KA Bijoux - R$ 50"],
    ["vale presente 100 00", "Vale-Presente KA Bijoux - R$ 100"],
    ["vale presente 200 00", "Vale-Presente KA Bijoux - R$ 200"],
    ["tapete escorredor de copos", "Tapete Escorredor de Copos"],
    ["calcinha com cinta", "Calcinha com Cinta"],
    ["vaso decorativo 60 00", "Vaso Decorativo - Modelo 60"],
    ["vaso decorativo 72 00", "Vaso Decorativo - Modelo 72"],
    ["chinelo havaianas branca", "Chinelo Havaianas Branco"],
    ["chinelo de time", "Chinelo de Time"],
    ["colar couro comprido", "Colar de Couro Comprido"],
    ["escova eletrica de dente", "Escova Elétrica de Dente"],
    ["escova finalizadora para cabelo", "Escova Finalizadora para Cabelo"],
    ["pente airbag massage comb", "Pente Airbag Massage Comb"],
    ["pulseira casal", "Pulseira Casal"],
    ["oleo hidratante de cuticula", "Óleo Hidratante de Cutícula"],
    ["blush bobbi rara", "Blush Bobbi Rara"],
    ["algodao demaquilante miamake", "Algodão Demaquilante Miamake"],
    ["progressiva de chuveiro sache", "Progressiva de Chuveiro Sachê"],
    ["creme facial noturno", "Creme Facial Noturno"],
  ]);
  if (exact.has(n)) return exact.get(n);

  if (n.startsWith("case ip 16e")) return `Capa Case para iPhone 16e${color ? ` - ${color}` : ""}`;
  if (n.startsWith("vibrador sexy controle")) return `Vibrador Sexy com Controle${color ? ` - ${color}` : ""}`;
  if (n.includes("anel peniano sexy ursinho")) return `Anel Peniano Sexy Ursinho${color ? ` - ${color}` : ""}`;
  if (n.includes("anel peniano sexy bolinha")) return `Anel Peniano Sexy Bolinha${color ? ` - ${color}` : ""}`;
  if (n.includes("dedeira com textura sexy")) return `Dedeira com Textura Sexy${color ? ` - ${color}` : ""}`;
  if (n.includes("anel peniano") && n.includes("orelha")) return `Anel Peniano com Orelhinha${color ? ` - ${color}` : ""}`;
  if (n.startsWith("algema") && n.includes("veludo")) return `Algema de Veludo${color ? ` - ${color}` : ""}`;
  if (n.includes("broche do brasil")) return "Broche do Brasil";
  if (n.includes("bracelete do brasil")) return "Bracelete do Brasil";
  if (n.includes("faixa brasil")) return "Faixa Brasil";
  if (n.includes("adesivo brasil")) return "Adesivo Brasil";
  if (n.includes("pulseira premium")) return "Pulseira Premium";

  return titleCase(raw.replace(/\s*Cor:/i, " - "));
}

function categoryName(row) {
  if (isAdult(row)) return "Linha Adulto";
  if (/case ip|iphone/i.test(row.productName)) return "Capinhas e Acessórios de Celular";
  if (/cachecol/i.test(row.productName)) return "Acessórios de Inverno";
  if (/calcinha/i.test(row.productName)) return "Lingerie";
  if (/blush|maquiagem/i.test(row.productName)) return "Maquiagem";
  if (/oleo|cuticula|creme facial/i.test(row.productName)) return "Perfumaria";
  return row.category || "KA Bijoux";
}

function subcategoryName(row) {
  const n = normalize(row.productName);
  if (!isAdult(row)) return row.subcategory || "";
  if (/vibrador|bullet/.test(n)) return "Vibradores";
  if (/anel|dedeira/.test(n)) return "Anéis Penianos";
  if (/masturbador|egg/.test(n)) return "Masturbadores";
  if (/algema/.test(n)) return "Acessórios Adultos";
  return "Géis & Cremes";
}

function packageContents(row, name) {
  const n = normalize(row.productName);
  if (/conjunto colar/.test(n)) return "1 conjunto com colar e brinco.";
  if (/vale presente/.test(n)) return "1 vale-presente KA Bijoux no valor indicado.";
  if (/cesta/.test(n)) return "1 cesta presente conforme composicao cadastrada e imagem do produto.";
  if (/case ip|iphone/.test(n)) return `1 capa case para ${name.includes("iPhone") ? "iPhone 16e" : "celular"}.`;
  if (/algodao/.test(n)) return "1 embalagem de algodão demaquilante.";
  if (/progressiva|sache/.test(n)) return "1 sachê.";
  if (/blush|oleo|creme|gel|pau erguido|bumbum|nabucet/.test(n)) return "1 unidade do produto.";
  return `1 ${name.toLowerCase()}.`;
}

function baseDetails(row, name, adult) {
  const details = ["Marca: KA Bijoux"];
  const color = colorFrom(row);
  if (row.sku) details.push(`SKU: ${row.sku}`);
  if (color) details.push(`Cor/modelo: ${color}`);
  if (row.flavor) details.push(`Aroma/sabor: ${titleCase(row.flavor)}`);
  details.push(`Conteúdo: ${packageContents(row, name).replace(/\.$/, "")}`);
  details.push(`Uso adulto: ${adult ? "Sim" : "Não"}`);
  return details;
}

function contentFor(row) {
  const name = displayName(row);
  const n = normalize(row.productName);
  const adult = isAdult(row);
  const srcType = sourceType(row);
  const details = baseDetails(row, name, adult);

  const common = {
    blingId: row.blingId || null,
    sku: row.sku || null,
    name: row.productName,
    displayName: name,
    isAdult: adult,
    categoryName: categoryName(row),
    subcategoryName: subcategoryName(row),
    price: row.price,
    stock: row.stock,
    imageFile: row.finalFileName,
    platformUrl: row.platformUrl,
    researchStatus: "pesquisa_aplicada_em_massa",
    researchSources: SOURCES[srcType],
    composition: null,
    packageContents: packageContents(row, name),
    seoTitle: `${name} | KA Bijoux`,
    seoDescription: "",
    seoKeywords: [],
    seoSlug: slugify(name),
  };

  if (/cachecol/.test(n)) {
    const isPremium = /premium/.test(n);
    const hasPompom = /pompom/.test(n);
    const isXadrez = /xadrez/.test(n);
    return finish(common, {
      shortDescription: `${name} para aquecer e completar looks de inverno com ${isXadrez ? "estampa clássica" : hasPompom ? "toque charmoso" : "visual versátil"}.`,
      longDescription: `${name} é uma peça prática para dias frios e combina bem com casacos, malhas e produções casuais. ${isXadrez ? "A padronagem xadrez traz um visual atemporal e fácil de coordenar." : hasPompom ? "O detalhe de pompom deixa o acessório mais delicado e especial." : "O design liso facilita combinações com diferentes cores e estilos."} ${isPremium ? "A proposta premium valoriza o acabamento do look sem perder conforto." : "É uma escolha simples para adicionar aconchego e estilo ao dia a dia."}`,
      details: [...details, "Indicação: looks de inverno e meia-estação"],
      benefits: "Ajuda a proteger do frio leve a moderado e adiciona acabamento estiloso ao visual.",
      howToUse: "Use ao redor do pescoço, ajustando a dobra e o caimento conforme o conforto desejado. Pode ser usado solto, com volta simples ou combinado com casacos.",
      careInstructions: "Verifique a etiqueta antes da lavagem. Em geral, cachecóis e lenços pedem lavagem delicada, água fria ou até 30 graus, sem alvejante, sem torção forte e com secagem à sombra.",
      keywords: ["cachecol", "inverno", "acessório de inverno", "KA Bijoux"],
    });
  }

  if (/case ip|iphone/.test(n)) {
    const color = colorFrom(row);
    return finish(common, {
      shortDescription: `${name} com encaixe prático e visual ${color ? color.toLowerCase() : "moderno"} para proteger o celular no dia a dia.`,
      longDescription: `${name} é uma opção prática para proteger e renovar o visual do aparelho. O cadastro indica compatibilidade com IP 16E/iPhone 16e, modelo com tela de 6,1 polegadas segundo a ficha técnica da Apple. A capa ajuda a reduzir riscos e marcas de uso na parte externa do celular, mantendo a proposta de encaixe simples para a rotina.`,
      details: [...details, "Modelo compatível: IP 16E / iPhone 16e conforme cadastro", "Indicação: proteção contra riscos leves e marcas de uso"],
      benefits: "Ajuda a preservar o acabamento do celular, melhora a pegada e adiciona cor ao aparelho.",
      howToUse: "Encaixe primeiro um dos cantos do celular e ajuste os demais com cuidado, conferindo se botões, câmera e conexões ficaram alinhados. Para remover, solte um canto por vez sem forçar o aparelho.",
      careInstructions: "Retire o celular antes da limpeza. Use pano macio, levemente umedecido e sem fiapos para limpar dentro e fora. Evite abrasivos, solventes, amônia, aerossol, alvejante ou produtos com peróxido de hidrogênio.",
      keywords: ["capa iPhone 16e", "case IP 16E", "capinha para celular", "KA Bijoux"],
    });
  }

  if (/vibrador|bullet|masturbador|anel peniano|dedeira/.test(n)) {
    const isToy = /vibrador|bullet|masturbador/.test(n);
    return finish(common, {
      shortDescription: `${name} é um acessório adulto discreto para momentos íntimos com cuidado e conforto.`,
      longDescription: `${name} faz parte da Linha Adulto KA Bijoux e foi selecionado para quem busca um item íntimo de uso pessoal, com apresentação discreta e proposta prática. O produto deve ser usado com calma, respeito ao próprio conforto e atenção às orientações da embalagem. Para acessórios íntimos, a higienização correta antes e depois do uso é essencial para preservar o produto e a experiência.`,
      details: [...details, `Indicação: ${isToy ? "exploração de sensações em uso adulto" : "acessório íntimo para uso adulto"}`],
      benefits: "Produto discreto, fácil de guardar e pensado para uso adulto com cuidado e privacidade.",
      howToUse: isToy
        ? "Higienize antes e depois do uso. Use somente conforme a embalagem, comece de forma gradual e interrompa se houver desconforto. Quando precisar de lubrificante, prefira produto à base de água e confirme a compatibilidade no rótulo."
        : "Higienize antes e depois do uso. Posicione com cuidado, sem apertar excessivamente, e remova imediatamente em caso de desconforto, dor, dormência ou irritação.",
      careInstructions: "Produto destinado a maiores de 18 anos. Não compartilhe sem higienização adequada. Guarde em local limpo, seco e protegido. Não mergulhe acessórios com partes elétricas, pilhas ou bateria, a menos que a embalagem informe que isso é permitido.",
      keywords: ["linha adulto", "acessório íntimo", "produto adulto", "KA Bijoux"],
    });
  }

  if (/algema/.test(n)) {
    return finish(common, {
      shortDescription: `${name} é um acessório adulto para compor momentos a dois com discrição e cuidado.`,
      longDescription: `${name} faz parte da Linha Adulto KA Bijoux e foi escolhido para quem busca um acessório de uso adulto com visual marcante. O uso deve ser sempre consensual, confortável e atento aos limites de cada pessoa. Mantenha a chave ou mecanismo de abertura sempre acessível e evite qualquer aperto excessivo.`,
      details: [...details, "Indicação: acessório adulto para momentos consensuais"],
      benefits: "Complementa a experiência adulta com apresentação discreta e proposta lúdica.",
      howToUse: "Use apenas com consentimento. Ajuste sem apertar demais e mantenha a chave ou trava de abertura ao alcance durante todo o uso. Interrompa imediatamente em caso de dor, formigamento ou desconforto.",
      careInstructions: "Produto destinado a maiores de 18 anos. Limpe com pano macio após o uso e guarde em local seco. Não utilize para imobilização forte, suspensão ou qualquer prática que possa causar lesão.",
      keywords: ["algema adulta", "linha adulto", "acessório adulto", "KA Bijoux"],
    });
  }

  if (/gel|creme dessensibilizante|creme multifuncoes|creme feminino|pau erguido|bumbum|nabucet/.test(n)) {
    return finish(common, {
      shortDescription: `${name} é um produto adulto de uso íntimo, com proposta discreta para cuidados e momentos especiais.`,
      longDescription: `${name} integra a Linha Adulto KA Bijoux e deve ser utilizado de forma responsável, seguindo sempre as instruções do rótulo. Como produtos íntimos podem variar em composição e indicação, o uso deve respeitar a região recomendada pelo fabricante, sem promessas de efeito garantido. Aplique com cuidado e suspenda em caso de irritação ou desconforto.`,
      details: [...details, "Indicação: uso adulto conforme rótulo do fabricante"],
      benefits: "Opção discreta para uso adulto, com embalagem prática e texto seguro para orientar a compra.",
      howToUse: "Leia o rótulo antes de usar. Aplique pequena quantidade somente na região indicada pelo fabricante. Evite contato com olhos, pele irritada ou lesionada e não ingira. Se for usar com preservativo, confirme a compatibilidade no rótulo.",
      careInstructions: "Produto destinado a maiores de 18 anos. Manter fora do alcance de crianças. Guardar em local seco, fresco e protegido de calor. Suspender o uso em caso de ardência persistente, alergia, irritação ou desconforto.",
      keywords: ["gel adulto", "produto íntimo adulto", "linha adulto", "KA Bijoux"],
    });
  }

  if (/brasil|broche|bracelete|pulseira|colar|laco|faixa|adesivo|conjunto/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para completar o visual com charme, cor e identidade brasileira.`,
      longDescription: `${name} é uma peça versátil para dar destaque ao look em eventos, festas, torcida e produções casuais. O visual inspirado no Brasil combina com composições alegres e pode ser usado como detalhe principal ou complemento de outros acessórios.`,
      details: [...details, "Indicação: looks temáticos, festas, torcida e uso casual"],
      benefits: "Adiciona cor e personalidade ao visual com uma peça fácil de combinar.",
      howToUse: "Use como complemento do look, combinando com roupas e acessórios de cores semelhantes ou neutras. Evite puxar, dobrar excessivamente ou prender em superfícies ásperas.",
      careInstructions: "Guarde em local seco e separado de peças que possam riscar ou puxar o acabamento. Evite contato com água, perfume, creme e produtos químicos para preservar o brilho e as cores.",
      keywords: ["acessório Brasil", "bijuteria", "look temático", "KA Bijoux"],
    });
  }

  if (/pulseira|colar|bracelete/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para complementar o look com brilho discreto e estilo no dia a dia.`,
      longDescription: `${name} é uma bijuteria versátil para usar em produções casuais, encontros e ocasiões especiais. A peça ajuda a valorizar o visual de forma simples, podendo ser usada sozinha ou combinada com outros acessórios da KA Bijoux.`,
      details: [...details, "Indicação: uso casual e composições de acessórios"],
      benefits: "Completa o visual com praticidade e combina com diferentes estilos.",
      howToUse: "Use como destaque ou em composição com outras peças. Evite tração excessiva e retire antes de banho, piscina ou atividades que possam danificar o acabamento.",
      careInstructions: "Guarde em local seco, limpo e separado. Evite contato com água, perfume, cremes, suor excessivo e produtos químicos.",
      keywords: ["bijuteria", "acessório feminino", "KA Bijoux"],
    });
  }

  if (/carimbo de francesinha/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para ajudar na aplicação de francesinha nas unhas com mais praticidade.`,
      longDescription: `${name} é um acessório de manicure pensado para facilitar a marcação da francesinha, ajudando a deixar o acabamento mais uniforme. É uma opção prática para quem gosta de fazer as unhas em casa ou complementar o kit de cuidados pessoais.`,
      details: [...details, "Indicação: acabamento de francesinha nas unhas"],
      benefits: "Facilita a aplicação e ajuda a criar linhas mais uniformes.",
      howToUse: "Aplique o esmalte no carimbo conforme a técnica desejada e pressione a ponta da unha com cuidado. Limpe o acessório após o uso para evitar acúmulo de produto.",
      careInstructions: "Use somente em unhas saudáveis. Evite contato com olhos e mantenha fora do alcance de crianças. Limpe e seque antes de guardar.",
      keywords: ["carimbo de francesinha", "unhas", "manicure", "KA Bijoux"],
    });
  }

  if (/blush/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para dar cor e acabamento saudável à maquiagem.`,
      longDescription: `${name} é um item de maquiagem para realçar as bochechas e finalizar a produção com aparência mais iluminada e delicada. Pode ser usado em camadas leves, conforme a intensidade desejada, sempre respeitando o tipo de pele e as orientações da embalagem.`,
      details: [...details, "Indicação: maquiagem facial"],
      benefits: "Ajuda a valorizar o rosto e complementar a maquiagem do dia a dia.",
      howToUse: "Aplique com pincel limpo nas maçãs do rosto, esfumando aos poucos até atingir a intensidade desejada. Evite contato direto com os olhos.",
      careInstructions: "Mantenha o produto fechado, seco e protegido de calor. Não use em pele irritada ou lesionada. Suspenda o uso em caso de irritação.",
      keywords: ["blush", "maquiagem", "Bobbi Rara", "KA Bijoux"],
    });
  }

  if (/algodao demaquilante/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para remover maquiagem e aplicar produtos de cuidado facial com suavidade.`,
      longDescription: `${name} é um item prático para a rotina de beleza, indicado para auxiliar na remoção de maquiagem com demaquilante, água micelar ou produto adequado ao seu tipo de pele. Também pode ser usado para aplicar tônicos e cuidados faciais, sempre com movimentos suaves.`,
      details: [...details, "Marca indicada no cadastro: Miamake", "Indicação: remoção de maquiagem e cuidados faciais"],
      benefits: "Facilita a limpeza da pele e ajuda a aplicar produtos com mais controle.",
      howToUse: "Umedeça o algodão com o produto escolhido e passe suavemente sobre a pele, sem esfregar com força. Para a área dos olhos, use movimentos delicados e evite contato direto com o globo ocular.",
      careInstructions: "Uso externo. Descarte após o uso. Não reutilize o algodão. Mantenha a embalagem protegida de umidade e poeira.",
      keywords: ["algodão demaquilante", "Miamake", "remoção de maquiagem", "KA Bijoux"],
    });
  }

  if (/oleo hidratante de cuticula/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para ajudar na hidratação e cuidado das cutículas.`,
      longDescription: `${name} é um produto de cuidado pessoal para a rotina de unhas, ideal para aplicar nas cutículas e deixar a região com aparência mais cuidada. Use conforme o rótulo e evite aplicação em pele irritada, ferida ou sensibilizada.`,
      details: [...details, "Indicação: cuidado das cutículas"],
      benefits: "Ajuda a manter as cutículas com aparência hidratada e bem cuidada.",
      howToUse: "Aplique pequena quantidade sobre as cutículas limpas e massageie suavemente. Use somente na região indicada pelo fabricante.",
      careInstructions: "Uso externo. Evite contato com olhos e mucosas. Não use em pele ferida ou irritada. Suspenda o uso em caso de irritação.",
      keywords: ["óleo de cutícula", "cuidados com unhas", "perfumaria", "KA Bijoux"],
    });
  }

  if (/progressiva/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para cuidado capilar prático conforme as orientações do fabricante.`,
      longDescription: `${name} é um sachê de cuidado capilar para uso conforme o modo de aplicação indicado no rótulo. Como produtos capilares podem variar em composição e etapa de uso, siga a embalagem antes de aplicar e faça teste de sensibilidade quando recomendado pelo fabricante.`,
      details: [...details, "Formato: sachê", "Indicação: cuidado capilar conforme rótulo"],
      benefits: "Opção prática para rotina capilar em embalagem individual.",
      howToUse: "Leia o rótulo antes do uso e siga o tempo de aplicação indicado pelo fabricante. Evite contato com olhos e não aplique se o couro cabeludo estiver irritado ou lesionado.",
      careInstructions: "Uso externo. Mantenha fora do alcance de crianças. Em caso de contato com os olhos, lave com água em abundância. Suspenda o uso em caso de irritação.",
      keywords: ["progressiva de chuveiro", "sachê capilar", "cuidado capilar", "KA Bijoux"],
    });
  }

  if (/creme facial/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para complementar a rotina de cuidado facial noturno.`,
      longDescription: `${name} é um produto de cuidado facial para uso conforme as orientações da embalagem. Aplique com a pele limpa e evite promessas de tratamento: o objetivo comercial é compor uma rotina de cuidado e hidratação conforme indicação do fabricante.`,
      details: [...details, "Indicação: cuidado facial noturno conforme rótulo"],
      benefits: "Ajuda a complementar a rotina de cuidado da pele com aplicação prática.",
      howToUse: "Com a pele limpa e seca, aplique pequena quantidade no rosto, evitando olhos e mucosas. Use conforme frequência indicada na embalagem.",
      careInstructions: "Uso externo. Não aplique em pele irritada ou lesionada. Suspenda o uso em caso de irritação. Mantenha fechado e fora do alcance de crianças.",
      keywords: ["creme facial", "cuidado noturno", "perfumaria", "KA Bijoux"],
    });
  }

  if (/calcinha/.test(n)) {
    return finish(common, {
      shortDescription: `${name} com modelagem prática para compor looks íntimos com conforto.`,
      longDescription: `${name} é uma peça de lingerie para uso diário ou ocasiões especiais, com proposta de ajuste ao corpo e visual delicado. Como composição e tamanho não foram confirmados no cadastro, a escolha deve considerar a imagem, o nome do produto e a disponibilidade informada na loja.`,
      details: [...details, "Categoria: lingerie", "Indicação: uso íntimo e vestuário"],
      benefits: "Peça versátil para compor a rotina com conforto e discrição.",
      howToUse: "Vista normalmente, ajustando ao corpo sem apertar em excesso. Escolha o tamanho conforme disponibilidade e preferência de caimento.",
      careInstructions: "Lave preferencialmente à mão, com sabão suave, e seque à sombra. Evite alvejante, secadora e torção forte para preservar o tecido e o elástico.",
      keywords: ["lingerie", "calcinha com cinta", "KA Bijoux"],
    });
  }

  if (/havaianas|chinelo/.test(n)) {
    const isHavaianas = /havaianas/.test(n);
    return finish(common, {
      shortDescription: `${name} para uso casual, com proposta confortável e prática para o dia a dia.`,
      longDescription: `${name} é uma opção leve para momentos casuais, passeios e uso diário. ${isHavaianas ? "O nome Havaianas aparece no cadastro do produto, então o texto preserva essa identificação comercial." : "O modelo de time adiciona um toque descontraído ao visual."} Combine com looks informais e use conforme conforto dos pés.`,
      details: [...details, "Indicação: calçado casual"],
      benefits: "Fácil de usar, prático para a rotina e simples de combinar com looks leves.",
      howToUse: "Calce normalmente e ajuste ao conforto dos pés. Evite correr, dirigir ou realizar atividades que exijam maior firmeza se o calçado não oferecer suporte adequado.",
      careInstructions: "Limpe com água e sabão neutro, usando pano ou esponja macia. Evite produtos químicos agressivos, calor excessivo e secagem direta ao sol intenso.",
      keywords: ["chinelo", isHavaianas ? "Havaianas" : "chinelo de time", "calçado casual", "KA Bijoux"],
    });
  }

  if (/bota de chuva/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para ajudar a proteger o calçado em dias de chuva.`,
      longDescription: `${name} é um acessório prático para vestir sobre o tênis e reduzir o contato com água e sujeira em deslocamentos rápidos. É ideal para manter o calçado mais protegido em dias úmidos, sempre respeitando o tamanho e o encaixe do produto.`,
      details: [...details, "Indicação: proteção do calçado contra chuva leve e respingos"],
      benefits: "Ajuda a preservar o tênis e facilita deslocamentos em dias de chuva.",
      howToUse: "Vista sobre o tênis seco, ajustando sem forçar o material. Após o uso, retire com cuidado e deixe secar antes de guardar.",
      careInstructions: "Limpe com pano úmido e sabão neutro quando necessário. Seque totalmente antes de guardar. Evite contato com objetos pontiagudos.",
      keywords: ["bota de chuva para tênis", "protetor de calçado", "KA Bijoux"],
    });
  }

  if (/vale presente/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para presentear com liberdade de escolha na KA Bijoux.`,
      longDescription: `${name} é uma opção prática para quem deseja presentear e deixar a pessoa escolher o item preferido. O vale deve ser utilizado conforme as condições informadas pela loja no atendimento ou no momento da compra.`,
      details: [...details, "Indicação: presente", `Valor cadastrado: R$ ${Number(row.price || 0).toFixed(2).replace(".", ",")}`],
      benefits: "Facilita a escolha do presente e evita erro de modelo, cor ou tamanho.",
      howToUse: "Após a compra, confirme com a KA Bijoux as condições de uso do vale-presente, prazo e forma de resgate. Use o valor indicado em produtos disponíveis na loja.",
      careInstructions: "Guarde o comprovante e as informações do vale. O uso depende das regras comerciais vigentes da loja.",
      keywords: ["vale presente", "presente KA Bijoux", "gift card", "KA Bijoux"],
    });
  }

  if (/vaso decorativo|tapete escorredor|cesta/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para complementar ambientes e presentes com praticidade.`,
      longDescription: `${name} foi selecionado para quem busca um item decorativo ou utilitário com boa apresentação. Use a peça para compor ambientes, organizar a rotina ou montar uma proposta de presente mais charmosa, sempre considerando as informações visíveis na imagem do produto.`,
      details: [...details, "Indicação: decoração, utilidade ou presente"],
      benefits: "Ajuda a deixar o ambiente ou presente mais bonito e funcional.",
      howToUse: "Use em superfície estável e limpa. No caso de itens utilitários, utilize apenas para a finalidade compatível com a peça e evite peso excessivo.",
      careInstructions: "Limpe com pano macio e seco ou levemente umedecido. Evite queda, impacto, abrasivos e produtos químicos fortes.",
      keywords: ["decoração", "presente", "utilidade", "KA Bijoux"],
    });
  }

  if (/escova eletrica de dente/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para auxiliar a rotina de higiene bucal com praticidade.`,
      longDescription: `${name} é um item de cuidado pessoal para escovação diária, pensado para tornar a rotina mais prática. Use sempre conforme as instruções da embalagem e combine com creme dental adequado à sua necessidade.`,
      details: [...details, "Indicação: higiene bucal"],
      benefits: "Facilita a escovação e ajuda a manter uma rotina de cuidado pessoal.",
      howToUse: "Aplique creme dental na escova e utilize com movimentos suaves, sem pressionar excessivamente. Siga o manual da embalagem para acionamento, troca de pilha ou recarga, quando aplicável.",
      careInstructions: "Enxágue a cabeça da escova após o uso e deixe secar em local ventilado. Não mergulhe o cabo em água se a embalagem não indicar resistência à água. Produto de uso individual.",
      keywords: ["escova elétrica", "higiene bucal", "cuidado pessoal", "KA Bijoux"],
    });
  }

  if (/escova finalizadora/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para auxiliar na finalização e alinhamento dos fios.`,
      longDescription: `${name} é um acessório de beleza para ajudar na rotina de cabelo, deixando a finalização mais prática. Use conforme as instruções do fabricante e respeite o tipo de fio, temperatura e condição do cabelo antes da aplicação.`,
      details: [...details, "Indicação: finalização capilar"],
      benefits: "Ajuda a pentear, alinhar e finalizar o cabelo com mais praticidade.",
      howToUse: "Leia a embalagem antes de usar. Utilize nos fios conforme indicado pelo fabricante e evite contato com água, couro cabeludo irritado ou pele sensível se houver aquecimento.",
      careInstructions: "Mantenha longe de água e umidade durante o uso elétrico. Desligue da tomada antes da limpeza. Guarde em local seco e fora do alcance de crianças.",
      keywords: ["escova finalizadora", "cabelo", "beleza", "KA Bijoux"],
    });
  }

  if (/pente airbag/.test(n)) {
    return finish(common, {
      shortDescription: `${name} para desembaraçar e massagear o couro cabeludo com leveza.`,
      longDescription: `${name} é um pente/escova com proposta prática para o dia a dia, ajudando a desembaraçar os fios e proporcionar sensação de massagem durante o uso. É uma opção simples para levar na bolsa, deixar no banheiro ou complementar a rotina de cuidados capilares.`,
      details: [...details, "Indicação: desembaraço e cuidado capilar"],
      benefits: "Ajuda a desembaraçar, alinhar os fios e massagear com suavidade.",
      howToUse: "Passe nos fios com movimentos suaves, começando pelas pontas e subindo aos poucos para reduzir quebras. Use em cabelo seco ou úmido conforme sua preferência e tipo de fio.",
      careInstructions: "Remova fios acumulados e limpe com pano úmido quando necessário. Deixe secar completamente antes de guardar.",
      keywords: ["pente airbag", "massage comb", "cabelo", "KA Bijoux"],
    });
  }

  return finish(common, {
    shortDescription: `${name} selecionado pela KA Bijoux para complementar sua rotina com praticidade e estilo.`,
    longDescription: `${name} faz parte da curadoria KA Bijoux e foi escolhido por sua proposta prática, bonita e fácil de usar. O produto deve ser conferido pela imagem, nome e disponibilidade no momento da compra.`,
    details: [...details, "Indicação: uso casual, presente ou complemento de rotina"],
    benefits: "Produto versátil, com apresentação pronta para a vitrine e compra local.",
    howToUse: "Utilize conforme a finalidade do produto e as orientações presentes na embalagem.",
    careInstructions: "Guarde em local seco e protegido. Evite calor excessivo, umidade e produtos químicos quando não forem compatíveis com o item.",
    keywords: ["KA Bijoux", "presente", "acessório"],
  });
}

function finish(common, content) {
  const seoKeywords = Array.from(new Set([...(content.keywords || []), common.displayName, common.categoryName]));
  return {
    ...common,
    shortDescription: content.shortDescription,
    longDescription: content.longDescription,
    details: Array.from(new Set(content.details.filter(Boolean))),
    benefits: content.benefits,
    howToUse: content.howToUse,
    careInstructions: content.careInstructions,
    seoDescription: content.shortDescription.slice(0, 155),
    seoKeywords,
  };
}

function main() {
  const rows = readRows();
  const overrides = rows.map(contentFor);
  fs.writeFileSync(OUTPUT, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");

  const header = ["blingId", "sku", "produtoAtual", "nomeRevisado", "imagem", "status"];
  const reportRows = overrides.map((item) => [
    item.blingId ?? "",
    item.sku ?? "",
    item.name,
    item.displayName,
    item.imageFile,
    "CONTEUDO_APLICADO_LOCAL",
  ]);
  fs.writeFileSync(REPORT, [header, ...reportRows].map((row) => row.map(csvEscape).join(";")).join("\n"), "utf8");
  console.log(JSON.stringify({ total: overrides.length, output: OUTPUT, report: REPORT }, null, 2));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

main();
