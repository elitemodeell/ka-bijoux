import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ordersApi } from "@/services/api";

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingPrice: number;
  discount: number;
  total: number;
  shippingType: string;
  shippingTrackingCode?: string;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    variationName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: { images: Array<{ url: string }> };
  }>;
  payment?: {
    method: string;
    status: string;
    pixCode?: string;
    paidAt?: string;
  };
  address?: {
    street: string; number: string; complement?: string;
    neighborhood: string; city: string; state: string; zipCode: string;
  };
  statusHistory: Array<{
    id: string; status: string; note?: string; createdAt: string;
  }>;
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CRIADO:               { label: "Criado",                  color: Colors.textMuted,   bg: Colors.surfaceAlt,   icon: "receipt-outline" },
  AGUARDANDO_PAGAMENTO: { label: "Aguardando Pagamento",    color: Colors.warning,     bg: Colors.warningLight, icon: "time-outline" },
  PAGAMENTO_APROVADO:   { label: "Pagamento Aprovado",      color: Colors.success,     bg: Colors.successLight, icon: "checkmark-circle-outline" },
  EM_SEPARACAO:         { label: "Em Separação",            color: Colors.info,        bg: Colors.infoLight,    icon: "cube-outline" },
  PRONTO_PARA_RETIRADA: { label: "Pronto para Retirada",   color: Colors.primary,     bg: Colors.pinkSoft,     icon: "storefront-outline" },
  SAIU_PARA_ENTREGA:    { label: "Saiu para Entrega",       color: Colors.primaryDark, bg: Colors.pinkSoft,     icon: "bicycle-outline" },
  ENVIADO_CORREIOS:     { label: "Enviado pelos Correios",  color: Colors.info,        bg: Colors.infoLight,    icon: "mail-outline" },
  ENTREGUE:             { label: "Entregue",                color: Colors.success,     bg: Colors.successLight, icon: "checkmark-done-outline" },
  CANCELADO:            { label: "Cancelado",               color: Colors.error,       bg: Colors.errorLight,   icon: "close-circle-outline" },
};

const shippingLabel: Record<string, string> = {
  RETIRADA: "Retirada na Loja",
  MOTOTAXI: "Mototáxi — Itaúna",
  CORREIOS: "Correios",
};

