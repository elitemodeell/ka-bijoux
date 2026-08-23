import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { authErrorMessage } from "@/lib/authFeedback";

export default function AlterarSenhaScreen() {
  const router = useRouter();
  const newPasswordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [form, setForm] = useState({ current: "", password: "", confirm: "" });
  const [visible, setVisible] = useState({ current: false, password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  }

  async function handleSubmit() {
    if (loading) return;
    if (!form.current || !form.password || !form.confirm) return setError("Preencha todos os campos.");
    if (form.password.length < 6) return setError("A nova senha precisa ter pelo menos 6 caracteres.");
    if (form.password !== form.confirm) return setError("As novas senhas não conferem.");
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/change-password", { currentPassword: form.current, newPassword: form.password });
      setSuccess(true);
    } catch (reason: unknown) {
      setError(authErrorMessage(reason, "reset"));
    } finally {
      setLoading(false);
    }
  }

  const fields: Array<{ key: keyof typeof form; label: string; placeholder: string; ref?: React.RefObject<TextInput>; next?: () => void; submit?: boolean }> = [
    { key: "current", label: "Senha atual", placeholder: "Digite sua senha atual", next: () => newPasswordRef.current?.focus() },
    { key: "password", label: "Nova senha", placeholder: "Mínimo 6 caracteres", ref: newPasswordRef, next: () => confirmRef.current?.focus() },
    { key: "confirm", label: "Confirmar nova senha", placeholder: "Repita a nova senha", ref: confirmRef, submit: true },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary} /></TouchableOpacity>
          <Text style={styles.title}>Alterar senha</Text><View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
          {success ? (
            <View accessibilityLiveRegion="polite" style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
              <Text style={styles.successTitle}>Senha alterada!</Text>
              <Text style={styles.successText}>Sua senha foi atualizada com sucesso.</Text>
              <Button label="Voltar" onPress={() => router.back()} fullWidth style={{ marginTop: 24 }} />
            </View>
          ) : (
            <View style={styles.form}>
              {!!error && <View accessibilityLiveRegion="polite" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
              {fields.map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      ref={field.ref}
                      accessibilityLabel={field.label}
                      value={form[field.key]}
                      onChangeText={(value) => update(field.key, value)}
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textLight}
                      secureTextEntry={!visible[field.key]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={field.key === "current" ? "current-password" : "new-password"}
                      textContentType={field.key === "current" ? "password" : "newPassword"}
                      returnKeyType={field.submit ? "done" : "next"}
                      blurOnSubmit={Boolean(field.submit)}
                      onSubmitEditing={field.submit ? handleSubmit : field.next}
                      editable={!loading}
                      style={styles.input}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={visible[field.key] ? "Ocultar senha" : "Mostrar senha"}
                      onPress={() => setVisible((current) => ({ ...current, [field.key]: !current[field.key] }))}
                      style={styles.eyeButton}
                    >
                      <Ionicons name={visible[field.key] ? "eye-off-outline" : "eye-outline"} size={21} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Button label="Alterar senha" onPress={handleSubmit} loading={loading} disabled={loading} fullWidth size="lg" />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.base, paddingVertical: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm },
  title: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: "800" }, headerSpacer: { width: 40 },
  content: { flexGrow: 1, padding: Spacing.base }, form: { gap: 16 }, inputGroup: { gap: 6 },
  label: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: "600" },
  passwordWrap: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingLeft: 16, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface },
  input: { flex: 1, height: 52, paddingVertical: 0, color: Colors.textPrimary, fontSize: FontSizes.base },
  eyeButton: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  errorBox: { padding: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.errorLight }, errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  successBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  successTitle: { color: Colors.textPrimary, fontSize: FontSizes.xl, fontWeight: "800", marginTop: 8 }, successText: { color: Colors.textMuted, fontSize: FontSizes.base, textAlign: "center" },
});
