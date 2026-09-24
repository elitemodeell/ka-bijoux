import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/lib/useTheme";
import { runGooglePlayCatalogMigration } from "@/lib/googlePlayCatalogMigration";
import { completeOnboarding, hasCompletedOnboarding } from "@/lib/onboarding";
import { WelcomeScreen } from "@/components/privacy/WelcomeScreen";
import { useFonts } from "expo-font";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay: require("../assets/fonts/PlayfairDisplay-Bold.ttf"),
    Inter: require("../assets/fonts/Inter-Regular.ttf"),
  });
  const loadSession = useAuthStore((state) => state.loadSession);
  const { isDark, Colors } = useTheme();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;

    hasCompletedOnboarding()
      .catch(() => false)
      .then((completed) => {
        if (mounted) setOnboardingCompleted(completed);
      })
      .finally(() => SplashScreen.hideAsync());

    // Public store content does not depend on the authenticated session.
    // Restore credentials and run the one-time catalog cleanup in background.
    void runGooglePlayCatalogMigration()
      .catch(() => undefined)
      .then(loadSession);

    return () => { mounted = false; };
  }, [loadSession]);

  async function finishOnboarding() {
    if (savingOnboarding) return;
    setSavingOnboarding(true);
    try {
      await completeOnboarding();
    } catch {
      // A falha de armazenamento não pode bloquear o acesso à loja nesta sessão.
    } finally {
      setOnboardingCompleted(true);
      setSavingOnboarding(false);
    }
  }

  if (onboardingCompleted === null || (!fontsLoaded && !fontError)) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={Colors.background} />
        {!onboardingCompleted ? (
          <WelcomeScreen onFinish={finishOnboarding} busy={savingOnboarding} />
        ) : <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="auth/callback" options={{ presentation: "card" }} />
          <Stack.Screen name="produto/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="produtos" options={{ presentation: "card" }} />
          <Stack.Screen name="checkout" options={{ presentation: "card" }} />
          <Stack.Screen name="pedidos" options={{ presentation: "card" }} />
          <Stack.Screen name="favoritos" options={{ presentation: "card" }} />
          <Stack.Screen name="endereco" options={{ presentation: "modal" }} />
          <Stack.Screen name="notificacoes" options={{ presentation: "card" }} />
          <Stack.Screen name="conta/editar-perfil" options={{ presentation: "card" }} />
          <Stack.Screen name="conta/excluir" options={{ presentation: "card" }} />
          <Stack.Screen name="privacidade-permissoes" options={{ presentation: "card" }} />
          <Stack.Screen name="avaliar/[productId]" options={{ presentation: "modal" }} />
        </Stack>}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
