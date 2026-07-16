import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { productsApi, reviewsApi, api } from "@/services/api";
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
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotionalPrice?: number | null;
  stock: number;
  images: Array<{ url: string; alt?: string }>;
  category: { name: string };
  isNew?: boolean;
  variations: Variation[];
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

type TabKey = "desc" | "caracteristicas" | "modo";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color="#f59e0b"
        />
      ))}
    </View>
  );
}

export default function ProdutoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, isLoading } = useCartStore();
  const { customer } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [togglingFav, setTogglingFav] = useState(false);
  const [variationError, setVariationError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("desc");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  useEffect(() => {
    if (!id) return;
    productsApi.getById(id)
      .then((res) => {
        const p: Product = res.data.data.product;
        setProduct(p);
        const def = p.variations.find((v) => v.isDefault) ?? null;
        if (def && def.stock > 0) setSelectedVariation(def.id);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
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
    setSelectedImage(v.imageUrl ? -1 : 0);
  }

  async function handleAddToCart() {
    if (!product) return;
    if (product.variations.length > 0 && !selectedVariation) {
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

  if (notFound || !product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={[styles.errorText, { marginTop: 12 }]}>Produto não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
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
    : (product.images[Math.max(0, selectedImage)]?.url ?? null);

  const isAvailable = hasVariations
    ? product.variations.some((v) => v.stock > 0)
    : product.stock > 0;

  const activeStock = activeVariation ? activeVariation.stock : product.stock;
  const priceModifier = activeVariation?.priceModifier ?? 0;
  const basePrice = product.promotionalPrice && product.promotionalPrice < product.price
    ? product.promotionalPrice
    : product.price;
  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const price = Number(basePrice) + priceModifier;
  const discount = hasPromo
    ? Math.round(((Number(product.price) - Number(product.promotionalPrice!)) / Number(product.price)) * 100)
    : 0;

  const variationGroupName = product.variations[0]?.name ?? "Opção";

  // Build tabs dynamically — only show a tab if it has content
  const hasCaracteristicas = !!(product.benefits || product.composition || product.careInstructions || product.packageContents);
  const hasModo = !!product.howToUse?.trim();

  const tabs: { key: TabKey; label: string }[] = [
    { key: "desc", label: "Descrição" },
    ...(hasCaracteristicas ? [{ key: "caracteristicas" as TabKey, label: "Características" }] : []),
    ...(hasModo ? [{ key: "modo" as TabKey, label: "Modo de Uso" }] : []),
  ];

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
          {mainImageUri ? (
            <Image source={{ uri: mainImageUri }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={64} color={Colors.border} />
            </View>
          )}
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

        {/* Thumbnails */}
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

        <View style={styles.info}>
          <Text style={styles.category}>{product.category.name}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Rating — apenas se houver avaliações reais */}
          {reviewsTotal > 0 && (
            <View style={styles.ratingRow}>
              <StarRow rating={avgRating} size={14} />
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({reviewsTotal} {reviewsTotal === 1 ? "avaliação" : "avaliações"})</Text>
            </View>
          )}

          {/* Preço */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, hasPromo && styles.pricePromo]}>
              {formatCurrency(price)}
            </Text>
            {hasPromo && (
              <Text style={styles.originalPrice}>{formatCurrency(Number(product.price))}</Text>
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
                          <Image source={{ uri: v.imageUrl }} style={styles.variationThumb} />
                          <Text style={[styles.variationText, isSelected && styles.variationTextActive, unavailable && styles.variationTextUnavailable]}>
                            {v.value}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.variationText, isSelected && styles.variationTextActive, unavailable && styles.variationTextUnavailable]}>
                          {v.value}
                        </Text>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantidade</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
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

          {/* Tabs dinâmicas — apenas com conteúdo real */}
          <View style={styles.section}>
            {tabs.length > 1 && (
              <View style={styles.tabsRow}>
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeTab === "desc" && (
              product.description?.trim()
                ? <Text style={styles.bodyText}>{product.description.trim()}</Text>
                : <Text style={styles.emptyText}>Descrição não disponível.</Text>
            )}

            {activeTab === "caracteristicas" && (
              <View style={{ gap: 16 }}>
                {product.benefits?.trim() && (
                  <View>
                    <Text style={styles.subSectionTitle}>Benefícios</Text>
                    <Text style={styles.bodyText}>{product.benefits.trim()}</Text>
                  </View>
                )}
                {product.composition?.trim() && (
                  <View>
                    <Text style={styles.subSectionTitle}>Composição</Text>
                    <Text style={styles.bodyText}>{product.composition.trim()}</Text>
                  </View>
                )}
                {product.careInstructions?.trim() && (
                  <View>
                    <Text style={styles.subSectionTitle}>Cuidados</Text>
                    <Text style={styles.bodyText}>{product.careInstructions.trim()}</Text>
                  </View>
                )}
                {product.packageContents?.trim() && (
                  <View>
                    <Text style={styles.subSectionTitle}>Conteúdo da embalagem</Text>
                    <Text style={styles.bodyText}>{product.packageContents.trim()}</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === "modo" && (
              <Text style={styles.bodyText}>{product.howToUse!.trim()}</Text>
            )}
          </View>

          {/* Avaliações reais */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              {reviewsTotal > 0 && (
                <View style={styles.reviewsScore}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.reviewsScoreText}>{avgRating.toFixed(1)} / 5</Text>
                  <Text style={styles.reviewsCount}>({reviewsTotal})</Text>
                </View>
              )}
            </View>
            {reviews.length === 0 ? (
              <Text style={styles.emptyText}>Ainda sem avaliações para este produto.</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {(rev.customer.name ?? "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{rev.customer.name}</Text>
                      <StarRow rating={rev.rating} size={11} />
                    </View>
                    <Text style={styles.reviewDate}>{formatDate(rev.createdAt)}</Text>
                  </View>
                  {rev.comment?.trim() ? (
                    <Text style={styles.reviewText}>{rev.comment.trim()}</Text>
                  ) : null}
                </View>
              ))
            )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  errorText: { fontSize: FontSizes.base, color: Colors.textMuted, textAlign: "center" },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, fontStyle: "italic" },
  floatingBtns: {
    position: "absolute", top: 16, left: 16, right: 16,
    flexDirection: "row", justifyContent: "space-between", zIndex: 10,
  },
  floatingBtnInner: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    ...Shadows.sm,
  },
  favBtnActive: { backgroundColor: Colors.primary },
  imagesContainer: { position: "relative", width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: Colors.pinkPale },
  mainImage: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
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
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  ratingText: { fontSize: FontSizes.sm, fontWeight: "700", color: "#f59e0b", marginLeft: 2 },
  ratingCount: { fontSize: FontSizes.sm, color: Colors.textMuted },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  price: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary },
  pricePromo: { color: Colors.primary },
  originalPrice: { fontSize: FontSizes.md, color: Colors.textMuted, textDecorationLine: "line-through" },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  subSectionTitle: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  bodyText: { fontSize: FontSizes.base, color: Colors.textSecondary, lineHeight: 24 },
  variationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectedVariationLabel: {
    fontSize: FontSizes.sm, color: Colors.primary, fontWeight: "600",
    backgroundColor: Colors.pinkSoft, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  variationErrorText: { fontSize: FontSizes.xs, color: "#e53e3e", fontWeight: "500", marginBottom: 8 },
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
  variationThumb: { width: 28, height: 28, borderRadius: 14 },
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
  variationHint: { marginTop: 8, fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: "italic" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    backgroundColor: Colors.pinkSoft,
    alignItems: "center", justifyContent: "center",
  },
  qtyText: { fontSize: FontSizes.lg, fontWeight: "800", minWidth: 32, textAlign: "center" },
  stockText: { fontSize: FontSizes.xs, color: Colors.textMuted, marginLeft: 8 },
  tabsRow: { flexDirection: "row", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: { paddingHorizontal: 12, paddingBottom: 10, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  reviewsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  reviewsScore: { flexDirection: "row", alignItems: "center", gap: 4 },
  reviewsScoreText: { fontSize: FontSizes.sm, fontWeight: "700", color: "#f59e0b" },
  reviewsCount: { fontSize: FontSizes.xs, color: Colors.textMuted },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 14, marginBottom: 10,
    ...Shadows.sm,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { color: "#fff", fontWeight: "800", fontSize: FontSizes.sm },
  reviewName: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2 },
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
