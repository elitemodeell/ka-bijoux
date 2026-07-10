import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/lib/useTheme";

SplashScreen.preventAutoHideAsync();

function PushHandler() {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Ao tocar em uma notificação, navega para a tela correta
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string> | undefined;
        if (!data) return;

        if (data.orderId) {
          router.push(`/pedidos/${data.orderId}` as `/${string}`);
        } else if (data.screen === "pedidos") {
          router.push("/pedidos");
        } else if (data.screen === "notificacoes") {
          router.push("/notificacoes");
        }
      }
    );

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  const { loadSession, isLoading } = useAuthStore();
  const { isDark, Colors } = useTheme();

  useEffect(() => {
    loadSession().then(() => SplashScreen.hideAsync());
  }, []);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={Colors.background} />
        <PushHandler />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="produto/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="produtos" options={{ presentation: "card" }} />
          <Stack.Screen name="checkout" options={{ presentation: "card" }} />
          <Stack.Screen name="pedidos" options={{ presentation: "card" }} />
          <Stack.Screen name="favoritos" options={{ presentation: "card" }} />
          <Stack.Screen name="endereco" options={{ presentation: "modal" }} />
          <Stack.Screen name="notificacoes" options={{ presentation: "card" }} />
          <Stack.Screen name="conta/editar-perfil" options={{ presentation: "card" }} />
          <Stack.Screen name="conta/excluir" options={{ presentation: "card" }} />
          <Stack.Screen name="avaliar/[productId]" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
