import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";

export default function ExcluirContaScreen() {
  const router = useRouter();
  const { customer, logout } = useAuthStore();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [needsAppleRevocation, setNeedsAppleRevocation] = useState(false);

  async function handleDelete() {
    Alert.alert(
      "Excluir conta",
      "Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão removidos permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const response = await api.delete("/api/customers/me", { data: { password } });
              const providers = response.data?.data?.providers;
              setNeedsAppleRevocation(Array.isArray(providers) && providers.includes("apple"));
              await logout();
              setConfirmed(true);
            } catch (e: unknown) {
              const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
              Alert.alert("Erro", msg ?? "Não foi possível excluir sua conta. Tente novamente.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  if (confirmed) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          <Text style={styles.doneTitle}>Conta excluída</Text>
          <Text style={styles.doneText}>
            Seus dados foram removidos. Esperamos te ver novamente em breve!
          </Text>
          {needsAppleRevocation && (
            <Text style={styles.appleRevocationText}>
              Para concluir também na Apple, abra Ajustes no iPhone, toque no seu nome, depois em Início de Sessão e Segurança, Iniciar sessão com Apple, KA Bijoux e Parar de usar.
            </Text>
          )}
          <Button
            label="Voltar ao início"
            onPress={() => router.replace("/(tabs)")}
            style={{ marginTop: 24 }}
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Excluir Conta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warnCard}>
          <Ionicons name="warning" size={32} color={Colors.error} />
          <Text style={styles.warnTitle}>Esta ação é permanente</Text>
          <Text style={styles.warnText}>
            Ao excluir sua conta, seus dados de acesso e perfil serão removidos ou anonimizados:
          </Text>
          <View style={styles.list}>
            {[
              "Seus dados pessoais (nome, e-mail, telefone)",
              "Endereços salvos",
              "Lista de favoritos",
            ].map((item) => (
              <View key={item} style={styles.listItem}>
                <Ionicons name="close-circle" size={16} color={Colors.error} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.warnNote}>
            Registros de pedidos e dados fiscais que precisem ser preservados por obrigação legal continuarão armazenados sem permitir novo acesso à conta. Pedidos em andamento não serão cancelados automaticamente.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Confirmar exclusão</Text>
          <Text style={styles.cardSubtitle}>
            Conta: <Text style={{ fontWeight: "700", color: Colors.primary }}>{customer?.email}</Text>
          </Text>
          <Text style={styles.label}>Sua senha, se sua conta usa e-mail</Text>
          <Text style={styles.cardSubtitle}>Contas Apple e Google não precisam informar senha.</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Senha da conta por e-mail"
            placeholderTextColor={Colors.textLight}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <Button
          label="Excluir minha conta"
          onPress={handleDelete}
          loading={loading}
          variant="danger"
          fullWidth
          size="lg"
        />

        <Button
          label="Cancelar"
          onPress={() => router.back()}
          variant="outline"
          fullWidth
          size="lg"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm,
  },
  title: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  content: { paddingHorizontal: Spacing.base, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.base },
  doneTitle: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary, marginTop: 16 },
  doneText: { fontSize: FontSizes.base, color: Colors.textMuted, textAlign: "center", marginTop: 8, lineHeight: 22 },
  appleRevocationText: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: "center", marginTop: 16, lineHeight: 21 },
  warnCard: {
    backgroundColor: Colors.errorLight, borderRadius: BorderRadius["2xl"],
    padding: 20, alignItems: "flex-start", gap: 10,
  },
  warnTitle: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.error },
  warnText: { fontSize: FontSizes.sm, color: Colors.error, lineHeight: 20 },
  list: { gap: 6, width: "100%" },
  listItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  listText: { fontSize: FontSizes.sm, color: Colors.error, flex: 1 },
  warnNote: {
    fontSize: FontSizes.xs, color: Colors.textMuted,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 10, lineHeight: 18,
  },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius["2xl"], padding: 16, ...Shadows.sm, gap: 8 },
  cardTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary },
  cardSubtitle: { fontSize: FontSizes.sm, color: Colors.textMuted },
  label: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary, marginTop: 4 },
  input: {
    backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSizes.base, color: Colors.textPrimary,
  },
});
