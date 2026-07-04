/**
 * KA Bijoux — Auditoria de Imagens de Produtos
 * ============================================================
 * Lê todos os produtos do Bling, classifica o status de imagem
 * de cada um, gera prompts para IA e organiza lotes de geração.
 *
 * Uso (a partir da raiz do projeto):
 *   cd scripts && npm install && npx tsx audit-catalog.ts
 *
 * Saída:
 *   ../reports/product-image-audit.json
 *   ../reports/product-image-audit.csv
 *   ../reports/image-generation-queue.json
 *   ../reports/image-generation-queue.csv
 *   ../reports/image-batches/batch-001.json  (e demais lotes)
 */

import fs   from 'fs';
import path from 'path';

// ── Paths ────────────────────────────────────────────────────
const ROOT     = path.resolve(__dirname, '..');
const BACKEND  = path.join(ROOT, 'backend');
const DATA     = path.join(BACKEND, 'data');
const UPLOADS  = path.join(BACKEND, 'public', 'uploads', 'products');
const REPORTS  = path.join(ROOT, 'reports');
const BATCHES  = path.join(REPORTS, 'image-batches');

// ── Config ───────────────────────────────────────────────────
const BATCH_SIZE        = 50;
const MIN_SCORE         = 0.62;
const GOOD_SCORE        = 0.80;

// Imagens que mostram múltiplas cores/variações num único arquivo
const GENERIC_IMAGE_PATTERNS = [
  /cores\.png$/i,
  /rosa-roxo\.png$/i,
  /multicolor/i,
  /todas-cores/i,
];

// ── Types ────────────────────────────────────────────────────
type ImageStatus =
  | 'OK_IMAGEM_BOA'
  | 'SEM_IMAGEM'
  | 'IMAGEM_GENERICA_KA'
  | 'IMAGEM_RUIM'
  | 'IMAGEM_ERRADA_VARIACAO'
  | 'PRECISA_REVISAO_MANUAL'
  | 'PRECISA_GERAR_IMAGEM';

type DescriptionStatus = 'DESCRICAO_OK' | 'DESCRICAO_GENERICA' | 'SEM_DESCRICAO';

interface AuditEntry {
  productId:         string;
  sku:               string;
  slug:              string;
  productName:       string;
  category:          string;
  categoryName:      string;
  subcategory:       string;
  subcategoryName:   string;
  price:             number;
  stock:             number;
  blingStatus:       string;
  color:             string;
  flavor:            string;
  variation:         string;
  currentImage:      string;
  imageSource:       string;
  imageScore:        string;
  imageStatus:       ImageStatus;
  descriptionStatus: DescriptionStatus;
  desiredFileName:   string;
  generatedPrompt:   string;
}

interface AuditSummary {
  generatedAt:              string;
  totalProducts:            number;
  totalActiveWithStock:     number;
  totalZeroStock:           number;
  totalOkImage:             number;
  totalSemImagem:           number;
  totalGenericImage:        number;
  totalBadImage:            number;
  totalWrongVariation:      number;
  totalNeedsGeneration:     number;
  totalNeedsManualReview:   number;
  totalBatches:             number;
  batchSize:                number;
}

// ── Data loading ─────────────────────────────────────────────
function loadJSON<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
  return JSON.parse(raw) as T;
}

type BlingRow = { id: string; nome: string; codigo: string; preco: string; situacao: string; estoque: string; categoria: string; [key: string]: string };
type MappingEntry = { src?: string; nome?: string; id?: string | number | null; sku?: string | null; obs?: string };

const blingRows:   BlingRow[]      = loadJSON(path.join(DATA, 'produtos-bling.json'));
const imageFiles:  string[]        = loadJSON(path.join(DATA, 'bling-image-files.json'));
const mappingRaw:  MappingEntry[]  = loadJSON(path.join(DATA, 'mapeamento-imagens-produtos.json'));

// Arquivos realmente presentes em /uploads/products no disco
const diskFiles = new Set(fs.readdirSync(UPLOADS).map(f => f.toLowerCase()));

