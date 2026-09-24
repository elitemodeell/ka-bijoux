import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";

type WelcomeScreenProps = {
  onFinish: () => void;
  busy?: boolean;
};

export function WelcomeScreen({ onFinish, busy = false }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoCard}>
            <Image source={require("../../assets/icon.png")} resizeMode="contain" style={styles.logo} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>Bem-vinda à KA Bijoux</Text>
          <Text style={styles.subtitle}>
            Encontre seus produtos favoritos e compre com segurança, do seu jeito.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Sua privacidade em primeiro lugar</Text>
              <Text style={styles.infoDescription}>Não pedimos acesso à localização, câmera, fotos ou contatos ao abrir o aplicativo.</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="location-outline" size={22} color={Colors.primary} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Você continua no controle</Text>
              <Text style={styles.infoDescription}>O endereço pode ser preenchido manualmente com CEP, sem compartilhar sua localização.</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Continuar" onPress={onFinish} loading={busy} disabled={busy} size="lg" fullWidth />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Pular boas-vindas"
            onPress={onFinish}
            disabled={busy}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Pular por agora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  hero: { alignItems: "center", paddingTop: Spacing.lg },
  logoCard: { width: 132, height: 132, borderRadius: 36, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.md },
  logo: { width: 112, height: 112, borderRadius: 28 },
  title: { marginTop: Spacing.xl, fontSize: FontSizes["3xl"], lineHeight: 39, fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
  subtitle: { marginTop: Spacing.md, maxWidth: 340, fontSize: FontSizes.base, lineHeight: 23, color: Colors.textSecondary, textAlign: "center" },
  infoCard: { marginTop: Spacing["2xl"], padding: Spacing.base, borderRadius: BorderRadius["2xl"], backgroundColor: Colors.surface, ...Shadows.sm },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  iconBox: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.pinkSoft, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1 },
  infoTitle: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary },
  infoDescription: { marginTop: 4, fontSize: FontSizes.sm, lineHeight: 19, color: Colors.textMuted },
  divider: { height: 1, marginVertical: Spacing.base, backgroundColor: Colors.border },
  actions: { marginTop: Spacing["2xl"] },
  skipButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: Spacing.sm },
  skipText: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textSecondary },
});