const paymentMethodLabel: Record<string, string> = {
  PIX: "Pix", CARTAO_CREDITO: "Cartão de Crédito", BOLETO: "Boleto",
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  AGUARDANDO:  { label: "Aguardando pagamento", color: Colors.warning },
  PAGO:        { label: "Pago",                  color: Colors.success },
  RECUSADO:    { label: "Recusado",              color: Colors.error },
  CANCELADO:   { label: "Cancelado",             color: Colors.error },
  REEMBOLSADO: { label: "Reembolsado",           color: Colors.info },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function PedidoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const [order, setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!id) return;
    ordersApi.getById(id)
      .then((res) => setOrder(res.data.data))
      .catch(() => setError("Não foi possível carregar o pedido."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Pedido</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || "Pedido não encontrado."}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.primary, fontWeight: "600" }}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status  = statusConfig[order.status] ?? { label: order.status, color: Colors.textMuted, bg: Colors.surfaceAlt, icon: "help-outline" as const };
  const payment = order.payment;
  const pixPending = payment?.method === "PIX" && payment.status === "AGUARDANDO" && payment.pixCode;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{order.orderNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Banner de status */}
        <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={28} color={status.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            <Text style={styles.statusDate}>
              Pedido em {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Código PIX pendente */}
        {pixPending && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💠 Pague com Pix</Text>
            <Text style={styles.pixInstr}>Copie o código e pague no aplicativo do seu banco</Text>
            <View style={styles.pixBox}>
              <Text style={styles.pixCode} selectable numberOfLines={6}>
                {payment.pixCode}
              </Text>
            </View>
            <Text style={styles.pixExp}>⏱️ Expira em 30 minutos</Text>
          </View>
        )}

        {/* Itens */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Itens do Pedido</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image
                source={{ uri: item.product?.images?.[0]?.url ?? "https://placehold.co/56x56/FFB6C1/FFF?text=KA" }}
                style={styles.itemImage}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                {item.variationName && (
                  <Text style={styles.itemVariation}>{item.variationName}</Text>
                )}
                <Text style={styles.itemQty}>{item.quantity}× {fmt(item.unitPrice)}</Text>
              </View>
              <Text style={styles.itemTotal}>{fmt(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Totais */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo Financeiro</Text>
          <Row label="Subtotal" value={fmt(order.subtotal)} />
          <Row
            label={`Frete — ${shippingLabel[order.shippingType] ?? order.shippingType}`}
            value={order.shippingPrice === 0 ? "Grátis" : fmt(order.shippingPrice)}
            valueColor={order.shippingPrice === 0 ? Colors.success : undefined}
          />
          {order.discount > 0 && (
            <Row label="Desconto" value={`−${fmt(order.discount)}`} valueColor={Colors.success} />
          )}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(order.total)}</Text>
          </View>
        </View>

        {/* Pagamento */}
        {payment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pagamento</Text>
            <Row label="Método" value={paymentMethodLabel[payment.method] ?? payment.method} />
            <Row
              label="Status"
              value={paymentStatusConfig[payment.status]?.label ?? payment.status}
              valueColor={paymentStatusConfig[payment.status]?.color}
            />
            {payment.paidAt && (
              <Row label="Pago em" value={new Date(payment.paidAt).toLocaleDateString("pt-BR")} />
            )}
          </View>
        )}

        {/* Endereço */}
        {order.address && order.shippingType !== "RETIRADA" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Endereço de Entrega</Text>
            <Text style={styles.addrText}>
              {order.address.street}, {order.address.number}
              {order.address.complement ? ` — ${order.address.complement}` : ""}
            </Text>
            <Text style={styles.addrText}>{order.address.neighborhood}</Text>
            <Text style={styles.addrText}>
              {order.address.city}/{order.address.state} — CEP {order.address.zipCode}
            </Text>
          </View>
        )}

        {order.shippingType === "RETIRADA" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Retirada na Loja</Text>
            <Text style={styles.addrText}>
              KA Bijoux — Itaúna/MG{"\n"}
              Compareça após a confirmação do pagamento.
            </Text>
          </View>
        )}

        {/* Rastreio */}
        {order.shippingTrackingCode && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Código de Rastreio</Text>
            <Text style={[styles.addrText, { fontFamily: "monospace", color: Colors.primary, letterSpacing: 1 }]}>
              {order.shippingTrackingCode}
            </Text>
          </View>
        )}

        {/* Histórico */}
        {order.statusHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Histórico</Text>
            {order.statusHistory.map((h) => {
              const sc = statusConfig[h.status];
              return (
                <View key={h.id} style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: sc?.color ?? Colors.textMuted }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyStatus, { color: sc?.color ?? Colors.textMuted }]}>
                      {sc?.label ?? h.status}
                    </Text>
                    {h.note && <Text style={styles.historyNote}>{h.note}</Text>}
                    <Text style={styles.historyDate}>
                      {new Date(h.createdAt).toLocaleString("pt-BR")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm,
  },
  title:     { flex: 1, fontSize: FontSizes.base, fontWeight: "800", color: Colors.textPrimary, textAlign: "center" },
  errorText: { fontSize: FontSizes.base, color: Colors.textMuted },
  content:   { paddingHorizontal: Spacing.base, gap: 12 },

  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: BorderRadius["2xl"], padding: 16,
  },
  statusLabel: { fontSize: FontSizes.md, fontWeight: "800" },
  statusDate:  { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },

  card:      { backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"], padding: 16, ...Shadows.sm },
  cardTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 },

  pixInstr: { fontSize: FontSizes.xs, color: Colors.textMuted, marginBottom: 10 },
  pixBox:   { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: 12, borderWidth: 1, borderColor: Colors.pinkLight },
  pixCode:  { fontSize: FontSizes.xs, fontFamily: "monospace", color: Colors.textPrimary, lineHeight: 18 },
  pixExp:   { fontSize: FontSizes.xs, color: Colors.warning, fontWeight: "600", marginTop: 8 },

  itemRow:     { flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "flex-start" },
  itemImage:   { width: 56, height: 56, borderRadius: BorderRadius.lg, backgroundColor: Colors.pinkPale },
  itemName:    { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary, lineHeight: 18 },
  itemVariation: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  itemQty:     { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 },
  itemTotal:   { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.primary },

  row:          { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  rowLabel:     { fontSize: FontSizes.sm, color: Colors.textMuted },
  rowValue:     { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  totalDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  totalRow:     { flexDirection: "row", justifyContent: "space-between" },
  totalLabel:   { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  totalValue:   { fontSize: FontSizes.lg, fontWeight: "900", color: Colors.primary },

  addrText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 22 },

  historyRow:    { flexDirection: "row", gap: 12, marginBottom: 12 },
  historyDot:    { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  historyStatus: { fontSize: FontSizes.sm, fontWeight: "700" },
  historyNote:   { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  historyDate:   { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
});
