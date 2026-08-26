import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { customerApi } from "@/services/api";

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "https://kabijoux.com.br";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

const menuItems: MenuItem[] = [
  { icon: "person-outline",      label: "Editar Perfil",    route: "/conta/editar-perfil" },
  { icon: "bag-outline",         label: "Meus Pedidos",     route: "/pedidos" },
  { icon: "heart-outline",       label: "Favoritos",        route: "/favoritos" },
  { icon: "notifications-outline", label: "Notificações",   route: "/notificacoes" },
  { icon: "location-outline",    label: "Endereços",        route: "/endereco" },
  { icon: "lock-closed-outline", label: "Alterar Senha",    route: "/(auth)/alterar-senha" },
];

export default function PerfilScreen() {
  const router = useRouter();
  const { customer, logout } = useAuthStore();
  const [exporting, setExporting] = useState(false);

  async function exportCustomerData() {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await customerApi.exportData();
      const contents = typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data, null, 2);
      const exportDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!exportDirectory) throw new Error("Diretório de exportação indisponível");

      const filename = `ka-bijoux-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = `${exportDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, contents, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          UTI: "public.json",
          dialogTitle: "Salvar ou compartilhar meus dados KA Bijoux",
        });
      } else {
        await Share.share({ title: filename, message: contents });
      }
      Alert.alert("Exportação pronta", "Seus dados foram preparados para salvar ou compartilhar.");
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401) {
        Alert.alert(
          "Sessão expirada",
          "Entre novamente para exportar seus dados.",
          [{ text: "Entrar", onPress: () => router.replace({ pathname: "/(auth)/entrada", params: { mode: "login" } }) }]
        );
      } else if (status === 403) {
        Alert.alert("Acesso negado", "Não foi possível autorizar a exportação dos seus dados.");
      } else if (axios.isAxiosError(error) && !error.response) {
        Alert.alert("Sem conexão", "Verifique sua internet e tente exportar novamente.");
      } else {
        Alert.alert("Erro", "Não foi possível exportar seus dados. Tente novamente.");
      }
    } finally {
      setExporting(false);
    }
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Minha Conta</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color={Colors.pinkLight} />
          </View>
          <Text style={styles.guestTitle}>Entre na sua conta</Text>
          <Text style={styles.guestText}>Faça login para ver seus pedidos e dados</Text>
          <View style={{ marginTop: 24, gap: 10, width: 220 }}>
            <Button
              label="Entrar"
              onPress={() => router.push({ pathname: "/(auth)/entrada", params: { mode: "login" } })}
              fullWidth
            />
            <Button
              label="Criar conta"
              onPress={() => router.push({ pathname: "/(auth)/entrada", params: { mode: "register" } })}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Minha Conta</Text>
        </View>

        {/* Avatar e dados */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{customer.name}</Text>
            <Text style={styles.profileEmail}>{customer.email}</Text>
            {customer.phone && <Text style={styles.profilePhone}>{customer.phone}</Text>}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItem}
              onPress={() => router.push(item.route as `/${string}`)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sair e excluir */}
        <View style={{ paddingHorizontal: Spacing.base, marginTop: 16, gap: 10 }}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
              router.replace("/(tabs)");
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => Linking.openURL(`${SITE_URL}/privacidade`)}
          >
            <Ionicons name="document-text-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.deleteText}>Política de Privacidade</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, exporting && styles.disabledBtn]}
            onPress={exportCustomerData}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityState={{ busy: exporting, disabled: exporting }}
            accessibilityLabel="Exportar meus dados da KA Bijoux"
          >
            {exporting
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Ionicons name="download-outline" size={16} color={Colors.textMuted} />}
            <Text style={styles.deleteText}>{exporting ? "Preparando exportação..." : "Exportar meus dados (LGPD)"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => router.push("/conta/excluir")}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.deleteText}>Excluir minha conta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 60 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.pinkSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  guestTitle: { fontSize: FontSizes.lg, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  guestText: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", marginTop: 6 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius["2xl"],
    padding: 20,
    marginBottom: 16,
    ...Shadows.sm,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: FontSizes.xl, fontWeight: "800" },
  profileName: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary },
  profileEmail: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  profilePhone: { fontSize: FontSizes.sm, color: Colors.textMuted },
  menuContainer: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: {
    width: 36, height: 36,
    backgroundColor: Colors.pinkSoft,
    borderRadius: BorderRadius.md,
    alignItems: "center", justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: FontSizes.base, color: Colors.textPrimary, fontWeight: "500" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.xl,
    padding: 16,
  },
  logoutText: { fontSize: FontSizes.base, fontWeight: "600", color: Colors.error },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  deleteText: { fontSize: FontSizes.sm, color: Colors.textMuted },
  disabledBtn: { opacity: 0.65 },
});
