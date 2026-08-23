import { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/theme";
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
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <LinearGradient
            colors={["#0e0409", "#5a0030", "#FF4D6D"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.header}
          >
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.logoBox}>
                <View style={styles.logoCircle}><Text style={styles.logoKA}>KA</Text></View>
                <Text style={styles.logoBijoux}>Bijoux</Text>
                <Text style={styles.logoTagline}>Moda • Beleza • Acessórios</Text>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.title}>Entrar com e-mail</Text>
            <Text style={styles.subtitle}>Informe seu e-mail e senha para acessar sua conta.</Text>

            {!!error && (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#c62828" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={[styles.inputWrap, focused === "email" && styles.inputFocused]}>
              <Ionicons name="mail-outline" size={19} color={focused === "email" ? Colors.primary : "#777"} />
              <TextInput
                accessibilityLabel="E-mail"
                value={email}
                onChangeText={updateEmail}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="Seu e-mail"
                placeholderTextColor="#999"
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
              <Ionicons name="lock-closed-outline" size={19} color={focused === "password" ? Colors.primary : "#777"} />
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Senha"
                value={password}
                onChangeText={updatePassword}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                placeholder="Sua senha"
                placeholderTextColor="#999"
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
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color="#777" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push("/(auth)/recuperar-senha")} style={styles.forgotButton}>
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
              <LinearGradient colors={loading ? ["#aaa", "#999"] : [Colors.primary, "#d63050"]} style={styles.submit}>
                {loading && <ActivityIndicator size="small" color="#fff" />}
                <Text style={styles.submitText}>{loading ? "Entrando..." : "Entrar"}</Text>
                {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Ainda não tem conta? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/cadastro")}>
                <Text style={styles.registerLink}>Criar conta</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.terms}>
              Ao continuar você concorda com nossos{" "}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(LEGAL_LINKS.terms)}>Termos de Uso</Text>
              {" e "}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}>Política de Privacidade</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { minHeight: 250, paddingBottom: 34 },
  backButton: { width: 42, height: 42, margin: 18, borderRadius: 21, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
  logoBox: { alignItems: "center", gap: 5 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: "rgba(255,255,255,.35)", backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" },
  logoKA: { color: "#fff", fontSize: 31, fontWeight: "900", letterSpacing: 2 },
  logoBijoux: { color: "#fff", fontSize: 21, fontStyle: "italic", fontWeight: "300", letterSpacing: 6 },
  logoTagline: { color: "rgba(255,255,255,.75)", fontSize: 11, letterSpacing: 1.2 },
  body: { flexGrow: 1, marginTop: -26, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#fff" },
  title: { color: "#1a1a2e", fontSize: 24, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#666", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: "#ffcdd2", backgroundColor: "#fff5f5" },
  errorText: { flex: 1, color: "#c62828", fontSize: 13, fontWeight: "500" },
  inputWrap: { height: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1.5, borderColor: "#e3e3ea", borderRadius: 14, backgroundColor: "#fafafa" },
  inputFocused: { borderColor: Colors.primary, backgroundColor: "#fff" },
  input: { flex: 1, height: "100%", color: "#1a1a2e", fontSize: 16, paddingVertical: 0 },
  eyeButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  forgotButton: { alignSelf: "flex-end", marginBottom: 20 },
  forgotText: { color: Colors.primary, fontSize: 13, fontWeight: "700" },
  submitOuter: { overflow: "hidden", borderRadius: 16, marginBottom: 24 },
  submit: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  registerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  registerText: { color: "#666", fontSize: 14 },
  registerLink: { color: Colors.primary, fontSize: 14, fontWeight: "800" },
  terms: { color: "#888", fontSize: 11, lineHeight: 18, textAlign: "center" },
  termsLink: { color: Colors.primary, fontWeight: "700" },
});
