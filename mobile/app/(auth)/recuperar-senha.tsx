import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { authApi } from "@/services/api";
import { Button } from "@/components/ui/Button";

type Step = "email" | "code";

export default function RecuperarSenhaScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSendCode() {
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email.trim());
      setStep("code");
    } catch {
      setError("Não foi possível enviar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!code || code.length !== 6) { setError("Digite o código de 6 dígitos."); return; }
    if (!newPassword || newPassword.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(email.trim(), code, newPassword);
      setSuccess(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
          <Text style={styles.successTitle}>Senha redefinida!</Text>
          <Text style={styles.successText}>
            Sua senha foi alterada com sucesso.{"\n"}Faça login com a nova senha.
          </Text>
          <Button
            label="Ir para Login"
            onPress={() => router.replace("/(auth)/login")}
            fullWidth
            size="lg"
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => step === "code" ? setStep("email") : router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.primary} />
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              {step === "email"
                ? "Informe seu e-mail cadastrado e enviaremos um código de verificação."
                : `Enviamos um código de 6 dígitos para\n${email}`}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === "email" ? (
            <View style={styles.form}>
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
              <Button
                label="Enviar código"
                onPress={handleSendCode}
                loading={loading}
                fullWidth
                size="lg"
              />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código de verificação</Text>
                <TextInput
                  value={code} onChangeText={setCode}
                  placeholder="000000"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, styles.codeInput]}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nova senha</Text>
                <TextInput
                  value={newPassword} onChangeText={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar senha</Text>
                <TextInput
                  value={confirmPassword} onChangeText={setConfirmPassword}
                  placeholder="Repita a nova senha"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
              <Button
                label="Redefinir senha"
                onPress={handleResetPassword}
                loading={loading}
                fullWidth
                size="lg"
              />
              <TouchableOpacity onPress={handleSendCode} style={{ alignItems: "center", marginTop: 4 }}>
                <Text style={styles.resendText}>Não recebi o código — Reenviar</Text>
              </TouchableOpacity>
            </View>
          )}
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
  header: { alignItems: "center", marginBottom: 28, gap: 10 },
  title: { fontSize: FontSizes.xl, fontWeight: "800", color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
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
  codeInput: { textAlign: "center", fontSize: 28, fontWeight: "800", letterSpacing: 8 },
  resendText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "600" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.base, gap: 12 },
  successTitle: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary },
  successText: { fontSize: FontSizes.base, color: Colors.textMuted, textAlign: "center", lineHeight: 24 },
});
