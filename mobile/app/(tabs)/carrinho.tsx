import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { ResilientProductImage } from "@/components/product/ResilientProductImage";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function CarrinhoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const customer = useAuthStore((state) => state.customer);
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const total = useCartStore((state) => state.total);
  const isLoading = useCartStore((state) => state.isLoading);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null);

  async function changeQuantity(itemId: string, quantity: number, remove = false) {
    if (mutatingItemId) return;
    setMutatingItemId(itemId);
    try {
      if (remove) await removeItem(itemId);
      else await updateItem(itemId, quantity);
    } finally {
      setMutatingItemId(null);
    }
  }

  useEffect(() => {
    if (customer) fetchCart();
  }, [customer]);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>Faça login para ver seu carrinho</Text>
          <View style={{ marginTop: 20, width: 220 }}>
            <Button label="Entrar na conta" onPress={() => router.push("/(auth)/entrada")} fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Carrinho</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.emptyText}>Explore nossos produtos e adicione ao carrinho</Text>
          <View style={{ marginTop: 20, width: 220 }}>
            <Button label="Ver Produtos" onPress={() => router.push("/(tabs)/categorias")} fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Carrinho</Text>
        <Text style={styles.count}>{items.length} {items.length === 1 ? "item" : "itens"}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ResilientProductImage
              sources={[item.product.images[0]?.url]}
              style={styles.itemImage}
              contentFit="cover"
              compact
              accessibilityLabel={`Imagem de ${item.product.name}`}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
              {item.variation && (
                <Text style={styles.itemVariation}>{item.variation.name}: {item.variation.value}</Text>
              )}
              <Text style={styles.itemPrice}>{formatCurrency(item.unitPrice)}</Text>

              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => {
                    void changeQuantity(item.id, item.quantity - 1, item.quantity === 1);
                  }}
                  disabled={mutatingItemId !== null}
                >
                  <Ionicons name={item.quantity > 1 ? "remove" : "trash-outline"} size={16} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => void changeQuantity(item.id, item.quantity + 1)}
                  disabled={mutatingItemId !== null || item.quantity >= (item.variation?.stock ?? item.product.stock)}
                >
                  <Ionicons name="add" size={16} color={Colors.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1 }} />
                <Text style={styles.itemTotal}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Frete</Text>
              <Text style={[styles.summaryValue, { color: Colors.textMuted }]}>Calcular no checkout</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        }
      />

      <View style={[styles.checkoutContainer, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
        <Button
          label={`Finalizar Compra • ${formatCurrency(total)}`}
          onPress={() => router.push("/checkout")}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  header: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingTop: 12, paddingBottom: 16,
  },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary },
  count: { fontSize: FontSizes.sm, color: Colors.textMuted },
  list: { paddingHorizontal: Spacing.base, paddingBottom: 16 },
  separator: { height: 12 },
  item: {
    flexDirection: "row", gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 12,
    ...Shadows.sm,
  },
  itemImage: { width: 80, height: 80, borderRadius: BorderRadius.lg, backgroundColor: Colors.pinkPale },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSizes.base, fontWeight: "600", color: Colors.textPrimary, lineHeight: 20 },
  itemVariation: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 4 },
  qtyRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: BorderRadius.md,
    backgroundColor: Colors.pinkSoft, alignItems: "center", justifyContent: "center",
  },
  qtyText: { fontSize: FontSizes.base, fontWeight: "700", minWidth: 24, textAlign: "center" },
  itemTotal: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.primary },
  footer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginTop: 8,
    ...Shadows.sm,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textMuted },
  summaryValue: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: "500" },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary },
  totalValue: { fontSize: FontSizes.md, fontWeight: "800", color: Colors.primary },
  checkoutContainer: {
    padding: Spacing.base,
    paddingBottom: 24,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", marginTop: 6 },
});
