/**
 * bling-import-all.js
 *
 * 1. Abre OAuth do Bling no browser
 * 2. Busca todos os produtos da conta Bling por SKU
 * 3. Cria/atualiza os 146 produtos faltando no banco com dados reais
 * 4. Associa as imagens já enviadas ao Supabase Storage
 * 5. Envia nossas imagens editadas de volta para o Bling (substitui as fotos genéricas)
 */

const path  = require('path');
const http  = require('http');
const https = require('https');
const fs    = require('fs');

// Rodar com: NODE_PATH=./backend/node_modules node scripts/bling-import-all.js
const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CLIENT_ID     = 'a328177fa4108c47078a0f0eb17395ba29bdd6cb';
const CLIENT_SECRET = '795e2d2d93be82d84a902cd5958ae7f09a97424dfdc513c3ec2be73853f2';
const REDIRECT_URI  = 'http://localhost:3007';
const IMAGES_DIR    = path.join(BACKEND_DIR, 'public', 'uploads', 'products');
const SUPABASE_BASE = 'https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products';

// ── Mapeamento de categoria por nome de produto ───────────────────────────────
function getCategoria(nome) {
  const n = nome.toLowerCase();

  // Sex shop — acessórios adultos
  if (/algema/.test(n))                                return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/plug/.test(n) && /metal|anal/.test(n))          return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/tapa.?mamilo|sutiã.?adesivo|sutia.?adesivo/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/caneta.?comest/.test(n))                        return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/lenço.?umedec|lenco.?umedec/.test(n))           return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/sabonete.?(íntimo|intimo)/.test(n))             return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/kit.?tapa|tapa.?mamilo.?descar/.test(n))        return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/cesta.?namorados/.test(n))                      return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  // Sex shop — jogos
  if (/jogo|roleta|duelo/.test(n) && /sexy|prazer|sedu/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-jogos' };
  // Sex shop — géis e cremes
  if (/(creme|gel).*(sexy|excit|íntim|intim|sensual|erotico|erótico|bumbum|pau.?erg|nabuc|virgem|anel)/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-geis-e-cremes' };
  if (/(pau.?erguido|nabuc|mais.?bumbum|gel.?(chin|sensu))/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-geis-e-cremes' };
  // Sex shop — vibradores
  if (/vibrador|mini.?vibr|bullet/.test(n))            return { cat: 'sex-shop', sub: 'sex-shop-vibradores' };
  // Sex shop — masturbadores
  if (/masturbad|egg.*(silky|stepper|twister|wavy|verde)/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-masturbadores' };

  // Bijuterias
  if (/bracelete|pulseira.?(bras|missan|pedra|casal|prem)|relicário|relicario|broche|laco.?bras|faixa.?bras|adesivo.?bras|conjunto.?colar|mix.?colar|colar.?couro/.test(n)) return { cat: 'bijuterias', sub: null };

  // Acessórios cabelo
  if (/anel.?de.?cabelo|spray.?tinta|mini.?prancha|escova.?final|pente.?(airbag|alis)/.test(n)) return { cat: 'acessorios-cabelo', sub: null };

  // Perfumaria
  if (/perfume|água.?perfumada|agua.?perfumada|odorizador|perfum.?ambient/.test(n)) return { cat: 'perfumaria', sub: null };

  // Maquiagem / beleza
  if (/blush|algodão.?demaq|algodao.?demaq|creme.?facial|máscara.?facial|mascara.?facial|progressiva|óleo.?hidrat|oleo.?hidrat|hidratante.?corporal|esfoliante/.test(n)) return { cat: 'maquiagem', sub: null };

  // Capinhas e acessórios de celular
  if (/cabo.?(usb|light|tipo)|fone.?(bluetooth|ouvido|lightning)|fonte.?(usb|tipo)|carregad|hub.?usb|pulseira.?(smart|watch)|corda.?celular/.test(n)) return { cat: 'capinhas-acessorios-celular', sub: null };

  // Utilidades domésticas
  if (/robô.?aspir|robo.?aspir|dispenser.?água|dispenser.?agua|porta.?joias|papa.?bolinha|cabide|limpador.?magn|espelho.?mesa|porta.?comprimid|balança|balanca|mini.?mixer|escova.?elétrica.?dente|escova.?eletrica.?dente|tapete.?escorred|kit.?frascos|kit.?(limpa|prendedor)|aspirador.?soprador|caneta.?laser|triturad/.test(n)) return { cat: 'utilidades-domesticas', sub: null };

  // Pet
  if (/pet|comedouro|escova.?(dental.*pet|tira.?pelo)/.test(n)) return { cat: 'pet', sub: null };

  // Decoração
  if (/luminária|luminaria|álbum.?foto|album.?foto|lâmpada|lampada|vaso.?decor/.test(n)) return { cat: 'decoracao', sub: null };

  // Lingerie / íntimo
  if (/calcinha|body.?model|boob.?tape|meia.?silic|protetor.?calcâ|protetor.?calca|protetor.?silic|sutia.?adesi/.test(n)) return { cat: 'lingerie', sub: null };

  // Acessórios de inverno
  if (/cachecol/.test(n)) return { cat: 'acessorios-inverno', sub: null };

  // Bolsas
  if (/pochete|bolsa|necessaire/.test(n)) return { cat: 'bolsas-necessaires', sub: null };

  // Papel de parede / papel
  if (/papel.?de.?parede/.test(n)) return { cat: 'decoracao', sub: null };

  // Default
  return { cat: 'utilidades-domesticas', sub: null };
}

// ── Mapeamento SKU → arquivo de imagem ─────────────────────────────────────────
function buildSkuImageMap() {
  const files = fs.readdirSync(IMAGES_DIR);
  const map = {};
  const skuRegex = /3104000\d+/;
  for (const f of files) {
    const m = f.match(skuRegex);
    if (m) {
      if (!map[m[0]]) map[m[0]] = f; // pega o primeiro arquivo por SKU
    }
  }
  return map;
}

// ── Bling API helpers ──────────────────────────────────────────────────────────
function blingRequest(token, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.bling.com.br',
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: true }); }
      });
    });
    req.on('error', () => resolve({ error: true }));
    req.end();
  });
}

