import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, Share, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { Image } from "expo-image";
import { LuxuryBackground } from "@/components/ios/LuxuryBackground";

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
  { icon: "shield-checkmark-outline", label: "Privacidade e permissões", route: "/privacidade-permissoes" },
  { icon: "lock-closed-outline", label: "Alterar Senha",    route: "/(auth)/alterar-senha" },
];

export default function PerfilScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
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
            <Button label="Entrar ou criar conta" onPress={() => router.push("/(auth)/entrada")} fullWidth />
            <Button label="Privacidade e permissões" variant="ghost" onPress={() => router.push("/privacidade-permissoes")} fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === "ios") {
    const accountItems = menuItems.filter((item) => item.route !== "/conta/editar-perfil");
    return (
      <SafeAreaView style={iosStyles.safe} edges={["top"]}>
        <LuxuryBackground />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[iosStyles.content, { paddingBottom: tabBarHeight + 22 }]}>
          <View style={iosStyles.heroHeader}>
            <View style={iosStyles.heroCopy}>
              <Text accessibilityRole="header" style={iosStyles.title}>Minha Conta</Text>
              <Text style={iosStyles.subtitle}>Aqui você gerencia seus dados,{`\n`}pedidos e preferências na KA Bijoux.</Text>
            </View>
            <Image source={require("../../assets/redesign-ios/account-hero.png")} style={iosStyles.heroArt} contentFit="contain" />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir notificações" onPress={() => router.push("/notificacoes")} style={iosStyles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#db0051" />
            </TouchableOpacity>
          </View>

          <View style={iosStyles.profileCard}>
            <View style={iosStyles.avatar}>
              <Image source={require("../../assets/icon.png")} style={iosStyles.avatarLogo} contentFit="contain" accessibilityLabel="Logo oficial KA Bijoux" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={iosStyles.clientLabel}>C L I E N T E</Text>
              <Text style={iosStyles.profileName}>{customer.name}</Text>
              <Text style={iosStyles.profileEmail} numberOfLines={1}>{customer.email}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/conta/editar-perfil")} style={iosStyles.editButton}>
              <Ionicons name="pencil-outline" size={18} color="#e10055" />
              <Text style={iosStyles.editText}>Editar</Text>
              <Ionicons name="chevron-forward" size={18} color="#e10055" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/pedidos")} style={iosStyles.communityCard}>
            <View style={iosStyles.communityIcon}><Ionicons name="diamond-outline" size={30} color="#e06482" /></View>
            <View style={{ flex: 1 }}><Text style={iosStyles.communityTitle}>Você faz parte da nossa comunidade! 💖</Text><Text style={iosStyles.communityText}>Acompanhe seus pedidos, salve seus favoritos e fique por dentro das novidades.</Text></View>
            <Ionicons name="chevron-forward" size={22} color="#d90050" />
          </TouchableOpacity>

          <View style={iosStyles.menuGrid}>
            {accountItems.map((item) => (
              <TouchableOpacity key={item.route} accessibilityRole="button" style={iosStyles.menuCard} onPress={() => router.push(item.route as `/${string}`)} activeOpacity={0.78}>
                <View style={iosStyles.menuIcon}><Ionicons name={item.icon} size={28} color="#c90049" /></View>
                <View style={{ flex: 1 }}><Text style={iosStyles.menuLabel}>{item.label}</Text><Text style={iosStyles.menuDescription}>{item.route === "/pedidos" ? "Acompanhe o status dos seus pedidos" : item.route === "/favoritos" ? "Seus produtos favoritos" : item.route === "/notificacoes" ? "Fique por dentro das novidades" : item.route === "/endereco" ? "Gerencie seus endereços de entrega" : item.route === "/privacidade-permissoes" ? "Controle seus dados e permissões" : "Mantenha sua conta segura"}</Text></View>
                <Ionicons name="chevron-forward" size={19} color="#d83b69" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={iosStyles.exclusiveCard}>
            <View style={iosStyles.exclusiveCopy}><Text style={iosStyles.exclusiveLabel}>E X C L U S I V I D A D E  K A  B I J O U X</Text><Text style={iosStyles.exclusiveTitle}>Novidades sempre{`\n`}para você</Text><Text style={iosStyles.exclusiveText}>Receba ofertas, lançamentos e coleções especiais.</Text></View>
            <Image source={require("../../assets/redesign-ios/account-hero.png")} style={iosStyles.exclusiveArt} contentFit="contain" />
          </View>

          <TouchableOpacity style={iosStyles.logoutButton} onPress={async () => { await logout(); router.replace("/(tabs)"); }}>
            <Ionicons name="log-out-outline" size={23} color="#c90049" /><Text style={iosStyles.logoutText}>Sair da conta</Text><Ionicons name="chevron-forward" size={21} color="#c90049" />
          </TouchableOpacity>
          <TouchableOpacity style={iosStyles.secondaryLink} onPress={() => Linking.openURL(`${SITE_URL}/privacidade`)}><Ionicons name="document-text-outline" size={19} color="#7c7780" /><Text style={iosStyles.secondaryText}>Política de Privacidade</Text><Ionicons name="chevron-forward" size={17} color="#a59198" /></TouchableOpacity>
          <TouchableOpacity style={iosStyles.secondaryLink} onPress={async () => { try { const response = await api.get("/api/customers/me/export"); await Share.share({ title: "Meus dados KA Bijoux", message: JSON.stringify(response.data, null, 2) }); } catch { Alert.alert("Erro", "Não foi possível preparar a exportação dos seus dados."); } }}><Ionicons name="download-outline" size={19} color="#7c7780" /><Text style={iosStyles.secondaryText}>Exportar meus dados (LGPD)</Text><Ionicons name="chevron-forward" size={17} color="#a59198" /></TouchableOpacity>
          <TouchableOpacity style={iosStyles.secondaryLink} onPress={() => router.push("/conta/excluir")}><Ionicons name="trash-outline" size={19} color="#7c7780" /><Text style={iosStyles.secondaryText}>Excluir minha conta</Text><Ionicons name="chevron-forward" size={17} color="#a59198" /></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}>
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
            style={styles.deleteBtn}
            onPress={async () => {
              try {
                const response = await api.get("/api/customers/me/export");
                await Share.share({
                  title: "Meus dados KA Bijoux",
                  message: JSON.stringify(response.data, null, 2),
                });
              } catch {
                Alert.alert("Erro", "Não foi possível preparar a exportação dos seus dados.");
              }
            }}
          >
            <Ionicons name="download-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.deleteText}>Exportar meus dados (LGPD)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => router.push("/conta/excluir")}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.deleteText}>Excluir minha conta</Text>
          </TouchableOpacity>
        </View>

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

const iosStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7f8" },
  content: { paddingHorizontal: 16 },
  heroHeader: { height: 176, marginHorizontal: -16, overflow: "hidden" },
  heroCopy: { position: "absolute", left: 20, top: 36, zIndex: 2 },
  title: { color: "#85002f", fontFamily: "PlayfairDisplay", fontSize: 36 },
  subtitle: { color: "#7a747c", fontFamily: "Inter", fontSize: 15, lineHeight: 21, marginTop: 7 },
  heroArt: { position: "absolute", width: 275, height: 175, right: -74, top: -2 },
  notificationButton: { position: "absolute", right: 15, top: 5, width: 48, height: 48, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", zIndex: 3 },
  profileCard: { minHeight: 112, marginTop: -2, borderRadius: 25, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.92)", shadowColor: "#cb718d", shadowOpacity: 0.11, shadowRadius: 16, shadowOffset: { width: 0, height: 7 } },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff4f6", borderWidth: 2, borderColor: "#ffe3ea", overflow: "hidden" },
  avatarLogo: { width: "100%", height: "100%" },
  clientLabel: { color: "#b27b8a", fontFamily: "Inter", fontSize: 10, letterSpacing: 3 },
  profileName: { color: "#16070c", fontFamily: "Inter", fontSize: 18, fontWeight: "800", marginTop: 4 },
  profileEmail: { color: "#9b878e", fontFamily: "Inter", fontSize: 12, marginTop: 4 },
  editButton: { height: 45, borderRadius: 22, backgroundColor: "#fff0f4", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 5 },
  editText: { color: "#df0053", fontFamily: "Inter", fontSize: 13, fontWeight: "800" },
  communityCard: { marginTop: 12, minHeight: 96, borderRadius: 24, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,235,241,0.68)" },
  communityIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,214,225,0.8)", alignItems: "center", justifyContent: "center" },
  communityTitle: { color: "#6d1029", fontFamily: "Inter", fontSize: 14, fontWeight: "800" },
  communityText: { color: "#88757c", fontFamily: "Inter", fontSize: 12, lineHeight: 17, marginTop: 4 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  menuCard: { width: "48%", minHeight: 124, flexGrow: 1, flexBasis: "45%", borderRadius: 23, backgroundColor: "rgba(255,255,255,0.84)", padding: 13, flexDirection: "row", gap: 9, alignItems: "flex-start", shadowColor: "#cc718c", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  menuIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: "#fff0f4", alignItems: "center", justifyContent: "center" },
  menuLabel: { color: "#171016", fontFamily: "Inter", fontSize: 13, fontWeight: "800", paddingRight: 2 },
  menuDescription: { color: "#726d77", fontFamily: "Inter", fontSize: 10, lineHeight: 14, marginTop: 4 },
  exclusiveCard: { height: 155, borderRadius: 25, overflow: "hidden", backgroundColor: "rgba(255,225,233,0.82)", marginTop: 16 },
  exclusiveCopy: { width: "59%", padding: 17, zIndex: 2 },
  exclusiveLabel: { color: "#a66f7e", fontFamily: "Inter", fontSize: 8, letterSpacing: 1.2 },
  exclusiveTitle: { color: "#9e0038", fontFamily: "PlayfairDisplay", fontSize: 24, lineHeight: 25, marginTop: 8 },
  exclusiveText: { color: "#8d727b", fontFamily: "Inter", fontSize: 11, lineHeight: 16, marginTop: 7 },
  exclusiveArt: { position: "absolute", width: 240, height: 150, right: -78, bottom: -2 },
  logoutButton: { marginTop: 16, minHeight: 58, borderRadius: 20, backgroundColor: "rgba(255,236,241,0.88)", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  logoutText: { flex: 1, color: "#c90049", fontFamily: "Inter", fontSize: 16, fontWeight: "800" },
  secondaryLink: { minHeight: 45, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6 },
  secondaryText: { flex: 1, color: "#746e78", fontFamily: "Inter", fontSize: 13 },
});
