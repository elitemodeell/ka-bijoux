import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
  Dimensions, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";

const { width: SW } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // ── Animations ──────────────────────────────────────────────
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(50)).current;
  const scaleAnim  = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password) { setError("Preencha todos os campos."); return; }
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
    <View style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>

          {/* ── Header gradiente ─────────────────────────────── */}
          <LinearGradient
            colors={["#0e0409", "#280818", "#5a0030", "#b02050", "#FF4D6D"]}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={s.header}
          >
            <SafeAreaView edges={["top"]}>
              {/* Voltar */}
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={s.backCircle}>
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Logo */}
              <Animated.View style={[s.logoBox, { transform: [{ scale: scaleAnim }] }]}>
                {/* Círculo com KA */}
                <View style={s.logoCircle}>
                  <Text style={s.logoKA}>KA</Text>
                </View>
                <Text style={s.logoBijoux}>Bijoux</Text>
                <View style={s.logoTaglineRow}>
                  <View style={s.logoTaglineDot} />
                  <Text style={s.logoTagline}>Moda  •  Beleza  •  Acessórios</Text>
                  <View style={s.logoTaglineDot} />
                </View>
              </Animated.View>
            </SafeAreaView>
          </LinearGradient>

          {/* ── Corpo ────────────────────────────────────────── */}
          <Animated.View style={[s.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Boas-vindas */}
            <Text style={s.welcomeTitle}>Bem-vindo de volta 👋</Text>
            <Text style={s.welcomeSub}>
              Entre para acessar milhares de produtos selecionados especialmente para você.
            </Text>

            {/* Erro */}
            {!!error && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#e53e3e" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Campo e-mail */}
            <View style={[s.inputWrap, emailFocused && s.inputFocused]}>
              <Ionicons
                name="mail-outline" size={18}
                color={emailFocused ? Colors.primary : Colors.textMuted}
                style={s.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="Seu e-mail"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={s.inputText}
              />
            </View>

            {/* Campo senha */}
            <View style={[s.inputWrap, passFocused && s.inputFocused]}>
              <Ionicons
                name="lock-closed-outline" size={18}
                color={passFocused ? Colors.primary : Colors.textMuted}
                style={s.inputIcon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                placeholder="Sua senha"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPassword}
                autoComplete="password"
                style={s.inputText}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Esqueceu senha */}
            <TouchableOpacity onPress={() => router.push("/(auth)/recuperar-senha")} style={s.forgotRow}>
              <Text style={s.forgotText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>

            {/* Botão entrar */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={s.loginBtnOuter}>
              <LinearGradient
                colors={loading ? ["#ccc", "#aaa"] : [Colors.primary, "#d63050"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.loginBtn}
              >
                {loading ? (
                  <Text style={s.loginBtnText}>Entrando...</Text>
                ) : (
                  <>
                    <Text style={s.loginBtnText}>Entrar</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divisor */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerLabel}>OU CONTINUE COM</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={s.socialRow}>
              <TouchableOpacity style={s.socialBtn} activeOpacity={0.8}
                onPress={() => Alert.alert("Em breve", "Login com Google estará disponível em breve.")}>
                <Text style={[s.socialIcon, { color: "#4285F4", fontWeight: "900" }]}>G</Text>
                <Text style={s.socialLabel}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.socialBtn} activeOpacity={0.8}
                onPress={() => Alert.alert("Em breve", "Login com Facebook estará disponível em breve.")}>
                <Ionicons name="logo-facebook" size={20} color="#1877f2" />
                <Text style={s.socialLabel}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Biometria */}
            <TouchableOpacity style={s.bioBtn} activeOpacity={0.8}
              onPress={() => Alert.alert("Impressão digital", "Faça login ao menos uma vez para habilitar a entrada por biometria.")}>
              <Ionicons name="finger-print-outline" size={22} color={Colors.primary} />
              <Text style={s.bioBtnText}>Entrar com impressão digital</Text>
            </TouchableOpacity>

            {/* Criar conta */}
            <View style={s.registerRow}>
              <Text style={s.registerText}>Ainda não tem conta? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/cadastro")} hitSlop={{ top: 8, bottom: 8 }}>
                <Text style={s.registerLink}>Criar conta</Text>
              </TouchableOpacity>
            </View>

            {/* Termos */}
            <Text style={s.terms}>
              Ao continuar você concorda com nossos{" "}
              <Text style={s.termsLink}>Termos de Uso</Text>
              {" e "}
              <Text style={s.termsLink}>Política de Privacidade</Text>
            </Text>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  // ── Header ──────────────────────────────────────────────────
  header: { paddingBottom: 36, minHeight: 280 },
  backBtn: { paddingHorizontal: 20, paddingTop: 12 },
  backCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },

  logoBox: { alignItems: "center", marginTop: 16, gap: 6 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  logoKA: { fontSize: 34, fontWeight: "900", color: "#fff", letterSpacing: 2 },
  logoBijoux: { fontSize: 22, fontWeight: "300", color: "rgba(255,255,255,0.92)", letterSpacing: 6, fontStyle: "italic" },
  logoTaglineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  logoTaglineDot: { width: 20, height: 1, backgroundColor: "rgba(255,255,255,0.4)" },
  logoTagline: { fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, fontWeight: "500" },

  // ── Body ─────────────────────────────────────────────────────
  body: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40,
    gap: 0,
  },

  welcomeTitle: { fontSize: 24, fontWeight: "800", color: "#1a1a2e", marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 24 },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#fcc",
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: "#e53e3e", fontWeight: "500" },

  // Inputs
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#e8e8f0",
    borderRadius: 14, backgroundColor: "#fafafa",
    paddingHorizontal: 14, marginBottom: 14, height: 54,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: "#fff",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: { marginRight: 10 },
  inputText: {
    flex: 1, fontSize: 15, color: "#1a1a2e",
    paddingVertical: 0,
  },
  eyeBtn: { padding: 4 },

  // Forgot
  forgotRow: { alignSelf: "flex-end", marginBottom: 20 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },

  // Login button
  loginBtnOuter: { borderRadius: 16, overflow: "hidden", marginBottom: 24, elevation: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
  loginBtn: { flexDirection: "row", height: 54, alignItems: "center", justifyContent: "center", gap: 8 },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e8e8f0" },
  dividerLabel: { fontSize: 11, color: "#aaa", fontWeight: "700", letterSpacing: 1 },

  // Social
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  socialBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: "#e8e8f0",
    backgroundColor: "#fff",
  },
  socialIcon: { fontSize: 18 },
  socialLabel: { fontSize: 14, fontWeight: "600", color: "#444" },

  // Biometria
  bioBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary + "40",
    backgroundColor: Colors.primary + "08", marginBottom: 28,
  },
  bioBtnText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },

  // Register
  registerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  registerText: { fontSize: 14, color: "#666" },
  registerLink: { fontSize: 14, color: Colors.primary, fontWeight: "800" },

  // Terms
  terms: { fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: "600" },
});