async function fetchAllBlingProducts(token) {
  const all = [];
  let page = 1;
  while (true) {
    const result = await blingRequest(token, `/Api/v3/produtos?pagina=${page}&limite=100&situacao=A`);
    if (result.error || !result.data || result.data.length === 0) break;
    all.push(...result.data);
    console.log(`  Bling página ${page}: ${result.data.length} produtos (total: ${all.length})`);
    if (result.data.length < 100) break;
    page++;
    await sleep(300);
  }
  return all;
}

async function fetchBlingProductDetail(token, id) {
  const result = await blingRequest(token, `/Api/v3/produtos/${id}`);
  return result.data || null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Enviar imagem editada para o Bling ────────────────────────────────────────
function blingAddImage(token, blingId, imageUrl) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ link: imageUrl });
    const req = https.request({
      hostname: 'www.bling.com.br',
      path: `/Api/v3/produtos/${blingId}/imagens`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', () => resolve({ status: 0, data: 'network error' }));
    req.write(body);
    req.end();
  });
}

// ── Atualizar imagens do Bling para todos os produtos com imagem nossa ─────────
async function updateBlingImages(token, blingProducts, skuImageMap) {
  console.log('\n=== ENVIANDO IMAGENS EDITADAS PARA O BLING ===');
  const blingById = {};
  for (const p of blingProducts) {
    if (p.codigo) blingById[String(p.codigo).trim()] = p;
  }

  let ok = 0, fail = 0, skip = 0;
  for (const [sku, imgFile] of Object.entries(skuImageMap)) {
    const blingProduct = blingById[sku];
    if (!blingProduct) { skip++; continue; }

    const imageUrl = `${SUPABASE_BASE}/${imgFile}`;
    const result = await blingAddImage(token, blingProduct.id, imageUrl);

    if (result.status === 200 || result.status === 201) {
      console.log(`  ✓ Bling[${blingProduct.id}] ${blingProduct.nome?.substring(0, 40)}`);
      ok++;
    } else {
      console.log(`  ✗ Bling[${blingProduct.id}] ${blingProduct.nome?.substring(0, 30)} → ${result.status}`);
      fail++;
    }
    await sleep(200); // respeitar rate limit do Bling
  }
  console.log(`\n  Imagens enviadas ao Bling: ${ok} OK | ${fail} falhas | ${skip} sem match`);
  return { ok, fail };
}

// ── Importar produtos no banco ─────────────────────────────────────────────────
async function importProducts(blingProducts, skuImageMap) {

  // Buscar produtos já cadastrados no banco
  const existingProducts = await prisma.product.findMany({ select: { sku: true, slug: true } });
  const existingSkus  = new Set(existingProducts.map(p => p.sku).filter(Boolean));
  const existingSlugs = new Set(existingProducts.map(p => p.slug));

  // Buscar categorias e subcategorias
  const categories = await prisma.category.findMany({ include: { children: true } });
  const catBySlug = {};
  for (const c of categories) {
    catBySlug[c.slug] = c;
    for (const sub of c.children) catBySlug[sub.slug] = sub;
  }

  // Montar mapa SKU → dados Bling
  const blingMap = {};
  for (const p of blingProducts) {
    if (p.codigo) blingMap[String(p.codigo).trim()] = p;
  }

  // SKUs com imagem mas sem produto no banco
  const skuRegex = /3104000\d+/;
  const imageFiles = fs.readdirSync(IMAGES_DIR);
  const skusComImagem = new Set();
  for (const f of imageFiles) {
    const m = f.match(skuRegex);
    if (m) skusComImagem.add(m[0]);
  }
  const skusFaltando = [...skusComImagem].filter(sku => !existingSkus.has(sku));

  console.log(`\nSKUs com imagem mas sem cadastro: ${skusFaltando.length}`);
  console.log(`SKUs encontrados no Bling: ${Object.keys(blingMap).length}`);
  let importados = 0, semBling = 0;

  for (const sku of skusFaltando) {
    const bling = blingMap[sku];
    const imgFile = skuImageMap[sku];

    if (!bling) {
      console.log(`  [SEM BLING] SKU ${sku} — ${imgFile || 'sem imagem'}`);
      semBling++;
    }

    // Nome do produto
    const nome = bling
      ? bling.nome
      : (imgFile ? imgFile.replace(/-?3104000\d+/, '').replace(/\.\w+$/, '').replace(/-/g, ' ').trim() : `Produto ${sku}`);

    // Slug único
    let slug = nome.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    if (existingSlugs.has(slug)) slug = `${slug}-${sku.slice(-4)}`;
    existingSlugs.add(slug);

    // Preço
    const preco = bling?.preco ? Number(bling.preco) : gerarPreco(nome);

    // Descrição
    const descricao = bling?.descricaoCurta
      ? bling.descricaoCurta
      : gerarDescricao(nome);

    // Dimensões / peso
    const peso   = bling?.pesoLiquido   ? Number(bling.pesoLiquido)   : 0.1;
    const altura = bling?.altura        ? Number(bling.altura)        : 5;
    const largura= bling?.largura       ? Number(bling.largura)       : 10;
    const comprimento = bling?.profundidade ? Number(bling.profundidade) : 15;

    // Categoria
    const { cat: catSlug, sub: subSlug } = getCategoria(nome);
    const category    = catBySlug[catSlug];
    const subcategory = subSlug ? catBySlug[subSlug] : null;

    if (!category) {
      console.log(`  [SEM CATEGORIA] ${nome} (cat: ${catSlug})`);
      continue;
    }

    // Imagem no Supabase
    const imageUrl = imgFile ? `${SUPABASE_BASE}/${imgFile}` : null;

    try {
      await prisma.product.create({
        data: {
          name:          nome,
          slug,
          sku,
          description:   descricao,
          price:         preco,
          stock:         bling?.estoque && !isNaN(Number(bling.estoque)) ? Math.max(Math.round(Number(bling.estoque)), 5) : 10,
          weight:        peso,
          height:        altura,
          width:         largura,
          length:        comprimento,
          active:        true,
          featured:      false,
          isNew:         false,
          categoryId:    category.id,
          subcategoryId: subcategory?.id ?? null,
          images: imageUrl ? { create: [{ url: imageUrl, alt: nome, order: 0 }] } : undefined,
        },
      });
      console.log(`  ✓ ${nome}`);
      importados++;
    } catch (err) {
      console.log(`  [ERRO] ${nome}: ${err.message}`);
    }
  }

  return { importados, semBling };
}

