import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Clipboard,
  Image,
  Linking,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ordersApi } from "@/services/api";
import { Button } from "@/components/ui/Button";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  shippingType: string;
  payment?: {
    method: string;
    status: string;
    amount: number;
    pixCode?: string;
    pixQrCode?: string;
    pixExpiration?: string;
    checkoutUrl?: string;
    checkoutExpiration?: string;
    boletoUrl?: string;
    boletoDigitableLine?: string;
    boletoExpiration?: string;
    installmentCount?: number;
    installmentValue?: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function ConfirmacaoScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError("Pedido não identificado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await ordersApi.getById(orderId);
      setOrder(response.data.data);
    } catch {
      setError("Não foi possível carregar o pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void loadOrder();
    });
    return () => subscription.remove();
  }, [loadOrder]);

  useEffect(() => {
    const pending =
      order?.payment?.status === "AGUARDANDO" ||
      order?.payment?.status === "EM_ANALISE";
    if (!pending) return;
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void loadOrder();
    }, 5_000);
    return () => clearInterval(interval);
  }, [loadOrder, order?.payment?.status]);

  function copyPixCode(code: string) {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  async function sharePixCode(code: string) {
    await Share.share({ message: code, title: "Código Pix — KA Bijoux" });
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  }

  const payment = order?.payment;
  const pixCode = payment?.pixCode;
  const pixExpiration = payment?.pixExpiration;
  const qrSource = payment?.pixQrCode
    ? payment.pixQrCode.startsWith("data:")
      ? payment.pixQrCode
      : `data:image/png;base64,${payment.pixQrCode}`
    : null;
  const paymentStatus = payment?.status;
  const pixExpired =
    paymentStatus === "EXPIRADO" ||
    order?.status === "PAGAMENTO_EXPIRADO" ||
    Boolean(pixExpiration && new Date(pixExpiration).getTime() <= Date.now());
  const canPayPix =
    payment?.method === "PIX" &&
    Boolean(pixCode) &&
    !pixExpired &&
    paymentStatus === "AGUARDANDO";
  const canOpenCardCheckout =
    payment?.method === "CARTAO_CREDITO" &&
    paymentStatus === "AGUARDANDO" &&
    Boolean(payment.checkoutUrl);
  const canPayBoleto =
    payment?.method === "BOLETO" &&
    paymentStatus === "AGUARDANDO" &&
    Boolean(payment.boletoUrl);
  const refunded =
    paymentStatus === "REEMBOLSADO" || paymentStatus === "ESTORNO_PENDENTE";
  const failed =
    paymentStatus === "FALHA" ||
    paymentStatus === "RECUSADO" ||
    paymentStatus === "CANCELADO" ||
    order?.status === "FALHA_NO_PAGAMENTO" ||
    order?.status === "CANCELADO";
  const confirmationTitle =
    paymentStatus === "PAGO"
      ? "Pagamento confirmado"
      : paymentStatus === "EM_ANALISE"
        ? "Pagamento em análise"
        : refunded
          ? "Reembolso do pedido"
          : pixExpired
            ? "Pix expirado"
            : failed
              ? "Pagamento não concluído"
              : "Pedido criado";
  const confirmationSubtitle =
    paymentStatus === "PAGO"
      ? "O pagamento foi recebido e o pedido seguirá para separação."
      : paymentStatus === "EM_ANALISE"
        ? "O provedor está analisando o pagamento. Não pague o código Pix novamente."
        : refunded
          ? "Acompanhe abaixo o estado atual do reembolso."
          : pixExpired
            ? "O código não deve mais ser pago. Para comprar novamente, faça um novo pedido."
            : failed
              ? "Este pagamento não foi concluído. Consulte o estado do pedido antes de tentar novamente."
              : "O pedido só será confirmado depois da confirmação financeira do provedor.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pendingIcon}>
          <Ionicons
            name={
              paymentStatus === "PAGO"
                ? "checkmark-circle-outline"
                : refunded
                  ? "return-down-back-outline"
                  : pixExpired || failed
                    ? "alert-circle-outline"
                    : "time-outline"
            }
            size={64}
            color={
              paymentStatus === "PAGO"
                ? Colors.success
                : pixExpired || failed
                  ? Colors.error
                  : Colors.warning
            }
          />
        </View>
        <Text style={styles.title}>{confirmationTitle}</Text>
        <Text style={styles.subtitle}>{confirmationSubtitle}</Text>

        {loading ? <ActivityIndicator color={Colors.primary} size="large" /> : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadOrder}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {order ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalhes do pedido</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Número</Text>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total calculado pelo servidor</Text>
              <Text style={styles.total}>{formatCurrency(Number(order.total))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Entrega</Text>
              <Text style={styles.rowValue}>
                {order.shippingType === "RETIRADA"
                  ? "Retirada na loja"
                  : order.shippingType === "MOTOTAXI"
                    ? "Mototáxi — Itaúna"
                    : "Correios"}
              </Text>
            </View>

            {canPayPix ? (
              <View style={styles.pixContainer}>
                <Text style={styles.pixTitle}>Pague com Pix</Text>
                <Text style={styles.pixSubtitle}>
                  Confira o valor no aplicativo do seu banco antes de confirmar.
                </Text>

                {qrSource ? <Image source={{ uri: qrSource }} style={styles.qrCode} /> : null}

                <View style={styles.pixCodeBox}>
                  <Text style={styles.pixCodeText} selectable numberOfLines={6}>
                    {pixCode}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.shareButton, copied && styles.shareButtonDone]}
                  onPress={() => copyPixCode(pixCode ?? "")}
                >
                  <Ionicons
                    name={copied ? "checkmark-circle" : "copy-outline"}
                    size={18}
                    color={copied ? Colors.success : Colors.primary}
                  />
                  <Text style={[styles.shareButtonText, copied && styles.shareButtonTextDone]}>
                    {copied ? "Código copiado" : "Copiar código Pix"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareButton, shared && styles.shareButtonDone]}
                  onPress={() => sharePixCode(pixCode ?? "")}
                >
                  <Ionicons
                    name={shared ? "checkmark-circle" : "share-outline"}
                    size={18}
                    color={shared ? Colors.success : Colors.primary}
                  />
                  <Text style={[styles.shareButtonText, shared && styles.shareButtonTextDone]}>
                    {shared ? "Código compartilhado" : "Compartilhar código Pix"}
                  </Text>
                </TouchableOpacity>

                {pixExpiration ? (
                  <Text style={styles.expiry}>
                    Válido até {new Date(pixExpiration).toLocaleString("pt-BR")}
                  </Text>
                ) : null}
              </View>
            ) : canOpenCardCheckout ? (
              <View style={styles.waitingBox}>
                <Text style={styles.waitingText}>
                  O cartão será informado somente na página segura do provedor. O
                  retorno ao aplicativo não confirma o pagamento; acompanhe o
                  status deste pedido.
                </Text>
                {payment?.installmentCount ? (
                  <Text style={styles.waitingText}>
                    Parcelamento escolhido: {payment.installmentCount}x
                    {payment.installmentValue
                      ? ` de ${formatCurrency(payment.installmentValue)}`
                      : ""}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={styles.externalButton}
                  onPress={() => Linking.openURL(payment?.checkoutUrl ?? "")}
                >
                  <Text style={styles.externalButtonText}>
                    Abrir pagamento seguro
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={loadOrder}>
                  <Text style={styles.retryText}>Atualizar status do pagamento</Text>
                </TouchableOpacity>
              </View>
            ) : canPayBoleto ? (
              <View style={styles.waitingBox}>
                <Text style={styles.waitingText}>
                  O boleto foi gerado, mas o pedido continuará pendente até a
                  confirmação do pagamento.
                </Text>
                {payment?.boletoDigitableLine ? (
                  <>
                    <View style={styles.pixCodeBox}>
                      <Text style={styles.pixCodeText} selectable>
                        {payment.boletoDigitableLine}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() =>
                        copyPixCode(payment.boletoDigitableLine ?? "")
                      }
                    >
                      <Text style={styles.shareButtonText}>
                        Copiar linha digitável
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity
                  style={styles.externalButton}
                  onPress={() => Linking.openURL(payment?.boletoUrl ?? "")}
                >
                  <Text style={styles.externalButtonText}>Abrir boleto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.waitingBox}>
                <Text style={styles.waitingText}>
                  {paymentStatus === "PAGO"
                    ? "Pagamento confirmado. O pedido seguirá para separação."
                    : paymentStatus === "EM_ANALISE"
                      ? "Pagamento confirmado e em análise pelo provedor. Não pague este Pix novamente; atualize o pedido para acompanhar."
                    : pixExpired
                      ? "Este Pix expirou. Para manter a referência financeira segura, faça um novo pedido em vez de pagar este código."
                      : paymentStatus === "REEMBOLSADO" || paymentStatus === "ESTORNO_PENDENTE"
                        ? "O pagamento está em processo de reembolso ou já foi reembolsado."
                        : "Os dados do pagamento ainda estão sendo preparados. Atualize o pedido em instantes."}
                </Text>
                <TouchableOpacity onPress={loadOrder}>
                  <Text style={styles.retryText}>Atualizar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Ver meus pedidos"
            onPress={() => router.replace("/pedidos")}
            fullWidth
            size="lg"
          />
          <Button
            label="Continuar comprando"
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
  content: { padding: Spacing.base, gap: 18, alignItems: "center" },
  pendingIcon: { marginTop: 18, marginBottom: 2 },
  title: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
  subtitle: { fontSize: FontSizes.base, color: Colors.textMuted, textAlign: "center", lineHeight: 23 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"], padding: 20, ...Shadows.sm, width: "100%" },
  cardTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  rowLabel: { flex: 1, fontSize: FontSizes.sm, color: Colors.textMuted },
  rowValue: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  orderNumber: { fontSize: FontSizes.sm, fontWeight: "800", color: Colors.primary, fontFamily: "monospace" },
  total: { fontSize: FontSizes.base, fontWeight: "900", color: Colors.primary },
  pixContainer: { marginTop: 16, backgroundColor: Colors.pinkPale, borderRadius: BorderRadius.xl, padding: 14, gap: 9, alignItems: "center" },
  pixTitle: { alignSelf: "stretch", fontSize: FontSizes.base, fontWeight: "800", color: Colors.primary },
  pixSubtitle: { alignSelf: "stretch", fontSize: FontSizes.xs, color: Colors.textMuted, lineHeight: 17 },
  qrCode: { width: 210, height: 210, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg },
  pixCodeBox: { alignSelf: "stretch", backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 12, borderWidth: 1, borderColor: Colors.pinkLight },
  pixCodeText: { fontSize: FontSizes.xs, color: Colors.textPrimary, fontFamily: "monospace", lineHeight: 18 },
  shareButton: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.pinkLight, borderRadius: BorderRadius.lg, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.primary },
  shareButtonDone: { backgroundColor: "#e8f5e9", borderColor: Colors.success },
  shareButtonText: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.primary },
  shareButtonTextDone: { color: Colors.success },
  selectHint: { alignSelf: "stretch", fontSize: FontSizes.xs, color: Colors.textMuted, lineHeight: 17 },
  expiry: { alignSelf: "stretch", fontSize: FontSizes.xs, color: Colors.warning, fontWeight: "600" },
  waitingBox: { marginTop: 14, backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: 12 },
  waitingText: { fontSize: FontSizes.sm, color: Colors.warning, lineHeight: 19 },
  errorBox: { width: "100%", backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 14 },
  errorText: { color: Colors.error, fontSize: FontSizes.sm },
  retryText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "700", marginTop: 8 },
  externalButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  externalButtonText: { color: "#fff", fontWeight: "800", fontSize: FontSizes.sm },
  actions: { width: "100%", gap: 10 },
});
