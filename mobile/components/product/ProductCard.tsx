import { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors, BorderRadius, FontSizes, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { Ionicons } from "@expo/vector-icons";

type Variation = {
  id: string;
  name: string;
  value: string;
  imageUrl?: string | null;
  stock: number;
  isDefault: boolean;
  order: number;
};

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    promotionalPrice?: number | null;
    stock: number;
    images: Array<{ url: string }>;
    isNew?: boolean;
    featured?: boolean;
    variations?: Variation[];
  };
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MAX_SWATCHES = 4;

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addItem, isLoading } = useCartStore();

  const variations = product.variations ?? [];
  const hasVariations = variations.length > 0;

  const defaultVariation = variations.find((v) => v.isDefault) ?? variations[0] ?? null;
  const [activeVariation, setActiveVariation] = useState<Variation | null>(defaultVariation);

  const mainImageUrl =
    (activeVariation?.imageUrl) ??
    product.images[0]?.url ??
    "https://placehold.co/300x300/FFB6C1/FFFFFF?text=KA";

  const isAvailable = hasVariations
    ? variations.some((v) => v.stock > 0)
    : product.stock > 0;

  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const displayPrice = hasPromo ? product.promotionalPrice! : product.price;
  const discount = hasPromo
    ? Math.round(((product.price - product.promotionalPrice!) / product.price) * 100)
    : 0;

  const visibleSwatches = variations.slice(0, MAX_SWATCHES);
  const extraCount = Math.max(0, variations.length - MAX_SWATCHES);

  async function handleAddToCart() {
    if (!isAvailable) return;
    if (hasVariations) {
      router.push(`/produto/${product.id}`);
      return;
    }
    await addItem(product.id, 1);
  }

  function handleSwatchPress(v: Variation) {
    if (v.stock === 0) return;
    setActiveVariation((prev) => (prev?.id === v.id ? prev : v));
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/produto/${product.id}`)}
      activeOpacity={0.9}
    >
      {/* Imagem */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: mainImageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Badges */}
        <View style={styles.badges}>
          {product.isNew && (
            <View style={[styles.badge, styles.badgeNew]}>
              <Text style={styles.badgeText}>Novo</Text>
            </View>
          )}
          {hasPromo && (
            <View style={[styles.badge, styles.badgeDiscount]}>
              <Text style={styles.badgeText}>-{discount}%</Text>
            </View>
          )}
        </View>

        {!isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Esgotado</Text>
          </View>
        )}

        {/* Swatches de cor sobrepostos na imagem (canto inferior esquerdo) */}
        {hasVariations && (
          <View style={styles.swatchesOverlay}>
            {visibleSwatches.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={(e) => { e.stopPropagation?.(); handleSwatchPress(v); }}
                accessibilityLabel={v.value}
                style={[
                  styles.swatch,
                  activeVariation?.id === v.id && styles.swatchActive,
                  v.stock === 0 && styles.swatchUnavailable,
                ]}
              >
                {v.imageUrl ? (
                  <Image source={{ uri: v.imageUrl }} style={styles.swatchImage} />
                ) : (
                  <View style={[styles.swatchDot, v.stock === 0 && styles.swatchDotUnavailable]} />
                )}
              </TouchableOpacity>
            ))}
            {extraCount > 0 && (
              <View style={styles.swatchExtra}>
                <Text style={styles.swatchExtraText}>+{extraCount}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Informações */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        {hasVariations && (
          <Text style={styles.colorHint}>
            {activeVariation ? activeVariation.value : `${variations.length} cores`}
          </Text>
        )}

        <View style={styles.priceRow}>
          <View>
            {hasPromo && (
              <Text style={styles.originalPrice}>{formatCurrency(product.price)}</Text>
            )}
            <Text style={[styles.price, hasPromo && styles.pricePromo]}>
              {formatCurrency(displayPrice)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addButton, !isAvailable && styles.addButtonDisabled]}
            onPress={handleAddToCart}
            disabled={!isAvailable || isLoading}
            activeOpacity={0.8}
          >
            <Ionicons
              name={hasVariations ? "arrow-forward" : "bag-add"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    ...Shadows.sm,
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    aspectRatio: 1,
    backgroundColor: Colors.pinkPale,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badges: {
    position: "absolute",
    top: 8, left: 8,
    gap: 4, flexDirection: "row",
  },
  badge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeNew: { backgroundColor: Colors.primary },
  badgeDiscount: { backgroundColor: Colors.primaryDark },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: { color: "#fff", fontWeight: "700", fontSize: FontSizes.sm },
  swatchesOverlay: {
    position: "absolute",
    bottom: 6, left: 6,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  swatch: {
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    overflow: "hidden",
    backgroundColor: Colors.pinkPale,
  },
  swatchActive: {
    borderColor: "#fff",
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  swatchUnavailable: { opacity: 0.4 },
  swatchImage: { width: "100%", height: "100%" },
  swatchDot: {
    flex: 1,
    backgroundColor: Colors.textMuted,
    margin: 2,
    borderRadius: 10,
  },
  swatchDotUnavailable: { backgroundColor: Colors.textLight },
  swatchExtra: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  swatchExtraText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  info: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: "500",
    lineHeight: 18,
  },
  colorHint: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 2,
  },
  originalPrice: {
    fontSize: 10,
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: FontSizes.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  pricePromo: { color: Colors.primary },
  addButton: {
    backgroundColor: Colors.primary,
    width: 34, height: 34,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: { backgroundColor: Colors.textLight },
});