// ── Gerar preço padrão quando não há dado do Bling ────────────────────────────
function gerarPreco(nome) {
  const n = nome.toLowerCase();
  if (/vale.?presente.?200/.test(n)) return 200;
  if (/vale.?presente.?100/.test(n)) return 100;
  if (/vale.?presente.?50/.test(n))  return 50;
  if (/vaso.?decor.*72/.test(n))     return 72;
  if (/vaso.?decor.*60/.test(n))     return 60;
  if (/vibrador|bullet/.test(n))     return 45;
  if (/fone.?bluetooth/.test(n))     return 45;
  if (/mini.?prancha/.test(n))       return 40;
  if (/porta.?joias/.test(n))        return 55;
  if (/pente.?alis|escova.?final/.test(n)) return 40;
  if (/robo.?aspir/.test(n))         return 45;
  if (/perfume/.test(n))             return 40;
  if (/dispenser.?agua/.test(n))     return 35;
  if (/body.?model|calcinha/.test(n)) return 40;
  if (/cachecol/.test(n))            return 40;
  if (/plug.?metal/.test(n))         return 30;
  if (/algema/.test(n))              return 18;
  if (/caixa.?som/.test(n))          return 35;
  if (/balanca|triturad/.test(n))    return 35;
  if (/papa.?bolinha/.test(n))       return 30;
  if (/spray.?tinta/.test(n))        return 15;
  if (/pulseira.?smart|pulseira.?watch/.test(n)) return 20;
  if (/cabo.?usb|cabo.?light|cabo.?tipo/.test(n)) return 18;
  if (/fonte|carregad/.test(n))      return 28;
  if (/bracelete.?inox/.test(n))     return 28;
  if (/creme|gel/.test(n))           return 12;
  if (/jogo|roleta|duelo/.test(n))   return 28;
  if (/cesta/.test(n))               return 70;
  if (/pulseira/.test(n))            return 18;
  if (/relicário|relicario/.test(n)) return 30;
  return 15;
}