// ── Static sex shop catalog (replicated from static-sex-shop-catalog.ts) ──
const STATIC_CATALOG: Record<string, string> = {
  '3104000004693': 'close-love-15g.png',
  '3104000004698': 'k-med-gel-intimo.png',
  '3104000004713': 'vamos-ser-feliz-gel.png',
  '3104000004704': 'rivosex-gel.png',
  '3104000004714': 'pererecard-gel.png',
  '3104000004709': 'pirocadura-gel.png',
  '3104000004707': 'beijo-grego-gel.png',
  '3104000004711': 'paracetaduro-gel.png',
  '3104000004710': 'pirocaexana-gel.png',
  '3104000004708': 'janumete-gel.png',
  '3104000004706': 'anis-sex-gel.png',
  '3104000004712': 'fofatoba-gel.png',
  '3104000004703': 'kama-sutra-gel.png',
  '3104000004719': 'hot-ice-gel.png',
  '3104000004726': 'amoxsex-gel.png',
  '3104000004727': 'virginite-gel.png',
  '3104000004718': 'sempre-virgem-gel.png',
  '3104000004705': 'metioulate-gel.png',
  '3104000004722': 'come-anel-gel.png',
  '3104000004715': 'mete-ficha-gel.png',
  '3104000004723': 'dando-uma-gostoso-gel.png',
  '3104000004755': 'vibrador-sexy-controle-cores.png',
  '3104000004751': 'vibrador-golfinho-rosa.png',
  '3104000004760': 'mini-bullet-rosa-ponta-fina.png',
  '3104000004758': 'mini-bullet-duplo-linguinha.png',
  '3104000004759': 'mini-bullet-duplo-rosa.png',
  '3104000004747': 'anel-peniano-bolinha-cores.png',
  '3104000004741': 'anel-peniano-orelha-cores.png',
  '3104000004742': 'anel-peniano-orelha-rosa-roxo.png',
  '3104000004696': 'egg-silky.png',
  '3104000004694': 'egg-stepper.png',
  '3104000000801': 'egg-twister.png',
  '3104000004695': 'egg-wavy.png',
  '3104000001491': 'nabucetim-18ml.png',
  '3104000001500': 'nocucedim-18ml.png',
  '3104000004310': 'desodorante-intimo-doce-paixao.png',
  '3104000004311': 'desodorante-intimo-tutti-frutti.png',
  '3104000004313': 'desodorante-intimo-morango.png',
};

// ── Image index ───────────────────────────────────────────────
const mappingById  = new Map<string, string>();  // blingId → filename
const mappingBySku = new Map<string, string>();  // sku → filename

for (const entry of mappingRaw) {
  const filename = entry.nome ?? '';
  if (!filename) continue;
  if (entry.id)  mappingById.set(String(entry.id).trim(),  filename);
  if (entry.sku) mappingBySku.set(String(entry.sku).trim(), filename);
}

// ── Normalizers ───────────────────────────────────────────────
function normalize(value: string): string {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function normalizeSpaces(v: string): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

// ── Colors / Flavors extraction ───────────────────────────────
const COLOR_MAP: Record<string, string> = {
  rosa: 'Rosa', roxo: 'Roxo', azul: 'Azul', verde: 'Verde',
  amarelo: 'Amarelo', laranja: 'Laranja', vermelho: 'Vermelho',
  preto: 'Preto', branco: 'Branco', cinza: 'Cinza',
  dourado: 'Dourado', prateado: 'Prateado', marrom: 'Marrom',
  bege: 'Bege', lilas: 'Lilás', transparente: 'Transparente',
  creme: 'Creme', nude: 'Nude', vinho: 'Vinho', coral: 'Coral',
  limon: 'Limão', prata: 'Prata', ouro: 'Ouro',
};

const FLAVOR_MAP: Record<string, string> = {
  morango: 'Morango', uva: 'Uva', menta: 'Menta', chocolate: 'Chocolate',
  caramelo: 'Caramelo', baunilha: 'Baunilha', maracuja: 'Maracujá',
  limao: 'Limão', tutti: 'Tutti Frutti', melancia: 'Melancia',
  pessego: 'Pêssego', abacaxi: 'Abacaxi', caipirinha: 'Caipirinha',
  tequila: 'Tequila', chiclete: 'Chiclete', framboesa: 'Framboesa',
  chantilly: 'Chantilly', iogurte: 'Iogurte', cereja: 'Cereja',
  mel: 'Mel', maca: 'Maçã Verde',
};

function extractColor(name: string): string {
  const n = normalize(name);
  // Pattern "Cor:ROSA" or "COR ROSA" from Bling
  const corMatch = n.match(/\bcor[:\s]+([a-z]+)/);
  if (corMatch && COLOR_MAP[corMatch[1]]) return COLOR_MAP[corMatch[1]];

  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (new RegExp(`\\b${key}\\b`).test(n)) return value;
  }
  return '';
}

