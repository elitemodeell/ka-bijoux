import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius, Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { LEGAL_LINKS } from "@/lib/legalLinks";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { LuxuryBackground } from "@/components/ios/LuxuryBackground";

type PermissionItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  status: string;
  description: string;
};

function PermissionItem({ icon, title, status, description }: PermissionItemProps) {
  if (Platform.OS === "ios") {
    return (
      <View style={iosStyles.permissionItem}>
        <View style={iosStyles.permissionIcon}><Ionicons name={icon} size={28} color="#dc0051" /></View>
        <View style={iosStyles.permissionText}>
          <View style={iosStyles.permissionTitleRow}>
            <Text style={iosStyles.permissionTitle}>{title}</Text>
            <Text style={iosStyles.status}>{status}</Text>
          </View>
          <Text style={iosStyles.permissionDescription}>{description}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.permissionItem}>
      <View style={styles.permissionIcon}><Ionicons name={icon} size={22} color={Colors.primary} /></View>
      <View style={styles.permissionText}>
        <View style={styles.permissionTitleRow}>
          <Text style={styles.permissionTitle}>{title}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
    </View>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return (
    <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(url)} style={Platform.OS === "ios" ? iosStyles.linkRow : styles.linkRow}>
      {Platform.OS === "ios" ? <View style={iosStyles.linkIcon}><Ionicons name={label.includes("Termos") ? "document-outline" : label.includes("Privacidade") ? "shield-checkmark-outline" : "person-outline"} size={22} color="#df0053" /></View> : null}
      <Text style={Platform.OS === "ios" ? iosStyles.linkText : styles.linkText}>{label}</Text>
      <Ionicons name="open-outline" size={18} color={Colors.primary} />
    </TouchableOpacity>
  );
}

