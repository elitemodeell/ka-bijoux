import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) { setError("Preencha todos os campos."); return; }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.back();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logo}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoText}>KA</Text>
            </View>
            <Text style={styles.logoName}>KA Bijoux</Text>
            <Text style={styles.logoSub}>Entre na sua conta</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                value={password} onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
                autoComplete="password"
                style={styles.input}
              />
            </View>

            <TouchableOpacity onPress={() => router.push("/(auth)/recuperar-senha")}>
              <Text style={styles.forgotPassword}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <Button
              label="Entrar"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Cadastro */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem conta? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/cadastro")}>
              <Text style={styles.footerLink}>Criar conta grátis</Text>
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
  backBtn: { marginBottom: 20 },
  backText: { color: Colors.primary, fontWeight: "600", fontSize: FontSizes.base },
  logo: { alignItems: "center", marginBottom: 32 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { color: "#fff", fontSize: 28, fontWeight: "900" },
  logoName: { fontSize: FontSizes.xl, fontWeight: "800", color: Colors.textPrimary },
  logoSub: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 4 },
  form: { gap: 16 },
  errorBox: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.lg,
    padding: 12,
  },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  inputGroup: { gap: 6 },
  label: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  forgotPassword: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textAlign: "right",
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  footerLink: { color: Colors.primary, fontWeight: "700", fontSize: FontSizes.sm },
});
