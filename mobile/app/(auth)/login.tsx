import { useRef, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { BorderRadius, Colors, FontSizes, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { authErrorMessage, isValidEmail } from "@/lib/authFeedback";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"email" | "password" | null>(null);

  function returnToOptions() {
    router.replace({ pathname: "/(auth)/entrada", params: { mode: "login" } });
  }

  function updateEmail(value: string) {
    setEmail(value);
    if (error) setError("");
  }

  function updatePassword(value: string) {
    setPassword(value);
    if (error) setError("");
  }

  async function handleLogin() {
    if (loading) return;
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (reason: unknown) {
      setError(authErrorMessage(reason, "login"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenShell
      title="Entrar com e-mail"
      subtitle="Informe seu e-mail e senha para acessar sua conta."
      onClose={returnToOptions}
      keyboardAware
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Voltar para outras opções de acesso"
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

      <View style={[styles.inputWrap, focused === "email" && styles.inputFocused]}>
        <Ionicons name="mail-outline" size={19} color={focused === "email" ? Colors.primary : Colors.textMuted} />
        <TextInput
          accessibilityLabel="E-mail"
          value={email}
          onChangeText={updateEmail}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          placeholder="Seu e-mail"
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

      <View style={[styles.inputWrap, focused === "password" && styles.inputFocused]}>
        <Ionicons name="lock-closed-outline" size={19} color={focused === "password" ? Colors.primary : Colors.textMuted} />
        <TextInput
          ref={passwordRef}
          accessibilityLabel="Senha"
          value={password}
          onChangeText={updatePassword}
          onFocus={() => setFocused("password")}
          onBlur={() => setFocused(null)}
          placeholder="Sua senha"
          placeholderTextColor={Colors.textLight}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
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

      <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(auth)/recuperar-senha")} style={styles.forgotButton}>
        <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
        style={styles.submitOuter}
      >
        <LinearGradient colors={loading ? ["#aaa", "#999"] : [Colors.primary, Colors.primaryDark]} style={styles.submit}>
          {loading && <ActivityIndicator size="small" color="#fff" />}
          <Text style={styles.submitText}>{loading ? "Entrando..." : "Entrar"}</Text>
          {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Ainda não tem conta? </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/(auth)/entrada", params: { mode: "register" } })}
        >
          <Text style={styles.switchLink}>Criar conta</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.legal}>
        Ao continuar, você concorda com os{" "}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(LEGAL_LINKS.terms)}>Termos de Uso</Text>
        {" e a "}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}>Política de Privacidade</Text>.
      </Text>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  optionsButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 7, minHeight: 44, marginBottom: Spacing.sm },
  optionsText: { color: Colors.primaryDark, fontSize: FontSizes.sm, fontWeight: "800" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, marginBottom: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.errorLight },
  errorText: { flex: 1, color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  inputWrap: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceAlt },
  inputFocused: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  input: { flex: 1, height: 54, color: Colors.textPrimary, fontSize: FontSizes.base, paddingVertical: 0 },
  eyeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  forgotButton: { alignSelf: "flex-end", minHeight: 40, justifyContent: "center", marginBottom: 12 },
  forgotText: { color: Colors.primaryDark, fontSize: FontSizes.sm, fontWeight: "700" },
  submitOuter: { overflow: "hidden", borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  submit: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { color: "#fff", fontSize: FontSizes.base, fontWeight: "800" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  switchText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  switchLink: { color: Colors.primaryDark, fontSize: FontSizes.sm, fontWeight: "800" },
  legal: { color: Colors.textMuted, fontSize: FontSizes.xs, lineHeight: 18, textAlign: "center", marginTop: Spacing.lg },
  legalLink: { color: Colors.primaryDark, fontWeight: "700" },
});