// ── Gerar descrição padrão quando não há dado do Bling ────────────────────────
function gerarDescricao(nome) {
  const n = nome.toLowerCase();

  if (/algema.*(veludo|preta|branca|rosa|vermelha|onça|onca)/.test(n))
    return `Algemas sensuais revestidas em veludo macio, ideais para momentos de diversão a dois. Acompanha chave. Resistente e confortável. ${nome}.`;
  if (/algema.*prata|algema.*tradicional/.test(n))
    return `Algemas clássicas em metal prateado para fantasias adultas. Resistentes, com fechamento seguro e chave inclusa.`;
  if (/plug.?metal.*premium/.test(n))
    return `Plug anal premium em metal polido hipoalergênico. Base em T para segurança máxima. Ideal para iniciantes e avançados. Fácil higienização.`;
  if (/plug.?metal/.test(n))
    return `Plug anal em metal polido de alta qualidade, hipoalergênico. Design anatômico com base segura. Fácil limpeza. Uso adulto individual.`;
  if (/tapa.?mamilo.*premium/.test(n))
    return `Tapa-mamilos premium com design sofisticado. Aderência segura, discreto sob roupas. Ideal para looks ousados e momentos especiais.`;
  if (/tapa.?mamilo.*sexy|tapa.?mamilo(?!.*descart)/.test(n))
    return `Tapa-mamilos sensuais com acabamento delicado. Aderência confortável, sem marcas na pele. Discretos e estilosos.`;
  if (/kit.?tapa.?mamilo|tapa.?mamilo.*descar/.test(n))
    return `Kit tapa-mamilos descartáveis. Prático, higiênico, aderência firme. Ideal para usar e descartar. Embalagem com diversas unidades.`;
  if (/sutiã.?adesi|sutia.?adesi/.test(n))
    return `Sutiã adesivo de silicone autoaderente, sem alças. Discreto sob qualquer roupa. Reutilizável com higiene adequada. Efeito levanta e modela.`;
  if (/caneta.?comest/.test(n))
    return `Caneta comestível de sabor adocicado para escrita na pele. Segura para uso íntimo, ingredientes comestíveis. Torne os momentos a dois mais saborosos.`;
  if (/lenço.?umedec|lenco.?umedec/.test(n))
    return `Lenços umedecidos íntimos com fórmula suave e pH balanceado. Proporcionam frescor e limpeza delicada. Embalagem prática para o dia a dia.`;
  if (/sabonete.?íntimo.*morango|sabonete.?intimo.*morango/.test(n))
    return `Sabonete íntimo com aroma de morango. Fórmula de pH balanceado, cuida e protege a região íntima. Fragrância suave e duradoura.`;
  if (/sabonete.?íntimo|sabonete.?intimo/.test(n))
    return `Sabonete íntimo com fórmula especial de pH neutro. Cuida e protege a região íntima com suavidade. Diversas opções de aroma disponíveis.`;
  if (/jogo.?sedu/.test(n))
    return `Jogo de sedução para casais. Inclui cartinhas e desafios ousados para acender a paixão. Diversão garantida para adultos. Ideal para presentear.`;
  if (/duelo.?prazer/.test(n))
    return `Jogo adulto "Duelo do Prazer" — desafios picantes e divertidos para casais. Estimula a comunicação e a cumplicidade. Surpresa a cada rodada.`;
  if (/roleta.?sexy/.test(n))
    return `Roleta sexy para casais. Gire e descubra desafios ousados e divertidos. Ótima pedida para animar noites a dois. Acompanha instruções.`;
  if (/cesta.?namorados/.test(n))
    return `Cesta especial para o Dia dos Namorados. Kit montado com produtos selecionados para presentear com carinho e criatividade.`;
  if (/creme.?dessensibil/.test(n))
    return `Creme dessensibilizante para relações mais confortáveis. Fórmula suave de ação local. Auxilia na redução do desconforto. Uso adulto.`;
  if (/creme.?feminino.?sexy/.test(n))
    return `Creme excitante feminino de ação sensível ao toque. Estimula a sensibilidade e intensifica o prazer. Seguro para uso íntimo, fórmula testada.`;
  if (/creme.?multifun/.test(n))
    return `Creme multifunções para uso íntimo e sensual. Combinação de funções em um só produto: hidrata, estimula e intensifica sensações.`;
  if (/gel.?chin/.test(n))
    return `Gel excitante estilo chinês de ação prolongada. Fórmula especial que estimula a sensibilidade. Seguro para uso íntimo. Embalagem discreta.`;
  if (/gel.?sensual/.test(n))
    return `Gel sensual para uso íntimo. Fórmula suave que auxilia na lubrificação e aumenta a sensibilidade. Seguro para pele sensível.`;
  if (/mais.?bumbum/.test(n))
    return `Gel "Mais Bumbum" — creme modelador que trata a região glútea, com ação firming e sensação de calor. Uso diário para melhores resultados.`;
  if (/nabuc/.test(n))
    return `Gel excitante masculino de ação intensa. Fórmula especial para aumentar a sensibilidade e o desempenho. Seguro para uso íntimo.`;
  if (/pau.?erguid/.test(n))
    return `Gel excitante masculino "Pau Erguido" — fórmula de ação rápida para estimular a ereção e prolongar o prazer. Uso adulto.`;
  if (/mini.?vibr/.test(n))
    return `Mini vibrador compacto e discreto, potente com múltiplas vibrações. Ideal para estimulação íntima. Prático e fácil de usar.`;
  if (/vibrador.?controle.?branco/.test(n))
    return `Vibrador sexy com controle remoto na cor branca. Múltiplas frequências de vibração, tamanho ergonômico. Material seguro e fácil limpeza.`;
  if (/vibrador.?controle.?marrom/.test(n))
    return `Vibrador sexy com controle remoto na cor marrom. Vibrações intensas e variadas, design anatômico confortável. Material hipoalergênico.`;
  if (/vibrador.?controle.?preto/.test(n))
    return `Vibrador sexy com controle remoto na cor preta. Design elegante, múltiplas intensidades, fácil uso. Material corpo-seguro, hipoalergênico.`;
  if (/vibrador.?controle.?vermelho/.test(n))
    return `Vibrador sexy com controle remoto na cor vermelha. Estimulação intensa com diversas frequências. Fácil limpeza, material seguro.`;
  if (/masturbador.*verde|egg.*verde/.test(n))
    return `Masturbador EGG Silky na cor verde — textura suave e envolvente para estimulação masculina. Compacto, descartável e discreto. Fácil de usar.`;

  // Bijuterias
  if (/bracelete.?inox.*cartier/.test(n))
    return `Bracelete em aço inox 316L estilo Cartier com strass brilhante. Não alarga, não enferruja, não mancha. Acabamento premium, resistente ao uso diário.`;
  if (/bracelete.?inox.*roma/.test(n))
    return `Bracelete em aço inox 316L estilo romano. Design elegante e atemporal. Resistente à água, não enferruja. Acabamento polido de alta qualidade.`;
  if (/bracelete.?inox.*liso.*prata|bracelete.*prata/.test(n))
    return `Bracelete liso em aço inox 316L banhado a prata. Elegante e versátil, combina com qualquer look. Não alarga, não enferruja, não mancha a pele.`;
  if (/bracelete.?inox.*liso/.test(n))
    return `Bracelete liso em aço inox 316L. Acabamento polido, resistente e elegante. Não alarga, não enferruja. Ajuste perfeito para o dia a dia.`;
  if (/bracelete.?bras/.test(n))
    return `Bracelete temático do Brasil para festas e eventos patrióticos. Cores vibrantes da bandeira, acabamento confortável. Ideal para Copa, festas juninas e mais.`;
  if (/broche.?bras/.test(n))
    return `Broche patriótico do Brasil para decorar roupas, mochilas e bolsas. Acabamento caprichado, cores vivas. Perfeito para festas patrióticas.`;
  if (/conjunto.?colar.?brinco.?bras/.test(n))
    return `Conjunto patriótico colar + brinco com motivo Brasil. Cores da bandeira, acabamento delicado. Perfeito para festas, Copa do Mundo e eventos nacionais.`;
  if (/colar.?couro/.test(n))
    return `Colar longo em couro sintético. Design moderno e casual, fácil de combinar com qualquer visual. Acabamento caprichado, leve e confortável.`;
  if (/pulseira.?casal/.test(n))
    return `Par de pulseiras para casal com símbolos que se completam. Material resistente e estiloso. Lindo presente para namorados e noivos.`;
  if (/pulseira.?missanga.*bras|pulseira.?bras/.test(n))
    return `Pulseira de missangas com as cores do Brasil. Artesanal, colorida e charmosa. Perfeita para festas, Copa do Mundo e datas patrióticas.`;
  if (/pulseira.?pedra.*turquesa/.test(n))
    return `Pulseira com pedras naturais de turquesa dourada oval. Design delicado e sofisticado. A pedra turquesa é símbolo de proteção e paz.`;
  if (/pulseira.?prem/.test(n))
    return `Pulseira premium com acabamento sofisticado. Design exclusivo, ideal para presentes e ocasiões especiais. Qualidade e estilo garantidos.`;
  if (/relicário.?coração|relicario.?coracao/.test(n))
    return `Relicário em formato de coração com flores em prata. Pode guardar foto ou mensagem especial. Perfeito para presentes em datas especiais.`;
  if (/relicário|relicario/.test(n))
    return `Relicário redondo dourado com flores. Pode guardar foto ou memória especial. Bijuteria sofisticada, ideal para presentear em ocasiões especiais.`;
  if (/mix.?colar.*dourado/.test(n))
    return `Mix de colares em malha fina dourada. Kit com vários modelos para usar sobrepostos ou separados. Versáteis e elegantes para qualquer ocasião.`;
  if (/mix.?colar.*prata/.test(n))
    return `Mix de colares em malha fina prateada. Kit com modelos variados para usar sobrepostos. Delicados e modernos, combina com qualquer visual.`;
  if (/adesivo.?bras/.test(n))
    return `Adesivo decorativo temático do Brasil. Para personalizar itens, decorar festas patrióticas ou Copa do Mundo. Aplicação fácil, boa aderência.`;
  if (/faixa.?bras/.test(n))
    return `Faixa decorativa do Brasil, perfeita para festas, Copa do Mundo e eventos patrióticos. Fácil de usar, material resistente e colorido.`;
  if (/laço.?bras|laco.?bras/.test(n))
    return `Laço decorativo temático do Brasil para penteados, bolsas e roupas. Cores da bandeira, acabamento fofo e charmoso. Perfeito para festas patrióticas.`;

  // Cabelo
  if (/anel.?cabelo.*color/.test(n))
    return `Anel de cabelo colorido e divertido para penteados criativos. Material macio, não prende nem quebra o cabelo. Perfeito para o dia a dia e festas.`;
  if (/anel.?cabelo.*dourado/.test(n))
    return `Anel de cabelo dourado para penteados sofisticados. Fácil de aplicar, não danifica os fios. Elegante e versátil para todas as ocasiões.`;
  if (/anel.?cabelo.*prat/.test(n))
    return `Anel de cabelo prateado para penteados delicados e modernos. Não prende nem quebra os fios. Ideal para usar no dia a dia ou em eventos.`;
  if (/spray.?tinta/.test(n))
    return `Spray de tinta temporária para cabelo. Cor intensa e vibrante que sai na lavagem. Ideal para festas, fantasias e eventos. Não danifica o cabelo.`;
  if (/mini.?prancha/.test(n))
    return `Mini prancha portátil para alisar e modelar o cabelo em qualquer lugar. Aquecimento rápido, ideal para viagens. Compacta e leve.`;
  if (/escova.?final/.test(n))
    return `Escova finalizadora de cabelo para dar volume e acabamento perfeito. Cerdas macias, combina com qualquer tipo de cabelo. Resultado profissional em casa.`;
  if (/pente.?airbag/.test(n))
    return `Pente airbag com almofada flexível e massageadora. Desliza suavemente nos cabelos, estimula a circulação do couro cabeludo. Reduz quebra.`;
  if (/pente.?alis/.test(n))
    return `Pente alisador recarregável — alisa o cabelo com praticidade sem fio. Aquecimento uniforme, resultados duradouros. Ideal para retoques rápidos.`;

  // Perfumaria
  if (/perfume.*cloe/.test(n))
    return `Perfume feminino inspirado em Chloé. Fragrância floral e sofisticada com notas de rosa, peônia e almíscar. Longa duração, ideal para o dia a dia.`;
  if (/perfume.*eterny/.test(n))
    return `Perfume feminino inspirado em Eternity. Fragrância fresca e floral com notas verdes e almíscar. Clássico e atemporal para todas as ocasiões.`;
  if (/perfume.*isis.?madam/.test(n))
    return `Perfume feminino Isis Madam — fragrância oriental e marcante. Notas amadeiradas e florais. Longa duração para mulheres elegantes.`;
  if (/perfume.*j.?amore/.test(n))
    return `Perfume feminino inspirado em J'adore. Fragrância floral e luxuosa com notas de jasmim, ylang-ylang e rosa. Elegância e sofisticação.`;
  if (/perfume.*la.?bella/.test(n))
    return `Perfume feminino La Bella — fragrância doce e floral com notas de baunilha e flores brancas. Encantador e marcante para o dia a dia.`;
  if (/perfume.*lady.?billion/.test(n))
    return `Perfume feminino inspirado em Lady Million. Fragrância floral e frutada com notas de neroli, gardênia e mel. Luxuosa e sedutora.`;
  if (/perfume.*lady.?dior/.test(n))
    return `Perfume feminino inspirado em Lady Dior. Fragrância floral e elegante com notas de iris, patchouli e almíscar. Ícone da elegância francesa.`;
  if (/água.?perfumada|agua.?perfumada/.test(n))
    return `Água perfumada para tecidos e ambientes. Fragrância suave e duradoura, deixa roupas e ambientes com aroma fresco. Não mancha.`;
  if (/perfume.*ambient|perfume.?de.?ambient/.test(n))
    return `Perfume de ambiente em spray. Fragrância intensa e duradoura para deixar sua casa sempre com cheiro agradável. Diversas opções de aroma.`;
  if (/odorizador/.test(n))
    return `Odorizador de tecidos e ambientes em spray. Elimina odores e deposita fragrância fresca em roupas, estofados e ambientes. Longa duração.`;

  // Maquiagem / beleza
  if (/blush/.test(n))
    return `Blush em pó compacto para realçar o colorido natural do rosto. Pigmentação intensa, acabamento matte ou acetinado. Longa duração.`;
  if (/algodão.?demaq|algodao.?demaq/.test(n))
    return `Algodão demaquilante de alta absorção. Remove maquiagem com suavidade, sem agredir a pele. Embalagem com múltiplas unidades, prático para o dia a dia.`;
  if (/creme.?facial/.test(n))
    return `Creme facial nutritivo de uso noturno. Fórmula com ativos hidratantes e regeneradores para pele seca e normal. Pele suave e radiante ao despertar.`;
  if (/máscara.?facial.*isis|mascara.?facial.*isis/.test(n))
    return `Máscara facial de rosa mosqueta — rica em vitaminas A e C, hidrata e regenera a pele. Textura cremosa de fácil aplicação. Resultado visível em 15 minutos.`;
  if (/progressiva.*sache/.test(n))
    return `Progressiva de chuveiro em sachê — tratamento alisante que dispensa chapa. Aplique, espere e lave. Fios lisos e hidratados por semanas.`;
  if (/óleo.?hidrat.*cutícula|oleo.?hidrat.*cuticula/.test(n))
    return `Óleo hidratante para cutículas. Fórmula nutritiva que amolece e hidrata as cutículas com praticidade. Absorção rápida, sem oleosidade.`;
  if (/hidratante.?corporal/.test(n))
    return `Hidratante corporal com fragrância floral delicada. Textura suave de absorção rápida, hidrata por horas sem deixar pele oleosa.`;
  if (/esfoliante.*pé|esfoliante.*pe/.test(n))
    return `Esfoliante para os pés que remove células mortas e hidrata profundamente. Deixa os pés macios e renovados. Aroma agradável e refrescante.`;

  // Eletrônicos
  if (/cabo.?v8|cabo.*micro.?usb/.test(n))
    return `Cabo de carregamento V8 Micro USB resistente. Compatível com Android, câmeras e outros dispositivos com entrada Micro USB. Carga rápida.`;
  if (/cabo.*lightning.*usb(?!.?c)/.test(n))
    return `Cabo Lightning para USB — carregamento e transferência de dados para iPhone e iPad. Resistente e compatível com todos os modelos Apple com Lightning.`;
  if (/cabo.*usb.?c.*lightning/.test(n))
    return `Cabo USB-C para Lightning 30W — carregamento rápido para iPhone 12 ou superior. Alta velocidade, construção reforçada e durável.`;
  if (/cabo.*usb.?c.*usb.?c/.test(n))
    return `Cabo USB-C para USB-C 60W de alta velocidade. Compatível com MacBooks, notebooks e smartphones. Transferência de dados e carga rápida.`;
  if (/fone.?bluetooth.?p47/.test(n))
    return `Fone de ouvido Bluetooth P47 — headphone over-ear sem fio. Graves potentes, autonomia de até 8h. Microfone embutido para chamadas. Dobrável para fácil transporte.`;
  if (/fone.*lightning/.test(n))
    return `Fone de ouvido com conector Lightning para iPhone. Som nítido e cristalino, compatível com iPhone 7 e superiores. Design leve e confortável.`;
  if (/fonte.*tipo.?c.*35w|fonte.*35w/.test(n))
    return `Fonte carregador com cabo USB-C integrado, potência 35W. Carregamento rápido compatível com MacBook Air, iPad e smartphones USB-C.`;
  if (/fonte.*usb.?c.*20w/.test(n))
    return `Fonte USB-C 20W para carregamento rápido de iPhone 12+ e outros dispositivos. Compatível com Power Delivery. Compacta e eficiente.`;
  if (/carregad.?veicular/.test(n))
    return `Carregador veicular com cabo incluído. Carrega seu celular no carro com segurança. Proteção contra sobrecorrente e sobretensão.`;
  if (/hub.?usb/.test(n))
    return `Hub USB 4 portas para expandir as conexões do seu computador. Plug and play, sem necessidade de driver. Compatível com Windows e Mac.`;
  if (/pulseira.*smart.*couro|pulseira.*smartwatch.*couro/.test(n))
    return `Pulseira de smartwatch estilo couro premium. Design sofisticado, substitui a pulseira original do seu relógio inteligente. Ajuste fácil.`;
  if (/pulseira.*smart|pulseira.*watch/.test(n))
    return `Pulseira de substituição para smartwatch. Silicone macio e resistente, vários tamanhos e cores disponíveis. Troca rápida sem ferramentas.`;
  if (/pulseira.*metal/.test(n) && /smart/.test(n))
    return `Pulseira de aço inox para smartwatch. Design metálico elegante, resistente e confortável. Encaixe universal para os principais modelos.`;
  if (/corda.?celular/.test(n))
    return `Corda para celular — transforma seu smartphone em acessório de moda. Ajustável, resistente, prende o celular com segurança. Vários modelos disponíveis.`;

  // Utilidades domésticas
  if (/robô.?aspir|robo.?aspir/.test(n))
    return `Mini robô aspirador de pó compacto e silencioso. Aspira poeira, pelos e sujeiras leves do piso. Prático e fácil de usar, ideal para o dia a dia.`;
  if (/dispenser.?água|dispenser.?agua/.test(n))
    return `Dispenser de água elétrico para galões de 10 a 20 litros. Pratico e higiênico, serve água sem esforço. Bivolt, instalação fácil.`;
  if (/porta.?joias.*visor/.test(n))
    return `Porta-joias organizador com visor transparente. Compartimentos para anéis, colares, brincos e pulseiras. Protege suas joias do pó e oxidação.`;
  if (/porta.?joias/.test(n))
    return `Porta-joias elegante com múltiplos compartimentos. Organiza anéis, brincos, colares e pulseiras. Material de qualidade, design sofisticado.`;
  if (/papa.?bolinha.*pilha.*azul/.test(n))
    return `Papa-bolinha a pilha na cor azul para remoção de fiapos e bolinhas de tecidos. Prático e eficiente, lâminas de aço inox. Protege suas roupas.`;
  if (/papa.?bolinha.*pilha.*rosa/.test(n))
    return `Papa-bolinha a pilha na cor rosa. Remove fiapos, bolinhas e pelos de roupas e tecidos com facilidade. Lâminas afiadas de aço inox.`;
  if (/papa.?bolinha.*verde/.test(n))
    return `Papa-bolinha recarregável na cor verde. Recarrega via USB, remove bolinhas de tecidos com eficiência. Lâminas de longa durabilidade.`;
  if (/papa.?bolinha/.test(n))
    return `Papa-bolinha elétrico para remoção de fiapos e bolinhas de tecidos. Renova roupas e tecidos como novos. Prático e de fácil manutenção.`;
  if (/cabide.?organ/.test(n))
    return `Cabide organizador multiuso para banheiro ou quarto. Suporta toalhas, roupas e acessórios. Material resistente e de fácil instalação.`;
  if (/limpador.*magn/.test(n))
    return `Limpador magnético para vidros — limpa os dois lados ao mesmo tempo com segurança. Ideal para janelas e superfícies de vidro. Não riscas.`;
  if (/espelho.*mesa/.test(n))
    return `Espelho de mesa redondo com suporte. Ideal para maquiagem e cuidados pessoais. Superfície de alta qualidade, reflexo claro e nítido.`;
  if (/porta.?comprimid/.test(n))
    return `Porta-comprimidos organizador premium com compartimentos diários. Resistente, compacto e prático para medicamentos, vitaminas e suplementos.`;
  if (/balança.*cozinha|balanca.*cozinha/.test(n))
    return `Mini balança digital de cozinha com precisão de 1g até 5kg. Display LCD, superfície fácil de limpar. Ideal para dietas e receitas precisas.`;
  if (/mini.?mixer/.test(n))
    return `Mini mixer elétrico portátil para drinks, shakes e vitaminas. Compacto, silencioso e de fácil limpeza. Alimentado por USB ou pilhas.`;
  if (/escova.?elétrica.*dente|escova.?eletrica.*dente/.test(n))
    return `Escova elétrica de dente com cabeça de substituição. Vibração que remove até 3x mais placa do que escovas manuais. Modos de limpeza variados.`;
  if (/tapete.?escorred/.test(n))
    return `Tapete escorredor de copos e utensílios de silicone. Absorve água com rapidez, secagem rápida. Não desliza, fácil de limpar, resistente.`;
  if (/kit.?frascos/.test(n))
    return `Kit de frascos para viagem — conjunto com frascos de tamanhos variados para higiene pessoal. Práticos para levar no avião e viagens.`;
  if (/kit.?limpa.?prata/.test(n))
    return `Kit limpa prata e ouro — restaura o brilho de joias e bijuterias. Fórmula segura para metais. Inclui solução e escovinha para limpeza.`;
  if (/kit.?prendedor.*lençol|kit.*prendedor.*cama/.test(n))
    return `Kit prendedores para lençol — mantém o lençol no lugar sem escorregar. Elástico resistente, fácil de instalar. Compatível com camas de todos os tamanhos.`;
  if (/aspirador.*soprador/.test(n))
    return `Aspirador e soprador de ar portátil. Aspira pó de teclados, instrumentos e eletrônicos. Pode ser revertido para soprar. Prático e compacto.`;
  if (/caneta.?laser/.test(n))
    return `Caneta laser para apresentações e aulas. Alcance de até 200m, bateria inclusa. Ideal para professores, palestrantes e uso profissional.`;
  if (/triturad.*alim|processad.*alim/.test(n))
    return `Triturador e processador de alimentos mini. Processa vegetais, frutas e temperos em segundos. Fácil de limpar, prático para o dia a dia.`;

  // Pet
  if (/comedouro.?pet|comedouro.?retrat/.test(n))
    return `Comedouro retrátil para pets. Design compacto que se expande conforme a necessidade. Ideal para cães e gatos, prático para viagens.`;
  if (/escova.?dental.*pet/.test(n))
    return `Escova dental dupla para pets — duas escovas em uma para facilitar a higiene bucal do seu animal. Reduz o tártaro e previne doenças.`;
  if (/escova.?tira.?pelo/.test(n))
    return `Escova tira pelos com depósito — remove pelos de roupas, estofados e carpetes de forma rápida. Depósito coletável, fácil de esvaziar.`;

  // Decoração
  if (/luminária.*coração.*3d|luminaria.*coracao.*3d/.test(n))
    return `Luminária LED coração 3D decorativa com luz colorida. Perfeita para quarto, sala ou como presente. Bateria ou USB. Design romântico e moderno.`;
  if (/álbum.*foto|album.*foto/.test(n))
    return `Álbum de fotos para guardar memórias especiais. Capacidade para muitas fotos, capa decorada. Ideal para presentear em datas especiais.`;
  if (/lâmpada.*globo.*rgb|lampada.*rgb/.test(n))
    return `Lâmpada globo de festa RGB com mudança de cor automática. Cria atmosfera festiva e colorida. Bivolt, base E27 padrão. Ideal para festas e eventos.`;
  if (/vaso.?decor/.test(n))
    return `Vaso decorativo artístico para plantas e flores artificiais ou naturais. Design moderno e sofisticado para decorar salas, quartos e escritórios.`;

  // Lingerie / íntimo
  if (/calcinha.?cinta/.test(n))
    return `Calcinha com cinta modeladora de cintura alta. Afina a silhueta e corrige a postura. Tecido elástico confortável, transparente sob roupas justas.`;
  if (/body.?model/.test(n))
    return `Body modelador fitness de compressão. Define a silhueta e proporciona sustentação extra. Ideal para academia e uso diário sob roupas.`;
  if (/boob.?tape/.test(n))
    return `Boob tape — fita adesiva modeladora para os seios. Discreto, resistente ao suor, permite usar roupas sem sutiã. Repositionável.`;
  if (/meia.?silic.*spa/.test(n))
    return `Meia de silicone para spa dos pés. Hidrata e amacia os pés durante o uso, com creme embutido. Deixa os pés macios e renovados.`;
  if (/protetor.?calcâ|protetor.?calca/.test(n))
    return `Protetor de calcanhar em silicone para aliviar o atrito e calosidades. Confortável e invisível dentro do calçado. Reutilizável.`;
  if (/protetor.*silic.*planta/.test(n))
    return `Protetor de silicone para planta do pé. Reduz o impacto e proporciona conforto durante caminhadas prolongadas. Fácil de colocar.`;

  // Inverno
  if (/cachecol.?liso.*pompom/.test(n))
    return `Cachecol liso com pompom — quentinho e estiloso para o inverno. Tecido macio e peludo, comprimento generoso para diferentes formas de usar.`;
  if (/cachecol.?xadrez.?premium/.test(n))
    return `Cachecol xadrez premium de tecido felpudo super macio. Estampa clássica e atemporal, aquece sem perder o estilo. Comprimento generoso.`;
  if (/cachecol.?xadrez/.test(n))
    return `Cachecol xadrez estiloso e quentinho. Estampa clássica ideal para o inverno. Tecido macio e leve, fácil de combinar com qualquer visual.`;
  if (/cachecol.?liso/.test(n))
    return `Cachecol liso e sofisticado para o frio. Cor neutra que combina com tudo, tecido macio e confortável. Perfeito para o inverno urbano.`;

  // Bolsas
  if (/pochete/.test(n))
    return `Pochete premium com alça ajustável e fecho seguro. Vários compartimentos para organizar documentos, celular e essenciais. Prático para passeios.`;

  // Papel de parede
  if (/papel.?de.?parede/.test(n))
    return `Papel de parede adesivo removível 45cm x 5m. Fácil de aplicar e remover sem deixar marcas. Renove sua decoração sem reforma. Diversas estampas.`;

  // Vales e presentes
  if (/vale.?presente/.test(n))
    return `Vale presente KA Bijoux — presente perfeito para quem você ama escolher. Válido para qualquer produto da loja. Entregue em embalagem especial.`;

  // Calçados
  if (/bota.?chuva/.test(n))
    return `Bota de chuva para tênis — protetor impermeável que veste sobre o tênis. Mantém os pés secos em dias chuvosos. Fácil de colocar e tirar.`;
  if (/chinelo.?time/.test(n))
    return `Chinelo temático de time de futebol. Confortável, resistente e estiloso para os fãs mostrarem sua paixão. Solado antiderrapante.`;
  if (/chinelo.?havaianas/.test(n))
    return `Chinelo estilo Havaianas branco clássico. Conforto e leveza para o dia a dia. Solado anatômico, resistente e durável.`;

  // Áudio / som
  if (/caixa.?som/.test(n))
    return `Caixa de som portátil 3 polegadas com conexão Bluetooth. Grave potente para o tamanho, bateria recarregável de longa duração. Prático para levar a qualquer lugar.`;

  return `${nome} — produto de qualidade KA Bijoux. Consulte detalhes e especificações com nossa equipe.`;
}

