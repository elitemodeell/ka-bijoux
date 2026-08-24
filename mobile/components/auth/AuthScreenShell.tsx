import type { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";

type AuthScreenShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  keyboardAware?: boolean;
};

export function AuthScreenShell({
  title,
  subtitle,
  children,
  onClose,
  keyboardAware = false,
}: AuthScreenShellProps) {
  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Fechar autenticação"
          onPress={onClose}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={23} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.brand}>
          <Image source={require("../../assets/icon.png")} resizeMode="contain" style={styles.logo} />
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.card}>{children}</View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {keyboardAware ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          {content}
        </KeyboardAvoidingView>
      ) : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl },
  content: { width: "100%", maxWidth: 560, flexGrow: 1, alignSelf: "center" },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginLeft: -4,
  },
  brand: { alignItems: "center", marginTop: 4, marginBottom: Spacing.lg },
  logo: { width: 92, height: 92, borderRadius: BorderRadius["2xl"], marginBottom: Spacing.base },
  title: { color: Colors.textPrimary, fontSize: FontSizes["2xl"], fontWeight: "900", textAlign: "center" },
  subtitle: {
    maxWidth: 420,
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  card: {
    width: "100%",
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius["2xl"],
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
});
