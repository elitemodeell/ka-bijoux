import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { productsApi } from "@/services/api";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/Button";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Product = {
  id: string; name: string; description: string;
  price: number; promotionalPrice?: number | null; stock: number;
  images: Array<{ url: string; alt?: string }>;
  category: { name: string }; isNew?: boolean;
  variations: Array<{ id: string; name: string; value: string; stock: number }>;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ProdutoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, isLoading } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    productsApi.getById(id)
      .then((res) => {
        const data = res.data.data;
        setProduct(data.product);
        setRelated(data.related ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  const isAvailable = product.stock > 0;
  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const price = hasPromo ? product.promotionalPrice! : product.price;
  const discount = hasPromo
    ? Math.round(((product.price - product.promotionalPrice!) / product.price) * 100)
    : 0;

  async function handleAddToCart() {
    await addItem(product!.id, quantity, selectedVariation ?? undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <View style={styles.backBtnInner}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </View>
        </TouchableOpacity>

        {/* Imagens */}
        <View style={styles.imagesContainer}>
          <Image
            source={{ uri: product.images[selectedImage]?.url ?? "https://placehold.co/400x400/FFB6C1/FFF?text=KA" }}
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

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.category}>{product.category.name}</Text>
          <Text style={styles.name}>{product.name}</Text>

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
          {product.variations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opções disponíveis</Text>
              <View style={styles.variations}>
                {product.variations.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.variationChip,
                      selectedVariation === v.id && styles.variationChipActive,
                      v.stock === 0 && styles.variationChipUnavailable,
                    ]}
                    onPress={() => v.stock > 0 && setSelectedVariation(v.id === selectedVariation ? null : v.id)}
                    disabled={v.stock === 0}
                  >
                    <Text style={[
                      styles.variationText,
                      selectedVariation === v.id && styles.variationTextActive,
                    ]}>
                      {v.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
              >
                <Ionicons name="add" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.stockText}>
                {product.stock} {product.stock === 1 ? "disponível" : "disponíveis"}
              </Text>
            </View>
          </View>

          {/* Descrição */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add to cart button */}
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
  backBtn: {
    position: "absolute", top: 16, left: 16, zIndex: 10,
  },
  backBtnInner: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    ...Shadows.sm,
  },
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
  sectionTitle: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary, marginBottom: 10 },
  variations: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variationChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  variationChipActive: { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  variationChipUnavailable: { opacity: 0.4 },
  variationText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "500" },
  variationTextActive: { color: Colors.primary, fontWeight: "700" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    backgroundColor: Colors.pinkSoft,
    alignItems: "center", justifyContent: "center",
  },
  qtyText: { fontSize: FontSizes.lg, fontWeight: "800", minWidth: 32, textAlign: "center" },
  stockText: { fontSize: FontSizes.xs, color: Colors.textMuted, marginLeft: 8 },
  description: { fontSize: FontSizes.base, color: Colors.textSecondary, lineHeight: 24 },
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
