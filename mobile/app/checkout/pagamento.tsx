import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import {
  customerApi,
  ordersApi,
  paymentsApi,
  type PaymentMethodOption,
} from "@/services/api";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { isValidCpf } from "@/lib/cpf";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function PagamentoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const submitLock = useRef(false);
  const { customer, setCustomer } = useAuthStore();
  const { subtotal, fetchCart } = useCartStore();
  const {
    selectedShipping,
    addressId,
    ensureIdempotencyKey,
    paymentMethod,
    installmentCount,
    setPaymentMethod,
    setInstallmentCount,
    reset,
  } = useCheckoutStore();
  const [loading, setLoading] = useState(false);
  const [cpfReady, setCpfReady] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);

  const estimatedTotal = subtotal + (selectedShipping?.price ?? 0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!customer) {
        setCpfReady(false);
        return () => {
          active = false;
        };
      }
      customerApi
        .getMe()
        .then(async (response) => {
          if (!active) return;
          const profile = response.data.data;
          setCpfReady(isValidCpf(profile?.cpf ?? ""));
          if (profile) await setCustomer(profile);
        })
        .catch(() => {
          if (active) setCpfReady(null);
        });
      setMethodsLoading(true);
      paymentsApi
        .methods()
        .then((response) => {
          if (!active) return;
          const available = response.data.data.methods;
          setMethods(available);
          if (
            available.length > 0 &&
            !available.some((option) => option.method === paymentMethod)
          ) {
            setPaymentMethod(available[0].method);
          }
        })
        .catch(() => {
          if (active) {
            setMethods([]);
            setError("Os métodos de pagamento estão temporariamente indisponíveis.");
          }
        })
        .finally(() => {
          if (active) setMethodsLoading(false);
        });
      return () => {
        active = false;
      };
    }, [customer?.id, paymentMethod, setCustomer, setPaymentMethod])
  );

  async function finalizarPedido() {
    if (submitLock.current) return;
    if (!customer) {
      router.push("/(auth)/entrada");
      return;
    }
    if (!selectedShipping) {
      setError("Selecione novamente a opção de entrega.");
      return;
    }
    if (selectedShipping.type !== "RETIRADA" && !addressId) {
      setError("Selecione um endereço de entrega.");
      return;
    }
    if (cpfReady !== true) {
      setError("Cadastre um CPF válido no perfil antes de pagar.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setError("");
    setCanRetry(false);
    try {
      const response = await ordersApi.create({
        ...(addressId ? { addressId } : {}),
        shippingType: selectedShipping.type,
        shippingOptionId: selectedShipping.id,
        idempotencyKey: ensureIdempotencyKey(),
        paymentMethod,
        installmentCount: paymentMethod === "CREDIT_CARD" ? installmentCount : 1,
      });
      const order = response.data.data;

      reset();
      await fetchCart();
      if (
        paymentMethod === "CREDIT_CARD" &&
        typeof order.payment?.checkoutUrl === "string"
      ) {
        const supported = await Linking.canOpenURL(order.payment.checkoutUrl);
        if (!supported) {
          throw new Error("CHECKOUT_URL_UNSUPPORTED");
        }
        await Linking.openURL(order.payment.checkoutUrl);
      }
      router.replace(`/checkout/confirmacao?orderId=${order.id}`);
    } catch (requestError: unknown) {
      const response = (requestError as {
        response?: { status?: number; data?: { error?: string; code?: string } };
      })?.response;
      const code = response?.data?.code;
      const status = response?.status;
      if (status === 401) {
        setError("Sua sessão expirou. Entre novamente para continuar com o mesmo carrinho.");
      } else if (code === "CPF_REQUIRED") {
        setCpfReady(false);
        setError("Cadastre um CPF válido no perfil antes de pagar.");
      } else if (code === "PAYMENT_IN_PROGRESS" || code === "PAYMENT_CUSTOMER_IN_PROGRESS") {
        setError("O Pix deste pedido já está sendo preparado. Aguarde alguns segundos e tente novamente.");
        setCanRetry(true);
      } else {
        setError("Não foi possível iniciar o pagamento agora. Tente novamente.");
        setCanRetry(status === undefined || status >= 500 || code === "PAYMENT_UNAVAILABLE");
      }
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + Math.max(insets.bottom, 8) },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo estimado</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Subtotal exibido no carrinho</Text>
            <Text style={styles.rowValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Frete — {selectedShipping?.name ?? "não selecionado"}</Text>
            <Text style={styles.rowValue}>
              {selectedShipping?.price === 0
                ? "Grátis"
                : formatCurrency(selectedShipping?.price ?? 0)}
            </Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Estimativa</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimatedTotal)}</Text>
          </View>
          <Text style={styles.serverNotice}>
            Produtos, desconto, frete e total serão recalculados com os dados atuais no servidor.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Como você quer pagar?</Text>
          {methodsLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <View style={styles.methodList}>
              {methods.map((option) => {
                const selected = option.method === paymentMethod;
                const icon =
                  option.method === "PIX"
                    ? "qr-code-outline"
                    : option.method === "CREDIT_CARD"
                      ? "card-outline"
                      : "document-text-outline";
                return (
                  <TouchableOpacity
                    key={option.method}
                    style={[
                      styles.methodOption,
                      selected && styles.methodOptionSelected,
                    ]}
                    onPress={() => setPaymentMethod(option.method)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pixIcon}>
                      <Ionicons name={icon} size={26} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      <Text style={styles.optionDesc}>
                        {option.method === "PIX"
                          ? "QR Code e código copia e cola."
                          : option.method === "CREDIT_CARD"
                            ? "Pagamento seguro na página hospedada do provedor."
                            : "Boleto com link e linha digitável."}
                      </Text>
                    </View>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={selected ? Colors.success : Colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {paymentMethod === "CREDIT_CARD" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parcelamento sem juros</Text>
            <View style={styles.installmentRow}>
              {(methods.find((item) => item.method === "CREDIT_CARD")
                ?.installments ?? [1]).map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.installmentButton,
                    installmentCount === count && styles.installmentButtonSelected,
                  ]}
                  onPress={() => setInstallmentCount(count)}
                >
                  <Text
                    style={[
                      styles.installmentText,
                      installmentCount === count && styles.installmentTextSelected,
                    ]}
                  >
                    {count}x
                  </Text>
                  <Text style={styles.installmentValue}>
                    sem juros
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.serverNotice}>
              O valor exato da parcela será calculado e devolvido pelo servidor
              após a criação do pedido. Os dados do cartão serão informados somente
              no ambiente seguro do provedor.
            </Text>
          </View>
        ) : null}

        {cpfReady === false ? (
          <View style={styles.warningBox}>
            <Ionicons name="person-circle-outline" size={20} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>CPF necessário para pagar</Text>
              <Text style={styles.warningText}>
                O provedor exige um CPF válido para identificar o pagador.
              </Text>
              <TouchableOpacity onPress={() => router.push("/conta/editar-perfil")}>
                <Text style={styles.profileLink}>Cadastrar CPF no perfil</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {canRetry ? (
              <TouchableOpacity
                onPress={finalizarPedido}
                disabled={loading}
                style={styles.retryButton}
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={18} color={Colors.primary} />
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Button
          label={
            loading
              ? "Iniciando pagamento..."
              : paymentMethod === "CREDIT_CARD"
                ? "Ir para pagamento seguro"
                : paymentMethod === "BOLETO"
                  ? "Criar pedido e gerar boleto"
                  : "Criar pedido e gerar Pix"
          }
          onPress={finalizarPedido}
          loading={loading}
          disabled={
            !selectedShipping ||
            cpfReady !== true ||
            methodsLoading ||
            methods.length === 0
          }
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
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  rowLabel: { flex: 1, fontSize: FontSizes.sm, color: Colors.textMuted },
  rowValue: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  totalValue: { fontSize: FontSizes.lg, fontWeight: "900", color: Colors.primary },
  serverNotice: { fontSize: FontSizes.xs, color: Colors.textMuted, lineHeight: 17, marginTop: 6 },
  methodList: { gap: 10 },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: 12,
  },
  methodOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.pinkSoft,
  },
  pixIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.pinkSoft, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  optionDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 3, lineHeight: 17 },
  installmentRow: { flexDirection: "row", gap: 8 },
  installmentButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
  },
  installmentButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.pinkSoft,
  },
  installmentText: { fontSize: FontSizes.base, fontWeight: "800", color: Colors.textPrimary },
  installmentTextSelected: { color: Colors.primary },
  installmentValue: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  warningBox: { flexDirection: "row", gap: 10, backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: 14 },
  warningTitle: { fontSize: FontSizes.sm, color: Colors.warning, fontWeight: "700" },
  warningText: { fontSize: FontSizes.xs, color: Colors.warning, marginTop: 2, lineHeight: 17 },
  profileLink: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "700", marginTop: 8 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12 },
  errorText: { color: Colors.error, fontSize: FontSizes.sm },
  retryButton: { marginTop: 10, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.lg },
  retryText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "700" },
  footer: { padding: Spacing.base, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
});
