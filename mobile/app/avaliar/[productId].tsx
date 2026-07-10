import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";

export default function AvaliarScreen() {
  const router = useRouter();
  const { productId, productName } = useLocalSearchParams<{ productId: string; productName: string }>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (rating === 0) { setError("Selecione uma nota de 1 a 5 estrelas."); return; }
    setLoading(true);
    setError("");
    try {
      await api.post(`/api/products/${productId}/reviews`, { rating, comment: comment.trim() || undefined });
      Alert.alert("Avaliação enviada!", "Sua avaliação será publicada após revisão. Obrigada! 💕", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Não foi possível enviar a avaliação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Avaliar produto</Text>
          {productName && (
            <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.ratingSection}>
            <Text style={styles.label}>Sua nota</Text>
            <StarRating value={rating} onChange={setRating} size={40} />
            <Text style={styles.ratingLabel}>
              {rating === 0 ? "Toque nas estrelas para avaliar" :
               rating === 1 ? "⭐ Ruim" :
               rating === 2 ? "⭐⭐ Regular" :
               rating === 3 ? "⭐⭐⭐ Bom" :
               rating === 4 ? "⭐⭐⭐⭐ Muito bom" :
               "⭐⭐⭐⭐⭐ Excelente!"}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Comentário (opcional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Conte sobre sua experiência com o produto..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              maxLength={500}
              style={styles.textarea}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          <Button
            label="Enviar avaliação"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, paddingTop: 8, flexGrow: 1, gap: 20 },
  backBtn: { marginBottom: 4 },
  backText: { color: Colors.primary, fontWeight: "600", fontSize: FontSizes.base },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary },
  productName: { fontSize: FontSizes.base, color: Colors.textMuted, marginTop: -10 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg, padding: 12 },
  errorText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: "500" },
  ratingSection: { alignItems: "center", gap: 12, paddingVertical: 16 },
  label: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textPrimary, alignSelf: "flex-start" },
  ratingLabel: { fontSize: FontSizes.sm, color: Colors.textMuted },
  inputGroup: { gap: 6 },
  textarea: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: FontSizes.base, color: Colors.textPrimary,
    minHeight: 100, textAlignVertical: "top",
  },
  charCount: { fontSize: FontSizes.xs, color: Colors.textLight, textAlign: "right" },
});
