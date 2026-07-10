import { useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { customerApi } from "@/services/api";
import { Button } from "@/components/ui/Button";

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { customer, setCustomer } = useAuthStore();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
  }, [customer]);

  async function handleSave() {
    if (!name.trim()) { setError("O nome é obrigatório."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await customerApi.updateMe({ name: name.trim(), phone: phone.trim() || undefined });
      const updated = res.data.data;
      setCustomer(updated);
      Alert.alert("Sucesso", "Dados atualizados com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Editar Perfil</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                value={name} onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <View style={[styles.input, styles.disabledInput]}>
                <Text style={styles.disabledText}>{customer?.email}</Text>
              </View>
              <Text style={styles.hint}>O e-mail não pode ser alterado.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone / WhatsApp</Text>
              <TextInput
                value={phone} onChangeText={setPhone}
                placeholder="(00) 00000-0000"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <Button
              label="Salvar alterações"
              onPress={handleSave}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, paddingTop: 8, flexGrow: 1 },
  backBtn: { marginBottom: 20 },
  backText: { color: Colors.primary, fontWeight: "600", fontSize: FontSizes.base },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary, marginBottom: 24 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: FontSizes.base, color: Colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: Colors.background,
    borderColor: Colors.borderLight,
    justifyContent: "center",
  },
  disabledText: { fontSize: FontSizes.base, color: Colors.textMuted },
  hint: { fontSize: FontSizes.xs, color: Colors.textLight, marginTop: 2 },
});