export default function PrivacyPermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function openSystemSettings() {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert("Não foi possível abrir os ajustes", "Abra os ajustes do aparelho e procure por KA Bijoux.");
    }
  }

  if (Platform.OS === "ios") {
    return (
      <SafeAreaView style={iosStyles.safe} edges={["top", "left", "right"]}>
        <LuxuryBackground />
        <ScrollView contentContainerStyle={[iosStyles.content, { paddingBottom: Math.max(insets.bottom, 16) + 26 }]} showsVerticalScrollIndicator={false}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={iosStyles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#770b2d" />
          </TouchableOpacity>
          <View style={iosStyles.heroHeader}>
            <View style={iosStyles.heroCopy}>
              <Text style={iosStyles.eyebrow}>K A  B I J O U X</Text>
              <Text accessibilityRole="header" style={iosStyles.title}>Privacidade e{`\n`}permissões</Text>
            </View>
            <View style={iosStyles.heroArtWrap}>
              <Image source={require("../assets/redesign-ios/privacy-hero.png")} style={iosStyles.heroArt} contentFit="contain" />
              <Image source={require("../assets/icon.png")} style={iosStyles.shieldLogo} contentFit="contain" accessibilityLabel="Logo oficial KA Bijoux" />
            </View>
          </View>
          <Text style={iosStyles.intro}>A KA Bijoux solicita acesso somente quando um recurso realmente precisa dele. Você pode negar uma permissão e continuar usando as demais funções.</Text>

          <View style={iosStyles.card}>
            <PermissionItem icon="notifications-outline" title="Notificações" status="Não solicitada" description="As atualizações de pedidos ficam disponíveis dentro do aplicativo. Alertas push ainda não estão ativos e, por isso, nenhuma permissão é solicitada." />
            <View style={iosStyles.divider} />
            <PermissionItem icon="location-outline" title="Localização" status="Não utilizada" description="O endereço é preenchido manualmente por CEP e campos de endereço. O aplicativo não acessa a localização do aparelho." />
            <View style={iosStyles.divider} />
            <PermissionItem icon="camera-outline" title="Câmera e fotos" status="Não utilizadas" description="O aplicativo não possui, nesta versão, uma função que precise acessar a câmera ou a galeria." />
          </View>

          <TouchableOpacity accessibilityRole="button" onPress={openSystemSettings} activeOpacity={0.86}>
            <LinearGradient colors={["#fa3b78", "#d90055", "#f05b8e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={iosStyles.settingsButton}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
              <Text style={iosStyles.settingsButtonText}>Abrir configurações do sistema</Text>
              <Ionicons name="chevron-forward" size={23} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={iosStyles.sectionHeading}>
            <View style={iosStyles.sectionHeadingIcon}><Ionicons name="document-text-outline" size={24} color="#e00054" /></View>
            <View><Text style={iosStyles.sectionTitle}>Documentos e controle da conta</Text><Text style={iosStyles.sectionSubtitle}>Acesse nossos documentos e gerencie sua conta.</Text></View>
          </View>
          <View style={iosStyles.linksCard}>
            <LegalLink label="Termos de Uso" url={LEGAL_LINKS.terms} />
            <View style={iosStyles.divider} />
            <LegalLink label="Política de Privacidade" url={LEGAL_LINKS.privacy} />
            <View style={iosStyles.divider} />
            <LegalLink label="Exclusão de Conta" url={LEGAL_LINKS.accountDeletion} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.headerTitle}>Privacidade e permissões</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          A KA Bijoux solicita acesso somente quando um recurso realmente precisa dele. Você pode negar uma permissão e continuar usando as demais funções.
        </Text>

        <View style={styles.card}>
          <PermissionItem
            icon="notifications-outline"
            title="Notificações"
            status="Não solicitada"
            description="As atualizações de pedidos ficam disponíveis dentro do aplicativo. Alertas push ainda não estão ativos e, por isso, nenhuma permissão é solicitada."
          />
          <View style={styles.divider} />
          <PermissionItem
            icon="location-outline"
            title="Localização"
            status="Não utilizada"
            description="O endereço é preenchido manualmente por CEP e campos de endereço. O aplicativo não acessa a localização do aparelho."
          />
          <View style={styles.divider} />
          <PermissionItem
            icon="camera-outline"
            title="Câmera e fotos"
            status="Não utilizadas"
            description="O aplicativo não possui, nesta versão, uma função que precise acessar a câmera ou a galeria."
          />
        </View>

        <TouchableOpacity accessibilityRole="button" onPress={openSystemSettings} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={20} color="#fff" />
          <Text style={styles.settingsButtonText}>Abrir configurações do sistema</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Documentos e controle da conta</Text>
        <View style={styles.linksCard}>
          <LegalLink label="Termos de Uso" url={LEGAL_LINKS.terms} />
          <View style={styles.divider} />
          <LegalLink label="Política de Privacidade" url={LEGAL_LINKS.privacy} />
          <View style={styles.divider} />
          <LegalLink label="Exclusão de Conta" url={LEGAL_LINKS.accountDeletion} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.base, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm },
  headerTitle: { flex: 1, textAlign: "center", fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  headerSpacer: { width: 42 },
  content: { padding: Spacing.base },
  intro: { fontSize: FontSizes.sm, lineHeight: 21, color: Colors.textSecondary, marginBottom: Spacing.base },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"], padding: Spacing.base, ...Shadows.sm },
  permissionItem: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  permissionIcon: { width: 42, height: 42, borderRadius: BorderRadius.md, backgroundColor: Colors.pinkSoft, alignItems: "center", justifyContent: "center" },
  permissionText: { flex: 1 },
  permissionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  permissionTitle: { flex: 1, fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  status: { fontSize: FontSizes.xs, fontWeight: "700", color: Colors.primary, backgroundColor: Colors.pinkSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  permissionDescription: { marginTop: 5, fontSize: FontSizes.sm, lineHeight: 19, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.base },
  settingsButton: { marginTop: Spacing.base, minHeight: 52, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  settingsButtonText: { color: "#fff", fontSize: FontSizes.base, fontWeight: "700" },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md, fontSize: FontSizes.md, fontWeight: "800", color: Colors.textPrimary },
  linksCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"], paddingHorizontal: Spacing.base, ...Shadows.sm },
  linkRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linkText: { fontSize: FontSizes.base, fontWeight: "600", color: Colors.textPrimary },
});

const iosStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7f8" },
  content: { paddingHorizontal: 16 },
  backButton: { marginTop: 5, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", shadowColor: "#ca6e89", shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, zIndex: 4 },
  heroHeader: { minHeight: 180, flexDirection: "row", alignItems: "center", marginTop: -38 },
  heroCopy: { width: "61%", paddingLeft: 10, paddingTop: 44, zIndex: 2 },
  eyebrow: { color: "#e00054", fontFamily: "Inter", fontSize: 10, letterSpacing: 2.5, marginBottom: 8 },
  title: { color: "#650922", fontFamily: "PlayfairDisplay", fontSize: 36, lineHeight: 38 },
  heroArtWrap: { position: "absolute", right: -34, top: 4, width: 220, height: 190 },
  heroArt: { width: "100%", height: "100%" },
  shieldLogo: { position: "absolute", width: 45, height: 45, right: 73, top: 79, borderRadius: 9, opacity: 0.86 },
  intro: { color: "#696b75", fontFamily: "Inter", fontSize: 15, lineHeight: 22, marginHorizontal: 10, marginBottom: 16 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 26, padding: 16, shadowColor: "#c75d7c", shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  permissionItem: { flexDirection: "row", gap: 14 },
  permissionIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: "#fff0f5", alignItems: "center", justifyContent: "center" },
  permissionText: { flex: 1 },
  permissionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  permissionTitle: { flexGrow: 1, color: "#2a0711", fontFamily: "Inter", fontSize: 17, fontWeight: "800" },
  status: { color: "#e70058", fontFamily: "Inter", fontSize: 11, fontWeight: "800", backgroundColor: "#ffe4ed", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14 },
  permissionDescription: { color: "#787a84", fontFamily: "Inter", fontSize: 13, lineHeight: 19, marginTop: 5 },
  divider: { height: 1, backgroundColor: "rgba(207,122,148,0.2)", marginVertical: 15 },
  settingsButton: { height: 58, borderRadius: 18, marginHorizontal: 3, marginTop: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#dc1558", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 7 } },
  settingsButtonText: { flex: 1, color: "#fff", fontFamily: "Inter", fontSize: 15, fontWeight: "800", textAlign: "center" },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22, marginHorizontal: 7, marginBottom: 10 },
  sectionHeadingIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,230,237,0.9)", alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: "#711029", fontFamily: "PlayfairDisplay", fontSize: 21 },
  sectionSubtitle: { color: "#7b7d85", fontFamily: "Inter", fontSize: 12, marginTop: 2 },
  linksCard: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 25, paddingHorizontal: 15, shadowColor: "#c75d7c", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  linkRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 13 },
  linkIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#fff0f5", alignItems: "center", justifyContent: "center" },
  linkText: { flex: 1, color: "#2c0b14", fontFamily: "Inter", fontSize: 14, fontWeight: "700" },
});
