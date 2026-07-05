# KA Bijoux — Auditoria e Otimização de Performance
**Data:** 2026-07-04

---

## 1. O que estava deixando o app pesado

### Crítico
| Problema | Impacto |
|---|---|
| Todas as páginas e API routes com `force-dynamic` | Sem nenhum cache — cada visita batia no banco do zero |
| DB query a cada render sem cache | Prisma chamado a cada request mesmo com dados iguais |
| `ProductCard` sem `React.memo` | Re-renders desnecessários em todos os 20 cards quando 1 muda |
| `Intl.NumberFormat` criado dentro do componente | Objeto recriado a cada render de cada card |
| Imagens de upload sem `Cache-Control` | Browser baixava as mesmas imagens de produto a cada visita |
| `<img>` raw nos cards de categoria (sex-shop) | Sem otimização WebP/AVIF, sem lazy loading via Next.js |
| `formatCurrency()` no corpo do componente | Nova instância do Intl a cada render do `AdultProductCard` |
| Primeiras 20 imagens sem `priority` | LCP sofrendo — imagens visíveis tratadas como lazy |

### Alto
| Problema | Impacto |
|---|---|
| API busca até 80 produtos do banco quando precisa de 20 | Overhead de 4x no DB |
| Merge Bling + DB em memória sem cache | Operação O(n) repetida a cada request |
| `minimumCacheTTL` não configurado no next.config | Cache de imagens otimizadas expirava rápido |

---

## 2. Quantas imagens foram otimizadas

- **363 imagens de produto** agora têm `Cache-Control: public, max-age=31536000, immutable`
- **Imagens de categoria (sex-shop):** 7 images trocadas de `<img>` para `next/image` com conversão automática para WebP/AVIF
- **`minimumCacheTTL: 31536000`** adicionado — imagens otimizadas pelo Next.js ficam em cache por 1 ano
- **4 primeiros cards** em cada listagem recebem `priority={true}` → carregamento antecipado (melhora LCP)

---

## 3. Antes / Depois — peso e cache

### Cache de imagens
| Situação | Antes | Depois |
|---|---|---|
| Imagens de produto (`/uploads/`) | Sem cache | `max-age=31536000, immutable` (1 ano) |
| Imagens estáticas (`/imagens/`, `/banners/`) | Sem cache | `max-age=86400, stale-while-revalidate=604800` |
| Imagens otimizadas Next.js (`/_next/image`) | TTL curto (padrão) | `minimumCacheTTL: 31536000` |

### Tempo de resposta das páginas
| Situação | Antes | Depois |
|---|---|---|
| Listagem de produtos (2ª visita) | DB query sempre | Cache 60s via `unstable_cache` |
| API `/api/products` (2ª chamada) | DB sempre | Cache 60s via `revalidate = 60` |
| API `/api/categories` | DB sempre | Cache 5 min via `revalidate = 300` |
| Formatação de preço | `new Intl.NumberFormat` a cada render | Singleton fora do componente |

---

## 4. Páginas otimizadas

| Página | O que mudou |
|---|---|
| `/produtos` | Removido `force-dynamic` redundante |
| `/categoria/[slug]` | Removido `force-dynamic` redundante |
| `/categoria/[slug]/[subcategoria]` | Removido `force-dynamic` redundante |
| `/categoria/sex-shop` | Removido `force-dynamic`, `formatCurrency` singleton, `<img>` → `next/image` |
| `/categoria/sex-shop/[subcategoria]` | Removido `force-dynamic` redundante |

---

## 5. Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `backend/next.config.mjs` | `headers()` com cache para uploads/imagens/banners; `minimumCacheTTL` |
| `backend/app/api/products/route.ts` | `force-dynamic` → `revalidate = 60` |
| `backend/app/api/categories/route.ts` | `force-dynamic` → `revalidate = 300` |
| `backend/components/loja/ProductCard.tsx` | `React.memo`, prop `priority`, `fmt` como singleton |
| `backend/components/loja/ProductListingPage.tsx` | `unstable_cache` no `fetchMergedProducts`, `priority` nos primeiros 4 cards |
| `backend/app/(loja)/produtos/page.tsx` | Removido `force-dynamic` |
| `backend/app/(loja)/categoria/[slug]/page.tsx` | Removido `force-dynamic` |
| `backend/app/(loja)/categoria/[slug]/[subcategoria]/page.tsx` | Removido `force-dynamic` |
| `backend/app/(loja)/categoria/sex-shop/page.tsx` | Removido `force-dynamic`, formatCurrency singleton, `next/image` nos cards |
| `backend/app/(loja)/categoria/sex-shop/[subcategoria]/page.tsx` | Removido `force-dynamic` |

---

## 6. Como ficou a paginação / lazy load

- **Paginação existente mantida:** 20 produtos por página, navegação por link
- **Cache da lista completa:** a lista de produtos mergeada (Bling + DB) é cacheada por 60s com `unstable_cache`; paginação ocorre em memória sobre os dados cacheados — sem query adicional por página
- **Lazy loading de imagens:** `next/image` com `loading="lazy"` por padrão; primeiros 4 cards usam `priority` (carregamento antecipado para LCP)
- **IntersectionObserver nos cards:** já estava presente para reveal de animação — mantido

---

## 7. Como ficou o cache

| Camada | Estratégia | TTL |
|---|---|---|
| Imagens de produto (estáticas) | Browser cache — `Cache-Control: immutable` | 1 ano |
| Imagens otimizadas Next.js | `minimumCacheTTL` + CDN Vercel | 1 ano |
| API `/api/products` | Edge cache Vercel + `revalidate = 60` | 60s |
| API `/api/categories` | Edge cache Vercel + `revalidate = 300` | 5 min |
| Query DB de listagem | `unstable_cache` em memória | 60s |
| Categoria / subcategoria | Dynamic por searchParams (normal), mas dados cacheados | 60s |

---

## 8. Garantia de que imagem de produto não foi trocada

- **Nenhuma imagem foi movida, renomeada ou substituída**
- Toda otimização foi no **transporte e cache** da imagem, não no arquivo em si
- O vínculo `produto → imagem` (por Bling ID / SKU / slug) permanece intacto no `mapeamento-imagens-produtos.json`
- `ProductVariantImage` continua usando `src` exata do produto — sem intermediários
- `React.memo` usa shallow comparison por padrão — o `product` prop (incluindo `image`) permanece o mesmo objeto SSR

---

## 9. Resultado do build

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (31/31)

Route (app)                         Size     First Load JS
/                                   7.33 kB        113 kB
/produtos                           195 B          105 kB
/categoria/[slug]                   195 B          105 kB
/categoria/sex-shop                 1.17 kB        102 kB
/produto/[slug]                     21.7 kB        127 kB
First Load JS shared by all         87.2 kB
```
**Zero erros. Zero warnings de tipo.**

---

## 10. O que ainda pode melhorar (próxima rodada)

| Item | Complexidade | Impacto |
|---|---|---|
| Virtualização da lista (react-window) | Alta | Alto — evita renderizar 20 cards fora da tela |
| ISR nas páginas de produto (`/produto/[slug]`) | Média | Alto — página de produto totalmente estática |
| `generateStaticParams` nas categorias | Média | Alto — categorias pré-renderizadas na build |
| Paginar DB ao invés de merge em memória | Alta | Médio — reduz DB query de 60→20 itens |
| Compressão Brotli no servidor | Baixa | Médio — reduz JS/HTML transferido |
| Remover mercadopago do bundle (não usado) | Baixa | Baixo — ~2.5MB do bundle servidor |