function extractFlavor(name: string): string {
  const n = normalize(name);
  for (const [key, value] of Object.entries(FLAVOR_MAP)) {
    if (new RegExp(`\\b${key}\\b`).test(n)) return value;
  }
  return '';
}

function buildVariationText(color: string, flavor: string): string {
  return [color, flavor].filter(Boolean).join(' | ');
}

// ── Category inference ────────────────────────────────────────
function inferCategory(name: string): { categorySlug: string; categoryName: string; subcategory: string; subcategoryName: string } {
  const n = normalize(name);

  if (/\b(case|capinha|capa|iphone|ip\s*\d+|pelicula|carregador|fone|cabo|suporte|anel de celular)\b/.test(n))
    return { categorySlug: 'capinhas-acessorios-celular', categoryName: 'Capinhas e Acessórios de Celular', subcategory: '', subcategoryName: '' };

  if (/\b(cachecol|gorro|luva|inverno|touca|manta|xadrez)\b/.test(n))
    return { categorySlug: 'acessorios-inverno', categoryName: 'Acessórios de Inverno', subcategory: '', subcategoryName: '' };

  if (/\b(oculos|oculo)\b/.test(n))
    return { categorySlug: 'oculos', categoryName: 'Óculos', subcategory: 'oculos-adulto', subcategoryName: 'Adulto' };

  if (/\b(bolsa|necessaire|carteira|porta joia|porta joias|porta espelho)\b/.test(n))
    return { categorySlug: 'bolsas-necessaires', categoryName: 'Bolsas e Necessaires', subcategory: '', subcategoryName: '' };

  if (/\b(pijama|camisola)\b/.test(n))
    return { categorySlug: 'pijamas', categoryName: 'Pijamas', subcategory: '', subcategoryName: '' };

  if (/\b(lingerie|calcinha|sutia|body lingerie)\b/.test(n))
    return { categorySlug: 'lingerie', categoryName: 'Lingerie', subcategory: '', subcategoryName: '' };

  if (/\b(make|maquiagem|batom|rimel|mascara|gloss|sombra|base|corretivo|blush|delineador|sobrancelha)\b/.test(n))
    return { categorySlug: 'maquiagem', categoryName: 'Maquiagem', subcategory: '', subcategoryName: '' };

  if (/\b(perfume|colonia|body splash|hidratante|sabonete|shampoo|condicionador|pomada)\b/.test(n))
    return { categorySlug: 'perfumaria', categoryName: 'Perfumaria', subcategory: '', subcategoryName: '' };

  if (/\b(tiara|presilha|piranha|elástico|grampo|xuxinha|rabo de cavalo|diadema)\b/.test(n))
    return { categorySlug: 'acessorios-cabelo', categoryName: 'Acessórios de Cabelo', subcategory: '', subcategoryName: '' };

  if (/\b(pet|coleira|guia|pote pet)\b/.test(n))
    return { categorySlug: 'pet', categoryName: 'Pet', subcategory: '', subcategoryName: '' };

  if (/\b(caderno|caneta|lapis|papel|estojo|agenda)\b/.test(n))
    return { categorySlug: 'papelaria', categoryName: 'Papelaria', subcategory: '', subcategoryName: '' };

  if (/\b(brinquedo|boneca|bola|carrinho|jogo)\b/.test(n))
    return { categorySlug: 'brinquedos', categoryName: 'Brinquedos', subcategory: '', subcategoryName: '' };

  // Sex shop detection
  if (isAdultProduct(n)) {
    const sub = inferAdultSubcategory(n);
    const subNames: Record<string, string> = {
      'sex-shop-vibradores':    'Vibradores',
      'sex-shop-geis-e-cremes': 'Géis & Cremes',
      'sex-shop-aneis':         'Anéis Penianos',
      'sex-shop-masturbadores': 'Masturbadores',
      'sex-shop-lubrificantes': 'Lubrificantes',
      'sex-shop-balas-liquidas':'Balas Líquidas',
      'sex-shop-desodorantes':  'Desodorantes Íntimos',
    };
    return { categorySlug: 'sex-shop', categoryName: 'Linha Adulto', subcategory: sub, subcategoryName: subNames[sub] ?? 'Linha Adulto' };
  }

  // Bijuterias (default fallback for jewelry-like names)
  if (/\b(brinco|colar|pulseira|bracelete|broche|bijoux|missanga|pingente|argola|anel(?! peniano))\b/.test(n))
    return { categorySlug: 'bijuterias', categoryName: 'Bijuterias', subcategory: '', subcategoryName: '' };

  return { categorySlug: 'bijuterias', categoryName: 'Bijuterias', subcategory: '', subcategoryName: '' };
}

