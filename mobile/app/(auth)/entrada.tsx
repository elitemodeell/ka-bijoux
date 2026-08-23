import { useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { APPLE_AUTH_CONFIG, GOOGLE_AUTH_CONFIG } from "@/constants/authProviders";
import { BorderRadius, Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { googleAuthErrorMessage, signInWithGoogle } from "@/services/googleAuth";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { appleAuthErrorMessage, signInWithApple } from "@/services/appleAuth";

type MethodButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

function MethodButton({ label, icon, iconColor, onPress, disabled = false, loading = false }: MethodButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.78}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled, busy: loading }}
      style={[styles.methodButton, disabled && styles.methodButtonDisabled]}
    >
      {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={icon} size={23} color={iconColor} />}
      <Text style={styles.methodLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function EntradaScreen() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  async function continueWithApple() {
    if (appleLoading) return;
    setAppleLoading(true);
    try {
      const result = await signInWithApple();
      if (result.status === "authenticated") router.replace("/(tabs)");
    } catch (reason: unknown) {
      Alert.alert("Não foi possível entrar com Apple", appleAuthErrorMessage(reason));
    } finally {
      setAppleLoading(false);
    }
  }

  async function continueWithGoogle() {
    if (googleLoading) return;
    if (!GOOGLE_AUTH_CONFIG.enabled) {
      Alert.alert(
        "Google indisponível nesta instalação",
        "Atualize a configuração do aplicativo ou continue com e-mail.",
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === "authenticated") router.replace("/(tabs)");
    } catch (reason: unknown) {
      Alert.alert("Não foi possível entrar com Google", googleAuthErrorMessage(reason));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={23} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.brand}>
          <Image source={require("../../assets/icon.png")} resizeMode="contain" style={styles.logo} />
          <Text style={styles.title}>Entre ou crie sua conta</Text>
          <Text style={styles.subtitle}>Escolha como deseja continuar na KA Bijoux.</Text>
        </View>

        <View style={styles.methods}>
          {Platform.OS === "ios" && APPLE_AUTH_CONFIG.visible && APPLE_AUTH_CONFIG.enabled && (
            <View accessibilityState={{ busy: appleLoading }} style={appleLoading && styles.methodButtonDisabled}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={10}
                style={styles.appleButton}
                onPress={continueWithApple}
              />
            </View>
          )}

          {GOOGLE_AUTH_CONFIG.visible && (
            <MethodButton
              label="Continuar com Google"
              icon="logo-google"
              iconColor="#4285F4"
              onPress={continueWithGoogle}
              disabled={googleLoading}
              loading={googleLoading}
            />
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <MethodButton
            label="Continuar com e-mail"
            icon="mail-outline"
            iconColor={Colors.primary}
            onPress={() => router.push("/(auth)/login")}
          />
        </View>

        <Text style={styles.legal}>
          Ao continuar, você concorda com os{" "}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(LEGAL_LINKS.terms)}>Termos de Uso</Text>
          {" e a "}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}>Política de Privacidade</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: 4, marginLeft: -10 },
  brand: { alignItems: "center", marginTop: 8, marginBottom: 30 },
  logo: { width: 104, height: 104, borderRadius: 24, marginBottom: 18 },
  title: { color: Colors.textPrimary, fontSize: FontSizes["2xl"], fontWeight: "900", textAlign: "center" },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20, textAlign: "center", marginTop: 8 },
  methods: { gap: 12 },
  appleButton: { width: "100%", height: 56 },
  methodButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  methodButtonDisabled: { opacity: 0.65 },
  methodLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 5 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: "600" },
  legal: { color: Colors.textMuted, fontSize: FontSizes.xs, lineHeight: 18, textAlign: "center", marginTop: 26 },
  legalLink: { color: Colors.primaryDark, fontWeight: "700" },
});
