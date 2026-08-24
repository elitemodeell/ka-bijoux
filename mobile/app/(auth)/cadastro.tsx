import { useRef, useState } from "react";
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Colors, FontSizes, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { authErrorMessage, isValidEmail } from "@/lib/authFeedback";

export default function CadastroScreen() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"name" | "email" | "password" | null>(null);

  function returnToOptions() {
    router.replace({ pathname: "/(auth)/entrada", params: { mode: "register" } });
  }

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  }

  async function handleRegister() {
    if (loading) return;
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (name.length < 2) return setError("Informe seu nome completo.");
    if (!isValidEmail(email)) return setError("Informe um e-mail válido.");
    if (form.password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (!acceptedTerms) return setError("Aceite os Termos de Uso e a Política de Privacidade para continuar.");

    setLoading(true);
    setError("");
    try {
      await register({ name, email, password: form.password, acceptedTerms: true });
      router.replace("/(tabs)");
    } catch (reason: unknown) {
      setError(authErrorMessage(reason, "register"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenShell
      title="Criar conta com e-mail"
      subtitle="Use seu nome, e-mail e uma senha segura."
      onClose={returnToOptions}
      keyboardAware
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Voltar para outras opções de cadastro"
        onPress={returnToOptions}
        style={styles.optionsButton}
      >
        <Ionicons name="arrow-back" size={18} color={Colors.primaryDark} />
        <Text style={styles.optionsText}>Voltar para outras opções</Text>
      </TouchableOpacity>

      {!!error && (
        <View accessibilityLiveRegion="polite" style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.label}>Nome completo *</Text>
      <View style={[styles.inputWrap, focused === "name" && styles.inputFocused]}>
        <Ionicons name="person-outline" size={19} color={focused === "name" ? Colors.primary : Colors.textMuted} />
        <TextInput
          accessibilityLabel="Nome completo"
          value={form.name}
          onChangeText={(value) => updateField("name", value)}
          onFocus={() => setFocused("name")}
          onBlur={() => setFocused(null)}
          placeholder="Seu nome"
          placeholderTextColor={Colors.textLight}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!loading}
          style={styles.input}
        />
      </View>

      <Text style={styles.label}>E-mail *</Text>
      <View style={[styles.inputWrap, focused === "email" && styles.inputFocused]}>
        <Ionicons name="mail-outline" size={19} color={focused === "email" ? Colors.primary : Colors.textMuted} />
        <TextInput
          ref={emailRef}
          accessibilityLabel="E-mail"
          value={form.email}
          onChangeText={(value) => updateField("email", value.toLowerCase())}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          placeholder="seu@email.com"
          placeholderTextColor={Colors.textLight}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading}
          style={styles.input}
        />
      </View>

      <Text style={styles.label}>Senha *</Text>
      <View style={[styles.inputWrap, focused === "password" && styles.inputFocused]}>
        <Ionicons name="lock-closed-outline" size={19} color={focused === "password" ? Colors.primary : Colors.textMuted} />
        <TextInput
          ref={passwordRef}
          accessibilityLabel="Senha"
          value={form.password}
          onChangeText={(value) => updateField("password", value)}
          onFocus={() => setFocused("password")}
          onBlur={() => setFocused(null)}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={Colors.textLight}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          editable={!loading}
          style={styles.input}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
          onPress={() => setShowPassword((value) => !value)}
          style={styles.eyeButton}
        >
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
        style={styles.termsRow}
        onPress={() => { setAcceptedTerms((value) => !value); if (error) setError(""); }}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={styles.termsText}>
          Li e aceito os{" "}
          <Text style={styles.termsLink} onPress={() => Linking.openURL(LEGAL_LINKS.terms)}>Termos de Uso</Text>
          {" e a "}
          <Text style={styles.termsLink} onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}>Política de Privacidade</Text>.
        </Text>
      </TouchableOpacity>

      <Button label="Criar conta" onPress={handleRegister} loading={loading} disabled={loading} fullWidth size="lg" />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Já tem conta? </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/(auth)/entrada", params: { mode: "login" } })}
        >
          <Text style={styles.switchLink}>Entrar</Text>
        </TouchableOpacity>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  optionsButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 7, minHeight: 44, marginBottom: Spacing.sm },
  optionsText: { color: Colors.primaryDark, fontSize: FontSizes.sm, fontWeight: "800" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, marginBottom: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.errorLight },
  errorText: { flex: 1, color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  label: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: "700", marginBottom: 6 },
  inputWrap: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceAlt },
  inputFocused: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  input: { flex: 1, height: 54, color: Colors.textPrimary, fontSize: FontSizes.base, paddingVertical: 0 },
  eyeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: Spacing.lg },
  checkbox: { width: 22, height: 22, flexShrink: 0, marginTop: 1, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.border, borderRadius: 6 },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  termsText: { flex: 1, color: Colors.textMuted, fontSize: FontSizes.xs, lineHeight: 18 },
  termsLink: { color: Colors.primaryDark, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: Spacing.lg, marginBottom: Spacing.sm },
  switchText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  switchLink: { color: Colors.primaryDark, fontSize: FontSizes.sm, fontWeight: "800" },
});