function isAdultProduct(n: string): boolean {
  return /\b(sexy|sex shop|sex|intimo|intima|lubrificante|vibrador|bullet|peniano|masturbador|algema|tesao|pocao|garganta profunda|virginite|anosex|egg silky|egg stepper|egg twister|egg wavy|egg milky|pau de cavalo|dessensibilizante|excitante|beijavel|desodorante intimo|anel peniano|plug|ponto g|clitoris)\b/.test(n) ||
    (/\bgel\b/.test(n) && /\b(excitant|sensual|massagem|estimulant|anestesico|dessensibilizante|hot ice|beijo|anal|sex|sexy)\b/.test(n));
}

function inferAdultSubcategory(n: string): string {
  if (/\b(desodorante)\b/.test(n))                                        return 'sex-shop-desodorantes';
  if (/\b(vibrador|bullet|sugador|golfinho|magic rose|mini bullet)\b/.test(n)) return 'sex-shop-vibradores';
  if (/\b(anel peniano|peniano|dedeira)\b/.test(n))                        return 'sex-shop-aneis';
  if (/\b(masturbador|egg silky|egg stepper|egg twister|egg wavy|egg milky)\b/.test(n)) return 'sex-shop-masturbadores';
  if (/\b(lubrificante|lub|k med|k-med|nabucetim|nocucedim)\b/.test(n))   return 'sex-shop-lubrificantes';
  if (/\b(tesao|pocao|bala liquida|pop ball|satisfaction caps|babaluu|garganta)\b/.test(n)) return 'sex-shop-balas-liquidas';
  return 'sex-shop-geis-e-cremes';
}

// ── Similarity scoring (same algorithm as bling-catalog.ts) ──
function tokenize(value: string): string[] {
  const stopwords = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'cor', 'para', 'e', 'a', 'o', 'em', 'ml', 'g', 'kg', 'un']);
  return normalize(value).split(/\s+/).filter(t => t.length >= 2 && !stopwords.has(t));
}

function similarityScore(aTokens: string[], bTokens: string[]): number {
  if (!aTokens.length || !bTokens.length) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let common = 0;
  for (const token of Array.from(a)) { if (b.has(token)) common++; }
  return common / Math.max(a.size, 3);
}

// ── Image resolution ─────────────────────────────────────────
type ResolvedImage = { filename: string; source: 'BLING' | 'MAPPING_ID' | 'MAPPING_SKU' | 'STATIC' | 'NAME_MATCH' | 'NONE'; score: number };

function resolveImage(row: BlingRow): ResolvedImage {
  const sku = normalizeSpaces(row.codigo);
  const id  = normalizeSpaces(row.id);

  // 1. Check mapping by Bling ID
  if (id && mappingById.has(id)) {
    const f = mappingById.get(id)!;
    if (diskFiles.has(f.toLowerCase())) return { filename: f, source: 'MAPPING_ID', score: 1 };
  }

  // 2. Check mapping by SKU
  if (sku && mappingBySku.has(sku)) {
    const f = mappingBySku.get(sku)!;
    if (diskFiles.has(f.toLowerCase())) return { filename: f, source: 'MAPPING_SKU', score: 1 };
  }

  // 3. Static catalog (by SKU)
  if (sku && STATIC_CATALOG[sku]) {
    const f = STATIC_CATALOG[sku];
    if (diskFiles.has(f.toLowerCase())) return { filename: f, source: 'STATIC', score: 1 };
  }

  // 4. Name similarity against available image files
  const productTokens = tokenize(row.nome);
  let best: { filename: string; score: number } | null = null;

  for (const f of imageFiles) {
    const nameOnly = f.replace(/\.[^.]+$/, '');
    const score = similarityScore(productTokens, tokenize(nameOnly));
    if (!best || score > best.score) best = { filename: f, score };
  }

  if (best && best.score >= MIN_SCORE && diskFiles.has(best.filename.toLowerCase())) {
    return { filename: best.filename, source: 'NAME_MATCH', score: best.score };
  }

  return { filename: '', source: 'NONE', score: 0 };
}

