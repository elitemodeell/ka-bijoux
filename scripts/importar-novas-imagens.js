/**
 * importar-novas-imagens.js
 *
 * Importa as novas imagens da pasta Downloads para o projeto,
 * atualiza mapeamento-imagens-produtos.json e bling-image-files.json
 */

const fs = require('fs');
const path = require('path');

const BACKEND  = path.resolve(__dirname, '..', 'backend');
const UPLOADS  = path.join(BACKEND, 'public', 'uploads', 'products');
const DOWNLOADS = 'C:\\Users\\bruno\\Downloads\\produtos sex shop';
const MAPEAMENTO_PATH = path.join(BACKEND, 'data', 'mapeamento-imagens-produtos.json');
const IMAGE_FILES_PATH = path.join(BACKEND, 'data', 'bling-image-files.json');

// ── Novas entradas a importar ───────────────────────────────────────────────
const novasEntradas = [
  // EGG models (Magical Kiss)
  { src: "ChatGPT Image 18 de jun. de 2026, 17_20_43 (6).png", nome: "masturbador-egg-roxo-sexy-3104000004695.jpg", id: "16665844281", sku: "3104000004695" },
  { src: "ChatGPT Image 18 de jun. de 2026, 17_20_43 (7).png", nome: "masturbador-egg-laranja-sexy-3104000000801.jpg", id: "16516507187", sku: "3104000000801" },
  { src: "ChatGPT Image 18 de jun. de 2026, 17_20_44 (8).png", nome: "masturbador-egg-rosa-sexy-3104000004694.jpg", id: "16665843407", sku: "3104000004694" },

  // Mini Bullet
  { src: "ChatGPT Image 18 de jun. de 2026, 19_57_40 (1).png", nome: "mini-bullet-duplo-vibrador-3104000003541.jpg", id: "16602145620", sku: "3104000003541" },

  // Anel Peniano duplo com vibração
  { src: "ChatGPT Image 18 de jun. de 2026, 19_57_41 (3).png", nome: "anel-peniano-sexy-3104000000791.jpg", id: "16516502926", sku: "3104000000791" },

  // Mini Bullet Duplo Sugador roxo
  { src: "ChatGPT Image 18 de jun. de 2026, 20_00_34 (4).png", nome: "mini-bullet-duplo-sugador-rosa-3104000004757.jpg", id: "16666355542", sku: "3104000004757" },

  // Bolinhas Sexy Triplo-X
  { src: "ChatGPT Image 1 de jul. de 2026, 12_14_14 (2).png", nome: "bolinhas-sexy-triplo-x-3104000004862.jpg", id: "16667168307", sku: "3104000004862" },

  // Gel ForSexy
  { src: "ChatGPT Image 1 de jul. de 2026, 12_14_15 (4).png", nome: "gel-for-sexy-hot-caramelo-3104000004831.jpg", id: "16667109939", sku: "3104000004831" },
  { src: "ChatGPT Image 1 de jul. de 2026, 12_14_16 (5).png", nome: "gel-for-sexy-leite-condensado-3104000004832.jpg", id: "16667109943", sku: "3104000004832" },

  // Prendedores Sensuais com Guizos (sem SKU no Bling)
  { src: "ChatGPT Image 1 de jul. de 2026, 12_31_58 (1).png", nome: "prendedores-sensuais-guizos-rosa.jpg", id: null, sku: null, obs: "Prendedores Sensuais com Guizos Rosa - produto não encontrado no Bling" },
  { src: "ChatGPT Image 1 de jul. de 2026, 13_08_04 (4).png", nome: "prendedores-sensuais-guizos-vermelho.jpg", id: null, sku: null, obs: "Prendedores Sensuais com Guizos Vermelhos - produto não encontrado no Bling" },

  // Tapa-Mamilo / Tapa-Seios
  { src: "ChatGPT Image 1 de jul. de 2026, 12_32_01 (3).png", nome: "tapa-mamilo-brilho-x-prata-3104000004901.jpg", id: "16667217794", sku: "3104000004901" },
  { src: "ChatGPT Image 1 de jul. de 2026, 12_32_02 (4).png", nome: "tapa-mamilo-brilho-coracao-vermelho-3104000004875.jpg", id: "16667217787", sku: "3104000004875" },
  { src: "ChatGPT Image 1 de jul. de 2026, 12_32_03 (5).png", nome: "tapa-mamilo-fosco-x-vermelho-3104000004935.jpg", id: "16668111224", sku: "3104000004935" },
  { src: "ChatGPT Image 1 de jul. de 2026, 13_08_04 (2).png", nome: "tapa-mamilo-brilho-coracao-preto-3104000004900.jpg", id: "16667217790", sku: "3104000004900" },

  // Plugs Anais
  { src: "ChatGPT Image 1 de jul. de 2026, 21_30_24.png", nome: "plug-silicone-sexy-ancora-rosa-3104000005026.jpg", id: "16669055623", sku: "3104000005026" },
  { src: "ChatGPT Image 1 de jul. de 2026, 21_38_18.png", nome: "plug-silicone-textura-lilas-3104000005028.jpg", id: "16669057244", sku: "3104000005028" },
  { src: "ChatGPT Image 1 de jul. de 2026, 21_39_52.png", nome: "plug-silicone-cobrinha-vermelho-3104000005027.jpg", id: "16669055624", sku: "3104000005027" },

  // Bomba a Vácuo
  { src: "ChatGPT Image 1 de jul. de 2026, 21_32_17.png", nome: "bomba-vacuo-plastica-clink-vermelha-3104000004129.jpg", id: "16632703061", sku: "3104000004129" },
  { src: "ChatGPT Image 1 de jul. de 2026, 21_32_30.png", nome: "bomba-vacuo-plastica-clink-rosa.jpg", id: null, sku: null, obs: "Bomba a vácuo variante rosa - SKU similar: 3104000004129" },

  // Vibradores Premium
  { src: "ChatGPT Image 1 de jul. de 2026, 22_10_30.png", nome: "vibrador-premium-16-rosa-3104000004922.jpg", id: "16668048736", sku: "3104000004922" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_17_25.png", nome: "vibrador-premium-3-rosa-3104000004925.jpg", id: "16668048714", sku: "3104000004925" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_17_46.png", nome: "vibrador-premium-6-vermelho-3104000004928.jpg", id: "16668048718", sku: "3104000004928" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_18_19.png", nome: "vibrador-premium-1-rosa-3104000004915.jpg", id: "16668048710", sku: "3104000004915" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_18_36.png", nome: "vibrador-premium-17-roxo-3104000004923.jpg", id: "16668048737", sku: "3104000004923" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_20_06.png", nome: "vibrador-premium-5-roxo-3104000004927.jpg", id: "16668048716", sku: "3104000004927" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_24_29.png", nome: "vibrador-premium-14-roxo-3104000004920.jpg", id: "16668048732", sku: "3104000004920" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_40_33.png", nome: "vibrador-premium-9-roxo-3104000004931.jpg", id: "16668048725", sku: "3104000004931" },
  { src: "ChatGPT Image 1 de jul. de 2026, 22_40_45.png", nome: "vibrador-premium-11-roxo-3104000004917.jpg", id: "16668048728", sku: "3104000004917" },

  // Vibrador Rabbit / Coelho
  { src: "ChatGPT Image 2 de jul. de 2026, 08_07_05.png", nome: "vibrador-premium-2-rosa-3104000004924.jpg", id: "16668048712", sku: "3104000004924" },

  // Calcinhas com Strass
  { src: "ChatGPT Image 3 de jul. de 2026, 13_37_53 (1).png", nome: "calcinha-fio-strass-bandida-3104000004573.jpg", id: "16658073947", sku: "3104000004573" },
  { src: "ChatGPT Image 3 de jul. de 2026, 13_37_56 (2).png", nome: "calcinha-fio-strass-cachorra.jpg", id: null, sku: null, obs: "Calcinha CACHORRA - sem SKU individual no Bling; ref: 3104000004573" },
  { src: "ChatGPT Image 3 de jul. de 2026, 13_37_56 (3).png", nome: "calcinha-fio-strass-vadia.jpg", id: null, sku: null, obs: "Calcinha VADIA - sem SKU individual no Bling; ref: 3104000004573" },
  { src: "ChatGPT Image 3 de jul. de 2026, 13_37_56 (4).png", nome: "calcinha-fio-strass-fogosa.jpg", id: null, sku: null, obs: "Calcinha FOGOSA - sem SKU individual no Bling; ref: 3104000004573" },

  // Duelo do Prazer (novas versões)
  { src: "ChatGPT Image 30 de jun. de 2026, 20_45_50.png", nome: "duelo-do-prazer-36-posicoes-3104000004953.jpg", id: "16668699789", sku: "3104000004953" },
  { src: "ChatGPT Image 30 de jun. de 2026, 20_46_07.png", nome: "duelo-do-prazer-namoro-3104000004955.jpg", id: "16668699794", sku: "3104000004955" },
];

// ── Carregar dados existentes ───────────────────────────────────────────────
const mapeamento = JSON.parse(fs.readFileSync(MAPEAMENTO_PATH, 'utf8'));
const imageFiles = JSON.parse(fs.readFileSync(IMAGE_FILES_PATH, 'utf8'));

const existingSrcs = new Set(mapeamento.map(m => m.src));
const existingSkus = new Set(mapeamento.map(m => m.sku).filter(Boolean));
const existingNomes = new Set(imageFiles);

let copiados = 0, pulados = 0, erros = 0;
const novosMapeamentos = [];
const novosArquivos = [];

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   KA BIJOUX — IMPORTAR NOVAS IMAGENS             ║');
console.log('╚══════════════════════════════════════════════════╝\n');

for (const entrada of novasEntradas) {
  const srcPath = path.join(DOWNLOADS, entrada.src);
  const destPath = path.join(UPLOADS, entrada.nome);

  // Verificar se src já está no mapeamento
  if (existingSrcs.has(entrada.src)) {
    console.log(`  [JÁ MAPEADO] ${entrada.src}`);
    pulados++;
    continue;
  }

  // Verificar se SKU já está no mapeamento
  if (entrada.sku && existingSkus.has(entrada.sku)) {
    console.log(`  [SKU DUPLICADO] ${entrada.sku} — ${entrada.nome}`);
    pulados++;
    continue;
  }

  // Verificar se arquivo fonte existe
  if (!fs.existsSync(srcPath)) {
    console.log(`  [ARQUIVO NÃO ENCONTRADO] ${entrada.src}`);
    erros++;
    continue;
  }

  // Copiar arquivo
  try {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copiado: ${entrada.nome}`);
    copiados++;

    // Adicionar ao mapeamento
    const novaEntrada = { src: entrada.src, nome: entrada.nome, id: entrada.id, sku: entrada.sku };
    if (entrada.obs) novaEntrada.obs = entrada.obs;
    novosMapeamentos.push(novaEntrada);

    // Registrar novo arquivo
    if (!existingNomes.has(entrada.nome)) {
      novosArquivos.push(entrada.nome);
      existingNomes.add(entrada.nome);
    }

    existingSrcs.add(entrada.src);
    if (entrada.sku) existingSkus.add(entrada.sku);
  } catch (err) {
    console.error(`  ✗ Erro ao copiar ${entrada.src}: ${err.message}`);
    erros++;
  }
}

// ── Salvar mapeamento atualizado ────────────────────────────────────────────
if (novosMapeamentos.length > 0) {
  const mapeamentoAtualizado = [...mapeamento, ...novosMapeamentos];
  fs.writeFileSync(MAPEAMENTO_PATH, JSON.stringify(mapeamentoAtualizado, null, 2), 'utf8');
  console.log(`\n  ✓ mapeamento-imagens-produtos.json atualizado (${mapeamentoAtualizado.length} entradas total)`);

  const imageFilesAtualizado = [...imageFiles, ...novosArquivos];
  fs.writeFileSync(IMAGE_FILES_PATH, JSON.stringify(imageFilesAtualizado, null, 2), 'utf8');
  console.log(`  ✓ bling-image-files.json atualizado (${imageFilesAtualizado.length} arquivos total)`);
}

console.log('\n╔══════════════════════════════════════╗');
console.log(`║  Copiados:  ${String(copiados).padEnd(25)}║`);
console.log(`║  Pulados:   ${String(pulados).padEnd(25)}║`);
console.log(`║  Erros:     ${String(erros).padEnd(25)}║`);
console.log('╚══════════════════════════════════════╝\n');
