import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { completeGoogleOAuthCode, googleAuthErrorMessage } from "@/services/googleAuth";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function GoogleAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
  }>();
  const [error, setError] = useState("");

  useEffect(() => {
    const oauthError = first(params.error);
    const code = first(params.code);
    if (oauthError === "access_denied") {
      router.replace("/(auth)/entrada");
      return;
    }
    if (oauthError) {
      setError("O Google não concluiu a autenticação. Tente novamente.");
      return;
    }
    if (!code) {
      setError("O retorno do Google não trouxe um código válido.");
      return;
    }

    let active = true;
    completeGoogleOAuthCode(code)
      .then((result) => {
        if (active && result.status === "authenticated") router.replace("/(tabs)");
      })
      .catch((reason: unknown) => {
        if (active) setError(googleAuthErrorMessage(reason));
      });

    return () => {
      active = false;
    };
  }, [params.code, params.error, router]);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.replace("/(auth)/entrada")}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Voltar para entrar</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text accessibilityLiveRegion="polite" style={styles.message}>Concluindo seu acesso com Google...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  message: { color: Colors.textSecondary, fontSize: FontSizes.base, textAlign: "center" },
  error: { color: "#b42318", fontSize: FontSizes.base, lineHeight: 22, textAlign: "center" },
  button: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14 },
  buttonText: { color: "#fff", fontSize: FontSizes.base, fontWeight: "700" },
});