// ── Image classification ──────────────────────────────────────
function classifyImage(
  resolved: ResolvedImage,
  productName: string,
  color: string,
  imageUsageCount: Map<string, number>,
): ImageStatus {
  const { filename, source, score } = resolved;

  if (!filename || source === 'NONE') return 'SEM_IMAGEM';

  // Generic image: multi-color sprites / shared images
  const isGeneric =
    GENERIC_IMAGE_PATTERNS.some(p => p.test(filename)) ||
    (imageUsageCount.get(filename) ?? 0) > 3;

  if (isGeneric) return 'IMAGEM_GENERICA_KA';

  // Wrong variation: product has color X but image suggests color Y
  if (color) {
    const imageColor  = extractColorFromFilename(filename);
    if (imageColor && imageColor.toLowerCase() !== color.toLowerCase()) {
      return 'IMAGEM_ERRADA_VARIACAO';
    }
  }

  // Source-based quality
  if (source === 'STATIC' || source === 'MAPPING_ID' || source === 'MAPPING_SKU') {
    return 'OK_IMAGEM_BOA';
  }

  if (source === 'NAME_MATCH') {
    if (score >= GOOD_SCORE) return 'PRECISA_REVISAO_MANUAL';
    return 'IMAGEM_RUIM';
  }

  return 'PRECISA_REVISAO_MANUAL';
}

function extractColorFromFilename(filename: string): string {
  const n = normalize(filename.replace(/\.[^.]+$/, ''));
  for (const key of Object.keys(COLOR_MAP)) {
    if (new RegExp(`\\b${key}\\b`).test(n)) return key;
  }
  return '';
}

// ── Filename generator ────────────────────────────────────────
function buildDesiredFilename(name: string, sku: string): string {
  const slug = slugify(name).slice(0, 80);
  const skuPart = sku ? `-${sku}` : '';
  return `${slug}${skuPart}.jpg`;
}

// ── Prompt templates ──────────────────────────────────────────
const STYLE_BASE = 'Fundo branco ou cinza claro limpo, produto inteiro e centralizado, iluminação de estúdio profissional com sombra leve, perspectiva levemente inclinada ou frontal. Estilo fotográfico de e-commerce premium (referência: Shopee / Mercado Livre). Sem texto, sem watermark, sem pessoas, sem nudez, sem conteúdo explícito. Produto deve aparecer completo, sem corte.';

