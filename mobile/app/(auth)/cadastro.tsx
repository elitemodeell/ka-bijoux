import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";

export default function CadastroScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) { setError("Preencha nome, e-mail e senha."); return; }
    if (form.password.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (form.password !== form.confirm) { setError("As senhas não conferem."); return; }
    if (!acceptedTerms) { setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar uma conta."); return; }

    setLoading(true);
    setError("");
    try {
      await register({
        name: form.name,
        email: form.email.trim(),
        phone: form.phone || undefined,
        password: form.password,
        acceptedTerms: true,
      });
      router.back();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "name",     label: "Nome completo *",   placeholder: "Seu nome",           type: "default",       secure: false },
    { key: "email",    label: "E-mail *",           placeholder: "seu@email.com",       type: "email-address", secure: false },
    { key: "phone",    label: "Telefone",           placeholder: "(37) 99999-9999",     type: "phone-pad",     secure: false },
    { key: "password", label: "Senha *",            placeholder: "Mínimo 6 caracteres", type: "default",       secure: true  },
    { key: "confirm",  label: "Confirmar senha *",  placeholder: "Repita a senha",      type: "default",       secure: true  },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>É rápido, gratuito e seguro 💕</Text>

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
                  keyboardType={field.type as "default" | "email-address" | "phone-pad"}
                  secureTextEntry={field.secure}
                  autoCapitalize={field.type === "email-address" ? "none" : field.key === "name" ? "words" : "none"}
                  style={styles.input}
                />
              </View>
            ))}

            {/* Aceite dos termos (obrigatório LGPD / App Store) */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                Li e aceito os{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL(`${API_URL}/termos`)}
                >
                  Termos de Uso
                </Text>
                {" "}e a{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL(`${API_URL}/privacidade`)}
                >
                  Política de Privacidade
                </Text>
              </Text>
            </TouchableOpacity>

            <Button label="Criar conta" onPress={handleRegister} loading={loading} fullWidth size="lg" style={{ marginTop: 4 }} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.footerLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, paddingTop: 8, flexGrow: 1 },
  backBtn: { marginBottom: 12 },
  backText: { color: Colors.primary, fontWeight: "600", fontSize: FontSizes.base },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: 24 },
  form: { gap: 14 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12 },
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
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  termsText: { flex: 1, fontSize: FontSizes.xs, color: Colors.textMuted, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  footerLink: { color: Colors.primary, fontWeight: "700", fontSize: FontSizes.sm },
});
