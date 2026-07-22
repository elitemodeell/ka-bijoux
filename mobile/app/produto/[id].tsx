import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, LayoutAnimation, Platform, UIManager, Linking, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { productsApi, reviewsApi, api } from "@/services/api";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";

const WHATSAPP_LINK = "https://wa.me/5537999999999";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://ka-bijoux-backend.vercel.app";
function resolveUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

const BENEFIT_CARDS = [
  { icon: "car-outline" as const, title: "Entrega rápida", subtitle: "Para todo Brasil" },
  { icon: "shield-checkmark-outline" as const, title: "Compra segura", subtitle: "Dados protegidos" },
  { icon: "diamond-outline" as const, title: "Produtos selecionados", subtitle: "Qualidade garantida" },
  { icon: "gift-outline" as const, title: "Mimos exclusivos", subtitle: "Em todos os pedidos" },
];

const PAYMENT_METHODS = [
  { name: "Pix", mark: "pix", color: "#22c7b8" },
  { name: "Visa", mark: "VISA", color: "#1f5cc9" },
  { name: "Mastercard", mark: "●●", color: "#f15a24" },
];

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const RELATED_CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - CARD_GAP) / 2;

const FAQS = [
  {
    q: "Como funciona a entrega?",
    a: "Fazemos envio pelos Correios para todo o Brasil. Também oferecemos retirada na loja e entrega por mototáxi em Itaúna – MG no mesmo dia ou no dia seguinte.",
  },
  {
    q: "Posso trocar ou devolver o produto?",
    a: "Sim! Temos política de troca e devolução em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor. Entre em contato pelo WhatsApp para resolver rapidamente.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "Mototáxi em Itaúna: mesmo dia ou dia seguinte. Pelos Correios: 5 a 15 dias úteis dependendo da região.",
  },
  {
    q: "O produto tem garantia?",
    a: "Trabalhamos apenas com produtos de qualidade. Caso receba algo com defeito ou diferente do pedido, entre em contato que resolvemos na hora.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "PIX, cartão de crédito e outras formas de pagamento oferecidas na finalização do pedido.",
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type Variation = {
  id: string;
  name: string;
  value: string;
  imageUrl?: string | null;
  stock: number;
  priceModifier?: number;
  isDefault?: boolean;
  order?: number;
};

type Product = {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  price: number;
  promotionalPrice?: number | null;
  stock: number;
  images: Array<{ url: string; alt?: string }>;
  category: { name: string; slug?: string };
  subcategory?: { name: string } | null;
  isNew?: boolean;
  variations: Variation[];
  brand?: string | null;
  benefits?: string | null;
  howToUse?: string | null;
  composition?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  customer: { name: string };
};

type RelatedProduct = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  promotionalPrice?: number | null;
  stock: number;
  images: Array<{ url: string }>;
  isNew?: boolean;
  variations?: Array<{
    id: string;
    name: string;
    value: string;
    imageUrl?: string | null;
    stock: number;
    isDefault: boolean;
    order: number;
  }>;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return ""; }
}

function publicText(value?: string | null): string | null {
  if (!value) return null;
  const text = value.trim();
  if (text.length < 3) return null;
  const blocked = [
    "nao informado", "nao disponivel", "necessita revisao", "revisao",
    "informacoes tecnicas pendentes", "importado da bling",
  ];
  const norm = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return blocked.some((t) => norm.includes(t)) ? null : text;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= Math.round(rating) ? "star" : "star-outline"} size={size} color="#f59e0b" />
      ))}
    </View>
  );
}

