import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
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
import { authApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { authErrorMessage, isValidEmail } from "@/lib/authFeedback";

type Step = "email" | "code";

export default function RecuperarSenhaScreen() {
  const router = useRouter();
  const codeRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);

  function clearFeedback() {
    if (error) setError("");
  }

  async function handleSendCode() {
    if (loading) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) return setError("Informe um e-mail válido.");
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await authApi.forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setStep("code");
      setNotice("Se o e-mail estiver cadastrado, você receberá um código de 6 dígitos. Verifique também o spam.");
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (reason: unknown) {
      setError(authErrorMessage(reason, "recovery"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (loading) return;
    if (!/^\d{6}$/.test(code)) return setError("Digite o código de 6 dígitos.");
    if (newPassword.length < 6) return setError("A nova senha deve ter pelo menos 6 caracteres.");
    if (newPassword !== confirmPassword) return setError("As senhas não conferem.");
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(email, code, newPassword);
      setSuccess(true);
    } catch (reason: unknown) {
      setError(authErrorMessage(reason, "reset"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View accessibilityLiveRegion="polite" style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
          <Text style={styles.successTitle}>Senha redefinida!</Text>
          <Text style={styles.successText}>A alteração foi confirmada pelo servidor. Entre com sua nova senha.</Text>
          <Button label="Ir para o login" onPress={() => router.replace("/(auth)/login")} fullWidth size="lg" style={{ marginTop: 20 }} />
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
          <TouchableOpacity onPress={() => step === "code" ? setStep("email") : router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.primary} />
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              {step === "email" ? "Informe seu e-mail para solicitar o código de recuperação." : "Digite o código recebido e escolha uma nova senha."}
            </Text>
          </View>

          {!!notice && <View accessibilityLiveRegion="polite" style={styles.noticeBox}><Text style={styles.noticeText}>{notice}</Text></View>}
          {!!error && <View accessibilityLiveRegion="polite" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          {step === "email" ? (
            <View style={styles.form}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                accessibilityLabel="E-mail para recuperação"
                value={email}
                onChangeText={(value) => { setEmail(value.toLowerCase()); clearFeedback(); }}
                placeholder="seu@email.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={handleSendCode}
                editable={!loading}
                style={styles.input}
              />
              <Button label="Enviar código" onPress={handleSendCode} loading={loading} disabled={loading} fullWidth size="lg" />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Código de verificação</Text>
              <TextInput
                ref={codeRef}
                accessibilityLabel="Código de 6 dígitos"
                value={code}
                onChangeText={(value) => { setCode(value.replace(/\D/g, "")); clearFeedback(); }}
                placeholder="000000"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => newPasswordRef.current?.focus()}
                editable={!loading}
                style={[styles.input, styles.codeInput]}
              />

              <Text style={styles.label}>Nova senha</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  ref={newPasswordRef}
                  accessibilityLabel="Nova senha"
                  value={newPassword}
                  onChangeText={(value) => { setNewPassword(value); clearFeedback(); }}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  editable={!loading}
                  style={styles.passwordInput}
                />
                <EyeButton visible={showNewPassword} onPress={() => setShowNewPassword((value) => !value)} />
              </View>

              <Text style={styles.label}>Confirmar nova senha</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  ref={confirmPasswordRef}
                  accessibilityLabel="Confirmar nova senha"
                  value={confirmPassword}
                  onChangeText={(value) => { setConfirmPassword(value); clearFeedback(); }}
                  placeholder="Repita a nova senha"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  editable={!loading}
                  style={styles.passwordInput}
                />
                <EyeButton visible={showConfirmPassword} onPress={() => setShowConfirmPassword((value) => !value)} />
              </View>

              <Button label="Redefinir senha" onPress={handleResetPassword} loading={loading} disabled={loading} fullWidth size="lg" />
              <TouchableOpacity disabled={loading} onPress={handleSendCode} style={styles.resendButton}>
                <Text style={styles.resendText}>Não recebi o código — Reenviar</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EyeButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"} onPress={onPress} style={styles.eyeButton}>
      <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={21} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: Spacing.base, paddingTop: 8 },
  backButton: { minHeight: 42, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, marginBottom: 18 },
  backText: { color: Colors.primary, fontSize: FontSizes.base, fontWeight: "700" },
  header: { alignItems: "center", gap: 10, marginBottom: 24 },
  title: { color: Colors.textPrimary, fontSize: FontSizes.xl, fontWeight: "800" },
  subtitle: { color: Colors.textMuted, fontSize: FontSizes.sm, lineHeight: 20, textAlign: "center" },
  form: { gap: 12 },
  label: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: "600", marginTop: 2 },
  input: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, color: Colors.textPrimary, fontSize: FontSizes.base },
  codeInput: { fontSize: 27, fontWeight: "800", letterSpacing: 8, textAlign: "center" },
  passwordWrap: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingLeft: 16, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface },
  passwordInput: { flex: 1, height: 52, paddingVertical: 0, color: Colors.textPrimary, fontSize: FontSizes.base },
  eyeButton: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  errorBox: { padding: 12, marginBottom: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.errorLight },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  noticeBox: { padding: 12, marginBottom: 12, borderRadius: BorderRadius.lg, backgroundColor: "#eef7ff" },
  noticeText: { color: "#24557a", fontSize: FontSizes.sm, lineHeight: 20 },
  resendButton: { alignItems: "center", minHeight: 42, justifyContent: "center" },
  resendText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "700" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: Spacing.xl },
  successTitle: { color: Colors.textPrimary, fontSize: FontSizes["2xl"], fontWeight: "900", textAlign: "center" },
  successText: { color: Colors.textMuted, fontSize: FontSizes.base, lineHeight: 23, textAlign: "center" },
});
