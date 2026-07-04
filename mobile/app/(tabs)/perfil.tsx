import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

const menuItems: MenuItem[] = [
  { icon: "bag-outline",      label: "Meus Pedidos",   route: "/pedidos" },
  { icon: "heart-outline",    label: "Favoritos",      route: "/favoritos" },
  { icon: "location-outline", label: "Endereços",      route: "/endereco" },
  { icon: "lock-closed-outline", label: "Alterar Senha", route: "/(auth)/alterar-senha" },
];

export default function PerfilScreen() {
  const router = useRouter();
  const { customer, logout } = useAuthStore();

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
            <Button label="Entrar" onPress={() => router.push("/(auth)/login")} fullWidth />
            <Button label="Criar conta" onPress={() => router.push("/(auth)/cadastro")} variant="outline" fullWidth />
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
            onPress={() => Linking.openURL("https://kabijoux.com.br/privacidade")}
          >
            <Ionicons name="document-text-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.deleteText}>Política de Privacidade</Text>
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
});
