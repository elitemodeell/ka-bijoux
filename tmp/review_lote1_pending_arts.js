const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "reports", "product-lote-1");
const PENDING_CSV = path.join(REPORT_DIR, "lote1-phase2-pending-review.csv");
const BLING_PATH = path.join(ROOT, "backend", "data", "produtos-bling.json");

const rows = [
  [1, "Ninho para bebe com mosquiteiro", "PROVAVEL_REVISAR", "3104000004292", "MOSQUITEIRO PARA CAMA", "Arte mostra ninho/colchonete com mosquiteiro; Bling tem mosquiteiro para cama, mas nao e o mesmo nome exato."],
  [3, "Colchonete infantil portatil", "MANTER_PENDENTE", "", "", "Nao achei SKU local com colchonete infantil portatil."],
  [5, "Caneca misturadora automatica", "PROVAVEL_REVISAR", "3104000000720", "CANECA", "Bling tem caneca generica, mas nao achei caneca misturadora automatica."],
  [9, "Bola interativa para gatos", "SEGURO_APLICAR", "3104000004365", "BRINQUEDO BOLA TEASER", "Produto visualmente compativel com brinquedo bola para pet/gato."],
  [14, "Oculos aviador", "PROVAVEL_REVISAR", "3104000000305", "OCULOS DE SOL", "Modelo aviador; Bling tem oculos de sol generico. Melhor revisar variacao/modelo."],
  [15, "Oculos redondos", "PROVAVEL_REVISAR", "3104000000305", "OCULOS DE SOL", "Modelo redondo; Bling tem oculos de sol generico. Melhor revisar variacao/modelo."],
  [17, "Dedeira de silicone para pets", "MANTER_PENDENTE", "", "", "Bling tem dedeira sexy, nao pet. Nao associar errado."],
  [18, "Escova dedeira para pets", "PROVAVEL_REVISAR", "3104000004360", "ESCOVA DE DENTE 2PONTAS PARA PET", "Mesmo tema pet/higiene, mas cadastro nao fala dedeira."],
  [22, "Difusor de aromas 250 ml", "PROVAVEL_REVISAR", "3104000000718", "VASO DIFUSOR PREMIUM", "Ha difusor/vaso no Bling, mas a arte mostra frasco 250 ml com fragrancias."],
  [23, "Espelho de mesa com gavetas", "SEGURO_APLICAR", "3104000004208", "GAVETEIRO DE GATINHA COM ESPELHO", "Arte bate com espelho/gaveteiro de mesa com gavetas."],
  [24, "Catnip para gatos", "PROVAVEL_REVISAR", "3104000004359", "BRINQUEDO ABACATE COM CATNIP PARA PET", "Bling tem produto com catnip, mas arte parece produto catnip individual."],
  [26, "Removedor eletrico de calos", "MANTER_PENDENTE", "", "", "Bling tem kit ralador de calos, nao removedor eletrico."],
  [31, "Espelho de mesa gatinho", "SEGURO_APLICAR", "3104000000462", "ESPELHO DE MESA", "Varia/modelo de espelho de mesa."],
  [32, "Espelho flor de mesa", "SEGURO_APLICAR", "3104000000462", "ESPELHO DE MESA", "Varia/modelo de espelho de mesa."],
  [38, "Protetor de calcanhar em silicone", "SEGURO_APLICAR", "3104000001146", "PROTETOR DE CALCANHAR C/2", "Produto bate com protetor de calcanhar."],
  [39, "Sapateira multiuso", "SEGURO_APLICAR", "3104000001222", "PRATILEIRA DE SAPATO", "Arte bate com prateleira/sapateira para sapatos."],
  [50, "Cabide organizador multiuso", "SEGURO_APLICAR", "3104000000957", "CABIDE ORGANIZADOR", "Produto bate com cabide organizador."],
  [53, "Organizador suspenso multiuso", "SEGURO_APLICAR", "3104000000985", "ORGANIZADOR MULTIUSO", "Produto bate com organizador multiuso suspenso."],
  [54, "Organizador com bolsos", "SEGURO_APLICAR", "3104000000985", "ORGANIZADOR MULTIUSO", "Produto bate com organizador multiuso com bolsos."],
  [55, "Organizador de calcados e acessorios", "SEGURO_APLICAR", "3104000001222", "PRATILEIRA DE SAPATO", "Arte mostra organizador de calcados/acessorios; bate com sapateira/prateleira."],
  [56, "Fone de ouvido com fio branco P2", "PROVAVEL_REVISAR", "3104000000606", "FONE PINO P1 C/MICROFONE", "Arte diz P2 3.5 mm; cadastro local fala P1. Conferir antes."],
  [63, "Perfume La Bella", "SEGURO_APLICAR", "3104000003766", "PERFUME LA BELLA", "Nome e embalagem batem."],
  [64, "Fone de ouvido com fio preto", "PROVAVEL_REVISAR", "3104000000606", "FONE PINO P1 C/MICROFONE", "Fone com fio, mas cadastro local fala P1."],
  [67, "Carregador rapido QGold 40W", "PROVAVEL_REVISAR", "", "", "Nao achei SKU 40W exato no export local."],
  [68, "Adaptador USB-C 30W", "PROVAVEL_REVISAR", "", "", "Nao achei SKU 30W exato no export local."],
  [69, "Adaptador USB-C 20W", "SEGURO_APLICAR", "3104000004348", "FONTE USB - C 20W", "Nome/potencia batem."],
  [72, "Fone de ouvido com fio preto P2", "PROVAVEL_REVISAR", "3104000000606", "FONE PINO P1 C/MICROFONE", "Arte diz P2 3.5 mm; cadastro local fala P1."],
  [73, "Kit de carregamento carregador e cabo USB-C 60W", "PROVAVEL_REVISAR", "", "", "Parece kit fonte+cabo, mas nao achei SKU unico exato."],
  [74, "Carregador rapido 3.1A QGold", "PROVAVEL_REVISAR", "", "", "Nao achei SKU 3.1A QGold exato."],
  [75, "Carregadores rapidos modelos variados", "MANTER_PENDENTE", "", "", "Arte tem mais de um produto/modelo; precisa decidir produto principal ou variacoes."],
  [76, "Carregador 3 USB", "PROVAVEL_REVISAR", "3104000000607", "FONTE 2 ENTRADAS USB", "Cadastro local nao bate com 3 USB; revisar."],
  [78, "Cabo de carregamento USB-C 60W Hmaston", "SEGURO_APLICAR", "3104000004339", "CABO USB-C / TIPO C 60W", "Nome/tipo/potencia batem."],
  [79, "Cabo Micro USB 1m", "SEGURO_APLICAR", "3104000000162", "CABO USB / V8 MICRO 60W", "Bate como cabo Micro/V8."],
  [81, "Cabos de dados rapido Lightning e Type-C", "MANTER_PENDENTE", "", "", "Arte contem dois tipos de cabo; precisa separar ou cadastrar variacoes corretas."],
  [85, "Kit carregador Tipo-C 5.1A QGold", "PROVAVEL_REVISAR", "", "", "Parece kit fonte+cabo Tipo-C, mas nao achei SKU QGold 5.1A exato."],
  [86, "Kit carregador iOS 5.1A QGold", "PROVAVEL_REVISAR", "", "", "Parece kit fonte+cabo iOS, mas nao achei SKU QGold 5.1A exato."],
  [87, "Fone de ouvido com fio preto", "PROVAVEL_REVISAR", "3104000000606", "FONE PINO P1 C/MICROFONE", "Fone com fio, mas cadastro local fala P1."],
  [90, "Organizador multiuso com divisoes", "SEGURO_APLICAR", "3104000000473", "ORGANIZADOR DE COMPRIMIDO", "Arte mostra estojo organizador com divisoes coloridas; bate com comprimidos."],
  [94, "Caixa de som com microfones", "SEGURO_APLICAR", "3104000001380", "CAIXA DE SOM + MICROFONE", "Nome e produto batem."],
  [95, "Perfume Lady Billion", "SEGURO_APLICAR", "3104000003767", "PERFUME LADY BILLION", "Nome e embalagem batem."],
  [97, "Porta-joias com visor", "SEGURO_APLICAR", "3104000000240", "PORTA JOIA PREMIUM", "Produto bate com porta-joias premium/visor."],
  [105, "Protetor de calcanhar adesivo", "PROVAVEL_REVISAR", "3104000001146", "PROTETOR DE CALCANHAR C/2", "Mesmo uso, mas arte especifica adesivo."],
  [106, "Protetor de silicone para planta do pe", "SEGURO_APLICAR", "3104000001148", "PROTETOR DE SILICONE PLANTA DO PE", "Nome e produto batem."],
  [108, "Mini karaoke portatil caixa com microfone", "SEGURO_APLICAR", "3104000001380", "CAIXA DE SOM + MICROFONE", "Produto bate com caixa de som + microfone."],
  [109, "Microfone karaoke portatil", "SEGURO_APLICAR", "3104000000630", "MICROFONE C/BLUETOOTH PRETO", "Produto principal existe; cores podem ficar como variacoes."],
  [110, "Organizador para sapatos", "SEGURO_APLICAR", "3104000001221", "ORGANIZADOR DE SAPATO", "Nome e uso batem."],
  [111, "Perfume feminino 45ml sortido", "MANTER_PENDENTE", "", "", "Arte mostra varias fragrancias; precisa escolher SKU/aroma correto."],
  [112, "Organizador multiuso para viagem", "PROVAVEL_REVISAR", "3104000000242", "KIT C/6 BOLSA DE VIAGEM", "Produto parece kit/bolsa de viagem, mas nao e exatamente o mesmo visual."],
  [114, "Kit organizador de mala", "SEGURO_APLICAR", "3104000000242", "KIT C/6 BOLSA DE VIAGEM", "Produto bate com kit organizador/bolsas de viagem."],
  [115, "Organizacao para sua viagem", "SEGURO_APLICAR", "3104000000242", "KIT C/6 BOLSA DE VIAGEM", "Produto bate como variacao/galeria do kit."],
  [116, "Organizador de mala estampado", "SEGURO_APLICAR", "3104000000242", "KIT C/6 BOLSA DE VIAGEM", "Produto bate como variacao/galeria do kit."],
  [117, "Organizador de mala", "SEGURO_APLICAR", "3104000000242", "KIT C/6 BOLSA DE VIAGEM", "Produto bate como variacao/galeria do kit."],
  [128, "Aero Glitter 3 em 1", "SEGURO_APLICAR", "3104000003115", "SPRAY GLITTER", "Produto bate com spray glitter."],
  [129, "Protetor de mamilo em silicone", "SEGURO_APLICAR", "3104000000064", "TAPA MAMILO SILICONE", "Nome/produto batem."],
  [131, "Kit frascos de viagem", "SEGURO_APLICAR", "3104000004899", "KIT FRASCO PARA VIAGEM", "Nome/produto batem."],
  [133, "Base brilhante acessorio", "MANTER_PENDENTE", "", "", "Nao ficou claro se e cosmestico, base de unha ou acessorio decorativo; nao associar."],
  [137, "Luminaria 3D coracao", "SEGURO_APLICAR", "3104000005817", "LUMINARIA LED P/ESCREVER CORAÇÃO", "Nome/modelo coracao batem."],
  [139, "Luminaria 3D LED", "SEGURO_APLICAR", "3104000001384", "LUMINARIA LED P/ESCREVER", "Produto principal bate; forma/modelo pode ser variacao."],
  [140, "Capa com alca para celular", "MANTER_PENDENTE", "", "", "Bling nao tem SKU exato de capa com alca; varios modelos de capa podem confundir."],
  [141, "Capa com cordao brilhante", "MANTER_PENDENTE", "", "", "Bling nao tem SKU exato de capa com cordao brilhante."],
  [143, "Elasticos de cabelo", "SEGURO_APLICAR", "3104000000151", "ELASTICO PRENDEDOR", "Produto bate como elastico/prendedor."],
  [153, "Relogio digital retro prata", "MANTER_PENDENTE", "", "", "Bling tem relogio generico, mas nao achei SKU digital retro."],
  [154, "Relogio digital retro cores", "MANTER_PENDENTE", "", "", "Arte tem variacoes de cor; precisa SKU/modelo correto."],
  [155, "Relogio digital retro", "MANTER_PENDENTE", "", "", "Nao achei SKU digital retro exato."],
  [158, "Relogio feminino analogico", "MANTER_PENDENTE", "", "", "Bling tem relogio generico; modelo feminino nao identificado com seguranca."],
  [159, "Relogio feminino analogico", "MANTER_PENDENTE", "", "", "Modelo/variacao sem SKU seguro."],
  [160, "Relogio feminino analogico cores", "MANTER_PENDENTE", "", "", "Arte tem opcoes de modelo; precisa SKU/variacao correta."],
  [168, "Regata modeladora com ziper", "PROVAVEL_REVISAR", "3104000004287", "CINTA MODELADORA FITNESS", "Mesmo tema modelador, mas cadastro nao fala regata."],
  [172, "Regata modeladora com ziper", "PROVAVEL_REVISAR", "3104000004287", "CINTA MODELADORA FITNESS", "Mesmo tema modelador, mas cadastro nao fala regata."],
  [175, "Pulseira dourada", "MANTER_PENDENTE", "", "", "Bijuteria sem SKU exato; ha muitas pulseiras parecidas."],
  [176, "Pulseira dourada", "MANTER_PENDENTE", "", "", "Bijuteria sem SKU exato; ha muitas pulseiras parecidas."],
  [178, "Pulseira dourada com detalhes", "MANTER_PENDENTE", "", "", "Bijuteria sem SKU exato; nao associar por semelhanca."],
  [180, "Pulseira com cabo metalico", "MANTER_PENDENTE", "", "", "Nao achei SKU com cabo metalico."],
  [182, "Colar prateado com pingente", "MANTER_PENDENTE", "", "", "Colar generico demais; precisa SKU exato."],
  [183, "Colar coracao vazado", "MANTER_PENDENTE", "", "", "Nao achei SKU exato coracao vazado."],
  [184, "Colar coracao geometrico dourado", "MANTER_PENDENTE", "", "", "Nao achei SKU exato; pode confundir com relicario/coracao."],
  [185, "Colar coracao dourado", "MANTER_PENDENTE", "", "", "Bijuteria parecida com varios modelos; precisa SKU."],
  [186, "Pulseira dourada delicada", "MANTER_PENDENTE", "", "", "Bijuteria sem SKU exato."],
  [189, "Colar coracao geometrico prata", "MANTER_PENDENTE", "", "", "Nao achei SKU exato."],
  [190, "Colar pingente redondo dourado", "MANTER_PENDENTE", "", "", "Nao achei SKU exato."],
  [191, "Colar coracao delicado prata", "MANTER_PENDENTE", "", "", "Nao achei SKU exato."],
  [194, "Choker com brilho delicado", "PROVAVEL_REVISAR", "3104000000751", "CHOKER", "Existe choker generico, mas modelo/strass precisa confirmacao."],
  [195, "Mix de colares dourado", "SEGURO_APLICAR", "3104000005354", "MIX COLAR GROSSO DOURADO", "Nome e cor batem como mix de colares dourado."],
  [196, "Colar prateado moderno", "MANTER_PENDENTE", "", "", "Nao achei SKU exato para esse modelo."],
  [197, "Colar ou choker com brilho", "PROVAVEL_REVISAR", "3104000000517", "CHOKER PREMIUM", "Pode ser choker/colar, mas precisa confirmar modelo."],
  [198, "Colar delicado moderno", "MANTER_PENDENTE", "", "", "Nao achei SKU exato."],
  [199, "Pulseira pedra turquesa dourada oval", "SEGURO_APLICAR", "3104000005384", "PULSEIRA PEDRA TURQUESA DOURADA OVAL", "Nome/cor/formato batem."],
  [200, "Pulseira pedra turquesa prata oval", "SEGURO_APLICAR", "3104000005383", "PULSEIRA PEDRA TURQUESA PRATA OVAL", "Nome/cor/formato batem."],
  [201, "Pulseira pedra turquesa", "PROVAVEL_REVISAR", "", "PULSEIRA PEDRA TURQUESA", "Imagem nao deixa claro se e oval/redonda e dourada/prata."],
  [202, "Relicario coracao prata", "PROVAVEL_REVISAR", "", "RELICARIO CORAÇÃO", "Ha varios relicarios coracao; precisa subtipo correto."],
  [203, "Relicario redondo dourado", "PROVAVEL_REVISAR", "3104000005052", "RELICARIO REDONDO FLOR DOURADO", "Candidato bom, mas precisa confirmar se e flor."],
  [204, "Pingente redondo dourado", "MANTER_PENDENTE", "", "", "Nao achei SKU de pingente redondo simples; pode nao ser relicario."],
  [205, "Relicario coracao prata", "PROVAVEL_REVISAR", "", "RELICARIO CORAÇÃO", "Ha varios relicarios coracao; precisa subtipo correto."],
  [206, "Coracao geometrico prata", "PROVAVEL_REVISAR", "3104000005232", "RELICARIO CORAÇÃO TRIANGULO PRATA", "Pode bater, mas precisa confirmar se e relicario ou apenas colar."],
  [207, "Aneis para cabelo dourado", "SEGURO_APLICAR", "3104000001048", "ANEL DE CABELO P DOURADO", "Nome/cor batem."],
  [213, "Pulseira shine aco inoxidavel", "MANTER_PENDENTE", "", "", "Nao achei SKU Pulseira Shine/Aco Inoxidavel."],
  [215, "Pulseira pedra turquesa", "PROVAVEL_REVISAR", "", "PULSEIRA PEDRA TURQUESA", "Precisa identificar formato/cor antes de associar."],
  [217, "Aspirador portatil sem fio", "SEGURO_APLICAR", "3104000000021", "ASPIRADOR E SOPRADOR DE AR", "Produto bate com aspirador/soprador portatil."],
  [219, "Luminaria 3D criativa", "SEGURO_APLICAR", "3104000001384", "LUMINARIA LED P/ESCREVER", "Produto principal bate; modelo pode ir como galeria/variacao."],
  [225, "Lampada LED com alto-falante", "SEGURO_APLICAR", "3104000001749", "LAMPADA LED COM CONTROLE", "Usuario confirmou que e a mesma logica/produto de lampada."],
  [230, "Sunset Lamp LED", "MANTER_PENDENTE", "", "", "Nao achei SKU Sunset Lamp no Bling local."],
  [240, "Calcinha fio renda frase Bandida", "SEGURO_APLICAR", "3104000004575", "CALCINHA FIO RENDA FRASE", "Produto principal bate; frase vira variacao na plataforma."],
  [241, "Calcinha fio renda frase Cachorra", "SEGURO_APLICAR", "3104000004575", "CALCINHA FIO RENDA FRASE", "Produto principal bate; frase vira variacao na plataforma."],
  [242, "Calcinha fio renda frase Vadia", "SEGURO_APLICAR", "3104000004575", "CALCINHA FIO RENDA FRASE", "Produto principal bate; frase vira variacao na plataforma."],
  [243, "Calcinha fio renda frase Princesa", "SEGURO_APLICAR", "3104000004575", "CALCINHA FIO RENDA FRASE", "Produto principal bate; frase vira variacao na plataforma."],
  [244, "Calcinha fio renda frase varias cores", "SEGURO_APLICAR", "3104000004575", "CALCINHA FIO RENDA FRASE", "Imagem principal/galeria do produto principal."],
];

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let quote = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quote && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quote = !quote;
      }
    } else if (char === ";" && !quote) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function readSemicolonCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  return lines.filter(Boolean).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ""]));
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[;"\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, data) {
  const headers = Object.keys(data[0] || {});
  const lines = [headers.join(";")];
  for (const row of data) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(";"));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const pending = readSemicolonCsv(PENDING_CSV);
  const pendingByItem = new Map(pending.map((row) => [Number(row.item), row]));
  const blingRows = JSON.parse(fs.readFileSync(BLING_PATH, "utf8"));
  const blingBySku = new Map(blingRows.map((product) => [String(product.codigo || "").trim(), product]));

  const reviewed = rows.map(([item, visualName, decision, candidateSku, candidateName, reason]) => {
    const pendingRow = pendingByItem.get(Number(item));
    const product = candidateSku ? blingBySku.get(String(candidateSku)) : null;
    return {
      item,
      arquivo: pendingRow?.sourceFile || "",
      arte_identificada: visualName,
      decisao: decision,
      sku_candidato: candidateSku || "",
      produto_bling_candidato: product?.nome || candidateName || "",
      preco_bling: product?.preco ?? "",
      estoque_bling: product?.estoque ?? "",
      motivo: reason,
    };
  });

  const reviewedItems = new Set(reviewed.map((row) => Number(row.item)));
  const missing = pending.filter((row) => !reviewedItems.has(Number(row.item)));
  if (missing.length) {
    throw new Error(`Itens pendentes sem revisao no script: ${missing.map((row) => row.item).join(", ")}`);
  }

  const counts = reviewed.reduce((acc, row) => {
    acc[row.decisao] = (acc[row.decisao] || 0) + 1;
    return acc;
  }, {});

  const csvPath = path.join(REPORT_DIR, "pending-art-review-full.csv");
  writeCsv(csvPath, reviewed);

  const safe = reviewed.filter((row) => row.decisao === "SEGURO_APLICAR");
  const probable = reviewed.filter((row) => row.decisao === "PROVAVEL_REVISAR");
  const manual = reviewed.filter((row) => row.decisao === "MANTER_PENDENTE");

  const md = [
    "# Revisao das artes pendentes - produto lote 1",
    "",
    `Data: ${new Date().toISOString()}`,
    "",
    "## Resumo",
    "",
    `- Artes pendentes revisadas: ${reviewed.length}`,
    `- Seguras para aplicar: ${safe.length}`,
    `- Provaveis, mas precisam revisao: ${probable.length}`,
    `- Manter pendente/manual: ${manual.length}`,
    "",
    "## Observacoes",
    "",
    "- Eu contei 106 imagens pendentes reais. O arquivo extra na pasta e `lista-das-106-pendentes.csv`, que e controle, nao arte.",
    "- `SEGURO_APLICAR` quer dizer que encontrei produto principal compativel no Bling local.",
    "- `PROVAVEL_REVISAR` quer dizer que ha candidato, mas existe diferenca de nome, modelo, potencia, cor ou tipo.",
    "- `MANTER_PENDENTE` quer dizer que eu nao associaria sem confirmacao manual.",
    "- Nenhuma atualizacao online no Bling foi feita por este relatorio.",
    "",
    "## Seguras Para Aplicar",
    "",
    ...safe.map((row) => `- Item ${row.item}: ${row.arte_identificada} -> ${row.sku_candidato} / ${row.produto_bling_candidato}`),
    "",
    "## Provaveis, Revisar Antes",
    "",
    ...probable.map((row) => `- Item ${row.item}: ${row.arte_identificada} -> ${row.sku_candidato || "sem SKU unico"} / ${row.produto_bling_candidato || "sem candidato"} (${row.motivo})`),
    "",
    "## Manter Pendente",
    "",
    ...manual.map((row) => `- Item ${row.item}: ${row.arte_identificada} (${row.motivo})`),
    "",
    "## Arquivo Completo",
    "",
    `- ${path.relative(ROOT, csvPath).replace(/\\/g, "/")}`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(REPORT_DIR, "pending-art-review-full.md"), md, "utf8");
  console.log(JSON.stringify({ total: reviewed.length, ...counts }, null, 2));
}

main();