function RelatedSection({ title, products }: { title: string; products: RelatedProduct[] }) {
  const router = useRouter();
  if (!products.length) return null;
  return (
    <View style={styles.cardSection}>
      <Text style={styles.relatedBadge}>SELEÇÃO KA BIJOUX</Text>
      <View style={styles.relatedTitleRow}>
        <Text style={styles.relatedTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)")}>
          <Text style={styles.relatedLink}>Ver vitrine →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.relatedGrid}>
        {products.map((item) => (
          <View key={item.id} style={styles.relatedItem}>
            <ProductCard product={item} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ProdutoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, isLoading } = useCartStore();
  const { customer } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [togglingFav, setTogglingFav] = useState(false);
  const [variationError, setVariationError] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    productsApi.getById(id)
      .then((res) => {
        const p: Product = res.data.data.product;
        setProduct(p);
        setRelated(res.data.data.related ?? []);
        const def = p.variations.find((v) => v.isDefault) ?? null;
        if (def && def.stock > 0) setSelectedVariation(def.id);
      })
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!product) return;
    reviewsApi.list(product.id)
      .then((res) => {
        const data = res.data.data;
        setReviews(data.reviews ?? []);
        setAvgRating(data.avgRating ?? 0);
        setReviewsTotal(data.total ?? 0);
      })
      .catch(() => {});
  }, [product?.id]);

  useEffect(() => {
    if (!customer || !product) {
      setFavoriteId(null);
      return;
    }
    api.get("/api/customers/me/favorites")
      .then((res) => {
        const list: Array<{ favoriteId: string; id: string; slug?: string | null }> = res.data.data ?? [];
        const found = list.find((f) =>
          f.id === product.id ||
          (product.slug ? f.slug === product.slug : false) ||
          f.id === id
        );
        setFavoriteId(found?.favoriteId ?? null);
      })
      .catch(() => {});
  }, [customer, product?.id, product?.slug, id]);

  async function toggleFavorite() {
    if (!customer) { router.push("/(auth)/login"); return; }
    if (!product) return;
    if (togglingFav) return;
    setTogglingFav(true);
    try {
      if (favoriteId) {
        await api.delete(`/api/customers/me/favorites/${favoriteId}`);
        setFavoriteId(null);
      } else {
        const res = await api.post("/api/customers/me/favorites", { productId: product.id });
        setFavoriteId(res.data.data.id);
      }
    } catch { } finally { setTogglingFav(false); }
  }

  function handleSelectVariation(v: Variation) {
    if (v.stock === 0) return;
    setVariationError(false);
    setSelectedVariation((prev) => (prev === v.id ? null : v.id));
    setSelectedImage(v.imageUrl ? -1 : 0);
  }

  async function handleAddToCart() {
    if (!product) return;
    if (!customer) {
      router.push("/(auth)/login");
      return;
    }
    if (product.variations.length > 0 && !selectedVariation) { setVariationError(true); return; }
    try {
      await addItem(product.id, quantity, selectedVariation ?? undefined);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      Alert.alert("Erro", "Nao foi possivel adicionar o produto ao carrinho.");
    }
  }

  function toggleFaq(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq((prev) => (prev === index ? null : index));
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (notFound || !product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={[styles.emptyText, { marginTop: 12 }]}>Produto não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={[styles.emptyText, { color: Colors.primary }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Computed values ────────────────────────────────────────────────────────

  const hasVariations = product.variations.length > 0;
  const activeVariation = hasVariations ? product.variations.find((v) => v.id === selectedVariation) ?? null : null;
  const mainImageUri = (activeVariation?.imageUrl && selectedImage === -1)
    ? resolveUrl(activeVariation.imageUrl)
    : resolveUrl(product.images[Math.max(0, selectedImage)]?.url);
  const isAvailable = hasVariations ? product.variations.some((v) => v.stock > 0) : product.stock > 0;
  const activeStock = activeVariation ? activeVariation.stock : product.stock;
  const priceModifier = activeVariation?.priceModifier ?? 0;
  const basePrice = product.promotionalPrice && product.promotionalPrice < product.price ? product.promotionalPrice : product.price;
  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const price = Number(basePrice) + priceModifier;
  const discount = hasPromo ? Math.round(((Number(product.price) - Number(product.promotionalPrice!)) / Number(product.price)) * 100) : 0;
  const variationGroupName = product.variations[0]?.name ?? "Opção";

  const description = publicText(product.description);
  const benefits = publicText(product.benefits);
  const howToUse = publicText(product.howToUse);
  const material = publicText(product.composition);
  const care = publicText(product.careInstructions);
  const packageContents = publicText(product.packageContents);
  const hasUsage = !!(howToUse || material || care || packageContents);

  const usageSections = [
    { title: "Modo de uso", value: howToUse },
    { title: "Material e composição", value: material },
    { title: "Cuidados", value: care },
    { title: "Conteúdo da embalagem", value: packageContents },
  ].filter((s): s is { title: string; value: string } => Boolean(s.value));

  const caracteristicaItems = [
    `Produto: ${product.name}`,
    `Categoria: ${product.category.name}`,
    ...(product.subcategory ? [`Subcategoria: ${product.subcategory.name}`] : []),
    ...(publicText(product.brand) ? [`Marca: ${product.brand!}`] : []),
  ];

  const relatedA = related.slice(0, 4);
  const relatedB = related.slice(4, 8);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Botões flutuantes */}
        <View style={styles.floatingBtns}>
          <TouchableOpacity onPress={() => router.back()}>
            <View style={styles.floatingBtnInner}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFavorite} disabled={togglingFav}>
            <View style={[styles.floatingBtnInner, favoriteId ? styles.favBtnActive : null]}>
              <Ionicons name={favoriteId ? "heart" : "heart-outline"} size={20} color={favoriteId ? "#fff" : Colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Imagem principal */}
        <View style={styles.imagesContainer}>
          {mainImageUri ? (
            <Image source={{ uri: mainImageUri }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={64} color={Colors.border} />
            </View>
          )}
          {hasPromo && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeSmall}>até</Text>
              <Text style={styles.discountBadgePct}>{discount}%</Text>
              <Text style={styles.discountBadgeSmall}>off</Text>
            </View>
          )}
          {!isAvailable && (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>Esgotado</Text>
            </View>
          )}
          {/* Dots para múltiplas imagens */}
          {product.images.length > 1 && (
            <View style={styles.imageDots}>
              {product.images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedImage(i)}>
                  <View style={[styles.imageDot, i === selectedImage && styles.imageDotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {product.images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
            {product.images.map((img, idx) => (
              <TouchableOpacity key={idx} onPress={() => setSelectedImage(idx)}
                style={[styles.thumbnail, idx === selectedImage && styles.thumbnailActive]}>
                <Image source={{ uri: resolveUrl(img.url) ?? "" }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Purchase panel */}
        <View style={styles.purchasePanel}>
          {/* Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badgeKA}><Text style={styles.badgeKAText}>KA Bijoux</Text></View>
            {isAvailable ? (
              <View style={styles.badgeInStock}>
                <View style={styles.badgeInStockDot} />
                <Text style={styles.badgeInStockText}>Em estoque</Text>
              </View>
            ) : (
              <View style={styles.badgeOutStock}>
                <View style={styles.badgeOutStockDot} />
                <Text style={styles.badgeOutStockText}>Indisponível</Text>
              </View>
            )}
          </View>

          <Text style={styles.category}>{product.category.name}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Rating summary */}
          <View style={styles.ratingRow}>
            <View style={{ flexDirection: "row", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= Math.round(avgRating) ? "star" : "star-outline"} size={14} color="#f59e0b" />
              ))}
            </View>
            {reviewsTotal > 0 ? (
              <>
                <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>{reviewsTotal} {reviewsTotal === 1 ? "avaliação" : "avaliações"}</Text>
              </>
            ) : (
              <Text style={styles.ratingCount}>Sem avaliações</Text>
            )}
          </View>

          {/* Preço */}
          <View style={styles.priceBox}>
            <Text style={styles.priceBoxLabel}>Preço KA Bijoux</Text>
            {hasPromo && (
              <View style={styles.priceBoxPromoRow}>
                <Text style={styles.originalPrice}>{formatCurrency(Number(product.price))}</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>{discount}% OFF</Text>
                </View>
              </View>
            )}
            <Text style={styles.price}>{formatCurrency(price)}</Text>
            <Text style={styles.installmentText}>Até 3x sem juros no cartão</Text>
          </View>

          {/* Variações */}
          {hasVariations && (
            <View style={styles.section}>
              <View style={styles.variationHeader}>
                <Text style={styles.sectionTitle}>
                  {variationGroupName === "Cor" ? "Escolha 1 cor" : `Escolha: ${variationGroupName}`}
                </Text>
                {activeVariation && (
                  <Text style={styles.selectedVariationLabel}>{activeVariation.value}</Text>
                )}
              </View>
              {variationError && (
                <Text style={styles.variationErrorText}>Selecione uma opção antes de adicionar ao carrinho.</Text>
              )}
              <View style={styles.variations}>
                {product.variations.map((v) => {
                  const isSelected = selectedVariation === v.id;
                  const unavailable = v.stock === 0;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.variationChip, isSelected && styles.variationChipActive, unavailable && styles.variationChipUnavailable, variationError && !selectedVariation && styles.variationChipError]}
                      onPress={() => handleSelectVariation(v)}
                      disabled={unavailable}
                    >
                      {v.imageUrl ? (
                        <View style={styles.variationWithImage}>
                          <Image source={{ uri: resolveUrl(v.imageUrl) ?? "" }} style={styles.variationThumb} />
                          <Text style={[styles.variationText, isSelected && styles.variationTextActive, unavailable && styles.variationTextUnavailable]}>{v.value}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.variationText, isSelected && styles.variationTextActive, unavailable && styles.variationTextUnavailable]}>{v.value}</Text>
                      )}
                      {unavailable && <View style={styles.strikeThrough} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.variationHint}>Vendido por unidade — escolha 1 {variationGroupName.toLowerCase()}</Text>
            </View>
          )}

          {/* Quantidade */}
          <View style={styles.qtyBox}>
            <View>
              <Text style={styles.qtyBoxLabel}>Quantidade</Text>
              <Text style={styles.qtyBoxSub}>Escolha quantos itens adicionar.</Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.min(activeStock, quantity + 1))} disabled={quantity >= activeStock}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── DESCRIÇÃO ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Descrição" />
          <View style={styles.card}>
            {description
              ? <Text style={styles.bodyText}>{description}</Text>
              : <Text style={styles.emptyText}>Descrição não disponível.</Text>
            }
            {benefits && (
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>Benefícios</Text>
                <Text style={styles.bodyText}>{benefits}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── CARACTERÍSTICAS ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Características" />
          <View style={styles.card}>
            <View style={styles.caracterGrid}>
              {caracteristicaItems.map((item) => {
                const colonIdx = item.indexOf(": ");
                const label = colonIdx > -1 ? item.slice(0, colonIdx) : "Detalhe";
                const value = colonIdx > -1 ? item.slice(colonIdx + 2) : item;
                return (
                  <View key={item} style={styles.caracterCard}>
                    <Text style={styles.caracterLabel}>{label.toUpperCase()}</Text>
                    <Text style={styles.caracterValue}>{value}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── MODO DE USO ── */}
        {hasUsage && (
          <View style={styles.cardSection}>
            <SectionLabel label="Modo de Uso" />
            <View style={styles.card}>
              {/* Dark "Cuidados" card */}
              <View style={styles.cuidadosCard}>
                <Text style={styles.cuidadosSmallLabel}>CUIDADOS</Text>
                <Text style={styles.cuidadosTitle}>Use com atenção</Text>
                <View style={styles.cuidadosItem}>
                  <View style={styles.cuidadosNumber}>
                    <Text style={styles.cuidadosNumberText}>1</Text>
                  </View>
                  <Text style={styles.cuidadosText}>Siga as instruções de limpeza indicadas na embalagem do fabricante.</Text>
                </View>
              </View>

              {/* Usage sections */}
              <View style={{ marginTop: 12, gap: 10 }}>
                {usageSections.map((section, idx) => (
                  <View key={section.title} style={styles.usageCard}>
                    <View style={styles.usageCardHeader}>
                      <View style={styles.usageCardNumber}>
                        <Text style={styles.usageCardNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.usageCardTitle}>{section.title}</Text>
                    </View>
                    <Text style={[styles.bodyText, { marginTop: 8 }]}>{section.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── AVALIAÇÕES ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Avaliações" />
          <View style={styles.card}>
            {reviewsTotal > 0 ? (
              <>
                {/* Resumo */}
                <View style={styles.reviewSummary}>
                  <View style={styles.reviewSummaryLeft}>
                    <Text style={styles.reviewBigNumber}>{avgRating.toFixed(1)}</Text>
                    <StarRow rating={avgRating} size={16} />
                    <Text style={styles.reviewSummaryCount}>{reviewsTotal} {reviewsTotal === 1 ? "cliente avaliou" : "clientes avaliaram"}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, gap: 10 }}>
                  {reviews.map((rev, idx) => (
                    <View key={rev.id} style={[styles.reviewCard, idx === 1 && styles.reviewCardDark]}>
                      <View style={styles.reviewTop}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>{(rev.customer.name ?? "?").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={[styles.reviewName, idx === 1 && { color: "#fff" }]}>{rev.customer.name}</Text>
                            <Text style={[styles.reviewDate, idx === 1 && { color: "rgba(255,255,255,0.6)" }]}>{formatDate(rev.createdAt)}</Text>
                          </View>
                          <StarRow rating={rev.rating} size={11} />
                        </View>
                      </View>
                      {rev.comment?.trim() ? (
                        <Text style={[styles.reviewText, idx === 1 && { color: "rgba(255,255,255,0.75)" }]}>{rev.comment.trim()}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Ainda sem avaliações para este produto.</Text>
            )}
          </View>
        </View>

        {/* ── PERGUNTAS FREQUENTES ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Perguntas frequentes" />
          <View style={styles.card}>
            <View style={{ gap: 10 }}>
              {FAQS.map((faq, i) => (
                <View key={faq.q} style={styles.faqItem}>
                  <TouchableOpacity style={styles.faqHeader} onPress={() => toggleFaq(i)} activeOpacity={0.75}>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <Ionicons
                      name={openFaq === i ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                  {openFaq === i && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.a}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── RELACIONADOS ── */}
        <RelatedSection title="Quem comprou também levou" products={relatedA} />
        <RelatedSection title="Você também pode gostar" products={relatedB} />

        {/* ── BENEFITS STRIP ── */}
        <View style={styles.cardSection}>
          <View style={styles.benefitsGrid}>
            {BENEFIT_CARDS.map((b) => (
              <View key={b.title} style={styles.benefitCard}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={b.icon} size={26} color="#FF6F9C" />
                </View>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSubtitle}>{b.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── FALE COM A GENTE ── */}
        <View style={styles.cardSection}>
          <View style={styles.contactCard}>
            <View style={styles.contactTop}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="headset-outline" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Fale com a gente</Text>
                <Text style={styles.contactHours}>Segunda a Sexta{"\n"}09h às 18h</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.whatsappBtn} onPress={() => Linking.openURL(WHATSAPP_LINK)}>
              <Text style={styles.whatsappBtnText}>WhatsApp →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FORMAS DE PAGAMENTO ── */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>FORMAS DE PAGAMENTO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentRow}>
            {PAYMENT_METHODS.map((m) => (
              <View key={m.name} style={styles.paymentCard}>
                <Text style={[styles.paymentMark, { color: m.color }]}>{m.mark}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── FEITO COM AMOR ── */}
        <View style={styles.feitoWrap}>
          <Ionicons name="heart-outline" size={28} color={Colors.primary} />
          <Text style={styles.feitoTitle}>Feito com amor</Text>
          <Text style={styles.feitoSub}>para você brilhar todos os dias.</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Rodapé */}
      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>{formatCurrency(price * quantity)}</Text>
        </View>
        <Button
          label={added ? "✓ Adicionado!" : "Adicionar ao Carrinho"}
          onPress={handleAddToCart}
          loading={isLoading}
          disabled={!isAvailable || added}
          style={{ flex: 1 }}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, fontStyle: "italic" },

  // Floating buttons
  floatingBtns: { position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  floatingBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", ...Shadows.sm },
  favBtnActive: { backgroundColor: Colors.primary },

  // Images
  imagesContainer: { position: "relative", width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: "#17070C" },
  mainImage: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  discountBadge: {
    position: "absolute", top: 12, left: 12,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    ...Shadows.md,
  },
  discountBadgeSmall: { color: "rgba(255,220,230,0.9)", fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  discountBadgePct: { color: "#fff", fontSize: 18, fontWeight: "900", lineHeight: 20 },
  soldOut: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  soldOutText: { color: "#fff", fontWeight: "800", fontSize: FontSizes.xl },
  imageDots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  imageDotActive: { width: 20, backgroundColor: "#fff" },
  thumbnails: { paddingHorizontal: Spacing.base, gap: 8, paddingVertical: 12 },
  thumbnail: { width: 78, height: 78, borderRadius: BorderRadius.lg, overflow: "hidden", borderWidth: 2, borderColor: Colors.borderLight },
  thumbnailActive: { borderColor: Colors.primary },
  thumbnailImage: { width: "100%", height: "100%" },

  // Purchase panel
  purchasePanel: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base },
  badgesRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  badgeKA: { backgroundColor: "#17070C", borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  badgeKAText: { color: "#fff", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5 },
  badgeInStock: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeInStockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  badgeInStockText: { fontSize: 11, fontWeight: "900", color: "#15803d" },
  badgeOutStock: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOutStockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  badgeOutStockText: { fontSize: 11, fontWeight: "900", color: "#dc2626" },

  category: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  name: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary, marginTop: 4, lineHeight: 32 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  ratingText: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary },
  ratingCount: { fontSize: FontSizes.xs, fontWeight: "600", color: Colors.textMuted },

  // Price box
  priceBox: { marginTop: 16, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.pinkPale, padding: Spacing.base },
  priceBoxLabel: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5, color: "#8b5c6d" },
  priceBoxPromoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  originalPrice: { fontSize: FontSizes.sm, color: Colors.textMuted, textDecorationLine: "line-through" },
  discountPill: { backgroundColor: "#17070C", borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  discountPillText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  price: { fontSize: 34, fontWeight: "900", color: Colors.primary, lineHeight: 40, marginTop: 4 },
  installmentText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "600", marginTop: 4 },

  // Variations
  section: { marginTop: 20 },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  variationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectedVariationLabel: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: "600", backgroundColor: Colors.pinkSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full },
  variationErrorText: { fontSize: FontSizes.xs, color: "#e53e3e", fontWeight: "500", marginBottom: 8 },
  variations: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variationChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, overflow: "hidden" },
  variationChipActive: { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  variationChipUnavailable: { opacity: 0.4 },
  variationChipError: { borderColor: "#e53e3e" },
  variationWithImage: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4, paddingRight: 14, paddingVertical: 6 },
  variationThumb: { width: 28, height: 28, borderRadius: 14 },
  variationText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "500", paddingHorizontal: 14, paddingVertical: 8 },
  variationTextActive: { color: Colors.primary, fontWeight: "700" },
  variationTextUnavailable: { color: Colors.textLight },
  strikeThrough: { position: "absolute", left: 0, right: 0, top: "50%", height: 1.5, backgroundColor: Colors.textMuted },
  variationHint: { marginTop: 8, fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: "italic" },

  // Quantity
  qtyBox: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl, padding: 12, backgroundColor: "rgba(255,255,255,0.8)" },
  qtyBoxLabel: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5, color: Colors.textMuted },
  qtyBoxSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  qtyControls: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, overflow: "hidden", backgroundColor: "#fff" },
  qtyBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 22, fontWeight: "900", color: Colors.primary },
  qtyText: { fontSize: FontSizes.base, fontWeight: "900", color: Colors.textPrimary, minWidth: 40, textAlign: "center" },

  // Card sections
  cardSection: { paddingHorizontal: Spacing.base, marginTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: "900", color: Colors.primary, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: 30, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  bodyText: { fontSize: FontSizes.base, color: Colors.textSecondary, lineHeight: 24 },

  // Descrição + Benefícios
  benefitsSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  benefitsTitle: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary, marginBottom: 8 },

  // Características grid
  caracterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  caracterCard: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.base * 2 - 10) / 2,
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.pinkPale, padding: 14,
  },
  caracterLabel: { fontSize: 11, fontWeight: "900", color: Colors.primary, textTransform: "uppercase", letterSpacing: 1 },
  caracterValue: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.textPrimary, marginTop: 4, lineHeight: 18 },

  // Modo de uso
  cuidadosCard: {
    borderRadius: BorderRadius.xl,
    padding: 20,
    backgroundColor: "#17070C",

  },
  cuidadosSmallLabel: { fontSize: 10, fontWeight: "900", color: "rgba(255,200,220,0.9)", letterSpacing: 1.8, textTransform: "uppercase" },
  cuidadosTitle: { fontSize: FontSizes.lg, fontWeight: "900", color: "#fff", marginTop: 4, marginBottom: 16 },
  cuidadosItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cuidadosNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cuidadosNumberText: { color: "rgba(255,200,220,0.9)", fontWeight: "900", fontSize: FontSizes.xs },
  cuidadosText: { flex: 1, fontSize: FontSizes.sm, color: "rgba(255,255,255,0.8)", lineHeight: 20 },
  usageCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl, padding: 14 },
  usageCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  usageCardNumber: { width: 40, height: 40, borderRadius: BorderRadius.lg, backgroundColor: Colors.pinkPale, alignItems: "center", justifyContent: "center" },
  usageCardNumberText: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.primary },
  usageCardTitle: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary },

  // Reviews
  reviewSummary: { flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.xl, backgroundColor: Colors.pinkPale, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  reviewSummaryLeft: { alignItems: "flex-start", gap: 4 },
  reviewBigNumber: { fontSize: 56, fontWeight: "900", color: Colors.textPrimary, lineHeight: 60 },
  reviewSummaryCount: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textMuted, marginTop: 4 },
  reviewCard: { borderRadius: 26, borderWidth: 1, borderColor: Colors.border, padding: 16, backgroundColor: Colors.surface },
  reviewCardDark: { backgroundColor: "#17070C", borderColor: "rgba(23,7,12,0.1)" },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 44, height: 44, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { color: "#fff", fontWeight: "900", fontSize: FontSizes.sm },
  reviewName: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary, marginBottom: 2 },
  reviewDate: { fontSize: FontSizes.xs, color: Colors.textMuted },
  reviewText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  // FAQ
  faqItem: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", backgroundColor: Colors.pinkPale },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 16 },
  faqQuestion: { flex: 1, fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary },
  faqAnswer: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 16, paddingTop: 12 },
  faqAnswerText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 22 },

  // Related
  relatedBadge: { fontSize: 11, fontWeight: "900", color: Colors.primary, letterSpacing: 1.8, marginBottom: 4, textTransform: "uppercase" },
  relatedTitleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 },
  relatedTitle: { fontSize: FontSizes.lg, fontWeight: "900", color: Colors.textPrimary },
  relatedLink: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.primary },
  relatedGrid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
  relatedItem: { width: RELATED_CARD_WIDTH },

  // Benefits strip
  benefitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  benefitCard: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - 10) / 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: "rgba(255,79,135,0.2)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 16, alignItems: "center",
  },
  benefitIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,79,135,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  benefitTitle: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
  benefitSubtitle: { fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: "center", marginTop: 2 },

  // Contact card
  contactCard: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: "rgba(255,79,135,0.35)", backgroundColor: "#1b0710", padding: 20 },
  contactTop: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  contactIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  contactTitle: { fontSize: FontSizes.base, fontWeight: "900", color: "#fff", marginBottom: 6 },
  contactHours: { fontSize: FontSizes.sm, color: "rgba(255,255,255,0.62)", lineHeight: 20 },
  whatsappBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingVertical: 14, alignItems: "center" },
  whatsappBtnText: { color: "#fff", fontWeight: "900", fontSize: FontSizes.base },

  // Payment
  paymentRow: { gap: 10, paddingBottom: 4 },
  paymentCard: { height: 54, minWidth: 110, borderRadius: BorderRadius.lg, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.border },
  paymentMark: { fontSize: FontSizes.base, fontWeight: "900" },

  // Feito com amor
  feitoWrap: { alignItems: "center", paddingVertical: 32, gap: 6 },
  feitoTitle: { fontSize: FontSizes.xl, fontWeight: "900", color: Colors.textPrimary, fontStyle: "italic" },
  feitoSub: { fontSize: FontSizes.sm, color: Colors.textMuted },

  // Footer
  footer: { flexDirection: "row", gap: 12, padding: Spacing.base, paddingBottom: 24, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: "center" },
  footerPrice: { alignItems: "center" },
  footerPriceLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  footerPriceValue: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.primary },
});
