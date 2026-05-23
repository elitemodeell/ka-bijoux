import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ordersApi } from "@/services/api";
import { Button } from "@/components/ui/Button";

type Order = {
  id: string; orderNumber: string; status: string; total: number;
  shippingType: string;
  payment?: { method: string; pixCode?: string; pixExpiration?: string };
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ConfirmacaoScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId) {
      ordersApi.getById(orderId).then((res) => setOrder(res.data.data));
    }
  }, [orderId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Sucesso */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
        </View>
        <Text style={styles.successTitle}>Pedido Confirmado! 🎉</Text>
        <Text style={styles.successText}>
          Obrigada por comprar na KA Bijoux!{"\n"}
          Acompanhe seu pedido pelo app.
        </Text>

        {order && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalhes do Pedido</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Número do Pedido</Text>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total</Text>
              <Text style={styles.rowValue}>{formatCurrency(order.total)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Entrega</Text>
              <Text style={styles.rowValue}>
                {order.shippingType === "RETIRADA" ? "Retirada na loja"
                  : order.shippingType === "MOTOTAXI" ? "Mototáxi - Itaúna"
                  : "Correios"}
              </Text>
            </View>

            {/* Pix */}
            {order.payment?.method === "PIX" && order.payment.pixCode && (
              <View style={styles.pixContainer}>
                <Text style={styles.pixTitle}>💠 Código Pix para pagamento</Text>
                <Text style={styles.pixSubtitle}>
                  Copie o código abaixo e pague no aplicativo do seu banco
                </Text>
                <View style={styles.pixCode}>
                  <Text style={styles.pixCodeText} selectable numberOfLines={4}>
                    {order.payment.pixCode}
                  </Text>
                </View>
                <Text style={styles.pixExpiry}>
                  ⏱️ Expira em 30 minutos
                </Text>
              </View>
            )}

            {order.shippingType === "RETIRADA" && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  🏪 Compareça à loja KA Bijoux em Itaúna/MG para retirar seu pedido após a confirmação do pagamento.
                </Text>
              </View>
            )}

            {order.shippingType === "MOTOTAXI" && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  🏍️ Entrega local por mototáxi em Itaúna. Você receberá uma notificação quando o pedido sair para entrega.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label="Ver Meus Pedidos"
            onPress={() => router.replace("/pedidos")}
            fullWidth
            size="lg"
          />
          <Button
            label="Continuar Comprando"
            onPress={() => router.replace("/(tabs)")}
            variant="outline"
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: 20, alignItems: "center" },
  successIcon: { marginTop: 20, marginBottom: 4 },
  successTitle: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
  successText: { fontSize: FontSizes.base, color: Colors.textMuted, textAlign: "center", lineHeight: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"],
    padding: 20, ...Shadows.sm, width: "100%",
  },
  cardTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  rowLabel: { fontSize: FontSizes.sm, color: Colors.textMuted },
  rowValue: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  orderNumber: { fontSize: FontSizes.sm, fontWeight: "800", color: Colors.primary, fontFamily: "monospace" },
  pixContainer: {
    marginTop: 16, backgroundColor: Colors.pinkPale,
    borderRadius: BorderRadius.xl, padding: 14, gap: 8,
  },
  pixTitle: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.primary },
  pixSubtitle: { fontSize: FontSizes.xs, color: Colors.textMuted },
  pixCode: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: 12,
    borderWidth: 1, borderColor: Colors.pinkLight,
  },
  pixCodeText: { fontSize: FontSizes.xs, color: Colors.textPrimary, fontFamily: "monospace", lineHeight: 18 },
  pixExpiry: { fontSize: FontSizes.xs, color: Colors.warning, fontWeight: "600" },
  infoBox: {
    marginTop: 12, backgroundColor: Colors.infoLight,
    borderRadius: BorderRadius.lg, padding: 12,
  },
  infoText: { fontSize: FontSizes.sm, color: Colors.info, lineHeight: 20 },
  actions: { width: "100%", gap: 10 },
});
