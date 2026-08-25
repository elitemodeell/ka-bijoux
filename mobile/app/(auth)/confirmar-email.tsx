import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Colors, FontSizes, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";

const DEFAULT_COOLDOWN_SECONDS = 60;

function otpErrorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message === "PENDING_REGISTRATION_MISSING") {
    return "Por segurança, reinicie o cadastro para solicitar um novo código.";
  }
  if (!axios.isAxiosError(reason)) return "Não foi possível confirmar o código. Tente novamente.";
  if (!reason.response) return "Sem conexão. Verifique sua internet e tente novamente.";
  const message = (reason.response.data as { error?: unknown } | undefined)?.error;
  if (typeof message === "string" && message.length <= 180) return message;
  if (reason.response.status === 410) return "Código expirado. Solicite um novo código.";
  if (reason.response.status === 429) return "Muitas tentativas. Aguarde ou solicite um novo código.";
  if (reason.response.status >= 500) return "Serviço temporariamente indisponível. Tente novamente em instantes.";
  return "Código incorreto. Confira os 6 dígitos e tente novamente.";
}

export default function ConfirmarEmailScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const pending = useAuthStore((state) => state.pendingRegistration);
  const verifyRegistration = useAuthStore((state) => state.verifyRegistration);
  const resendRegistrationCode = useAuthStore((state) => state.resendRegistrationCode);
  const clearPendingRegistration = useAuthStore((state) => state.clearPendingRegistration);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(DEFAULT_COOLDOWN_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1_000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function returnToOptions() {
    clearPendingRegistration();
    router.replace({ pathname: "/(auth)/entrada", params: { mode: "register" } });
  }

  function correctEmail() {
    const name = pending?.name ?? "";
    const email = pending?.email ?? "";
    clearPendingRegistration();
    router.replace({ pathname: "/(auth)/cadastro", params: { name, email } });
  }

  async function confirmCode() {
    if (loading) return;
    if (!/^\d{6}$/.test(code)) return setError("Informe o código de 6 dígitos.");
    setLoading(true);
    setError("");
    try {
      await verifyRegistration(code);
      setSuccess("E-mail confirmado. Sua conta foi criada com sucesso.");
      await new Promise((resolve) => setTimeout(resolve, 700));
      router.replace("/(tabs)");
    } catch (reason) {
      setError(otpErrorMessage(reason));
      setCode("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError("");
    setSuccess("");
    try {
      const seconds = await resendRegistrationCode();
      setCooldown(Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_COOLDOWN_SECONDS);
      setSuccess("Se o cadastro estiver pendente, um novo código foi enviado.");
      setCode("");
    } catch (reason) {
      setError(otpErrorMessage(reason));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreenShell
      title="Confirme seu e-mail"
      subtitle="Digite o código para concluir a criação da sua conta."
      onClose={returnToOptions}
      keyboardAware
    >
      <TouchableOpacity accessibilityRole="button" onPress={returnToOptions} style={styles.backButton}>
        <Ionicons name="arrow-back" size={18} color={Colors.primaryDark} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.instructions}>Enviamos um código de 6 dígitos para:</Text>
      <Text accessibilityLabel={`E-mail ${pending?.email ?? "não disponível"}`} style={styles.email}>
        {pending?.email ?? "E-mail não disponível"}
      </Text>

      {!!error && <View accessibilityLiveRegion="assertive" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      {!!success && <View accessibilityLiveRegion="polite" style={styles.successBox}><Text style={styles.successText}>{success}</Text></View>}

      <Text style={styles.label}>Código de confirmação</Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Código de confirmação de 6 dígitos"
        value={code}
        onChangeText={(value) => { setCode(value.replace(/\D/g, "").slice(0, 6)); if (error) setError(""); }}
        placeholder="000000"
        placeholderTextColor={Colors.textLight}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={confirmCode}
        editable={!loading}
        autoFocus
        style={styles.otpInput}
      />

      <Button label="Confirmar código" onPress={confirmCode} loading={loading} disabled={loading || code.length !== 6} fullWidth size="lg" />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: cooldown > 0 || resending }}
        disabled={cooldown > 0 || resending}
        onPress={resendCode}
        style={styles.actionButton}
      >
        <Text style={[styles.actionText, cooldown > 0 && styles.disabledText]}>
          {resending ? "Reenviando..." : cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={correctEmail} style={styles.actionButton}>
        <Text style={styles.actionText}>Corrigir e-mail</Text>
      </TouchableOpacity>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 7, minHeight: 44, marginBottom: Spacing.sm },
  backText: { color: Colors.primaryDark, fontSize: FontSizes.sm, fontWeight: "800" },
  instructions: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: "center", lineHeight: 21 },
  email: { color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: "800", textAlign: "center", marginTop: 4, marginBottom: Spacing.lg },
  label: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: "700", marginBottom: 8 },
  otpInput: { height: 64, marginBottom: Spacing.base, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceAlt, color: Colors.textPrimary, fontSize: 30, fontWeight: "800", letterSpacing: 10, textAlign: "center" },
  errorBox: { padding: 12, marginBottom: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.errorLight },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "600", textAlign: "center" },
  successBox: { padding: 12, marginBottom: 14, borderRadius: BorderRadius.md, backgroundColor: "#E8F6ED" },
  successText: { color: "#206A3A", fontSize: FontSizes.sm, fontWeight: "600", textAlign: "center" },
  actionButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 6 },
  actionText: { color: Colors.primaryDark, fontSize: FontSizes.sm, fontWeight: "800" },
  disabledText: { color: Colors.textLight },
});
