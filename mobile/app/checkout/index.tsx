import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { shippingApi } from "@/services/api";
import { Button } from "@/components/ui/Button";

type ShippingOption = {
  type: string; name: string; description: string;
  price: number; estimatedDays?: number; available: boolean;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function CheckoutEntregaScreen() {
  const router = useRouter();
  const { items, subtotal } = useCartStore();
  const { zipCode, setZipCode, shippingOptions, setShippingOptions, selectShipping, selectedShipping, setCalculatingShipping, isCalculatingShipping } = useCheckoutStore();

  const [zip, setZip] = useState(zipCode);

  async function calcularFrete() {
    if (zip.replace(/\D/g, "").length < 8) return;
    setCalculatingShipping(true);
    try {
      const res = await shippingApi.calculate(zip);
      const options: ShippingOption[] = res.data.data ?? [];
      setShippingOptions(options);
      setZipCode(zip);
    } finally {
      setCalculatingShipping(false);
    }
  }

  const total = subtotal + (selectedShipping?.price ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Entrega</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumo do carrinho */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.quantity}× {item.product.name}
              </Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
        </View>

        {/* CEP */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calcular Frete</Text>
          <View style={styles.zipRow}>
            <TextInput
              value={zip}
              onChangeText={(v) => setZip(v.replace(/\D/g, "").substring(0, 8))}
              placeholder="00000-000"
              keyboardType="number-pad"
              style={styles.zipInput}
              placeholderTextColor={Colors.textLight}
              maxLength={9}
            />
            <Button
              label="Calcular"
              onPress={calcularFrete}
              loading={isCalculatingShipping}
              size="sm"
              style={{ minWidth: 90 }}
            />
          </View>
        </View>

        {/* Opções de entrega */}
        {shippingOptions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Opções de Entrega</Text>
            <View style={styles.shippingOptions}>
              {shippingOptions.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.shippingOption,
                    selectedShipping?.name === opt.name && styles.shippingOptionSelected,
                    !opt.available && styles.shippingOptionUnavailable,
                  ]}
                  onPress={() => opt.available && selectShipping(opt)}
                  disabled={!opt.available}
                >
                  <View style={styles.shippingRadio}>
                    {selectedShipping?.name === opt.name && (
                      <View style={styles.shippingRadioFill} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shippingName}>{opt.name}</Text>
                    <Text style={styles.shippingDesc} numberOfLines={2}>{opt.description}</Text>
                    {opt.estimatedDays !== undefined && opt.estimatedDays > 0 && (
                      <Text style={styles.shippingDays}>
                        Prazo: ~{opt.estimatedDays} {opt.estimatedDays === 1 ? "dia útil" : "dias úteis"}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.shippingPrice, opt.price === 0 && styles.shippingFree]}>
                    {opt.price === 0 ? "Grátis" : formatCurrency(opt.price)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerTotal}>
            {formatCurrency(total)}
            {selectedShipping && (
              <Text style={styles.footerFrete}> (+ frete {selectedShipping.price === 0 ? "grátis" : formatCurrency(selectedShipping.price)})</Text>
            )}
          </Text>
        </View>
        <Button
          label="Ir para Pagamento"
          onPress={() => router.push("/checkout/pagamento")}
          disabled={!selectedShipping}
          size="lg"
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm,
  },
  title: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  content: { paddingHorizontal: Spacing.base, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"], padding: 16, ...Shadows.sm },
  cardTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  itemName: { flex: 1, fontSize: FontSizes.sm, color: Colors.textSecondary, marginRight: 8 },
  itemPrice: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textMuted },
  summaryValue: { fontSize: FontSizes.sm, fontWeight: "700" },
  zipRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  zipInput: {
    flex: 1, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSizes.base, color: Colors.textPrimary,
  },
  shippingOptions: { gap: 10 },
  shippingOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, padding: 14,
  },
  shippingOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  shippingOptionUnavailable: { opacity: 0.5 },
  shippingRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  shippingRadioFill: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary,
  },
  shippingName: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  shippingDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  shippingDays: { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 2, fontWeight: "600" },
  shippingPrice: { fontSize: FontSizes.base, fontWeight: "800", color: Colors.textPrimary },
  shippingFree: { color: Colors.success },
  footer: {
    flexDirection: "row", gap: 12, padding: Spacing.base, paddingBottom: 24,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    alignItems: "center",
  },
  footerLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  footerTotal: { fontSize: FontSizes.md, fontWeight: "800", color: Colors.textPrimary },
  footerFrete: { fontSize: FontSizes.xs, fontWeight: "400", color: Colors.textMuted },
});
