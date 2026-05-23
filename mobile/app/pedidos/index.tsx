import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ordersApi } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

type Order = {
  id: string; orderNumber: string; status: string;
  total: number; shippingType: string; createdAt: string;
  items: Array<{ productName: string }>;
  payment?: { status: string };
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  CRIADO:               { label: "Criado",              color: Colors.textMuted,   bg: Colors.surfaceAlt },
  AGUARDANDO_PAGAMENTO: { label: "Aguard. Pagamento",   color: Colors.warning,     bg: Colors.warningLight },
  PAGAMENTO_APROVADO:   { label: "Pago",                color: Colors.success,     bg: Colors.successLight },
  EM_SEPARACAO:         { label: "Em Separação",        color: Colors.info,        bg: Colors.infoLight },
  PRONTO_PARA_RETIRADA: { label: "Pronto p/ Retirada",  color: Colors.primary,     bg: Colors.pinkSoft },
  SAIU_PARA_ENTREGA:    { label: "Saiu p/ Entrega",     color: Colors.primaryDark, bg: Colors.pinkSoft },
  ENVIADO_CORREIOS:     { label: "Correios",            color: Colors.info,        bg: Colors.infoLight },
  ENTREGUE:             { label: "Entregue ✓",          color: Colors.success,     bg: Colors.successLight },
  CANCELADO:            { label: "Cancelado",           color: Colors.error,       bg: Colors.errorLight },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function PedidosScreen() {
  const router = useRouter();
  const { customer } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) { setLoading(false); return; }
    ordersApi.list()
      .then((res) => setOrders(res.data.data ?? []))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Meus Pedidos</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>Faça login para ver seus pedidos</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Pedidos</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const status = statusConfig[item.status] ?? { label: item.status, color: Colors.textMuted, bg: Colors.surfaceAlt };
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/pedidos/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <Text style={styles.itemsList} numberOfLines={1}>
                {item.items.map((i) => i.productName).join(", ")}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</Text>
                <Text style={styles.total}>{formatCurrency(item.total)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Nenhum pedido ainda</Text>
            <Text style={styles.emptyText}>Seus pedidos aparecerão aqui</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm,
  },
  title: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  list: { padding: Spacing.base, gap: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"],
    padding: 16, ...Shadows.sm, gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNumber: { fontSize: FontSizes.sm, fontWeight: "800", color: Colors.primary, fontFamily: "monospace" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: "700" },
  itemsList: { fontSize: FontSizes.sm, color: Colors.textMuted },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  date: { fontSize: FontSizes.xs, color: Colors.textMuted },
  total: { fontSize: FontSizes.base, fontWeight: "800", color: Colors.textPrimary },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", marginTop: 6 },
});
