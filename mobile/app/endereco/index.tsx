import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { addressesApi } from "@/services/api";
import { Button } from "@/components/ui/Button";

type Address = {
  id: string; label?: string; street: string; number: string;
  complement?: string; neighborhood: string; city: string;
  state: string; zipCode: string; isDefault: boolean;
};

type AddressForm = {
  label: string; street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string; zipCode: string;
};

const EMPTY_FORM: AddressForm = {
  label: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "", zipCode: "",
};

const REQUIRED_FIELDS: Array<keyof AddressForm> = ["street", "number", "neighborhood", "city", "state", "zipCode"];
const FIELD_LABELS: Record<keyof AddressForm, string> = {
  label: "Identificação (ex: Casa, Trabalho)",
  street: "Rua *", number: "Número *", complement: "Complemento",
  neighborhood: "Bairro *", city: "Cidade *", state: "Estado (UF) *",
  zipCode: "CEP *",
};

export default function EnderecoScreen() {
  const router = useRouter();
  const [addresses, setAddresses]   = useState<Address[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<AddressForm>(EMPTY_FORM);
  const [error, setError]           = useState("");

  async function fetchAddresses() {
    try {
      const res = await addressesApi.list();
      setAddresses(res.data.data ?? []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAddresses(); }, []);

  async function handleSave() {
    for (const field of REQUIRED_FIELDS) {
      if (!form[field].trim()) {
        setError(`O campo "${FIELD_LABELS[field].replace(" *", "")}" é obrigatório.`);
        return;
      }
    }
    if (form.zipCode.replace(/\D/g, "").length !== 8) {
      setError("CEP inválido."); return;
    }
    if (form.state.length !== 2) {
      setError("Estado inválido. Use a sigla com 2 letras (ex: MG)."); return;
    }

    setSaving(true);
    setError("");
    try {
      await addressesApi.create({
        label: form.label || undefined,
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim() || undefined,
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zipCode: form.zipCode.replace(/\D/g, ""),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchAddresses();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao salvar endereço.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await addressesApi.setDefault(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id }))
      );
    } catch {
      Alert.alert("Erro", "Não foi possível definir o endereço padrão.");
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Remover endereço", "Deseja remover este endereço?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover", style: "destructive",
        onPress: async () => {
          try {
            await addressesApi.delete(id);
            setAddresses((prev) => prev.filter((a) => a.id !== id));
          } catch {
            Alert.alert("Erro", "Não foi possível remover o endereço.");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Endereços</Text>
        {!showForm && (
          <TouchableOpacity onPress={() => { setShowForm(true); setError(""); }} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {showForm && <View style={{ width: 40 }} />}
      </View>

      {showForm ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.formTitle}>Novo Endereço</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {(Object.keys(EMPTY_FORM) as Array<keyof AddressForm>).map((key) => (
              <View key={key} style={styles.inputGroup}>
                <Text style={styles.label}>{FIELD_LABELS[key]}</Text>
                <TextInput
                  value={form[key]}
                  onChangeText={(v) => {
                    let val = v;
                    if (key === "zipCode") val = v.replace(/\D/g, "").substring(0, 8);
                    if (key === "state")   val = v.toUpperCase().substring(0, 2);
                    setForm((p) => ({ ...p, [key]: val }));
                  }}
                  placeholder={
                    key === "zipCode" ? "00000000" :
                    key === "state"   ? "MG" :
                    undefined
                  }
                  placeholderTextColor={Colors.textLight}
                  keyboardType={key === "zipCode" ? "number-pad" : "default"}
                  autoCapitalize={key === "state" ? "characters" : "words"}
                  maxLength={key === "state" ? 2 : key === "zipCode" ? 8 : undefined}
                  style={styles.input}
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => { setShowForm(false); setForm(EMPTY_FORM); setError(""); }}
                style={{ flex: 1 }}
              />
              <Button
                label="Salvar"
                onPress={handleSave}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>Nenhum endereço cadastrado</Text>
          <Text style={styles.emptyText}>Adicione um endereço para facilitar seus pedidos</Text>
          <View style={{ marginTop: 20, width: 220 }}>
            <Button label="Adicionar Endereço" onPress={() => setShowForm(true)} fullWidth />
          </View>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.addressCard, item.isDefault && styles.addressCardDefault]}>
              <View style={styles.addressTop}>
                <View style={{ flex: 1 }}>
                  {item.label && <Text style={styles.addressLabel}>{item.label}</Text>}
                  <Text style={styles.addressStreet}>
                    {item.street}, {item.number}
                    {item.complement ? ` — ${item.complement}` : ""}
                  </Text>
                  <Text style={styles.addressCity}>
                    {item.neighborhood}, {item.city}/{item.state}
                  </Text>
                  <Text style={styles.addressZip}>CEP {item.zipCode}</Text>
                </View>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Padrão</Text>
                  </View>
                )}
              </View>

              <View style={styles.addressActions}>
                {!item.isDefault && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleSetDefault(item.id)}
                  >
                    <Ionicons name="star-outline" size={16} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Definir padrão</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  <Text style={[styles.actionBtnText, { color: Colors.error }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.pinkSoft, alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  list:  { padding: Spacing.base, gap: 12 },

  addressCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"],
    padding: 16, ...Shadows.sm,
    borderWidth: 1.5, borderColor: "transparent",
  },
  addressCardDefault: { borderColor: Colors.primary },
  addressTop:    { flexDirection: "row", gap: 12, marginBottom: 12 },
  addressLabel:  { fontSize: FontSizes.xs, fontWeight: "700", color: Colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  addressStreet: { fontSize: FontSizes.base, fontWeight: "600", color: Colors.textPrimary },
  addressCity:   { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  addressZip:    { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  defaultBadge:  { backgroundColor: Colors.pinkSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, height: 26, justifyContent: "center" },
  defaultBadgeText: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: "700" },

  addressActions: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  actionBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.lg, backgroundColor: Colors.pinkSoft },
  actionBtnDanger:{ backgroundColor: Colors.errorLight },
  actionBtnText:  { fontSize: FontSizes.xs, fontWeight: "600", color: Colors.primary },

  formContent: { padding: Spacing.base, gap: 0 },
  formTitle:   { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary, marginBottom: 16 },
  errorBox:    { backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12, marginBottom: 12 },
  errorText:   { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  inputGroup:  { gap: 6, marginBottom: 12 },
  label:       { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: FontSizes.base, color: Colors.textPrimary,
  },
  emptyIcon:  { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  emptyText:  { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", marginTop: 6 },
});
