import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors, BorderRadius, FontSizes, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { Ionicons } from "@expo/vector-icons";

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
  };
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addItem, isLoading } = useCartStore();
  const isAvailable = product.stock > 0;
  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const displayPrice = hasPromo ? product.promotionalPrice! : product.price;
  const discount = hasPromo
    ? Math.round(((product.price - product.promotionalPrice!) / product.price) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/produto/${product.id}`)}
      activeOpacity={0.9}
    >
      {/* Imagem */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images[0]?.url ?? "https://placehold.co/300x300/FFB6C1/FFFFFF?text=KA" }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Badges */}
        <View style={styles.badges}>
          {product.isNew && <View style={[styles.badge, styles.badgeNew]}><Text style={styles.badgeText}>Novo</Text></View>}
          {hasPromo && <View style={[styles.badge, styles.badgeDiscount]}><Text style={styles.badgeText}>-{discount}%</Text></View>}
        </View>

        {!isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Esgotado</Text>
          </View>
        )}
      </View>

      {/* Informações */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

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
            onPress={async (e) => {
              e.stopPropagation();
              if (!isAvailable) return;
              await addItem(product.id, 1);
            }}
            disabled={!isAvailable || isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-add" size={18} color="#fff" />
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
  info: {
    padding: 10,
    gap: 6,
  },
  name: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: "500",
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
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
