import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { productsApi, api } from "@/services/api";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  id: string; name: string; description: string;
  price: number; promotionalPrice?: number | null; stock: number;
  images: Array<{ url: string; alt?: string }>;
  category: { name: string }; isNew?: boolean;
  variations: Variation[];
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ProdutoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, isLoading } = useCartStore();
  const { customer } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [togglingFav, setTogglingFav] = useState(false);
  const [variationError, setVariationError] = useState(false);
  const [activeTab, setActiveTab] = useState<"desc" | "beneficios" | "como" | "faq">("desc");

  useEffect(() => {
    const url = `/api/products/${id}`;
    console.log("[ProdutoScreen] param recebido:", id, "| URL:", url);
    productsApi.getById(id)
      .then((res) => {
        console.log("[ProdutoScreen] resposta status:", res.status, "| produto:", res.data?.data?.product?.name);
        const data = res.data.data;
        const p: Product = data.product;
        setProduct(p);
        setRelated(data.related ?? []);

        const def = p.variations.find((v) => v.isDefault) ?? null;
        if (def && def.stock > 0) setSelectedVariation(def.id);
      })
      .catch((err) => {
        console.log("[ProdutoScreen] ERRO:", err.response?.status, err.response?.data?.error ?? err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!customer || !id) return;
    api.get("/api/customers/me/favorites")
      .then((res) => {
        const list: Array<{ favoriteId: string; id: string }> = res.data.data ?? [];
        const found = list.find((f) => f.id === id);
        setFavoriteId(found?.favoriteId ?? null);
      })
      .catch(() => {});
  }, [customer, id]);

  async function toggleFavorite() {
    if (!customer) { router.push("/(auth)/login"); return; }
    if (togglingFav) return;
    setTogglingFav(true);
    try {
      if (favoriteId) {
        await api.delete(`/api/customers/me/favorites/${favoriteId}`);
        setFavoriteId(null);
      } else {
        const res = await api.post("/api/customers/me/favorites", { productId: id });
        setFavoriteId(res.data.data.id);
      }
    } catch {
    } finally {
      setTogglingFav(false);
    }
  }

  function handleSelectVariation(v: Variation) {
    if (v.stock === 0) return;
    setVariationError(false);
    setSelectedVariation((prev) => (prev === v.id ? null : v.id));
    if (v.imageUrl) {
      // Insere a imagem da variação como primeira, sem remover as originais
      setSelectedImage(-1);
    } else {
      setSelectedImage(0);
    }
  }

  async function handleAddToCart() {
    if (!product) return;
    const hasVariations = product.variations.length > 0;
    if (hasVariations && !selectedVariation) {
      setVariationError(true);
      return;
    }
    await addItem(product.id, quantity, selectedVariation ?? undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Produto não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.errorText, { color: Colors.primary }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasVariations = product.variations.length > 0;
  const activeVariation = hasVariations
    ? product.variations.find((v) => v.id === selectedVariation) ?? null
    : null;

  const mainImageUri = (activeVariation?.imageUrl && selectedImage === -1)
    ? activeVariation.imageUrl
    : (product.images[Math.max(0, selectedImage)]?.url ?? "https://placehold.co/400x400/FFB6C1/FFF?text=KA");

  const isAvailable = hasVariations
    ? product.variations.some((v) => v.stock > 0)
    : product.stock > 0;

  const activeStock = activeVariation ? activeVariation.stock : product.stock;

  const priceModifier = activeVariation?.priceModifier ?? 0;
  const basePrice = product.promotionalPrice && product.promotionalPrice < product.price
    ? product.promotionalPrice
    : product.price;
  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const price = basePrice + priceModifier;
  const discount = hasPromo
    ? Math.round(((product.price - product.promotionalPrice!) / product.price) * 100)
    : 0;

  const variationGroupName = product.variations[0]?.name ?? "Cor";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Botões flutuantes */}
        <View style={styles.floatingBtns}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <View style={styles.floatingBtnInner}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite} disabled={togglingFav}>
            <View style={[styles.floatingBtnInner, favoriteId && styles.favBtnActive]}>
              <Ionicons
                name={favoriteId ? "heart" : "heart-outline"}
                size={20}
                color={favoriteId ? "#fff" : Colors.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Imagem principal */}
        <View style={styles.imagesContainer}>
          <Image
            source={{ uri: mainImageUri }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          {hasPromo && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          {!isAvailable && (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>Esgotado</Text>
            </View>
          )}
        </View>

        {/* Thumbnails do produto */}
        {product.images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnails}>
            {product.images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedImage(idx)}
                style={[styles.thumbnail, idx === selectedImage && styles.thumbnailActive]}
              >
                <Image source={{ uri: img.url }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.category}>{product.category.name}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1,2,3,4,5].map((s) => (
              <Ionicons key={s} name="star" size={14} color={s <= 5 ? "#f59e0b" : Colors.border} />
            ))}
            <Text style={styles.ratingText}>4.8</Text>
            <Text style={styles.ratingCount}>(247 avaliações)</Text>
          </View>

          {/* Preço */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, hasPromo && styles.pricePromo]}>
              {formatCurrency(price)}
            </Text>
            {hasPromo && (
              <Text style={styles.originalPrice}>{formatCurrency(product.price)}</Text>
            )}
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
                <Text style={styles.variationErrorText}>
                  Selecione uma opção antes de adicionar ao carrinho.
                </Text>
              )}

              <View style={styles.variations}>
                {product.variations.map((v) => {
                  const isSelected = selectedVariation === v.id;
                  const unavailable = v.stock === 0;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      accessibilityLabel={`${v.name}: ${v.value}`}
                      style={[
                        styles.variationChip,
                        isSelected && styles.variationChipActive,
                        unavailable && styles.variationChipUnavailable,
                        variationError && !selectedVariation && styles.variationChipError,
                      ]}
                      onPress={() => handleSelectVariation(v)}
                      disabled={unavailable}
                    >
                      {v.imageUrl ? (
                        <View style={styles.variationWithImage}>
                          <Image
                            source={{ uri: v.imageUrl }}
                            style={styles.variationThumb}
                          />
                          <Text style={[
                            styles.variationText,
                            isSelected && styles.variationTextActive,
                            unavailable && styles.variationTextUnavailable,
                          ]}>
                            {v.value}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[
                          styles.variationText,
                          isSelected && styles.variationTextActive,
                          unavailable && styles.variationTextUnavailable,
                        ]}>
                          {v.value}
                        </Text>
                      )}
                      {unavailable && (
                        <View style={styles.strikeThrough} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.variationHint}>
                Vendido por unidade — escolha 1 {variationGroupName.toLowerCase()}
              </Text>
            </View>
          )}

          {/* Quantidade */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantidade</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.min(activeStock, quantity + 1))}
                disabled={quantity >= activeStock}
              >
                <Ionicons name="add" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.stockText}>
                {activeStock} {activeStock === 1 ? "disponível" : "disponíveis"}
              </Text>
            </View>
          </View>

          {/* Tabs: Descrição / Benefícios / Como Usar / FAQ */}
          <View style={styles.section}>
            <View style={styles.tabsRow}>
              {(["desc","beneficios","como","faq"] as const).map((tab) => {
                const labels = { desc: "Descrição", beneficios: "Benefícios", como: "Como Usar", faq: "FAQ" };
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {labels[tab]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {activeTab === "desc" && (
              <Text style={styles.description}>{product.description || "Sem descrição disponível."}</Text>
            )}
            {activeTab === "beneficios" && (
              <View style={{ gap: 10 }}>
                {["Produto de qualidade premium", "Material hipoalergênico e seguro para a pele", "Embalagem discreta e sem identificação", "Garantia de satisfação KA Bijoux", "Certificação de qualidade"].map((b, i) => (
                  <View key={i} style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    <Text style={styles.benefitItemText}>{b}</Text>
                  </View>
                ))}
              </View>
            )}
            {activeTab === "como" && (
              <View style={{ gap: 12 }}>
                {["Abra a embalagem com cuidado e verifique o produto.", "Siga as instruções do fabricante impressas na embalagem.", "Realize uma pequena quantidade de teste antes do uso completo.", "Guarde em local fresco e seco após o uso.", "Mantenha fora do alcance de crianças."].map((s, i) => (
                  <View key={i} style={styles.stepItem}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
            {activeTab === "faq" && (
              <View style={{ gap: 14 }}>
                {[
                  { q: "O produto é entregue em embalagem discreta?", a: "Sim! Todos os produtos KA Bijoux são enviados em caixa neutra, sem identificação do conteúdo." },
                  { q: "Qual o prazo de entrega?", a: "Dependendo da sua localidade, o prazo varia de 3 a 10 dias úteis após a confirmação do pagamento." },
                  { q: "Posso trocar se não gostar?", a: "Aceitamos troca em até 7 dias desde que o produto esteja em perfeitas condições e com a embalagem original." },
                  { q: "O produto tem garantia?", a: "Sim, todos os produtos possuem garantia do fornecedor. Em caso de defeito, entre em contato conosco." },
                ].map((item, i) => (
                  <View key={i} style={styles.faqItem}>
                    <Text style={styles.faqQ}>{item.q}</Text>
                    <Text style={styles.faqA}>{item.a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Avaliações demo */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              <View style={styles.reviewsScore}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.reviewsScoreText}>4.8 / 5</Text>
              </View>
            </View>
            {[
              { name: "Mariana C.", date: "12/06/2025", rating: 5, text: "Amei! Produto chegou super rápido e bem embalado. Qualidade excelente, recomendo muito!" },
              { name: "Julia F.", date: "04/06/2025", rating: 5, text: "Perfeito! A embalagem discreta faz toda a diferença. Produto de alta qualidade, voltarei a comprar." },
              { name: "Ana Beatriz L.", date: "28/05/2025", rating: 4, text: "Produto muito bom, superou minhas expectativas. Entrega rápida e embalagem caprichada." },
            ].map((rev, i) => (
              <View key={i} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{rev.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{rev.name}</Text>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {[1,2,3,4,5].map((s) => (
                        <Ionicons key={s} name="star" size={11} color={s <= rev.rating ? "#f59e0b" : Colors.border} />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{rev.date}</Text>
                </View>
                <Text style={styles.reviewText}>{rev.text}</Text>
              </View>
            ))}
          </View>
        </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: FontSizes.base, color: Colors.textMuted },
  floatingBtns: {
    position: "absolute", top: 16, left: 16, right: 16,
    flexDirection: "row", justifyContent: "space-between", zIndex: 10,
  },
  backBtn: {},
  favBtn: {},
  floatingBtnInner: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    ...Shadows.sm,
  },
  favBtnActive: { backgroundColor: Colors.primary },
  imagesContainer: { position: "relative", width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: Colors.pinkPale },
  mainImage: { width: "100%", height: "100%" },
  discountBadge: {
    position: "absolute", top: 16, right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  discountText: { color: "#fff", fontWeight: "800", fontSize: FontSizes.sm },
  soldOut: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  soldOutText: { color: "#fff", fontWeight: "800", fontSize: FontSizes.xl },
  thumbnails: { paddingHorizontal: Spacing.base, gap: 8, paddingVertical: 12 },
  thumbnail: {
    width: 60, height: 60, borderRadius: BorderRadius.lg,
    overflow: "hidden", borderWidth: 2, borderColor: "transparent",
  },
  thumbnailActive: { borderColor: Colors.primary },
  thumbnailImage: { width: "100%", height: "100%" },
  info: { padding: Spacing.base, gap: 2 },
  category: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  name: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary, marginTop: 4, lineHeight: 32 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  price: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary },
  pricePromo: { color: Colors.primary },
  originalPrice: { fontSize: FontSizes.md, color: Colors.textMuted, textDecorationLine: "line-through" },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary, marginBottom: 6 },
  variationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectedVariationLabel: {
    fontSize: FontSizes.sm, color: Colors.primary, fontWeight: "600",
    backgroundColor: Colors.pinkSoft, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  variationErrorText: {
    fontSize: FontSizes.xs, color: "#e53e3e", fontWeight: "500", marginBottom: 8,
  },
  variations: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variationChip: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  variationChipActive: { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  variationChipUnavailable: { opacity: 0.4 },
  variationChipError: { borderColor: "#e53e3e" },
  variationWithImage: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingLeft: 4, paddingRight: 14, paddingVertical: 6,
  },
  variationThumb: {
    width: 28, height: 28, borderRadius: 14,
  },
  variationText: {
    fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "500",
    paddingHorizontal: 16, paddingVertical: 8,
  },
  variationTextActive: { color: Colors.primary, fontWeight: "700" },
  variationTextUnavailable: { color: Colors.textLight },
  strikeThrough: {
    position: "absolute", left: 0, right: 0,
    top: "50%", height: 1.5,
    backgroundColor: Colors.textMuted,
  },
  variationHint: {
    marginTop: 8,
    fontSize: FontSizes.xs, color: Colors.textMuted,
    fontStyle: "italic",
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    backgroundColor: Colors.pinkSoft,
    alignItems: "center", justifyContent: "center",
  },
  qtyText: { fontSize: FontSizes.lg, fontWeight: "800", minWidth: 32, textAlign: "center" },
  stockText: { fontSize: FontSizes.xs, color: Colors.textMuted, marginLeft: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  ratingText: { fontSize: FontSizes.sm, fontWeight: "700", color: "#f59e0b", marginLeft: 2 },
  ratingCount: { fontSize: FontSizes.sm, color: Colors.textMuted },

  tabsRow: { flexDirection: "row", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: { paddingHorizontal: 10, paddingBottom: 10, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },

  description: { fontSize: FontSizes.base, color: Colors.textSecondary, lineHeight: 24 },

  benefitItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  benefitItemText: { flex: 1, fontSize: FontSizes.base, color: Colors.textSecondary, lineHeight: 22 },

  stepItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: "#fff", fontSize: FontSizes.xs, fontWeight: "800" },
  stepText: { flex: 1, fontSize: FontSizes.base, color: Colors.textSecondary, lineHeight: 22 },

  faqItem: { gap: 4 },
  faqQ: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  faqA: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  reviewsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  reviewsScore: { flexDirection: "row", alignItems: "center", gap: 4 },
  reviewsScoreText: { fontSize: FontSizes.sm, fontWeight: "700", color: "#f59e0b" },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 14,
    marginBottom: 10,
    ...Shadows.sm,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { color: "#fff", fontWeight: "800", fontSize: FontSizes.sm },
  reviewName: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.textPrimary },
  reviewDate: { fontSize: FontSizes.xs, color: Colors.textMuted },
  reviewText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  footer: {
    flexDirection: "row", gap: 12,
    padding: Spacing.base, paddingBottom: 24,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    alignItems: "center",
  },
  footerPrice: { alignItems: "center" },
  footerPriceLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  footerPriceValue: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.primary },
});