function buildPrompt(entry: { productName: string; categorySlug: string; subcategorySlug: string; color: string; flavor: string }): string {
  const { productName: name, categorySlug: cat, subcategorySlug: sub, color, flavor } = entry;
  const corText    = color  ? ` na cor ${color}`     : '';
  const saborText  = flavor ? ` sabor/aroma ${flavor}` : '';
  const varText    = color || flavor ? `${corText}${saborText}` : '';
  const subOrCat   = sub || cat;

  if (sub === 'sex-shop-vibradores')
    return `Imagem comercial premium de marketplace de um vibrador/bullet chamado "${name}"${varText}. ${STYLE_BASE}`;

  if (sub === 'sex-shop-geis-e-cremes')
    return `Imagem comercial de marketplace de um gel íntimo chamado "${name}"${saborText}${corText}. Embalagem em destaque. Elementos decorativos sutis relacionados ao aroma/sabor quando aplicável (ex: frutas, menta, flores). ${STYLE_BASE}`;

  if (sub === 'sex-shop-aneis')
    return `Imagem comercial de marketplace de um acessório íntimo (anel peniano) chamado "${name}"${varText}. Produto sobre superfície clean. ${STYLE_BASE}`;

  if (sub === 'sex-shop-masturbadores')
    return `Imagem comercial de marketplace de um masturbador masculino chamado "${name}"${varText}. Embalagem ou produto em destaque. ${STYLE_BASE}`;

  if (sub === 'sex-shop-lubrificantes')
    return `Imagem comercial de marketplace de um lubrificante íntimo chamado "${name}"${saborText}. Frasco/embalagem inteiro centralizado. Visual clean de saúde. ${STYLE_BASE}`;

  if (sub === 'sex-shop-desodorantes')
    return `Imagem comercial de marketplace de um desodorante íntimo chamado "${name}"${saborText}. Embalagem centralizada, elementos decorativos suaves relacionados à fragrância. ${STYLE_BASE}`;

  if (sub === 'sex-shop-balas-liquidas')
    return `Imagem comercial de marketplace de um produto íntimo chamado "${name}"${saborText}. Embalagem em destaque. Elementos visuais discretos relacionados ao sabor. ${STYLE_BASE}`;

  if (cat === 'sex-shop')
    return `Imagem comercial de marketplace de um produto adulto discreto chamado "${name}"${varText}. ${STYLE_BASE}`;

  if (cat === 'capinhas-acessorios-celular')
    return `Imagem comercial de marketplace de uma capinha/acessório de celular chamado "${name}"${varText}. Perspectiva mostrando frente e lateral. Sem texto ou marcas de terceiros visíveis. ${STYLE_BASE}`;

  if (cat === 'bijuterias')
    return `Imagem comercial de marketplace de uma bijuteria chamada "${name}"${varText}. Iluminação que realça brilho e detalhes delicados. Sobre superfície branca limpa ou base de veludo discreto. ${STYLE_BASE}`;

  if (cat === 'oculos')
    return `Imagem comercial de marketplace de óculos chamado "${name}"${varText}. Óculos aberto em posição de destaque (3/4 ou frontal). Iluminação que realça lentes e armação. ${STYLE_BASE}`;

  if (cat === 'bolsas-necessaires')
    return `Imagem comercial de marketplace de uma bolsa/necessaire chamada "${name}"${varText}. Pode mostrar bolsa aberta ou fechada, destacando detalhes (alça, zíper, textura). ${STYLE_BASE}`;

  if (cat === 'lingerie' || cat === 'pijamas')
    return `Imagem comercial de marketplace de uma peça de moda íntima chamada "${name}"${varText}. Exibida em cabide flat ou manequim sem rosto. Sem modelo real. ${STYLE_BASE}`;

  if (cat === 'maquiagem')
    return `Imagem comercial de marketplace de um produto de maquiagem chamado "${name}"${varText}. Embalagem em destaque, pode ter toque artístico sutil com textura/cor do produto. ${STYLE_BASE}`;

  if (cat === 'perfumaria')
    return `Imagem comercial de marketplace de um produto de perfumaria/cuidados chamado "${name}"${varText}. Frasco ou embalagem centralizado, iluminação elegante. ${STYLE_BASE}`;

  if (cat === 'acessorios-cabelo')
    return `Imagem comercial de marketplace de um acessório de cabelo chamado "${name}"${varText}. Produto bem centralizado sobre fundo clean. ${STYLE_BASE}`;

  if (cat === 'acessorios-inverno')
    return `Imagem comercial de marketplace de um acessório de inverno chamado "${name}"${varText}. Produto bem dobrado/exibido sobre fundo clean. ${STYLE_BASE}`;

  return `Imagem comercial profissional de marketplace de um produto chamado "${name}"${varText}. ${STYLE_BASE}`;
}

