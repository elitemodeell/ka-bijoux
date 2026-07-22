import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, FontSizes, Spacing } from "@/constants/theme";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "ghost" | "danger";
  fullWidth?: boolean;
}

const sizeMap = {
  sm: { height: 36, fontSize: FontSizes.sm, px: Spacing.md },
  md: { height: 44, fontSize: FontSizes.base, px: Spacing.base },
  lg: { height: 52, fontSize: FontSizes.md, px: Spacing.xl },
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  size = "md",
  variant = "primary",
  fullWidth = false,
}: ButtonProps) {
  const { height, fontSize, px } = sizeMap[size];
  const isDisabled = disabled || loading;
  const widthStyle: ViewStyle = fullWidth ? { alignSelf: "stretch" } : {};

  if (variant === "outline") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.75}
        style={[
          styles.base,
          { height, paddingHorizontal: px, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: "transparent" },
          isDisabled && styles.disabled,
          widthStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Text style={[styles.label, { fontSize, color: Colors.primary }]}>{label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === "ghost") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.75}
        style={[styles.base, { height, paddingHorizontal: px }, isDisabled && styles.disabled, widthStyle, style]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Text style={[styles.label, { fontSize, color: Colors.primary }]}>{label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === "danger") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.78}
        style={[
          styles.base,
          { height, paddingHorizontal: px, backgroundColor: Colors.error },
          isDisabled && styles.disabled,
          widthStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.label, { fontSize, color: "#fff" }]}>{label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[{ borderRadius: BorderRadius.lg, overflow: "hidden" }, isDisabled && styles.disabled, widthStyle, style]}
    >
      <LinearGradient
        colors={isDisabled ? ["#ccc", "#bbb"] : ["#FF6B8A", "#FF4D6D", "#C8274A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.base, { height, paddingHorizontal: px }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.label, { fontSize, color: "#fff" }]}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.55,
  },
});
