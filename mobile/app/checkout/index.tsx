import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore, type ShippingOption } from "@/stores/checkoutStore";
import { useAuthStore } from "@/stores/authStore";
import { shippingApi, addressesApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Image } from "expo-image";
import { LuxuryBackground } from "@/components/ios/LuxuryBackground";


type Address = {
  id: string; label?: string; street: string; number: string;
  complement?: string; neighborhood: string; city: string;
  state: string; zipCode: string; isDefault: boolean;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

export default function CheckoutEntregaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customer } = useAuthStore();
  const { items, subtotal, updateItem, removeItem, isBuyingNow } = useCartStore();
  const {
    zipCode, setZipCode, setAddress,
    shippingOptions, setShippingOptions,
    selectShipping, selectedShipping,
    setCalculatingShipping, isCalculatingShipping,
  } = useCheckoutStore();

  const [zip, setZip]                       = useState(zipCode);
  const [addresses, setAddresses]           = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddr, setLoadingAddr]       = useState(false);
  const [shippingError, setShippingError]   = useState("");

  const loadAddresses = useCallback(async () => {
    if (!customer) return;
    setLoadingAddr(true);
    try {
      const res = await addressesApi.list();
      const list: Address[] = res.data.data ?? [];
      setAddresses(list);
      const checkoutState = useCheckoutStore.getState();
      const persisted = checkoutState.addressCustomerId === customer.id
        ? list.find((candidate) => candidate.id === checkoutState.addressId)
        : undefined;
      const chosen = persisted ?? list.find((candidate) => candidate.isDefault) ?? (list.length === 1 ? list[0] : list[0]);
      if (chosen) {
        setSelectedAddressId(chosen.id);
        setAddress(chosen.id, customer.id);
        const cleanZip = chosen.zipCode.replace(/\D/g, "");
        setZip(cleanZip);
        setZipCode(cleanZip);
      } else {
        setSelectedAddressId(null);
        setAddress(null, customer.id);
        setZip("");
        setZipCode("");
      }
    } catch {
      setAddresses([]);
      setShippingError("Não foi possível carregar seus endereços.");
    } finally {
      setLoadingAddr(false);
    }
  }, [customer, setAddress, setZipCode]);

  useFocusEffect(useCallback(() => { void loadAddresses(); }, [loadAddresses]));

  function selectAddress(addr: Address) {
    setSelectedAddressId(addr.id);
    setAddress(addr.id, customer?.id ?? null);
    const cleanZip = addr.zipCode.replace(/\D/g, "");
    setZip(cleanZip);
    setZipCode(cleanZip);
    setShippingOptions([]);
  }

  const calcularFrete = useCallback(async (zipOverride?: string, addressOverride?: string | null) => {
    if (!customer) {
      router.push("/(auth)/entrada");
      return;
    }
    const requestedZip = (zipOverride ?? zip).replace(/\D/g, "");
    const requestedAddressId = addressOverride === undefined ? selectedAddressId : addressOverride;
    if (requestedZip.length !== 0 && requestedZip.length !== 8) {
      setShippingError("Informe um CEP válido com 8 dígitos.");
      return;
    }
    setCalculatingShipping(true);
    setShippingError("");
    try {
      const res = await shippingApi.calculate(requestedZip, requestedAddressId ?? undefined);
      const options: ShippingOption[] = res.data.data ?? [];
      setShippingOptions(options);
      setZipCode(requestedZip);
    } catch {
      setShippingOptions([]);
      setShippingError("Não foi possível calcular o frete agora. Tente novamente.");
    } finally {
      setCalculatingShipping(false);
    }
  }, [customer, router, selectedAddressId, setCalculatingShipping, setShippingOptions, setZipCode, zip]);

  const cartSignature = useMemo(
    () => items.map((item) => `${item.id}:${item.quantity}`).sort().join("|"),
    [items]
  );
  const selectedAddress = useMemo(
    () => addresses.find((candidate) => candidate.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  useEffect(() => {
    if (!customer || loadingAddr || isBuyingNow || items.length === 0) return;
    void calcularFrete(selectedAddress?.zipCode ?? "", selectedAddress?.id ?? null);
  }, [cartSignature, selectedAddress?.id, selectedAddress?.zipCode, selectedAddress?.city, selectedAddress?.state, customer, loadingAddr, isBuyingNow]);

  const needsAddress = selectedShipping?.type !== "RETIRADA";
  const canProceed   = items.length > 0 && !!selectedShipping?.available && (!needsAddress || !!selectedAddressId);
  const blockedReason = items.length === 0
    ? "Seu carrinho está vazio."
    : !selectedShipping
      ? "Selecione uma opção de entrega."
      : needsAddress && !selectedAddressId
        ? "Selecione um endereço de entrega."
        : "";
  const total        = subtotal + (selectedShipping?.price ?? 0);

  if (isBuyingNow) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {Platform.OS === "ios" ? <LuxuryBackground /> : null}
        <View style={styles.buyNowLoading}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.buyNowLoadingTitle}>Preparando sua compra...</Text>
          <Text style={styles.buyNowLoadingText}>Confirmando o produto e o estoque.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {Platform.OS === "ios" ? <LuxuryBackground /> : null}
      {Platform.OS === "ios" ? (
        <View style={styles.iosHero}>
          <Image source={require("../../assets/redesign-ios/checkout-hero.png")} style={styles.iosHeroArt} contentFit="cover" />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.iosBackBtn}>
            <Ionicons name="arrow-back" size={25} color="#7c0b2e" />
          </TouchableOpacity>
          <View style={styles.iosHeroCopy}>
            <Text style={styles.iosHeroTitle}>Entrega</Text>
            <Text style={styles.iosHeroKicker}>Quase lá! 💖</Text>
            <Text style={styles.iosHeroSubtitle}>Revise seu pedido e escolha{`\n`}a melhor forma de entrega.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Entrega</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Resumo do carrinho */}
        <View style={styles.card}>
          {Platform.OS === "ios" ? <View style={styles.sectionTitleRow}><Ionicons name="bag-handle-outline" size={22} color={Colors.primary} /><Text style={styles.cardTitle}>Resumo do Pedido</Text><Text style={styles.itemCount}>{items.length} {items.length === 1 ? "item" : "itens"}</Text></View> : <Text style={styles.cardTitle}>Resumo</Text>}
          {items.map((item) => (
            Platform.OS === "ios" ? (
              <View key={item.id} style={styles.iosItemRow}>
                {item.product.images?.[0]?.url ? <Image source={item.product.images[0].url} style={styles.itemImage} contentFit="cover" /> : <View style={[styles.itemImage, styles.itemImageFallback]}><Ionicons name="image-outline" size={24} color={Colors.primary} /></View>}
                <View style={styles.iosItemCopy}><Text style={styles.iosItemName} numberOfLines={2}>{item.product.name}</Text>{item.variation ? <Text style={styles.itemVariation}>{item.variation.value}</Text> : null}</View>
                <View style={styles.quantityControl}>
                  <TouchableOpacity accessibilityLabel="Diminuir quantidade" disabled={item.quantity <= 1} onPress={() => void updateItem(item.id, item.quantity - 1)} style={styles.quantityButton}><Ionicons name="remove" size={17} color={item.quantity <= 1 ? "#cdbec4" : "#c90049"} /></TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity accessibilityLabel="Aumentar quantidade" onPress={() => void updateItem(item.id, item.quantity + 1)} style={styles.quantityButton}><Ionicons name="add" size={17} color="#c90049" /></TouchableOpacity>
                </View>
                <Text style={styles.iosItemPrice}>{fmt(item.unitPrice * item.quantity)}</Text>
                <TouchableOpacity accessibilityLabel="Remover item" onPress={() => void removeItem(item.id)} style={styles.removeButton}><Ionicons name="trash-outline" size={18} color="#e00054" /></TouchableOpacity>
              </View>
            ) : (
              <View key={item.id} style={styles.itemRow}><Text style={styles.itemName} numberOfLines={1}>{item.quantity}× {item.product.name}</Text><Text style={styles.itemPrice}>{fmt(item.unitPrice * item.quantity)}</Text></View>
            )
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{fmt(subtotal)}</Text>
          </View>
        </View>

        {/* Endereço de entrega */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            {Platform.OS === "ios" ? <View style={styles.sectionTitleRow}><Ionicons name="location-outline" size={22} color={Colors.primary} /><Text style={styles.cardTitle}>Endereço de Entrega</Text></View> : <Text style={styles.cardTitle}>Endereço de Entrega</Text>}
            <TouchableOpacity onPress={() => router.push({ pathname: "/endereco", params: { select: "1" } })}>
              <Text style={styles.manageLink}>Gerenciar</Text>
            </TouchableOpacity>
          </View>

          {loadingAddr ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
          ) : addresses.length === 0 ? (
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => router.push({ pathname: "/endereco", params: { select: "1" } })}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addAddressText}>Adicionar endereço de entrega</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addressList}>
              {addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressOption,
                    selectedAddressId === addr.id && styles.addressOptionSelected,
                  ]}
                  onPress={() => selectAddress(addr)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radio, selectedAddressId === addr.id && styles.radioActive]}>
                    {selectedAddressId === addr.id && <View style={styles.radioFill} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    {addr.label && (
                      <Text style={styles.addrLabel}>{addr.label}</Text>
                    )}
                    <Text style={styles.addrStreet}>
                      {addr.street}, {addr.number}
                      {addr.complement ? ` — ${addr.complement}` : ""}
                    </Text>
                    <Text style={styles.addrCity}>
                      {addr.neighborhood}, {addr.city}/{addr.state} — CEP {addr.zipCode}
                    </Text>
                  </View>
                  {addr.isDefault && (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>Padrão</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Calcular frete */}
        <View style={styles.card}>
          {Platform.OS === "ios" ? <View style={styles.sectionTitleRow}><Ionicons name="car-outline" size={22} color={Colors.primary} /><Text style={styles.cardTitle}>Calcular Frete</Text></View> : <Text style={styles.cardTitle}>Calcular Frete</Text>}
          <View style={styles.zipRow}>
            <TextInput
              value={formatCep(zip)}
              onChangeText={(v) => setZip(v.replace(/\D/g, "").substring(0, 8))}
              placeholder="00000000"
              keyboardType="number-pad"
              style={styles.zipInput}
              placeholderTextColor={Colors.textLight}
              maxLength={9}
              editable={!selectedAddressId}
            />
            <Button
              label="Calcular"
              onPress={() => calcularFrete()}
              loading={isCalculatingShipping}
              size="sm"
              style={{ minWidth: 90 }}
            />
          </View>
          {!customer && (
            <Text style={styles.zipHint}>
              Faça login para calcular o frete com seu carrinho.
            </Text>
          )}
          {!!selectedAddressId && <Text style={styles.zipHint}>CEP do endereço selecionado. Para alterar, escolha ou edite outro endereço.</Text>}
          {shippingError ? <Text style={styles.shippingError}>{shippingError}</Text> : null}
        </View>

        {/* Opções de entrega */}
        {shippingOptions.length > 0 && (
          <View style={styles.card}>
            {Platform.OS === "ios" ? <View style={styles.sectionTitleRow}><Ionicons name="cube-outline" size={22} color={Colors.primary} /><Text style={styles.cardTitle}>Opções de Entrega</Text></View> : <Text style={styles.cardTitle}>Opções de Entrega</Text>}
            <View style={styles.shippingOptions}>
              {shippingOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.shippingOption,
                    selectedShipping?.id === opt.id && styles.shippingOptionSelected,
                    !opt.available && styles.shippingOptionUnavailable,
                  ]}
                  onPress={() => opt.available && selectShipping(opt)}
                  disabled={!opt.available}
                  activeOpacity={0.8}
                >
                  <View style={styles.radio}>
                    {selectedShipping?.id === opt.id && (
                      <View style={styles.radioFill} />
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
                  <Text style={[styles.shippingPrice, opt.available && opt.price === 0 && styles.shippingFree, !opt.available && styles.shippingUnavailable]}>
                    {!opt.available ? "Indisponível" : opt.price === 0 ? "Grátis" : fmt(opt.price)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Aviso: endereço obrigatório para entrega */}
        {selectedShipping && needsAddress && !selectedAddressId && (
          <View style={styles.warnBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
            <Text style={styles.warnText}>
              Adicione um endereço de entrega para continuar.
            </Text>
          </View>
        )}

        <View style={{ height: (Platform.OS === "ios" ? 164 : 112) + insets.bottom }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerTotal}>
            {fmt(total)}
            {selectedShipping && (
              <Text style={styles.footerFrete}>
                {" "}(frete {selectedShipping.price === 0 ? "grátis" : fmt(selectedShipping.price)})
              </Text>
            )}
          </Text>
        </View>
        <View style={styles.footerAction}>
          <Button label="Ir para Pagamento" onPress={() => router.push("/checkout/pagamento")} disabled={!canProceed} size="lg" fullWidth />
          {!!blockedReason && <Text style={styles.blockedReason}>{blockedReason}</Text>}
        </View>
        {Platform.OS === "ios" ? <View style={styles.trustStrip}>
          {[["car-outline", "Entrega para todo o Brasil"], ["shield-checkmark-outline", "Compra segura"], ["card-outline", "Pague como preferir"]].map(([icon, label]) => <View key={label} style={styles.trustItem}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color="#e00054" /><Text style={styles.trustText}>{label}</Text></View>)}
        </View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Platform.OS === "ios" ? "#fff6f8" : Colors.background },
  buyNowLoading: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  buyNowLoadingTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: "700", marginTop: 8 },
  buyNowLoadingText: { color: Colors.textMuted, fontSize: 14, textAlign: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm,
  },
  title:   { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  content: { paddingHorizontal: Spacing.base, gap: 12 },
  card:      { backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.9)" : Colors.surface, borderRadius: Platform.OS === "ios" ? 26 : BorderRadius["2xl"], padding: 16, borderWidth: Platform.OS === "ios" ? 1 : 0, borderColor: "rgba(238,167,187,0.22)", ...Shadows.sm },
  cardTitle: { fontSize: Platform.OS === "ios" ? 17 : FontSizes.md, fontFamily: Platform.OS === "ios" ? "Inter" : undefined, fontWeight: "700", color: Platform.OS === "ios" ? "#621128" : Colors.textPrimary, marginBottom: Platform.OS === "ios" ? 0 : 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 },
  itemCount: { marginLeft: "auto", color: Colors.textMuted, fontFamily: "Inter", fontSize: 12, fontWeight: "400" },
  manageLink:   { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: "600" },

  itemRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  itemName:  { flex: 1, fontSize: FontSizes.sm, color: Colors.textSecondary, marginRight: 8 },
  itemPrice: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  iosHero: { height: 205, marginBottom: -18, overflow: "hidden" },
  iosHeroArt: { ...StyleSheet.absoluteFillObject },
  iosBackBtn: { position: "absolute", left: 16, top: 8, width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", shadowColor: "#c96a87", shadowOpacity: 0.13, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } },
  iosHeroCopy: { position: "absolute", left: 66, top: 13, width: 180, alignItems: "center" },
  iosHeroTitle: { color: "#a00038", fontFamily: "PlayfairDisplay", fontSize: 36 },
  iosHeroKicker: { color: "#b00040", fontFamily: "Inter", fontSize: 14, fontWeight: "700", marginTop: -2 },
  iosHeroSubtitle: { color: "#70717a", fontFamily: "Inter", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 7 },
  iosItemRow: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 7, paddingBottom: 12 },
  itemImage: { width: 58, height: 58, borderRadius: 15, backgroundColor: "#ffe9f0" },
  itemImageFallback: { alignItems: "center", justifyContent: "center" },
  iosItemCopy: { flex: 1, minWidth: 65 },
  iosItemName: { color: "#451021", fontFamily: "Inter", fontSize: 11, fontWeight: "800" },
  itemVariation: { color: "#8b7d83", fontFamily: "Inter", fontSize: 10, marginTop: 3 },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 4 },
  quantityButton: { width: 27, height: 27, borderRadius: 14, borderWidth: 1, borderColor: "#f0cbd7", alignItems: "center", justifyContent: "center" },
  quantityText: { width: 16, color: "#5e1730", fontFamily: "Inter", fontSize: 12, fontWeight: "700", textAlign: "center" },
  iosItemPrice: { color: "#c60048", fontFamily: "Inter", fontSize: 12, fontWeight: "900" },
  removeButton: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#fff0f4", alignItems: "center", justifyContent: "center" },
  divider:   { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  summaryRow:   { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.textMuted },
  summaryValue: { fontSize: FontSizes.sm, fontWeight: "700" },

  addAddressBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.pinkSoft, borderRadius: BorderRadius.xl,
    padding: 14, borderWidth: 1.5, borderColor: Colors.pinkLight, borderStyle: "dashed",
  },
  addAddressText: { fontSize: FontSizes.base, color: Colors.primary, fontWeight: "600" },

  addressList:   { gap: 10 },
  addressOption: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, padding: 12,
  },
  addressOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  radio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: "center", justifyContent: "center", marginTop: 2 },
  radioActive: { borderColor: Colors.primary },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  addrLabel:  { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  addrStreet: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  addrCity:   { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  defaultPill: { backgroundColor: Colors.pinkSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  defaultPillText: { fontSize: 10, color: Colors.primary, fontWeight: "700" },

  zipRow:   { flexDirection: "row", gap: 10, alignItems: "center" },
  zipInput: {
    flex: 1, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSizes.base, color: Colors.textPrimary,
  },
  zipHint:  { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 8 },
  shippingError: { fontSize: FontSizes.xs, color: Colors.error, marginTop: 8 },

  shippingOptions: { gap: 10 },
  shippingOption:  {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, padding: 14,
  },
  shippingOptionSelected:    { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  shippingOptionUnavailable: { opacity: 0.5 },
  shippingName:  { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  shippingDesc:  { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  shippingDays:  { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 2, fontWeight: "600" },
  shippingPrice: { fontSize: FontSizes.base, fontWeight: "800", color: Colors.textPrimary },
  shippingFree:  { color: Colors.success },
  shippingUnavailable: { color: Colors.error, fontSize: FontSizes.sm },

  warnBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: 12,
  },
  warnText: { flex: 1, fontSize: FontSizes.sm, color: Colors.warning, fontWeight: "500" },

  footer: {
    flexDirection: "row", flexWrap: Platform.OS === "ios" ? "wrap" : "nowrap", gap: 12, padding: Spacing.base, paddingBottom: 24,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    alignItems: "center",
  },
  footerLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  footerTotal: { fontSize: FontSizes.md, fontWeight: "800", color: Colors.textPrimary },
  footerFrete: { fontSize: FontSizes.xs, fontWeight: "400", color: Colors.textMuted },
  footerAction: { flex: 1, gap: 4 },
  blockedReason: { color: Colors.error, fontSize: 10, fontWeight: "600", textAlign: "center" },
  trustStrip: { width: "100%", flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f6dce4", paddingTop: 10, marginTop: 2 },
  trustItem: { flex: 1, alignItems: "center", gap: 3, paddingHorizontal: 4 },
  trustText: { color: "#706a74", fontFamily: "Inter", fontSize: 8, lineHeight: 11, textAlign: "center" },
});
