import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";

export default function AlterarSenhaScreen() {
  const router = useRouter();
  const [form, setForm]       = useState({ current: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!form.current || !form.password || !form.confirm) {
      setError("Preencha todos os campos."); return;
    }
    if (form.password.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres."); return;
    }
    if (form.password !== form.confirm) {
      setError("As novas senhas não conferem."); return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: form.current,
        newPassword: form.password,
      });
      setSuccess(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao alterar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "current",  label: "Senha atual",          placeholder: "Digite sua senha atual" },
    { key: "password", label: "Nova senha",            placeholder: "Mínimo 6 caracteres" },
    { key: "confirm",  label: "Confirmar nova senha",  placeholder: "Repita a nova senha" },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Alterar Senha</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {success ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
              <Text style={styles.successTitle}>Senha alterada!</Text>
              <Text style={styles.successText}>Sua senha foi atualizada com sucesso.</Text>
              <Button label="Voltar" onPress={() => router.back()} fullWidth style={{ marginTop: 24 }} />
            </View>
          ) : (
            <View style={styles.form}>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {fields.map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    value={form[field.key]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              ))}

              <Button
                label="Alterar Senha"
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                size="lg"
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  title:   { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  content: { padding: Spacing.base, flexGrow: 1 },
  form:    { gap: 16 },
  errorBox:  { backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12 },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  inputGroup: { gap: 6 },
  label: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: FontSizes.base, color: Colors.textPrimary,
  },
  successBox:   { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  successTitle: { fontSize: FontSizes.xl, fontWeight: "800", color: Colors.textPrimary, marginTop: 8 },
  successText:  { fontSize: FontSizes.base, color: Colors.textMuted, textAlign: "center" },
});
