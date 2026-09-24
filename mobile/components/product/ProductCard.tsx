import { memo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions, PixelRatio } from "react-native";
import { thumbnail } from "@/components/home/brand";
import { useRouter } from "expo-router";
import { Colors, BorderRadius, FontSizes, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ResilientProductImage } from "@/components/product/ResilientProductImage";

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
    slug?: string | null;
    name: string;
    price: number;
    promotionalPrice?: number | null;
    stock: number;
    updatedAt?: string | null;
    images: Array<{ url: string }>;
    isNew?: boolean;
    featured?: boolean;
    badge?: string | null;
    variations?: Variation[];
  };
  badgeSeal?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrency = (v: number) => currencyFormatter.format(v);
const PRODUCT_THUMBNAIL_WIDTH = Math.min(
  640,
  Math.ceil((Dimensions.get("window").width / 2) * PixelRatio.get()),
);

const SITE = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";
function resolveUrl(url?: string | null, version?: string | null): string | null {
  if (!url) return null;
  const resolved = url.startsWith("http") ? url : `${SITE}${url}`;
  if (!version) return resolved;
  return `${resolved}${resolved.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function ProductCardComponent({ product, badgeSeal = false }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const buyNow = useCartStore((state) => state.buyNow);
  const actionLock = useRef(false);
  const [cartAction, setCartAction] = useState<"add" | "buy" | null>(null);
  const customer = useAuthStore((state) => state.customer);

  const variations = product.variations ?? [];
  const hasVariations = variations.length > 0;

  const defaultVariation = variations.find((v) => v.isDefault) ?? variations[0] ?? null;
  const [activeVariation] = useState<Variation | null>(defaultVariation);
  const mainImageUrl =
    resolveUrl(activeVariation?.imageUrl, product.updatedAt) ??
    resolveUrl(product.images[0]?.url, product.updatedAt) ??
    null;

  const isAvailable = hasVariations
    ? variations.some((v) => v.stock > 0)
    : product.stock > 0;

  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const displayPrice = hasPromo ? product.promotionalPrice! : product.price;
  const discount = hasPromo
    ? Math.round(((product.price - product.promotionalPrice!) / product.price) * 100)
    : 0;

  // Use real UUID for DB products. After dedupeProductCards fix, DB products
  // preserve their UUID; only Bling-only products still have "bling-" prefix.
  const productKey = !product.id.startsWith("bling-") ? product.id : (product.slug ?? product.id);

  function openProduct() {
    router.push({
      pathname: "/produto/[id]",
      params: {
        id: productKey,
        previewName: product.name,
        previewPrice: String(product.price),
        previewPromotionalPrice: product.promotionalPrice == null ? "" : String(product.promotionalPrice),
        previewStock: String(product.stock),
        previewImage: mainImageUrl ?? "",
      },
    });
  }

  async function handleCartAction(action: "add" | "buy") {
    if (!isAvailable) return;
    if (actionLock.current) return;
    if (!customer) {
      router.push("/(auth)/entrada");
      return;
    }
    if (hasVariations) {
      openProduct();
      return;
    }
    actionLock.current = true;
    setCartAction(action);
    try {
      if (action === "buy") {
        await buyNow(product.id, 1);
        router.push("/checkout");
      } else {
        await addItem(product.id, 1);
      }
    } catch {
      Alert.alert("Não foi possível concluir agora", "Tente novamente.");
    } finally {
      actionLock.current = false;
      setCartAction(null);
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={openProduct}
      activeOpacity={0.9}
    >
      {/* Imagem */}
      <View style={styles.imageContainer}>
        <ResilientProductImage
          sources={[mainImageUrl ? thumbnail(mainImageUrl, PRODUCT_THUMBNAIL_WIDTH) : null, mainImageUrl]}
          style={styles.image}
          contentFit="contain"
          accessibilityLabel={`Imagem de ${product.name}`}
        />

        {/* Badges */}
        <View style={styles.badges}>
          {product.badge ? (
            <View style={[styles.badge, styles.badgeNew, badgeSeal && styles.badgeSeal]}>
              <Text style={[styles.badgeText, badgeSeal && styles.badgeSealText]}>{product.badge}</Text>
            </View>
          ) : null}
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
        <TouchableOpacity
          style={[styles.floatingCart, !isAvailable && styles.addButtonDisabled]}
          onPress={() => handleCartAction("add")}
          disabled={!isAvailable || cartAction !== null}
          accessibilityLabel={`Adicionar ${product.name} ao carrinho`}
        >
          <Ionicons name="bag-add-outline" size={17} color={isAvailable ? Colors.primary : "#fff"} />
        </TouchableOpacity>
      </View>

      {/* Informações */}
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>

        <View style={styles.priceRow}>
          <View>
            {hasPromo && (
              <Text style={styles.originalPrice}>{formatCurrency(product.price)}</Text>
            )}
            <Text style={[styles.price, hasPromo && styles.pricePromo]}>
              {formatCurrency(displayPrice)}
            </Text>
          </View>

        </View>
        <TouchableOpacity
          style={[styles.addButton, !isAvailable && styles.addButtonDisabled]}
          onPress={() => handleCartAction("buy")}
          disabled={!isAvailable || cartAction !== null}
          activeOpacity={0.8}
        >
          {cartAction === "buy" ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addButtonText}>Comprar agora</Text>}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fce7f3",
    overflow: "hidden",
    ...Shadows.sm,
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    aspectRatio: 4 / 5,
    backgroundColor: Colors.pinkPale,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badges: {
    position: "absolute",
    top: 8, left: 8,
    gap: 4, flexDirection: "column", maxWidth: '65%',
  },
  badge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeNew: { backgroundColor: Colors.primary },
  badgeDiscount: { backgroundColor: Colors.primaryDark },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  badgeSeal: { minHeight: 34, maxWidth: 64, borderRadius: 17, justifyContent: "center" },
  badgeSealText: { textAlign: "center", fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  floatingCart: { position: "absolute", right: 8, top: 8, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center", ...Shadows.sm },
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
    padding: 12,
    gap: 8,
    flex: 1,
  },
  name: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "500",
    lineHeight: 18,
    minHeight: 36,
  },
  colorHint: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginTop: 'auto',
  },
  originalPrice: {
    fontSize: 10,
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  pricePromo: { color: Colors.primary },
  addButton: {
    backgroundColor: Colors.primary,
    width: "100%", minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  addButtonDisabled: { backgroundColor: Colors.textLight },
});