// ── Main audit ────────────────────────────────────────────────
function main() {
  console.log('🔍 KA Bijoux — Auditoria de Imagens\n');
  console.log(`📦 Produtos no Bling: ${blingRows.length}`);
  console.log(`🖼️  Arquivos de imagem disponíveis: ${imageFiles.length}`);
  console.log(`🗺️  Entradas no mapeamento: ${mappingRaw.length}\n`);

  // First pass: count image usage to detect shared images
  const imageUsageCount = new Map<string, number>();
  for (const row of blingRows) {
    const resolved = resolveImage(row);
    if (resolved.filename) {
      imageUsageCount.set(resolved.filename, (imageUsageCount.get(resolved.filename) ?? 0) + 1);
    }
  }

  const entries: AuditEntry[] = [];

  for (const row of blingRows) {
    const name   = normalizeSpaces(row.nome);
    const sku    = normalizeSpaces(row.codigo);
    const id     = normalizeSpaces(row.id);
    const price  = parseFloat(String(row.preco ?? '0').replace(',', '.')) || 0;
    const stock  = parseInt(String(row.estoque ?? '0'), 10) || 0;
    const status = normalizeSpaces(row.situacao) || 'A';

    const color   = extractColor(name);
    const flavor  = extractFlavor(name);
    const variation = buildVariationText(color, flavor);

    const cat = inferCategory(name);
    const resolved = resolveImage(row);

    const imgStatus = classifyImage(resolved, name, color, imageUsageCount);

    // Normalize final status: SEM_IMAGEM + variants that need generation
    let finalStatus: ImageStatus = imgStatus;
    if (imgStatus === 'SEM_IMAGEM' || imgStatus === 'IMAGEM_ERRADA_VARIACAO' || imgStatus === 'IMAGEM_GENERICA_KA') {
      finalStatus = 'PRECISA_GERAR_IMAGEM';
    }

    const descStatus: DescriptionStatus =
      !name || name.length < 3 ? 'SEM_DESCRICAO' :
      STATIC_CATALOG[sku]    ? 'DESCRICAO_OK' :
      'DESCRICAO_GENERICA';

    const desiredFileName = buildDesiredFilename(name, sku);
    const generatedPrompt = buildPrompt({
      productName:     name,
      categorySlug:    cat.categorySlug,
      subcategorySlug: cat.subcategory,
      color,
      flavor,
    });

    const productSlug = slugify(name).slice(0, 60) || `produto-${id}`;

    entries.push({
      productId:         id,
      sku,
      slug:              productSlug,
      productName:       name,
      category:          cat.categorySlug,
      categoryName:      cat.categoryName,
      subcategory:       cat.subcategory,
      subcategoryName:   cat.subcategoryName,
      price,
      stock,
      blingStatus:       status,
      color,
      flavor,
      variation,
      currentImage:      resolved.filename ? `/uploads/products/${resolved.filename}` : '',
      imageSource:       resolved.source,
      imageScore:        resolved.score > 0 ? resolved.score.toFixed(2) : '',
      imageStatus:       imgStatus,     // raw classification
      descriptionStatus: descStatus,
      desiredFileName,
      generatedPrompt,
    });
  }

  // ── Statistics ────────────────────────────────────────────
  const statuses   = (s: ImageStatus) => entries.filter(e => e.imageStatus === s).length;
  const needsGen   = entries.filter(e =>
    e.imageStatus === 'SEM_IMAGEM' ||
    e.imageStatus === 'IMAGEM_ERRADA_VARIACAO' ||
    e.imageStatus === 'IMAGEM_GENERICA_KA'
  );
  const queue      = needsGen.filter(e => e.stock > 0);  // prioritize in-stock products

  const summary: AuditSummary = {
    generatedAt:            new Date().toISOString(),
    totalProducts:          entries.length,
    totalActiveWithStock:   entries.filter(e => e.stock > 0).length,
    totalZeroStock:         entries.filter(e => e.stock <= 0).length,
    totalOkImage:           statuses('OK_IMAGEM_BOA'),
    totalSemImagem:         statuses('SEM_IMAGEM'),
    totalGenericImage:      statuses('IMAGEM_GENERICA_KA'),
    totalBadImage:          statuses('IMAGEM_RUIM'),
    totalWrongVariation:    statuses('IMAGEM_ERRADA_VARIACAO'),
    totalNeedsGeneration:   needsGen.length,
    totalNeedsManualReview: statuses('PRECISA_REVISAO_MANUAL'),
    totalBatches:           Math.ceil(queue.length / BATCH_SIZE),
    batchSize:              BATCH_SIZE,
  };

  // ── Print summary ─────────────────────────────────────────
  console.log('📊 RESUMO DA AUDITORIA\n' + '─'.repeat(50));
  console.log(`Total de produtos:          ${summary.totalProducts}`);
  console.log(`Com estoque:                ${summary.totalActiveWithStock}`);
  console.log(`Sem estoque:                ${summary.totalZeroStock}`);
  console.log('');
  console.log(`✅ OK_IMAGEM_BOA:            ${summary.totalOkImage}`);
  console.log(`❌ SEM_IMAGEM:               ${summary.totalSemImagem}`);
  console.log(`⚠️  IMAGEM_GENERICA_KA:      ${summary.totalGenericImage}`);
  console.log(`🔶 IMAGEM_RUIM:              ${summary.totalBadImage}`);
  console.log(`🔴 IMAGEM_ERRADA_VARIACAO:   ${summary.totalWrongVariation}`);
  console.log(`🔁 PRECISA_REVISAO_MANUAL:   ${summary.totalNeedsManualReview}`);
  console.log('');
  console.log(`🎯 Total que precisa gerar imagem: ${summary.totalNeedsGeneration}`);
  console.log(`📦 Lotes criados (${BATCH_SIZE}/lote):      ${summary.totalBatches}`);

  // ── Write JSON audit ──────────────────────────────────────
  const auditOutput = { summary, products: entries };
  fs.mkdirSync(REPORTS,  { recursive: true });
  fs.mkdirSync(BATCHES,  { recursive: true });

  fs.writeFileSync(path.join(REPORTS, 'product-image-audit.json'), JSON.stringify(auditOutput, null, 2), 'utf-8');
  console.log('\n✅ Relatório JSON gravado: reports/product-image-audit.json');

  // ── Write CSV audit ───────────────────────────────────────
  const csvHeader = [
    'productId','sku','slug','productName','category','categoryName',
    'subcategory','subcategoryName','price','stock','blingStatus',
    'color','flavor','variation','currentImage','imageSource','imageScore',
    'imageStatus','descriptionStatus','desiredFileName',
  ].join(',');

  const csvRows = entries.map(e => [
    e.productId, e.sku, e.slug, csvEscape(e.productName), e.category, csvEscape(e.categoryName),
    e.subcategory, csvEscape(e.subcategoryName), e.price, e.stock, e.blingStatus,
    e.color, e.flavor, csvEscape(e.variation), e.currentImage, e.imageSource, e.imageScore,
    e.imageStatus, e.descriptionStatus, e.desiredFileName,
  ].join(','));

  fs.writeFileSync(path.join(REPORTS, 'product-image-audit.csv'), [csvHeader, ...csvRows].join('\n'), 'utf-8');
  console.log('✅ Relatório CSV gravado:  reports/product-image-audit.csv');

  // ── Write generation queue ────────────────────────────────
  const queueEntries = needsGen.map(e => ({
    productId:       e.productId,
    sku:             e.sku,
    slug:            e.slug,
    productName:     e.productName,
    category:        e.category,
    categoryName:    e.categoryName,
    subcategory:     e.subcategory,
    subcategoryName: e.subcategoryName,
    price:           e.price,
    stock:           e.stock,
    color:           e.color,
    flavor:          e.flavor,
    variation:       e.variation,
    currentImage:    e.currentImage,
    imageStatus:     e.imageStatus,
    desiredFileName: e.desiredFileName,
    generatedPrompt: e.generatedPrompt,
    status:          e.stock > 0 ? 'FILA' : 'AGUARDANDO_ESTOQUE',
  }));

  fs.writeFileSync(path.join(REPORTS, 'image-generation-queue.json'), JSON.stringify(queueEntries, null, 2), 'utf-8');
  console.log('✅ Fila JSON gravada:      reports/image-generation-queue.json');

  const queueCsvHeader = 'productId,sku,slug,productName,category,subcategory,color,flavor,variation,currentImage,imageStatus,desiredFileName,status,generatedPrompt';
  const queueCsvRows   = queueEntries.map(e => [
    e.productId, e.sku, e.slug, csvEscape(e.productName), e.category, e.subcategory,
    e.color, e.flavor, csvEscape(e.variation), e.currentImage, e.imageStatus,
    e.desiredFileName, e.status, csvEscape(e.generatedPrompt),
  ].join(','));

  fs.writeFileSync(path.join(REPORTS, 'image-generation-queue.csv'), [queueCsvHeader, ...queueCsvRows].join('\n'), 'utf-8');
  console.log('✅ Fila CSV gravada:       reports/image-generation-queue.csv');

  // ── Write batches ─────────────────────────────────────────
  const priorityQueue = [
    ...queueEntries.filter(e => e.stock > 0).sort((a, b) => b.stock - a.stock),
    ...queueEntries.filter(e => e.stock <= 0),
  ];

  let batchIndex = 0;
  for (let i = 0; i < priorityQueue.length; i += BATCH_SIZE) {
    batchIndex++;
    const batch = {
      batchNumber:  batchIndex,
      totalBatches: summary.totalBatches,
      totalItems:   Math.min(BATCH_SIZE, priorityQueue.length - i),
      createdAt:    new Date().toISOString(),
      status:       'PENDENTE',
      items:        priorityQueue.slice(i, i + BATCH_SIZE),
    };
    const batchFile = path.join(BATCHES, `batch-${String(batchIndex).padStart(3, '0')}.json`);
    fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2), 'utf-8');
  }
  console.log(`✅ ${summary.totalBatches} lotes criados em: reports/image-batches/\n`);

  console.log('🏁 Auditoria concluída com sucesso!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('  1. Abra reports/image-generation-queue.json');
  console.log('  2. Abra reports/image-batches/batch-001.json para o primeiro lote');
  console.log('  3. Copie os prompts para a ferramenta de IA (DALL-E, Midjourney, etc.)');
  console.log('  4. Salve as imagens geradas em: generated-product-images/pending/');
  console.log('  5. Revise e mova para generated-product-images/approved/');
  console.log('  6. Execute: npx tsx import-generated-images.ts');
}

function csvEscape(value: string): string {
  if (!value) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

main();
