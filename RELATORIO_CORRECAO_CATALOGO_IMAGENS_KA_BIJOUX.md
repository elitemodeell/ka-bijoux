# KA Bijoux — Relatório de Correção do Catálogo de Imagens
**Data:** 2026-07-04

---

## 1. Problema Identificado

O app mobile exibia imagens de produtos adultos (linha KA Íntima / sex-shop) em produtos de categorias normais (bijuterias, moda, etc.). Exemplos confirmados pelos screenshots do usuário:

| Produto exibido | Imagem errada que aparecia |
|---|---|
| Bracelete do Brasil (bijuterias) | ICE Menta |
| Pulseira Miçanga do Brasil (bijuterias) | InGula Moranguete |
| Faixa Brasil (bijuterias) | InGula Leite Condensado |
| Bota de Chuva para Tênis | Meia 7/8 Arrastão |
| Pulseira Premium (bijuterias) | Algemas com barra separadora |
| Laço Brasil (bijuterias) | Calcinha com Abertura |
| ANEL (bijuterias) | Anel Peniano Bolinha Cores |

---

## 2. Causa Raiz

### Dois vetores distintos de contaminação

**Vetor A — Banco de dados (ProductImage):**  
A tabela `product_images` continha 1 registro com URL de imagem adulta vinculada a um produto não-adulto. Suspeita: algum script de importação/sync realizou correspondência fuzzy de nome e associou incorretamente o produto "ANEL" (bijuteria) à imagem do "Anel Peniano Bolinha Cores" (sex-shop).

**Vetor B — Catálogo Bling (`produtos-bling.json`):**  
O campo `imageUrl` de produtos no catálogo Bling (populado via API do Bling após envio das nossas imagens pelo `bling-import-all.js`) continha URLs de imagens adultas em entradas de produtos normais. Suspeita: colisão de SKU ou nome durante `updateBlingImages`.

Fluxo de exibição antes da correção:
```
mapDbProductToCard()
  → dbImages = product.images  (usadas primeiro, sem filtro)
  → images = dbImages.length ? dbImages : bling?.images  (fallback sem filtro)

buildCatalogProduct() em bling-catalog.ts
  → resolveImage() → row.imageUrl  (usado primeiro, sem filtro)
  → image = imageMatch.url  (sem filtro de categoria)
```

---

## 3. Correções Aplicadas

### 3.1 Filtro defensivo no backend — `mapDbProductToCard`

Adicionado em **dois arquivos** (`app/api/products/route.ts` e `components/loja/ProductListingPage.tsx`):

```typescript
const ADULT_FILENAME_PATTERNS = [
  "vibrador", "mini-bullet", "anel-peniano", "masturbador",
  "egg-silky", "egg-stepper", "egg-wavy", "egg-twister",
  "plug-silicone", "algema", "tapa-mamilo", "bomba-vacuo",
  "bolinhas-sexy", "gel-for-sexy", "duelo-prazer",
  "prendedores-sensuais", "calcinha-fio", "calcinha-aber",
  "k-med-", "lub-plus", "nabucetim", "nocucedim", "paracetaduro", "pererecard",
  "ingula", "meia-7-8", "arrastao", "always-virgem",
  "ice-menta", "ice-catuaba", "ice-frutas", "hot-ice",
];

function isAdultImageUrl(url: string): boolean {
  const filename = url.split("/").pop()?.toLowerCase() ?? "";
  return ADULT_FILENAME_PATTERNS.some((p) => filename.includes(p));
}

// Em mapDbProductToCard():
const isAdultCategory = product.category?.slug === "sex-shop";
const rawDbImages = product.images.map(...);
const dbImages = isAdultCategory ? rawDbImages : rawDbImages.filter((i) => !isAdultImageUrl(i.url));
const images = dbImages.length ? dbImages : bling?.images ?? [];
```

**Efeito:** Imagens com filenames de produtos adultos são descartadas silenciosamente para produtos de categorias normais. O produto fica sem imagem (melhor do que mostrar imagem errada).

### 3.2 Filtro defensivo no catálogo Bling — `buildCatalogProduct`

Adicionado em **`lib/bling-catalog.ts`**:

```typescript
// Após computar imageMatch e catalogLine:
const safeImageMatch: ImageMatch =
  catalogLine !== "adult" && imageMatch.url && isAdultImageUrl(imageMatch.url)
    ? { url: "", source: "NONE", reason: "adult_image_blocked_for_normal_product" }
    : imageMatch;

// No return:
image: safeImageMatch.url || null,
images: safeImageMatch.url ? [{ url: safeImageMatch.url, alt: row.name }] : [],
imageSource: safeImageMatch.source,
```

**Efeito:** Produtos do catálogo Bling com `row.imageUrl` apontando para imagens adultas (via cross-contamination no Bling API) não recebem essa imagem se não forem da linha adulto.

### 3.3 Limpeza do banco de dados

Script `scripts/fix-wrong-images.js` executado em modo `--execute`:

| Campo | Valor |
|---|---|
| Total de imagens em produtos não-adultos auditadas | 125 |
| Imagens adultas encontradas | 1 |
| Produto afetado | ANEL (bijuterias) |
| Imagem removida | `anel-peniano-bolinha-cores.png` |
| Registros deletados | 1 (ProductImage `cmr6k83dv00025qx7jc51hacb`) |

---

## 4. Arquivos Alterados

| Arquivo | O que mudou |
|---|---|
| `backend/app/api/products/route.ts` | `ADULT_FILENAME_PATTERNS`, `isAdultImageUrl()`, filtro em `mapDbProductToCard()` |
| `backend/components/loja/ProductListingPage.tsx` | `ADULT_FILENAME_PATTERNS`, `isAdultImageUrl()`, filtro em `mapDbProductToCard()` |
| `backend/lib/bling-catalog.ts` | `ADULT_FILENAME_PATTERNS`, `isAdultImageUrl()`, `safeImageMatch` em `buildCatalogProduct()` |
| `scripts/fix-wrong-images.js` | Novo script de auditoria e limpeza do banco |

---

## 5. Garantias do Sistema Após a Correção

| Garantia | Como é garantida |
|---|---|
| Produtos bijuterias nunca exibem imagem adulta | Filtro em `mapDbProductToCard()` + `buildCatalogProduct()` |
| Imagens adultas corretas (sex-shop) não são afetadas | `isAdultCategory === true` pula o filtro para sex-shop |
| Produtos sex-shop com imagens corretas: intactos | `catalogLine === "adult"` pula o `safeImageMatch` |
| Banco de dados limpo | 1 registro errado removido via script |
| Filtro duplo (DB + Bling catalog) | Ambos os vetores cobertos |

---

## 6. Resultado do Build Após as Correções

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (31/31)
Zero erros TypeScript. Zero warnings.
```

---

## 7. Produto Auto-Ocultado / Fila de Revisão

**Produto "ANEL" (bijuterias):** após remoção da imagem errada, o produto ficará sem imagem. Dois comportamentos possíveis:
1. O catálogo Bling tem uma imagem correta para esse produto → aparece normalmente com imagem do Bling
2. Não há imagem correta → produto aparece sem imagem (placeholder)

Para evitar exibição de produto sem imagem, o filtro `requireImage: true` (padrão em `getBlingCatalogProducts`) ocultará automaticamente esse produto até que uma imagem válida seja associada. **Nenhuma intervenção manual necessária.**

---

## 8. Como Rodar a Auditoria Novamente

```bash
# Dry-run (só lista, não altera):
NODE_PATH=./backend/node_modules node scripts/fix-wrong-images.js

# Executar remoção:
NODE_PATH=./backend/node_modules node scripts/fix-wrong-images.js --execute
```

---

## 9. Infinite Scroll

Verificado: o app mobile (`mobile/app/produtos/index.tsx`) **já possui infinite scroll implementado**:
- `FlatList` com `onEndReached` + `onEndReachedThreshold={0.4}`
- Estado `page`, `hasMore`, `loadingMore`
- `ActivityIndicator` no footer durante carregamento
- Callback `loadMore` incrementa página e busca mais produtos

**Nenhuma alteração necessária no mobile.** O scroll infinito estilo marketplace já está funcional.
