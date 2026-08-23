import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { Button } from "@/components/ui/Button";
import {
  authErrorMessage,
  isValidEmail,
} from "@/lib/authFeedback";


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
  const [success, setSuccess] = useState(false);

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

  if (success) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View accessibilityLiveRegion="polite" style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
          <Text style={styles.successTitle}>Conta criada com sucesso!</Text>
          <Text style={styles.successText}>Seu cadastro foi confirmado pelo servidor e sua sessão já está ativa.</Text>
          <Button label="Continuar para a loja" onPress={() => router.replace("/(tabs)")} fullWidth size="lg" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Use seu nome, e-mail e uma senha segura.</Text>

          {!!error && <View accessibilityLiveRegion="polite" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome completo *</Text>
            <TextInput
              accessibilityLabel="Nome completo"
              value={form.name}
              onChangeText={(value) => updateField("name", value)}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              ref={emailRef}
              accessibilityLabel="E-mail"
              value={form.email}
              onChangeText={(value) => updateField("email", value.toLowerCase())}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha *</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Senha"
                value={form.password}
                onChangeText={(value) => updateField("password", value)}
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
                style={styles.passwordInput}
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
          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}><Text style={styles.footerLink}>Entrar com e-mail</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: Spacing.base, paddingTop: 8, gap: 14 },
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, minHeight: 42 },
  backText: { color: Colors.primary, fontSize: FontSizes.base, fontWeight: "700" },
  title: { color: Colors.textPrimary, fontSize: FontSizes["2xl"], fontWeight: "800" },
  subtitle: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: 6 },
  errorBox: { padding: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.errorLight },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  inputGroup: { gap: 6 },
  label: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: "600" },
  input: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, color: Colors.textPrimary, fontSize: FontSizes.base },
  passwordWrap: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingLeft: 16, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface },
  passwordInput: { flex: 1, height: 52, paddingVertical: 0, color: Colors.textPrimary, fontSize: FontSizes.base },
  eyeButton: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginVertical: 2 },
  checkbox: { width: 22, height: 22, flexShrink: 0, marginTop: 1, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.border, borderRadius: 6 },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  termsText: { flex: 1, color: Colors.textMuted, fontSize: FontSizes.xs, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 10, marginBottom: 12 },
  footerText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  footerLink: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "700" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: Spacing.xl },
  successTitle: { color: Colors.textPrimary, fontSize: FontSizes["2xl"], fontWeight: "900", textAlign: "center" },
  successText: { color: Colors.textMuted, fontSize: FontSizes.base, lineHeight: 23, textAlign: "center" },
});