// ── MAIN ───────────────────────────────────────────────────────────────────────
const STATE   = 'kabijoux_import_' + Date.now();
const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${STATE}`;

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║     KA BIJOUX — IMPORTAÇÃO COMPLETA DE PRODUTOS  ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('\nAbra esse link no navegador para autorizar o Bling:');
console.log('\n' + authUrl + '\n');
console.log('Aguardando autorização...\n');

const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://localhost:3007');
  const code = url.searchParams.get('code');
  if (!code) { res.end('Sem código'); return; }

  console.log('Código recebido! Trocando por token...');

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  const tokenReq = https.request({
    hostname: 'www.bling.com.br',
    path: '/Api/v3/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (tokenRes) => {
    let data = '';
    tokenRes.on('data', d => data += d);
    tokenRes.on('end', async () => {
      const token = JSON.parse(data);
      if (!token.access_token) {
        console.log('Erro ao obter token:', data);
        res.end('Erro ao obter token');
        server.close();
        return;
      }

      console.log('Token obtido! Buscando todos os produtos do Bling...\n');

      try {
        const blingProducts = await fetchAllBlingProducts(token.access_token);
        console.log(`\nTotal produtos no Bling: ${blingProducts.length}`);

        console.log('\nImportando produtos faltando no banco...');
        const skuImageMap = buildSkuImageMap();
        const { importados, semBling } = await importProducts(blingProducts, skuImageMap);

        // Enviar nossas imagens editadas de volta para o Bling
        const { ok: imgOk } = await updateBlingImages(token.access_token, blingProducts, skuImageMap);

        const total = await prisma.product.count();
        console.log('\n╔══════════════════════════════════════╗');
        console.log(`║  Importados no banco: ${String(importados).padEnd(14)}║`);
        console.log(`║  Sem dados Bling: ${String(semBling).padEnd(18)}║`);
        console.log(`║  Imagens enviadas ao Bling: ${String(imgOk).padEnd(8)}║`);
        console.log(`║  Total no banco agora: ${String(total).padEnd(13)}║`);
        console.log('╚══════════════════════════════════════╝\n');

        res.end(`<h1>Importação concluída!</h1><p><b>${importados}</b> produtos importados no banco.</p><p><b>${imgOk}</b> imagens enviadas ao Bling.</p><p>Total no banco: <b>${total}</b></p><p>Feche esta aba.</p>`);
      } catch (err) {
        console.error('Erro na importação:', err);
        res.end('Erro: ' + err.message);
      } finally {
        server.close();
        await prisma.$disconnect();
      }
    });
  });
  tokenReq.write(body);
  tokenReq.end();
});

server.listen(3007);
