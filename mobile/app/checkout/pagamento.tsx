import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { ordersApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";

type PaymentMethod = "PIX" | "CARTAO_CREDITO";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function PagamentoScreen() {
  const router = useRouter();
  const { customer } = useAuthStore();
  const { subtotal } = useCartStore();
  const { selectedShipping, addressId, setPaymentMethod, paymentMethod, reset } = useCheckoutStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = subtotal + (selectedShipping?.price ?? 0);

  async function finalizarPedido() {
    if (!paymentMethod) { setError("Selecione uma forma de pagamento."); return; }
    if (!customer) { router.push("/(auth)/login"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await ordersApi.create({
        addressId: addressId,
        shippingType: selectedShipping?.type,
        shippingPrice: selectedShipping?.price ?? 0,
        paymentMethod,
      });

      const order = res.data.data;
      reset();
      router.replace(`/checkout/confirmacao?orderId=${order.id}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao finalizar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const paymentOptions: Array<{ method: PaymentMethod; label: string; desc: string; icon: string }> = [
    { method: "PIX", label: "Pix", desc: "Pagamento instantâneo — copie o código e pague no seu banco", icon: "💠" },
    { method: "CARTAO_CREDITO", label: "Cartão de Crédito", desc: "Em até 12× sem juros (quando disponível)", icon: "💳" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Resumo do pedido */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo do Pedido</Text>
          <View style={styles.row}><Text style={styles.rowLabel}>Subtotal</Text><Text style={styles.rowValue}>{formatCurrency(subtotal)}</Text></View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Frete — {selectedShipping?.name}</Text>
            <Text style={[styles.rowValue, selectedShipping?.price === 0 && { color: Colors.success }]}>
              {selectedShipping?.price === 0 ? "Grátis" : formatCurrency(selectedShipping?.price ?? 0)}
            </Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Forma de pagamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forma de Pagamento</Text>
          {paymentOptions.map((opt) => (
            <TouchableOpacity
              key={opt.method}
              style={[styles.option, paymentMethod === opt.method && styles.optionSelected]}
              onPress={() => setPaymentMethod(opt.method)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionIcon}>{opt.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
              <View style={[styles.radio, paymentMethod === opt.method && styles.radioActive]}>
                {paymentMethod === opt.method && <View style={styles.radioFill} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={loading ? "Finalizando..." : `Finalizar Pedido • ${formatCurrency(total)}`}
          onPress={finalizarPedido}
          loading={loading}
          disabled={!paymentMethod}
          fullWidth
          size="lg"
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
  cardTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  rowLabel: { fontSize: FontSizes.sm, color: Colors.textMuted },
  rowValue: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  totalValue: { fontSize: FontSizes.lg, fontWeight: "900", color: Colors.primary },
  option: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, padding: 14, marginBottom: 10,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  optionIcon: { fontSize: 28 },
  optionLabel: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  optionDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: Colors.primary },
  radioFill: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  errorBox: {
    backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12,
  },
  errorText: { color: Colors.error, fontSize: FontSizes.sm },
  footer: { padding: Spacing.base, paddingBottom: 24, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
});
