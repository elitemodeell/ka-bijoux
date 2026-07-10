import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 24, readonly = false }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onChange?.(star)}
          disabled={readonly}
          activeOpacity={readonly ? 1 : 0.7}
        >
          <Ionicons
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={star <= value ? Colors.warning : Colors.textLight}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
});
